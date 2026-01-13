import type { APIContext } from 'astro';
import { getSession } from './session';

const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Validate CSRF token from request header against session
 * Returns the session data if valid, throws error if invalid
 */
export async function validateCsrf(context: APIContext): Promise<void> {
  const session = await getSession(context.cookies);

  if (!session) {
    throw new CsrfError('Nicht authentifiziert');
  }

  const csrfToken = context.request.headers.get(CSRF_HEADER);

  if (!csrfToken) {
    throw new CsrfError('CSRF-Token fehlt');
  }

  if (csrfToken !== session.csrfToken) {
    throw new CsrfError('Ungültiger CSRF-Token');
  }
}

/**
 * Get CSRF token from session (for exposing to frontend)
 */
export async function getCsrfToken(context: APIContext): Promise<string | null> {
  const session = await getSession(context.cookies);
  return session?.csrfToken ?? null;
}

/**
 * Custom error class for CSRF validation failures
 */
export class CsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsrfError';
  }
}

/**
 * Helper to create a 403 response for CSRF errors
 */
export function csrfErrorResponse(error: CsrfError): Response {
  return new Response(
    JSON.stringify({ error: error.message }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
