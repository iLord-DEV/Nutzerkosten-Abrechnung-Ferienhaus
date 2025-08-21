import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Session-Cookie löschen
    cookies.delete('session', { path: '/' });

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
