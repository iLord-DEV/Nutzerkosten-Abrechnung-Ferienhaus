import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../utils/auth';

const prisma = new PrismaClient();

// GET /api/terminplanung/[id] - Einzelne Terminplanung abrufen
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const id = parseInt(context.params.id!);
    
    const terminplanung = await prisma.terminPlanung.findUnique({
      where: { id },
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
            }
          },
          orderBy: {
            createdAt: 'asc'
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


    return new Response(JSON.stringify(terminplanung), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Terminplanung:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der Terminplanung' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// PUT /api/terminplanung/[id] - Terminplanung aktualisieren (Datum ändern)
export const PUT: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const id = parseInt(context.params.id!);
    const body = await context.request.json();
    
    const { titel, startDatum, endDatum, beschreibung, grund } = body;
    
    // Prüfen ob die Terminplanung existiert
    const existingTermin = await prisma.terminPlanung.findUnique({
      where: { id },
      include: {
        abstimmungen: true
      }
    });

    if (!existingTermin) {
      return new Response(JSON.stringify({ error: 'Terminplanung nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Nur der Ersteller oder Admin kann Änderungen vornehmen
    if (existingTermin.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
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

    // Prüfen ob sich die Daten geändert haben
    const datumGeaendert = 
      existingTermin.startDatum.getTime() !== start.getTime() ||
      existingTermin.endDatum.getTime() !== end.getTime();

    // Transaktion für Update und Änderungshistorie
    const result = await prisma.$transaction(async (tx) => {
      // Terminplanung aktualisieren
      const updatedTermin = await tx.terminPlanung.update({
        where: { id },
        data: {
          titel: titel || existingTermin.titel,
          startDatum: start,
          endDatum: end,
          beschreibung: beschreibung !== undefined ? beschreibung : existingTermin.beschreibung,
          version: existingTermin.version + 1,
          status: datumGeaendert ? 'PENDING' : existingTermin.status // Bei Datumsänderung zurück zu PENDING
        }
      });

      // Änderungshistorie speichern (nur bei Datumsänderung)
      if (datumGeaendert) {
        await tx.terminAenderung.create({
          data: {
            terminPlanungId: id,
            userId: user.id,
            alteStartDatum: existingTermin.startDatum,
            alteEndDatum: existingTermin.endDatum,
            neueStartDatum: start,
            neueEndDatum: end,
            grund: grund || null,
            version: existingTermin.version + 1
          }
        });

        // Alle bestehenden Abstimmungen löschen
        await tx.terminAbstimmung.deleteMany({
          where: { terminPlanungId: id }
        });
      }

      return updatedTermin;
    });

    // TODO: In Production: Benachrichtigungen an alle User senden
    if (process.env.NODE_ENV === 'production' && datumGeaendert) {
      // await sendNotifications(result, 'DATUM_CHANGED');
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Terminplanung:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Aktualisieren der Terminplanung' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// DELETE /api/terminplanung/[id] - Terminplanung stornieren
export const DELETE: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    const id = parseInt(context.params.id!);
    
    const existingTermin = await prisma.terminPlanung.findUnique({
      where: { id }
    });

    if (!existingTermin) {
      return new Response(JSON.stringify({ error: 'Terminplanung nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Nur der Ersteller oder Admin kann stornieren
    if (existingTermin.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Keine Berechtigung' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const updatedTermin = await prisma.terminPlanung.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    return new Response(JSON.stringify(updatedTermin), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Fehler beim Stornieren der Terminplanung:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Stornieren der Terminplanung' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
