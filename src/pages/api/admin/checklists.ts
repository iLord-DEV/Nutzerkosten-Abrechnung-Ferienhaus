import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

// GET: Alle Checklisten mit Items
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const checklists = await prisma.checklist.findMany({
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return new Response(JSON.stringify(checklists), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Checklisten:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Neue Checkliste erstellen
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const body = await context.request.json();
    const { title, description, isActive } = body;

    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: 'Titel erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Höchste sortOrder finden
    const maxSortOrder = await prisma.checklist.aggregate({
      _max: { sortOrder: true },
    });

    const checklist = await prisma.checklist.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
      include: {
        items: true,
      },
    });

    return new Response(JSON.stringify(checklist), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
