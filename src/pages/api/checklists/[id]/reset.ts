import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUser } from '../../../../utils/auth';

const prisma = new PrismaClient();

// POST: Checkliste zurücksetzen
export const POST: APIRoute = async (context) => {
  try {
    const user = await getUser(context);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checklistId = parseInt(context.params.id || '');
    if (isNaN(checklistId)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfen ob Checkliste existiert
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { items: true },
    });

    if (!checklist) {
      return new Response(JSON.stringify({ error: 'Checkliste nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Alle Progress-Einträge für diese Checkliste und diesen User löschen
    const itemIds = checklist.items.map(item => item.id);

    await prisma.userChecklistProgress.deleteMany({
      where: {
        userId: user.id,
        checklistItemId: { in: itemIds },
      },
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
