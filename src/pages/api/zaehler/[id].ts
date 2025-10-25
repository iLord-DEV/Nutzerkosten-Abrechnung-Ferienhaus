import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

// Einzelnen Zähler mit allen Details abrufen
export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { params } = context;
    const id = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const zaehler = await prisma.zaehler.findUnique({
      where: { id: parseInt(id) },
      include: {
        tankfuellungen: {
          orderBy: {
            zaehlerstand: 'desc',
          },
        },
        aufenthalteAnkunft: {
          orderBy: {
            ankunft: 'asc',
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        aufenthalteAbreise: {
          orderBy: {
            zaehlerAbreise: 'desc',
          },
          take: 1,
          select: {
            zaehlerAbreise: true,
          },
        },
      },
    });

    if (!zaehler) {
      return new Response(JSON.stringify({ error: 'Zähler nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Letzten Aufenthalt-Stand berechnen
    const letzterAufenthaltStand = zaehler.aufenthalteAbreise[0]?.zaehlerAbreise || 0;

    // Aufenthalte umbenennen (wir wollen beide Listen zusammenführen)
    const aufenthalte = zaehler.aufenthalteAnkunft;

    const zaehlerMitStand = {
      ...zaehler,
      letzterAufenthaltStand,
      aufenthalte, // Einheitlicher Name
    };

    return new Response(JSON.stringify(zaehlerMitStand), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Zählers:', error);
    return new Response(JSON.stringify({
      error: 'Fehler beim Laden der Daten',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Zähler löschen
export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { params } = context;
    const id = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfen ob Zähler aktiv ist
    const zaehler = await prisma.zaehler.findUnique({
      where: { id: parseInt(id) },
      select: { istAktiv: true },
    });

    if (!zaehler) {
      return new Response(JSON.stringify({ error: 'Zähler nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (zaehler.istAktiv) {
      return new Response(JSON.stringify({
        error: 'Aktive Zähler können nicht gelöscht werden. Bitte zuerst einen neuen Zähler einbauen.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zähler löschen
    await prisma.zaehler.delete({
      where: { id: parseInt(id) },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Zählers:', error);
    return new Response(JSON.stringify({
      error: 'Fehler beim Löschen',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
