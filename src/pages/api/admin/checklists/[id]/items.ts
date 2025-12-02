import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../../utils/auth';

const prisma = new PrismaClient();

// POST: Item zu Checkliste hinzufügen
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const checklistId = parseInt(context.params.id || '');
    if (isNaN(checklistId)) {
      return new Response(JSON.stringify({ error: 'Ungültige Checklisten-ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { text } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: 'Text erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfen ob Checkliste existiert
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
    });

    if (!checklist) {
      return new Response(JSON.stringify({ error: 'Checkliste nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Höchste sortOrder finden
    const maxSortOrder = await prisma.checklistItem.aggregate({
      where: { checklistId },
      _max: { sortOrder: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        checklistId,
        text: text.trim(),
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    return new Response(JSON.stringify(item), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
