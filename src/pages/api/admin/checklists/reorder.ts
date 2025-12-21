import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';

const prisma = new PrismaClient();

// POST: Reihenfolge von Checklisten oder Items aktualisieren
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const body = await context.request.json();
    const { type, items } = body;

    if (!type || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'type und items erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'checklists') {
      // Checklisten-Reihenfolge aktualisieren
      await prisma.$transaction(
        items.map((item: { id: number; sortOrder: number }) =>
          prisma.checklist.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );
    } else if (type === 'items') {
      // Item-Reihenfolge aktualisieren
      await prisma.$transaction(
        items.map((item: { id: number; sortOrder: number }) =>
          prisma.checklistItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );
    } else {
      return new Response(JSON.stringify({ error: 'Ungültiger type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Reorder:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
