import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';

const prisma = new PrismaClient();

// GET: Einzelnen Eintrag abrufen
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const entry = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Eintrag nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof Error && error.message === 'Keine Berechtigung') {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Fehler beim Laden des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Eintrag aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { category, title, content, keywords, isActive, sortOrder } = body;

    const entry = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(category !== undefined && { category: category.trim() }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(keywords !== undefined && { keywords: keywords?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof Error && error.message === 'Keine Berechtigung') {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Fehler beim Aktualisieren des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Eintrag löschen
export const DELETE: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prisma.knowledgeBase.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof Error && error.message === 'Keine Berechtigung') {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Fehler beim Löschen des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
