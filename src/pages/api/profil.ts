import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';

const prisma = new PrismaClient();

export const PUT: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);

    const data = await context.request.json();
    const { email, username } = data;

    // Validierung E-Mail
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-Mail ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Ungültiges E-Mail-Format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Username-Format prüfen (falls angegeben)
    const trimmedUsername = username?.trim() || null;
    if (trimmedUsername) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(trimmedUsername)) {
        return new Response(
          JSON.stringify({ error: 'Benutzername: 3-20 Zeichen, nur Buchstaben, Zahlen, _ und -' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prüfen ob E-Mail bereits vergeben (von anderem User)
    if (email !== user.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: user.id }
        }
      });

      if (existingEmail) {
        return new Response(
          JSON.stringify({ error: 'Diese E-Mail-Adresse wird bereits verwendet' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prüfen ob Username bereits vergeben (von anderem User)
    if (trimmedUsername && trimmedUsername !== user.username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username: trimmedUsername,
          id: { not: user.id }
        }
      });

      if (existingUsername) {
        return new Response(
          JSON.stringify({ error: 'Dieser Benutzername wird bereits verwendet' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // User aktualisieren
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        username: trimmedUsername,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        beguenstigt: true,
        profileImage: true,
      }
    });

    // Session-Cookie aktualisieren
    const sessionCookie = context.cookies.get('session');
    if (sessionCookie) {
      const sessionData = JSON.parse(sessionCookie.value);
      sessionData.email = updatedUser.email;

      context.cookies.set('session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 Tage
      });
    }

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);

    if (error instanceof Error && error.name === 'AuthenticationError') {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
