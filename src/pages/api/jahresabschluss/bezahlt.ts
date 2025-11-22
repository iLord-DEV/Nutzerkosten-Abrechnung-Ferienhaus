import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

/**
 * GET /api/jahresabschluss/bezahlt?jahr=2024
 * Holt den Bezahlt-Status für alle User (Admin) oder nur eigenen Status (User)
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);

    const url = new URL(context.request.url);
    const jahr = url.searchParams.get('jahr');

    if (!jahr) {
      return new Response(JSON.stringify({ error: 'Jahr ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Admin: Alle User mit Aufenthalten
    // User: Nur eigenen Status
    const isAdmin = user.role === 'ADMIN';

    // Nur User laden, die in diesem Jahr Aufenthalte haben
    const userIdsWithAufenthalte = await prisma.aufenthalt.findMany({
      where: {
        jahr: parseInt(jahr),
        ...(isAdmin ? {} : { userId: user.id }), // User sieht nur eigene Aufenthalte
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    const userIds = userIdsWithAufenthalte.map(a => a.userId);

    if (userIds.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Diese User laden
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Bezahlt-Status für das Jahr laden
    const bezahltStatus = await prisma.userJahresabschluss.findMany({
      where: {
        jahr: parseInt(jahr),
        userId: { in: userIds }
      }
    });

    // Status-Map erstellen für schnellen Zugriff
    const statusMap = new Map(
      bezahltStatus.map(s => [s.userId, s.bezahlt])
    );

    // Ergebnis zusammenbauen
    const result = users.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      bezahlt: statusMap.get(user.id) ?? false
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Bezahlt-Status:', error);
    return new Response(JSON.stringify({
      error: 'Interner Server-Fehler',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/jahresabschluss/bezahlt
 * Setzt den Bezahlt-Status für einen User und ein Jahr
 * Body: { userId: number, jahr: number, bezahlt: boolean }
 */
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const body = await context.request.json();
    const { userId, jahr, bezahlt } = body;

    if (!userId || !jahr || typeof bezahlt !== 'boolean') {
      return new Response(JSON.stringify({
        error: 'userId, jahr und bezahlt sind erforderlich'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert: Update wenn vorhanden, sonst Create
    const result = await prisma.userJahresabschluss.upsert({
      where: {
        userId_jahr: {
          userId: parseInt(userId),
          jahr: parseInt(jahr)
        }
      },
      update: {
        bezahlt: bezahlt
      },
      create: {
        userId: parseInt(userId),
        jahr: parseInt(jahr),
        bezahlt: bezahlt
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Setzen des Bezahlt-Status:', error);
    return new Response(JSON.stringify({
      error: 'Interner Server-Fehler',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
