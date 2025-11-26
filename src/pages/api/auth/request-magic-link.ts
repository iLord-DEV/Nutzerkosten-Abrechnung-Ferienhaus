import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { generateMagicLinkToken } from '../../../utils/magicLink';
import { sendMagicLinkEmail } from '../../../utils/email';

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { identifier, isPWA } = body;

    if (!identifier || typeof identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email oder Benutzername erforderlich' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // User suchen (Email ODER Username)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.trim() },
          { username: identifier.trim() },
        ],
      },
    });

    // WICHTIG: Immer gleiche Antwort zurückgeben (Security: keine Email-Enumeration)
    const successResponse = {
      success: true,
      message: 'Falls ein Account existiert, wurde ein Magic-Link gesendet.',
    };

    // User existiert nicht
    if (!user) {
      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Token generieren (mit Rate-Limiting)
      const { token, expiresAt } = await generateMagicLinkToken(user.id);

      // Magic-Link URL erstellen
      const appUrl = process.env.APP_URL || 'http://localhost:4321';
      const magicLink = `${appUrl}/verify?token=${token}`;

      // Email senden (oder in Console loggen in Development)
      await sendMagicLinkEmail(user.email, user.name, magicLink, expiresAt, isPWA);

      // In Development: Magic-Link auch im Response zurückgeben
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const response = isDevelopment
        ? { ...successResponse, magicLink }
        : successResponse;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      // Rate-Limit überschritten
      if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
        console.warn(`Rate-Limit überschritten für User ${user.id}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.'
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Magic-Link-Fehler:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Server-Fehler' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
