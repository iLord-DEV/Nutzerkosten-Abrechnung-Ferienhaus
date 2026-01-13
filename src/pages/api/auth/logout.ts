import type { APIRoute } from 'astro';
import { deleteSession } from '../../../utils/session';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../utils/csrf';

export const POST: APIRoute = async (context) => {
  try {
    // CSRF-Token validieren
    await validateCsrf(context);

    // Session aus DB löschen und Cookie clearen
    await deleteSession(context.cookies);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Logout-Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
