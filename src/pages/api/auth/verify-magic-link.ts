import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { verifyMagicLinkToken } from '../../../utils/magicLink';

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token fehlt' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Token verifizieren
    const userId = await verifyMagicLinkToken(token);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger oder abgelaufener Link' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // User laden
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        beguenstigt: true,
      },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Benutzer nicht gefunden' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Session-Cookie setzen (gleiche Logik wie bei altem Password-Login)
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
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 31, // 31 Tage
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          beguenstigt: user.beguenstigt,
        },
        redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Verify-Fehler:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Server-Fehler' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
