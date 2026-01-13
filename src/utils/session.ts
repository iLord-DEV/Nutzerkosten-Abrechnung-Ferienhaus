import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import type { AstroCookies } from 'astro';

const prisma = new PrismaClient();

// Session configuration
const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_DAYS = 7;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  beguenstigt: boolean;
  isKind: boolean;
  profileImage: string | null;
}

export interface SessionData {
  id: string;
  userId: number;
  csrfToken: string;
  expiresAt: Date;
  user: SessionUser;
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a new session in the database
 */
export async function createSession(
  userId: number,
  cookies: AstroCookies
): Promise<SessionData> {
  const sessionId = generateToken(32);
  const csrfToken = generateToken(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  // Create session in database
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      csrfToken,
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          beguenstigt: true,
          isKind: true,
          profileImage: true,
        },
      },
    },
  });

  // Set session cookie (only contains session ID, not user data!)
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
  });

  return {
    id: session.id,
    userId: session.userId,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
    user: session.user as SessionUser,
  };
}

/**
 * Get and validate session from cookie
 * Returns null if session is invalid or expired
 */
export async function getSession(cookies: AstroCookies): Promise<SessionData | null> {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  // Look up session in database
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          beguenstigt: true,
          isKind: true,
          profileImage: true,
        },
      },
    },
  });

  if (!session) {
    // Session not found - clear invalid cookie
    clearSessionCookie(cookies);
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    clearSessionCookie(cookies);
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
    user: session.user as SessionUser,
  };
}

/**
 * Delete session from database and clear cookie
 */
export async function deleteSession(cookies: AstroCookies): Promise<void> {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // Delete from database (ignore errors if already deleted)
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  clearSessionCookie(cookies);
}

/**
 * Clear the session cookie
 */
function clearSessionCookie(cookies: AstroCookies): void {
  cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
  });
}

/**
 * Delete all sessions for a user (useful for logout everywhere)
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

/**
 * Update session (e.g., after profile changes)
 * Creates a new session with fresh CSRF token
 */
export async function refreshSession(
  cookies: AstroCookies,
  userId: number
): Promise<SessionData> {
  // Delete old session
  await deleteSession(cookies);
  // Create new session
  return createSession(userId, cookies);
}
