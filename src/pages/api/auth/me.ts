import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');

    if (!sessionCookie || !sessionCookie.value) {
      return new Response(JSON.stringify({ error: 'Nicht eingeloggt' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const sessionData = JSON.parse(sessionCookie.value);

    if (!sessionData.loggedIn) {
      return new Response(JSON.stringify({ error: 'Session abgelaufen' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // User aus Datenbank holen für aktuelle Daten (inkl. profileImage)
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        beguenstigt: true,
        profileImage: true,
        notifyOnComments: true,
        notifyOnTermine: true,
      }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer-Informationen:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
