import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../utils/auth';

const prisma = new PrismaClient();

// POST /api/terminplanung/[id]/abstimmung - Abstimmung abgeben oder ändern
export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const terminplanungId = parseInt(context.params.id!);
    const body = await context.request.json();
    
    const { stimme, kommentar } = body;
    
    if (!stimme || !['APPROVE', 'NEED_INFO'].includes(stimme)) {
      return new Response(JSON.stringify({ error: 'Ungültige Abstimmung' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Prüfen ob die Terminplanung existiert
    const terminplanung = await prisma.terminPlanung.findUnique({
      where: { id: terminplanungId },
      include: {
        abstimmungen: true
      }
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

    // Prüfen ob bereits eine Abstimmung existiert
    const existingAbstimmung = await prisma.terminAbstimmung.findFirst({
      where: {
        terminPlanungId: terminplanungId,
        userId: user.id,
        version: terminplanung.version
      }
    });

    let abstimmung;
    
    if (existingAbstimmung) {
      // Bestehende Abstimmung aktualisieren
      abstimmung = await prisma.terminAbstimmung.update({
        where: { id: existingAbstimmung.id },
        data: {
          stimme,
          kommentar: kommentar || null,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } else {
      // Neue Abstimmung erstellen
      abstimmung = await prisma.terminAbstimmung.create({
        data: {
          terminPlanungId: terminplanungId,
          userId: user.id,
          stimme,
          kommentar: kommentar || null,
          version: terminplanung.version
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    // Status der Terminplanung automatisch aktualisieren
    try {
      await updateTerminplanungStatus(terminplanungId);
    } catch (statusError) {
      console.error('Fehler beim Aktualisieren des Status:', statusError);
      // Status-Update-Fehler ignorieren, Abstimmung war erfolgreich
    }

    return new Response(JSON.stringify(abstimmung), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Abgeben der Abstimmung:', error);
    
    // Prüfen ob es ein Authentifizierungsfehler ist
    if (error.name === 'AuthenticationError' || error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Fehler beim Abgeben der Abstimmung: ' + error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// DELETE /api/terminplanung/[id]/abstimmung - Zustimmung entziehen
export const DELETE: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const terminplanungId = parseInt(context.params.id!);

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

    // Bestehende Abstimmung finden und löschen
    const existingAbstimmung = await prisma.terminAbstimmung.findFirst({
      where: {
        terminPlanungId: terminplanungId,
        userId: user.id,
        version: terminplanung.version
      }
    });

    if (existingAbstimmung) {
      await prisma.terminAbstimmung.delete({
        where: { id: existingAbstimmung.id }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Entziehen der Zustimmung:', error);
    
    if (error.name === 'AuthenticationError' || error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Fehler beim Entziehen der Zustimmung: ' + error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// Hilfsfunktion: Status der Terminplanung basierend auf Abstimmungen aktualisieren
async function updateTerminplanungStatus(terminplanungId: number) {
  try {
    const terminplanung = await prisma.terminPlanung.findUnique({
      where: { id: terminplanungId },
      include: {
        abstimmungen: {
          where: {
            version: terminplanung.version
          }
        }
      }
    });

    if (!terminplanung) return;

    // Alle User abrufen (außer dem Ersteller)
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: terminplanung.userId }
      }
    });

    const currentVersionAbstimmungen = terminplanung.abstimmungen;

    let newStatus = terminplanung.status;

    if (currentVersionAbstimmungen.length === 0) {
      newStatus = 'PENDING';
    } else if (currentVersionAbstimmungen.length === allUsers.length) {
      // Alle User haben abgestimmt
      const alleZugestimmt = currentVersionAbstimmungen.every(a => a.stimme === 'APPROVE');
      newStatus = alleZugestimmt ? 'APPROVED' : 'DISCUSSING';
    } else {
      // Nicht alle User haben abgestimmt
      const hatDiskussion = currentVersionAbstimmungen.some(a => a.stimme === 'NEED_INFO');
      newStatus = hatDiskussion ? 'DISCUSSING' : 'PENDING';
    }

    // Status nur aktualisieren wenn er sich geändert hat
    if (newStatus !== terminplanung.status) {
      await prisma.terminPlanung.update({
        where: { id: terminplanungId },
        data: { status: newStatus }
      });
    }
  } catch (error) {
    console.error('Fehler in updateTerminplanungStatus:', error);
    throw error;
  }
}