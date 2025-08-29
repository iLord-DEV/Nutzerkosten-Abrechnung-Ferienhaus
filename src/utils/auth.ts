import type { APIContext } from 'astro';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export async function getUser(context: APIContext): Promise<User | null> {
  try {
    const sessionCookie = context.cookies.get('session');
    
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    if (!sessionData.loggedIn) {
      return null;
    }

    return {
      id: sessionData.userId,
      name: sessionData.name,
      email: sessionData.email,
      role: sessionData.role,
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer-Informationen:', error);
    return null;
  }
}

export async function requireAuth(context: APIContext): Promise<User> {
  const user = await getUser(context);
  if (!user) {
    throw new Error('Nicht authentifiziert');
  }
  return user;
}

export async function requireAdmin(context: APIContext): Promise<User> {
  const user = await requireAuth(context);
  if (user.role !== 'ADMIN') {
    throw new Error('Keine Berechtigung');
  }
  return user;
}
