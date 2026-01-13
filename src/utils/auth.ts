import type { APIContext } from 'astro';
import { getSession, type SessionUser, type SessionData } from './session';

// Re-export SessionUser as User for backwards compatibility
export type User = SessionUser;

// Extended user with session info (includes CSRF token)
export interface AuthenticatedUser extends SessionUser {
  sessionId: string;
  csrfToken: string;
}

/**
 * Get the current user from session
 * Returns null if not authenticated
 */
export async function getUser(context: APIContext): Promise<User | null> {
  try {
    const session = await getSession(context.cookies);

    if (!session) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer-Informationen:', error);
    return null;
  }
}

/**
 * Get full session data including CSRF token
 * For use in layouts that need to expose CSRF token to frontend
 */
export async function getSessionData(context: APIContext): Promise<SessionData | null> {
  try {
    return await getSession(context.cookies);
  } catch (error) {
    console.error('Fehler beim Abrufen der Session:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not logged in
 */
export async function requireAuth(context: APIContext): Promise<User> {
  const user = await getUser(context);
  if (!user) {
    const error = new Error('Nicht authentifiziert');
    error.name = 'AuthenticationError';
    throw error;
  }
  return user;
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin(context: APIContext): Promise<User> {
  const user = await requireAuth(context);
  if (user.role !== 'ADMIN') {
    throw new Error('Keine Berechtigung');
  }
  return user;
}
