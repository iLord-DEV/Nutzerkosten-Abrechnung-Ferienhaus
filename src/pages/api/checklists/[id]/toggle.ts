import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUser } from '../../../../utils/auth';

const prisma = new PrismaClient();

// PUT: Checkbox umschalten
export const PUT: APIRoute = async (context) => {
  try {
    const user = await getUser(context);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const itemId = parseInt(context.params.id || '');
    if (isNaN(itemId)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prüfen ob Item existiert
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return new Response(JSON.stringify({ error: 'Item nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Aktuellen Fortschritt holen
    const existingProgress = await prisma.userChecklistProgress.findUnique({
      where: {
        userId_checklistItemId: {
          userId: user.id,
          checklistItemId: itemId,
        },
      },
    });

    let progress;
    if (existingProgress) {
      // Toggle
      progress = await prisma.userChecklistProgress.update({
        where: { id: existingProgress.id },
        data: {
          isChecked: !existingProgress.isChecked,
          checkedAt: !existingProgress.isChecked ? new Date() : null,
        },
      });
    } else {
      // Erstellen und auf checked setzen
      progress = await prisma.userChecklistProgress.create({
        data: {
          userId: user.id,
          checklistItemId: itemId,
          isChecked: true,
          checkedAt: new Date(),
        },
      });
    }

    return new Response(JSON.stringify({
      isChecked: progress.isChecked,
    }), {
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
