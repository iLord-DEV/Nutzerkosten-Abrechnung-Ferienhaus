import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID ist erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Tankfüllung löschen
    await prisma.tankfuellung.delete({
      where: {
        id: parseInt(id),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Tankfüllung:', error);
    return new Response(JSON.stringify({ error: 'Interner Server-Fehler' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
