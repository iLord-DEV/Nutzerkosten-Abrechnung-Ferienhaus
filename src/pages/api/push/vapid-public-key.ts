import type { APIRoute } from 'astro';

/**
 * GET /api/push/vapid-public-key
 * Gibt den VAPID Public Key zurück für Client-seitige Push-Registrierung
 */
export const GET: APIRoute = async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response(
      JSON.stringify({ error: 'Push-Benachrichtigungen nicht konfiguriert' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ publicKey }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
