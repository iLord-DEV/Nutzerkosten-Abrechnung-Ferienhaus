import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';

const prisma = new PrismaClient();

// GET: Liste aller eindeutigen Kategorien
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const categories = await prisma.knowledgeBase.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    const categoryList = categories.map((c) => c.category);

    return new Response(JSON.stringify(categoryList), {
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
    console.error('Fehler beim Laden der Kategorien:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
