import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Session-Cookie komplett löschen
    cookies.delete('session', { path: '/' });
    // Zusätzlich mit leerem Wert überschreiben
    cookies.set('session', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout-Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
