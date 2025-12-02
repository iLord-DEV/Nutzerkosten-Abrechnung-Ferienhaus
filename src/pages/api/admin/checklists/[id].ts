import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';

const prisma = new PrismaClient();

// GET: Einzelne Checkliste
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!checklist) {
      return new Response(JSON.stringify({ error: 'Checkliste nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(checklist), {
      status: 200,
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

// PUT: Checkliste aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { title, description, isActive, sortOrder } = body;

    const checklist = await prisma.checklist.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return new Response(JSON.stringify(checklist), {
      status: 200,
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

// DELETE: Checkliste löschen
export const DELETE: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prisma.checklist.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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
