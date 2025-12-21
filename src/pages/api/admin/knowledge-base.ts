import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

// GET: Liste aller Knowledge Base Einträge
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const url = new URL(context.request.url);
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    const entries = await prisma.knowledgeBase.findMany({
      where: {
        ...(category && { category }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { title: 'asc' },
      ],
    });

    return new Response(JSON.stringify(entries), {
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
    console.error('Fehler beim Laden der Knowledge Base:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Neuen Eintrag erstellen
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const body = await context.request.json();
    const { category, title, content, keywords, priority, sourceType, sourceUrl, fileName } = body;

    if (!category || !title || !content) {
      return new Response(
        JSON.stringify({ error: 'Kategorie, Titel und Inhalt sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const entry = await prisma.knowledgeBase.create({
      data: {
        category: category.trim(),
        title: title.trim(),
        content: content.trim(),
        keywords: keywords?.trim() || null,
        priority: typeof priority === 'number' ? priority : 0,
        sourceType: sourceType || 'manual',
        sourceUrl: sourceUrl || null,
        fileName: fileName || null,
      },
    });

    return new Response(JSON.stringify(entry), {
      status: 201,
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
    console.error('Fehler beim Erstellen des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
