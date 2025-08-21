import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
