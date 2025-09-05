import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async (context) => {
  try {
    // Authentifizierung prüfen
    const user = await requireAuth(context);
    
    // Verfügbare Jahre aus Aufenthalten des angemeldeten Benutzers laden
    const years = await prisma.aufenthalt.findMany({
      where: {
        userId: user.id, // Nur Aufenthalte des angemeldeten Benutzers
      },
      select: {
        jahr: true,
      },
      distinct: ['jahr'],
      orderBy: {
        jahr: 'desc', // Neueste Jahre zuerst
      },
    });

    // Nur Jahre zurückgeben, die tatsächlich Aufenthalte haben
    const availableYears = years.map(year => year.jahr);

    return new Response(JSON.stringify(availableYears), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden der verfügbaren Jahre:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Daten' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
