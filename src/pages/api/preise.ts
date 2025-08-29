import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../utils/auth';

const prisma = new PrismaClient();

// GET: Alle Preise abrufen
export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const url = new URL(request.url);
    const datum = url.searchParams.get('datum');

    if (datum) {
      // Hole den gültigen Preis für ein bestimmtes Datum
      const preis = await prisma.preise.findFirst({
        where: {
          gueltigAb: {
            lte: new Date(datum)
          }
        },
        orderBy: {
          gueltigAb: 'desc'
        }
      });

      if (!preis) {
        // Fallback-Preise wenn keine konfiguriert sind
        return new Response(JSON.stringify({
          uebernachtungMitglied: 5,
          uebernachtungGast: 10
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(preis), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hole alle Preise
    const preise = await prisma.preise.findMany({
      orderBy: {
        jahr: 'desc'
      }
    });

    return new Response(JSON.stringify(preise), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Preise:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der Preise' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Neuen Preis erstellen
export const POST: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;
    
    const body = await request.json();
    const { gueltigAb, uebernachtungMitglied, uebernachtungGast } = body;

    if (!gueltigAb || uebernachtungMitglied === undefined || uebernachtungGast === undefined) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generiere eine eindeutige ID basierend auf dem Datum
    const jahr = new Date(gueltigAb).getFullYear();
    const monat = new Date(gueltigAb).getMonth() + 1;
    const tag = new Date(gueltigAb).getDate();
    const eindeutigeId = jahr * 10000 + monat * 100 + tag; // z.B. 20250101
    
    console.log('Debug - Erstelle Preis mit:', { gueltigAb, jahr: eindeutigeId, uebernachtungMitglied, uebernachtungGast });
    
    const neuerPreis = await prisma.preise.create({
      data: {
        jahr: eindeutigeId,
        oelpreisProLiter: 1.01, // Fallback
        uebernachtungMitglied,
        uebernachtungGast,
        verbrauchProStunde: 5.5, // Fallback
        istBerechnet: false,
        gueltigAb: new Date(gueltigAb),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return new Response(JSON.stringify(neuerPreis), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Preises:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen des Preises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Preis aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request, url } = context;
    const jahr = url.searchParams.get('jahr');
    if (!jahr) {
      return new Response(JSON.stringify({ error: 'Jahr ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { gueltigAb, uebernachtungMitglied, uebernachtungGast } = body;

    if (!gueltigAb || uebernachtungMitglied === undefined || uebernachtungGast === undefined) {
      return new Response(JSON.stringify({ error: 'Alle Felder sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const aktualisierterPreis = await prisma.preise.update({
      where: { jahr: parseInt(jahr) },
      data: {
        uebernachtungMitglied,
        uebernachtungGast,
        gueltigAb: new Date(gueltigAb)
      }
    });

    return new Response(JSON.stringify(aktualisierterPreis), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Preises:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Aktualisieren des Preises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Preis löschen
export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request, url } = context;
    const jahr = url.searchParams.get('jahr');
    if (!jahr) {
      return new Response(JSON.stringify({ error: 'Jahr ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfe ob der Preis existiert
    const preis = await prisma.preise.findUnique({
      where: { jahr: parseInt(jahr) }
    });

    if (!preis) {
      return new Response(JSON.stringify({ error: 'Preis nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await prisma.preise.delete({
      where: { jahr: parseInt(jahr) }
    });

    return new Response(JSON.stringify({ message: 'Preis erfolgreich gelöscht' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Preises:', error);
    
    if (error.code === 'P2025') {
      return new Response(JSON.stringify({ error: 'Preis nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Fehler beim Löschen des Preises' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
