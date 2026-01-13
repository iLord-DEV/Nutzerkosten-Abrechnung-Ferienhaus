import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../utils/csrf';

const prisma = new PrismaClient();

/**
 * POST /api/push/subscribe
 * Registriert eine Push-Subscription für den aktuellen User
 */
export const POST: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    const user = await requireAuth(context);
    const body = await context.request.json();

    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Subscription-Daten' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upsert: Update wenn vorhanden, sonst Create
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint: endpoint.substring(0, 500) // Max 500 Zeichen
        }
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth
      },
      create: {
        userId: user.id,
        endpoint: endpoint.substring(0, 500),
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });

    console.log(`📱 Push-Subscription registriert für User ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, id: subscription.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fehler beim Registrieren der Push-Subscription:', error);

    if (error instanceof Error && error.name === 'AuthenticationError') {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE /api/push/subscribe
 * Entfernt eine Push-Subscription
 */
export const DELETE: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    const user = await requireAuth(context);
    const body = await context.request.json();

    const { endpoint } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: endpoint.substring(0, 500)
      }
    });

    console.log(`📱 Push-Subscription entfernt für User ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fehler beim Entfernen der Push-Subscription:', error);

    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }

    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
