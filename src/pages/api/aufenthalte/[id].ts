import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { params } = context;
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aufenthalt laden
    const aufenthalt = await prisma.aufenthalt.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!aufenthalt) {
      return new Response(JSON.stringify({ error: 'Aufenthalt nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normale Benutzer können nur ihre eigenen Aufenthalte sehen
    if (user.role !== 'ADMIN' && aufenthalt.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(aufenthalt), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Aufenthalts:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { params, request } = context;
    const id = params.id;
    const body = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aufenthalt laden um zu prüfen, ob der Benutzer ihn bearbeiten darf
    const existingAufenthalt = await prisma.aufenthalt.findUnique({
      where: { id: parseInt(id) },
      select: { userId: true }
    });

    if (!existingAufenthalt) {
      return new Response(JSON.stringify({ error: 'Aufenthalt nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normale Benutzer können nur ihre eigenen Aufenthalte bearbeiten
    if (user.role !== 'ADMIN' && existingAufenthalt.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normale Benutzer können den Benutzer nicht ändern
    if (user.role !== 'ADMIN') {
      body.userId = existingAufenthalt.userId;
    }

    // Validierung der Zählerstände
    const zaehlerStart = parseInt(body.zaehlerStart);
    const zaehlerEnde = parseInt(body.zaehlerEnde);
    const ankunftDate = new Date(body.ankunft + 'T00:00:00');
    const abreiseDate = new Date(body.abreise + 'T00:00:00');

    // Grundlegende Validierung
    if (isNaN(zaehlerStart) || isNaN(zaehlerEnde)) {
      return new Response(JSON.stringify({
        error: 'Ungültige Zählerstände. Bitte geben Sie gültige Zahlen ein.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (zaehlerEnde <= zaehlerStart) {
      return new Response(JSON.stringify({
        error: 'Endzählerstand muss größer als Ankunftszählerstand sein.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zukunfts-Datum-Validierung
    const heute = new Date();
    heute.setHours(0, 0, 0, 0); // Auf Mitternacht setzen für faire Vergleich
    if (ankunftDate > heute) {
      return new Response(JSON.stringify({
        error: 'Ankunft kann nicht in der Zukunft liegen. Bitte wählen Sie ein Datum von heute oder früher.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Zählerstand-Kontinuitätsprüfung: Prüfe rückwärtslaufende Zähler
    const eigeneAufenthalte = await prisma.aufenthalt.findMany({
      where: {
        userId: parseInt(body.userId),
        id: { not: parseInt(id) } // Aktuellen Aufenthalt ausschließen
      },
      orderBy: {
        zaehlerAbreise: 'desc'
      }
    });

    // Prüfe rückwärtslaufende Zähler: Finde eigene Aufenthalte, die nach dem neuen Startstand enden
    const problematischeAufenthalte = eigeneAufenthalte.filter(a =>
      a.zaehlerAbreise !== null && a.zaehlerAbreise > zaehlerStart
    );

    if (problematischeAufenthalte.length > 0) {
      const problematischerAufenthalt = problematischeAufenthalte[0];
      return new Response(JSON.stringify({
        error: `Zählerstand ${zaehlerStart} ist kleiner als der Endstand ${problematischerAufenthalt.zaehlerAbreise} vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Zähler können nicht rückwärts laufen. Bitte wählen Sie einen Zählerstand größer als ${problematischerAufenthalt.zaehlerAbreise}.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfe zeitlich unmögliche Zählerstände:
    // Wenn jemand zeitlich nach einem anderen kommt, darf sein Zählerstart nicht im Bereich des Vorherigen liegen
    const alleAufenthalte = await prisma.aufenthalt.findMany({
      where: {
        id: { not: parseInt(id) } // Aktuellen Aufenthalt ausschließen
      },
      orderBy: {
        zaehlerAbreise: 'desc'
      }
    });

    const zeitlichVorherigeAufenthalte = alleAufenthalte.filter(a => {
      const aAbreise = new Date(a.abreise);
      return aAbreise < ankunftDate && a.zaehlerAbreise !== null &&
             zaehlerStart >= a.zaehlerAnkunft && zaehlerStart < a.zaehlerAbreise;
    });

    if (zeitlichVorherigeAufenthalte.length > 0) {
      const problematischerAufenthalt = zeitlichVorherigeAufenthalte[0];
      return new Response(JSON.stringify({
        error: `Zählerstand ${zaehlerStart} liegt im Bereich des vorherigen Aufenthalts (${problematischerAufenthalt.zaehlerAnkunft}-${problematischerAufenthalt.zaehlerAbreise}) vom ${problematischerAufenthalt.abreise.toISOString().split('T')[0]}. Das ist zeitlich unmöglich. Bitte wählen Sie einen Zählerstand außerhalb des Bereichs ${problematischerAufenthalt.zaehlerAnkunft}-${problematischerAufenthalt.zaehlerAbreise}.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aktiven Zähler für Abreise finden
    const aktiverZaehler = await prisma.zaehler.findFirst({
      where: { istAktiv: true },
    });

    if (!aktiverZaehler) {
      return new Response(JSON.stringify({ 
        error: 'Kein aktiver Zähler gefunden. Bitte erst einen Zähler einbauen.' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Aufenthalt aktualisieren
    const updatedAufenthalt = await prisma.aufenthalt.update({
      where: { id: parseInt(id) },
      data: {
        user: {
          connect: { id: parseInt(body.userId) }
        },
        ankunft: ankunftDate,
        abreise: abreiseDate,
        zaehlerAnkunft: zaehlerStart,
        zaehlerAbreise: zaehlerEnde,
        uebernachtungenMitglieder: parseInt(body.uebernachtungenMitglieder),
        uebernachtungenGaeste: parseInt(body.uebernachtungenGaeste),
        jahr: ankunftDate.getFullYear(),
        zaehler: {
          connect: { id: aktiverZaehler.id }
        },
        zaehlerAbreiseRef: {
          connect: { id: aktiverZaehler.id }
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(updatedAufenthalt), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Aufenthalts:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { params } = context;
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Aufenthalt laden um zu prüfen, ob der Benutzer ihn löschen darf
    const aufenthalt = await prisma.aufenthalt.findUnique({
      where: { id: parseInt(id) },
      select: { userId: true }
    });

    if (!aufenthalt) {
      return new Response(JSON.stringify({ error: 'Aufenthalt nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normale Benutzer können nur ihre eigenen Aufenthalte löschen
    if (user.role !== 'ADMIN' && aufenthalt.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aufenthalt löschen
    await prisma.aufenthalt.delete({
      where: {
        id: parseInt(id),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Aufenthalts:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
