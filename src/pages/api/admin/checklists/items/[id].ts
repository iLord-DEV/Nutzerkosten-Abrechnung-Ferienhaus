import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../../../utils/csrf';

const prisma = new PrismaClient();

// PUT: Item aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { text, sortOrder } = body;

    const item = await prisma.checklistItem.update({
      where: { id },
      data: {
        ...(text !== undefined && { text: text.trim() }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Item löschen
export const DELETE: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prisma.checklistItem.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
