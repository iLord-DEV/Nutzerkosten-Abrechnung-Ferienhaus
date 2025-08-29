import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    
    // URL-Parameter auslesen
    const { url } = context;
    const searchParams = url.searchParams;
    const jahr = searchParams.get('jahr');
    
    // Basis-Query
    let whereClause: any = {};
    
    // Jahr-Filter hinzufügen
    if (jahr) {
      whereClause.jahr = parseInt(jahr);
    }
    
    // Normale Benutzer sehen nur ihre eigenen Aufenthalte
    if (user.role !== 'ADMIN') {
      whereClause.userId = user.id;
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

export const POST: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    const { request } = context;
    const body = await request.json();
    
    // Normale Benutzer können nur Aufenthalte für sich selbst erstellen
    if (user.role !== 'ADMIN') {
      body.userId = user.id;
    }
    
    const aufenthalt = await prisma.aufenthalt.create({
      data: {
        userId: body.userId,
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
