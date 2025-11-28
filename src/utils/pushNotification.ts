import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// VAPID konfigurieren
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@wuestenstein.de';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Sendet Push-Benachrichtigung an einen einzelnen User
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('⚠️ VAPID Keys nicht konfiguriert - Push übersprungen');
    return 0;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  });

  let successCount = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        JSON.stringify({
          ...payload,
          icon: payload.icon || '/pwa-192x192.png',
          badge: payload.badge || '/pwa-192x192.png'
        })
      );
      successCount++;
    } catch (error: any) {
      // Subscription ungültig - entfernen
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id }
        });
        console.log(`🗑️ Ungültige Push-Subscription entfernt: ${sub.id}`);
      } else {
        console.error(`❌ Push-Fehler für Subscription ${sub.id}:`, error.message);
      }
    }
  }

  return successCount;
}

/**
 * Sendet Push-Benachrichtigung an mehrere User
 */
export async function sendPushToUsers(userIds: number[], payload: PushPayload): Promise<number> {
  let totalSuccess = 0;

  for (const userId of userIds) {
    totalSuccess += await sendPushToUser(userId, payload);
  }

  if (totalSuccess > 0) {
    console.log(`📱 Push-Benachrichtigungen gesendet: ${totalSuccess}`);
  }

  return totalSuccess;
}

/**
 * Sendet Push-Benachrichtigung an alle User mit aktivierten Kommentar-Notifications
 * (außer dem Autor)
 * Kind-User werden nur benachrichtigt wenn sie Ersteller der Terminplanung sind
 */
export async function sendPushForNewComment(
  authorId: number,
  terminTitel: string,
  terminId: number,
  kommentarInhalt: string
): Promise<void> {
  // Terminplanung laden um den Ersteller zu ermitteln
  const terminplanung = await prisma.terminPlanung.findUnique({
    where: { id: terminId },
    select: { userId: true }
  });

  // Kind-User ausschließen, AUSSER sie sind Ersteller der Terminplanung
  const usersToNotify = await prisma.user.findMany({
    where: {
      notifyOnComments: true,
      id: { not: authorId },
      OR: [
        { isKind: false },
        { id: terminplanung?.userId } // Kind-User bekommt Push wenn es ihre Terminplanung ist
      ]
    },
    select: { id: true }
  });

  if (usersToNotify.length === 0) return;

  await sendPushToUsers(
    usersToNotify.map(u => u.id),
    {
      title: '💬 Neuer Kommentar',
      body: `Neuer Kommentar zu "${terminTitel}"`,
      url: `/terminplanung/${terminId}`,
      tag: `comment-${terminId}`
    }
  );
}

/**
 * Sendet Push-Benachrichtigung an alle User mit aktivierten Termin-Notifications
 * (außer dem Ersteller und Kind-User)
 */
export async function sendPushForNewTermin(
  authorId: number,
  terminTitel: string,
  terminId: number
): Promise<void> {
  const usersToNotify = await prisma.user.findMany({
    where: {
      notifyOnTermine: true,
      id: { not: authorId },
      isKind: false
    },
    select: { id: true }
  });

  if (usersToNotify.length === 0) return;

  await sendPushToUsers(
    usersToNotify.map(u => u.id),
    {
      title: '📅 Neuer Termin',
      body: terminTitel,
      url: `/terminplanung/${terminId}`,
      tag: `termin-${terminId}`
    }
  );
}
