import type { APIRoute } from 'astro';

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

    return new Response(JSON.stringify({
      id: sessionData.userId,
      name: sessionData.name,
      email: sessionData.email,
      role: sessionData.role,
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
