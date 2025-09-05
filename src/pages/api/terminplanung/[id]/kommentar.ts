import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../utils/auth';

const prisma = new PrismaClient();

// POST /api/terminplanung/[id]/kommentar - Kommentar hinzufügen
export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const terminplanungId = parseInt(context.params.id!);
    const body = await context.request.json();
    
    const { inhalt, parentId } = body;
    
    if (!inhalt || inhalt.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Kommentar darf nicht leer sein' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Prüfen ob die Terminplanung existiert
    const terminplanung = await prisma.terminPlanung.findUnique({
      where: { id: terminplanungId }
    });

    if (!terminplanung) {
      return new Response(JSON.stringify({ error: 'Terminplanung nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (terminplanung.status === 'CANCELLED') {
      return new Response(JSON.stringify({ error: 'Terminplanung wurde storniert' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Prüfen ob Parent-Kommentar existiert (falls es eine Antwort ist)
    if (parentId) {
      const parentKommentar = await prisma.terminKommentar.findFirst({
        where: {
          id: parseInt(parentId),
          terminPlanungId: terminplanungId
        }
      });
      
      if (!parentKommentar) {
        return new Response(JSON.stringify({ error: 'Parent-Kommentar nicht gefunden' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Kommentar erstellen
    const kommentar = await prisma.terminKommentar.create({
      data: {
        terminPlanungId: terminplanungId,
        userId: user.id,
        inhalt: inhalt.trim(),
        version: terminplanung.version,
        parentId: parentId ? parseInt(parentId) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Status auf DISCUSSING setzen wenn Kommentar hinzugefügt wird
    if (terminplanung.status !== 'DISCUSSING') {
      await prisma.terminPlanung.update({
        where: { id: terminplanungId },
        data: { status: 'DISCUSSING' }
      });
    }

    return new Response(JSON.stringify(kommentar), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Kommentars:', error);
    
    // Prüfen ob es ein Authentifizierungsfehler ist
    if (error.name === 'AuthenticationError' || error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen des Kommentars: ' + error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};