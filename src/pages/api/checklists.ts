import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth, getUser } from '../../utils/auth';

const prisma = new PrismaClient();

// GET: Alle aktiven Checklisten mit User-Fortschritt
export const GET: APIRoute = async (context) => {
  try {
    const user = await getUser(context);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checklists = await prisma.checklist.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            progress: {
              where: { userId: user.id },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Fortschritt einbetten
    const checklistsWithProgress = checklists.map(checklist => ({
      ...checklist,
      items: checklist.items.map(item => ({
        id: item.id,
        text: item.text,
        sortOrder: item.sortOrder,
        isChecked: item.progress.length > 0 && item.progress[0].isChecked,
      })),
      completedCount: checklist.items.filter(item =>
        item.progress.length > 0 && item.progress[0].isChecked
      ).length,
      totalCount: checklist.items.length,
    }));

    return new Response(JSON.stringify(checklistsWithProgress), {
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
