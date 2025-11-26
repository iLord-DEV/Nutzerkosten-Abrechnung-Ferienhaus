import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Token-Gültigkeit: 15 Minuten
const TOKEN_EXPIRY_MINUTES = 15;

// Rate-Limiting: Max 3 Anfragen pro Stunde
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;

/**
 * Generiert einen kryptographisch sicheren Magic-Link-Token
 *
 * @param userId - ID des Users
 * @returns Token-String und Ablaufzeit
 * @throws Error wenn Rate-Limit überschritten
 */
export async function generateMagicLinkToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
  // ZUERST: Alte/abgelaufene Tokens aufräumen (wichtig für korrektes Rate-Limiting!)
  await prisma.magicLinkToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } }, // Abgelaufen
        { used: true }                      // Bereits verwendet
      ]
    }
  });

  // Rate-Limiting prüfen (zählt nur aktive, nicht-verwendete Tokens)
  const rateLimitStart = new Date();
  rateLimitStart.setHours(rateLimitStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  const recentTokens = await prisma.magicLinkToken.count({
    where: {
      userId,
      createdAt: { gte: rateLimitStart },
      used: false,
      expiresAt: { gte: new Date() } // Nur nicht-abgelaufene
    }
  });

  if (recentTokens >= RATE_LIMIT_COUNT) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // Kryptographisch sicheren Token generieren (64 Zeichen Hex = 256 Bit)
  const token = crypto.randomBytes(32).toString('hex');

  // Ablaufzeit berechnen
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  // In Datenbank speichern
  await prisma.magicLinkToken.create({
    data: {
      userId,
      token,
      expiresAt,
      used: false
    }
  });

  return { token, expiresAt };
}

/**
 * Verifiziert einen Magic-Link-Token
 *
 * @param token - Token-String aus URL
 * @returns User-ID wenn Token gültig, sonst null
 */
export async function verifyMagicLinkToken(token: string): Promise<number | null> {
  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { token },
    include: { user: true }
  });

  // Token existiert nicht
  if (!magicLink) {
    return null;
  }

  // Token bereits verwendet
  if (magicLink.used) {
    return null;
  }

  // Token abgelaufen
  if (magicLink.expiresAt < new Date()) {
    return null;
  }

  // Token als verwendet markieren (One-Time-Use)
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { used: true }
  });

  return magicLink.userId;
}
