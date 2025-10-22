import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Passwort-basierte Authentifizierung
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        beguenstigt: true,
        password: true,
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Benutzer nicht gefunden' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Passwort validieren
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: 'Ungültiges Passwort' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Session-Cookie setzen
    const sessionData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      beguenstigt: user.beguenstigt,
      loggedIn: true,
    };

    cookies.set('session', JSON.stringify(sessionData), {
      path: '/',
      httpOnly: true, // Für Sicherheit
      secure: false, // Für lokale Entwicklung
      sameSite: 'lax', // Für lokale Entwicklung
      maxAge: 60 * 60 * 24, // 24 Stunden
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        beguenstigt: user.beguenstigt,
      },
      redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Login-Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
