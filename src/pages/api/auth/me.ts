import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getSession } from '../../../utils/session';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const session = await getSession(cookies);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Nicht eingeloggt' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // User aus Datenbank holen für aktuelle Daten (inkl. profileImage)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        beguenstigt: true,
        isKind: true,
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

    return new Response(JSON.stringify({
      ...user,
      // Include CSRF token for frontend forms
      csrfToken: session.csrfToken,
    }), {
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
