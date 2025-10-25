import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';
import { validateAufenthaltData, type AufenthaltData } from '../../../utils/aufenthaltValidation';

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
            beguenstigt: true,
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

    // Validierung mit den Utils-Funktionen (DRY - Don't Repeat Yourself)
    const aufenthaltData: AufenthaltData = {
      userId: parseInt(body.userId),
      ankunft: body.ankunft,
      abreise: body.abreise,
      zaehlerStart: parseInt(body.zaehlerStart),
      zaehlerEnde: parseInt(body.zaehlerEnde),
      uebernachtungenMitglieder: parseInt(body.uebernachtungenMitglieder),
      uebernachtungenGaeste: parseInt(body.uebernachtungenGaeste)
    };

    // Wichtig: excludeId übergeben, damit der aktuelle Aufenthalt bei der Validierung ausgeschlossen wird
    const validationErrors = await validateAufenthaltData(aufenthaltData, parseInt(id));

    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      return new Response(JSON.stringify({
        error: firstError.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Variablen für nachfolgende Verwendung
    const zaehlerStart = aufenthaltData.zaehlerStart;
    const zaehlerEnde = aufenthaltData.zaehlerEnde;
    const ankunftDate = new Date(body.ankunft + 'T00:00:00');
    const abreiseDate = new Date(body.abreise + 'T00:00:00');

    // Nächte berechnen - Logik:
    // null = User-Status entscheidet (begünstigt=false, normal=true)
    // true = explizit berechnen (auch für begünstigte)
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(body.userId) },
      select: { beguenstigt: true }
    });
    // Nur speichern wenn begünstigt UND explizit true gesetzt
    const naechteBerechnen = (targetUser?.beguenstigt && body.naechteBerechnen === true) ? true : null;

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
        naechteBerechnen: naechteBerechnen,
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({
      error: 'Interner Server-Fehler',
      details: error.message
    }), {
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
