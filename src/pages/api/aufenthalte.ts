import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ cookies }) => {
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
    
    // Basis-Query
    let whereClause: any = {};
    
    // Normale Benutzer sehen nur ihre eigenen Aufenthalte
    if (session.role !== 'ADMIN') {
      whereClause.userId = session.userId;
    }

    const aufenthalte = await prisma.aufenthalt.findMany({
      where: whereClause,
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
      orderBy: {
        ankunft: 'desc',
      },
    });

    return new Response(JSON.stringify(aufenthalte), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Aufenthalte:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Daten' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
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
    const body = await request.json();
    
    // Normale Benutzer können nur Aufenthalte für sich selbst erstellen
    if (session.role !== 'ADMIN') {
      body.userId = session.userId;
    }
    
    const aufenthalt = await prisma.aufenthalt.create({
      data: {
        userId: body.userId,
        ankunft: new Date(body.ankunft),
        abreise: new Date(body.abreise),
        zaehlerstandStart: parseFloat(body.zaehlerStart),
        zaehlerstandEnde: parseFloat(body.zaehlerEnde),
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

    return new Response(JSON.stringify(aufenthalt), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Aufenthalts:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen des Aufenthalts' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
