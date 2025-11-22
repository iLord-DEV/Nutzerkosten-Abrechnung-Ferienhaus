import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';
import { sendJahresabschlussEmail } from '../../../utils/email';

const prisma = new PrismaClient();

interface UserStatistik {
  userId: number;
  userName: string;
  email: string;
  gesamtKosten: number;
  oelKosten: number;
  uebernachtungKosten: number;
  anzahlAufenthalte: number;
  gesamtTage: number;
  gesamtVerbrauch: number;
}

/**
 * Berechnet die Statistiken für einen einzelnen User
 */
async function calculateUserStatistik(userId: number, jahr: number): Promise<UserStatistik | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, beguenstigt: true }
  });

  if (!user) return null;

  const aufenthalte = await prisma.aufenthalt.findMany({
    where: { userId, jahr },
    include: {
      user: { select: { beguenstigt: true } }
    }
  });

  if (aufenthalte.length === 0) return null;

  const preise = await prisma.preise.findUnique({
    where: { jahr }
  });

  const verbrauchProStunde = preise?.verbrauchProStunde || 5.5;
  const oelpreisProLiter = preise?.oelpreisProLiter || 1.01;
  const uebernachtungMitglied = preise?.uebernachtungMitglied || 5;
  const uebernachtungGast = preise?.uebernachtungGast || 10;

  let gesamtVerbrauch = 0;
  let oelKosten = 0;
  let uebernachtungKosten = 0;
  let gesamtTage = 0;

  for (const aufenthalt of aufenthalte) {
    // Brennerstunden und Verbrauch
    const brennerstunden = aufenthalt.zaehlerAbreise - aufenthalt.zaehlerAnkunft;
    const verbrauch = brennerstunden * verbrauchProStunde;
    gesamtVerbrauch += verbrauch;
    oelKosten += verbrauch * oelpreisProLiter;

    // Tage
    const tage = Math.ceil(
      (new Date(aufenthalt.abreise).getTime() - new Date(aufenthalt.ankunft).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    gesamtTage += tage;

    // Übernachtungskosten (nur wenn naechteBerechnen nicht explizit false)
    const naechteBerechnen = aufenthalt.naechteBerechnen ?? !user.beguenstigt;
    if (naechteBerechnen) {
      uebernachtungKosten +=
        aufenthalt.uebernachtungenMitglieder * uebernachtungMitglied +
        aufenthalt.uebernachtungenGaeste * uebernachtungGast;
    }
  }

  return {
    userId: user.id,
    userName: user.name,
    email: user.email,
    gesamtKosten: oelKosten + uebernachtungKosten,
    oelKosten,
    uebernachtungKosten,
    anzahlAufenthalte: aufenthalte.length,
    gesamtTage,
    gesamtVerbrauch
  };
}

/**
 * POST /api/admin/send-jahresabschluss
 * Sendet Jahresabschluss-Emails an alle User
 *
 * Body: { jahr: number, testMode?: boolean, testEmail?: string }
 * - testMode: true = sendet nur an testEmail zur Vorschau
 * - testEmail: Email-Adresse für Testversand
 */
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const body = await context.request.json();
    const { jahr, testMode, testEmail } = body;

    if (!jahr) {
      return new Response(
        JSON.stringify({ error: 'Jahr ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Alle User mit Aufenthalten im Jahr holen
    const usersWithAufenthalte = await prisma.user.findMany({
      where: {
        aufenthalte: {
          some: { jahr: parseInt(jahr) }
        }
      },
      select: { id: true }
    });

    const results: { success: string[]; failed: string[]; skipped: string[] } = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const { id: userId } of usersWithAufenthalte) {
      const statistik = await calculateUserStatistik(userId, parseInt(jahr));

      if (!statistik) {
        results.skipped.push(`User ${userId}: Keine Daten`);
        continue;
      }

      // Nur User mit Kosten > 0 benachrichtigen
      if (statistik.gesamtKosten <= 0) {
        results.skipped.push(`${statistik.userName}: Keine Kosten`);
        continue;
      }

      try {
        const targetEmail = testMode && testEmail ? testEmail : statistik.email;

        await sendJahresabschlussEmail(
          targetEmail,
          statistik.userName,
          parseInt(jahr),
          {
            gesamtKosten: statistik.gesamtKosten,
            oelKosten: statistik.oelKosten,
            uebernachtungKosten: statistik.uebernachtungKosten,
            anzahlAufenthalte: statistik.anzahlAufenthalte,
            gesamtTage: statistik.gesamtTage,
            gesamtVerbrauch: statistik.gesamtVerbrauch
          }
        );

        results.success.push(
          testMode
            ? `${statistik.userName}: Test an ${targetEmail} (${statistik.gesamtKosten.toFixed(2)}€)`
            : `${statistik.userName}: ${statistik.gesamtKosten.toFixed(2)}€`
        );

        // Im Testmodus nur eine Email senden
        if (testMode) break;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
        results.failed.push(`${statistik.userName}: ${errorMessage}`);
      }
    }

    const summary = {
      jahr: parseInt(jahr),
      testMode: !!testMode,
      gesendet: results.success.length,
      fehlgeschlagen: results.failed.length,
      uebersprungen: results.skipped.length,
      details: results
    };

    console.log(`📧 Jahresabschluss ${jahr} versendet:`, summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fehler beim Versenden der Jahresabschluss-Emails:', error);

    if (error instanceof Error && error.message === 'Keine Berechtigung') {
      return new Response(
        JSON.stringify({ error: 'Nur Administratoren können diese Funktion nutzen' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/admin/send-jahresabschluss?jahr=2024
 * Gibt eine Vorschau zurück (ohne Emails zu senden)
 */
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const url = new URL(context.request.url);
    const jahr = url.searchParams.get('jahr') || String(new Date().getFullYear() - 1);

    // Alle User mit Aufenthalten im Jahr holen
    const usersWithAufenthalte = await prisma.user.findMany({
      where: {
        aufenthalte: {
          some: { jahr: parseInt(jahr) }
        }
      },
      select: { id: true }
    });

    const preview: UserStatistik[] = [];

    for (const { id: userId } of usersWithAufenthalte) {
      const statistik = await calculateUserStatistik(userId, parseInt(jahr));
      if (statistik && statistik.gesamtKosten > 0) {
        preview.push(statistik);
      }
    }

    const gesamtSumme = preview.reduce((sum, s) => sum + s.gesamtKosten, 0);

    return new Response(JSON.stringify({
      jahr: parseInt(jahr),
      anzahlUser: preview.length,
      gesamtSumme,
      users: preview.map(s => ({
        name: s.userName,
        email: s.email,
        gesamtKosten: s.gesamtKosten,
        aufenthalte: s.anzahlAufenthalte,
        tage: s.gesamtTage
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fehler bei Jahresabschluss-Vorschau:', error);

    if (error instanceof Error && error.message === 'Keine Berechtigung') {
      return new Response(
        JSON.stringify({ error: 'Nur Administratoren können diese Funktion nutzen' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
