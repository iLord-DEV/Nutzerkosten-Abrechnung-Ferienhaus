import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';
import { sendNewTerminEmail } from '../../utils/email';
import { sendPushForNewTermin } from '../../utils/pushNotification';

const prisma = new PrismaClient();

// GET /api/terminplanung - Alle Terminplanungen abrufen
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    
    const terminplanungen = await prisma.terminPlanung.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        abstimmungen: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        kommentare: {
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
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          where: {
            parentId: null // Nur Top-Level-Kommentare
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        aenderungen: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return new Response(JSON.stringify(terminplanungen), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Terminplanungen:', error);
    
    // Prüfen ob es ein Authentifizierungsfehler ist
    if (error.name === 'AuthenticationError' || error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der Terminplanungen' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// POST /api/terminplanung - Neue Terminplanung erstellen
export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const body = await context.request.json();
    
    const { titel, startDatum, endDatum, beschreibung } = body;
    
    if (!titel || !startDatum || !endDatum) {
      return new Response(JSON.stringify({ error: 'Titel, Start- und Enddatum sind erforderlich' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validierung: Startdatum muss vor Enddatum liegen
    const start = new Date(startDatum);
    const end = new Date(endDatum);
    
    if (start >= end) {
      return new Response(JSON.stringify({ error: 'Startdatum muss vor dem Enddatum liegen' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const terminplanung = await prisma.terminPlanung.create({
      data: {
        userId: user.id,
        titel,
        startDatum: start,
        endDatum: end,
        beschreibung: beschreibung || null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        abstimmungen: true,
        kommentare: true,
        aenderungen: true
      }
    });

    // Email-Benachrichtigungen versenden (async, nicht blockierend)
    sendTerminNotifications(
      user.id,
      user.name,
      terminplanung.titel,
      terminplanung.id,
      start,
      end,
      beschreibung
    ).catch(err => console.error('Fehler beim Versenden der Termin-Benachrichtigungen:', err));

    // Push-Benachrichtigungen versenden (async, nicht blockierend)
    sendPushForNewTermin(
      user.id,
      terminplanung.titel,
      terminplanung.id
    ).catch(err => console.error('Fehler beim Versenden der Push-Benachrichtigungen:', err));

    return new Response(JSON.stringify(terminplanung), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Terminplanung:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Erstellen der Terminplanung' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * Sendet Email-Benachrichtigungen an alle User die notifyOnTermine aktiviert haben
 * (außer dem Ersteller des Termins)
 */
async function sendTerminNotifications(
  authorId: number,
  authorName: string,
  terminTitel: string,
  terminId: number,
  startDatum: Date,
  endDatum: Date,
  beschreibung?: string
): Promise<void> {
  // Alle User holen die Benachrichtigungen aktiviert haben (außer dem Autor)
  const usersToNotify = await prisma.user.findMany({
    where: {
      notifyOnTermine: true,
      id: { not: authorId }
    },
    select: {
      email: true,
      name: true
    }
  });

  // Emails parallel versenden
  await Promise.all(
    usersToNotify.map(user =>
      sendNewTerminEmail(
        user.email,
        user.name,
        authorName,
        terminTitel,
        terminId,
        startDatum,
        endDatum,
        beschreibung
      )
    )
  );

  if (usersToNotify.length > 0) {
    console.log(`📧 Termin-Benachrichtigungen an ${usersToNotify.length} User gesendet`);
  }
}
