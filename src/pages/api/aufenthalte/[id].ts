import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    // Session prüfen
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
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
    if (session.role !== 'ADMIN' && aufenthalt.userId !== session.userId) {
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

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    // Session prüfen
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
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
    if (session.role !== 'ADMIN' && existingAufenthalt.userId !== session.userId) {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Normale Benutzer können den Benutzer nicht ändern
    if (session.role !== 'ADMIN') {
      body.userId = existingAufenthalt.userId;
    }

    // Aufenthalt aktualisieren
    const updatedAufenthalt = await prisma.aufenthalt.update({
      where: { id: parseInt(id) },
      data: {
        userId: parseInt(body.userId),
        ankunft: new Date(body.ankunft),
        abreise: new Date(body.abreise),
        zaehlerAnkunft: parseFloat(body.zaehlerStart),
        zaehlerAbreise: parseFloat(body.zaehlerEnde),
        anzahlMitglieder: parseInt(body.anzahlMitglieder),
        anzahlGaeste: parseInt(body.anzahlGaeste),
        jahr: new Date(body.ankunft).getFullYear(),
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

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    // Session prüfen
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
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
    if (session.role !== 'ADMIN' && aufenthalt.userId !== session.userId) {
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
