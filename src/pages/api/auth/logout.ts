import type { APIRoute } from 'astro';
import { deleteSession } from '../../../utils/session';
import { validateCsrf, CsrfError } from '../../../utils/csrf';

export const POST: APIRoute = async (context) => {
  try {
    // CSRF-Token validieren — aber bei Fehlschlag trotzdem ausloggen
    try {
      await validateCsrf(context);
    } catch (error) {
      if (error instanceof CsrfError) {
        // Session expired or invalid — still proceed with logout
        console.warn('Logout ohne gültige CSRF-Session:', error.message);
      } else {
        throw error;
      }
    }

    // Session aus DB löschen und Cookie clearen (funktioniert auch ohne aktive Session)
    await deleteSession(context.cookies);

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
