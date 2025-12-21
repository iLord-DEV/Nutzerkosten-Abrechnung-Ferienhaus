import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

// GET /api/terminplanung/pending - Termine die Aufmerksamkeit brauchen
// 1. Termine ohne Abstimmung des Users
// 2. Termine mit neuer Aktivität seit lastSeenAt (Kommentare, NEED_INFO)
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);

    // Kind-User können nicht abstimmen - leere Liste zurückgeben
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isKind: true }
    });

    if (fullUser?.isKind) {
      return new Response(JSON.stringify({ count: 0, termine: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Alle lastSeenAt Einträge für diesen User laden
    const userSeenEntries = await prisma.userTerminSeen.findMany({
      where: { userId: user.id }
    });
    const seenMap = new Map(userSeenEntries.map(e => [e.terminPlanungId, e.lastSeenAt]));

    // Alle nicht-stornierten Terminplanungen laden (auch eigene für Activity-Check)
    const terminplanungen = await prisma.terminPlanung.findMany({
      where: {
        status: { not: 'CANCELLED' }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        abstimmungen: true,
        kommentare: {
          select: {
            id: true,
            userId: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        startDatum: 'asc'
      }
    });

    const pendingTermine: Array<{
      id: number;
      titel: string;
      startDatum: Date;
      endDatum: Date;
      ersteller: string;
      grund: 'abstimmung' | 'aktivitaet';
    }> = [];

    for (const termin of terminplanungen) {
      const lastSeenAt = seenMap.get(termin.id);
      const isOwnTermin = termin.userId === user.id;

      // 1. Prüfe ob User noch nicht abgestimmt hat (nur für fremde Termine)
      if (!isOwnTermin) {
        const userAbstimmung = termin.abstimmungen.find(
          a => a.userId === user.id && a.version === termin.version
        );
        if (!userAbstimmung) {
          pendingTermine.push({
            id: termin.id,
            titel: termin.titel,
            startDatum: termin.startDatum,
            endDatum: termin.endDatum,
            ersteller: termin.user.name,
            grund: 'abstimmung'
          });
          continue; // Nicht doppelt zählen
        }
      }

      // 2. Prüfe ob es neue Aktivität seit lastSeenAt gibt
      if (lastSeenAt) {
        // Neue Kommentare von anderen seit lastSeenAt?
        const neueKommentare = termin.kommentare.some(
          k => k.userId !== user.id && new Date(k.createdAt) > lastSeenAt
        );

        // Neue NEED_INFO Abstimmungen von anderen seit lastSeenAt?
        const neueNeedInfo = termin.abstimmungen.some(
          a => a.userId !== user.id &&
               a.stimme === 'NEED_INFO' &&
               a.version === termin.version &&
               new Date(a.createdAt) > lastSeenAt
        );

        if (neueKommentare || neueNeedInfo) {
          pendingTermine.push({
            id: termin.id,
            titel: termin.titel,
            startDatum: termin.startDatum,
            endDatum: termin.endDatum,
            ersteller: termin.user.name,
            grund: 'aktivitaet'
          });
        }
      }
    }

    // Response formatieren
    const response = {
      count: pendingTermine.length,
      termine: pendingTermine.map(t => ({
        id: t.id,
        titel: t.titel,
        startDatum: t.startDatum,
        endDatum: t.endDatum,
        ersteller: t.ersteller,
        grund: t.grund
      }))
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der pending Terminplanungen:', error);

    if (error.name === 'AuthenticationError' || error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der pending Termine' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
