import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';

const prisma = new PrismaClient();

// Einzelnen Zähler abrufen
export const GET: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    
    const zaehlerId = parseInt(context.params.id!);
    
    const zaehler = await prisma.zaehler.findUnique({
      where: { id: zaehlerId },
      include: {
        tankfuellungen: {
          orderBy: {
            datum: 'desc',
          },
        },
        aufenthalte: {
          orderBy: {
            ankunft: 'desc',
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!zaehler) {
      return new Response(JSON.stringify({ error: 'Zähler nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify(zaehler), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Zählers:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler beim Laden der Daten',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Zähler bearbeiten
export const PUT: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);
    const { request } = context;

    const zaehlerId = parseInt(context.params.id!);
    const body = await request.json();

    // Prüfen ob Zähler existiert
    const existierenderZaehler = await prisma.zaehler.findUnique({
      where: { id: zaehlerId },
    });

    if (!existierenderZaehler) {
      return new Response(JSON.stringify({ error: 'Zähler nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Zähler aktualisieren
    const aktualisierterZaehler = await prisma.zaehler.update({
      where: { id: zaehlerId },
      data: {
        einbauDatum: body.einbauDatum ? new Date(body.einbauDatum + 'T12:00:00Z') : undefined,
        ausbauDatum: body.ausbauDatum ? new Date(body.ausbauDatum + 'T12:00:00Z') : undefined,
        letzterStand: body.letzterStand !== undefined ? parseFloat(body.letzterStand) : undefined,
        istAktiv: body.istAktiv !== undefined ? body.istAktiv : undefined,
        notizen: body.notizen || null,
      },
    });

    return new Response(JSON.stringify(aktualisierterZaehler), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Zählers:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Aktualisieren des Zählers' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

// Zähler löschen
export const DELETE: APIRoute = async (context) => {
  try {
    // Admin-Berechtigung prüfen
    await requireAdmin(context);

    const zaehlerId = parseInt(context.params.id!);

    // Prüfen ob Zähler existiert
    const existierenderZaehler = await prisma.zaehler.findUnique({
      where: { id: zaehlerId },
      include: {
        _count: {
          select: {
            tankfuellungen: true,
            aufenthalte: true,
          },
        },
      },
    });

    if (!existierenderZaehler) {
      return new Response(JSON.stringify({ error: 'Zähler nicht gefunden' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Prüfen ob Zähler noch verwendet wird
    if (existierenderZaehler._count.tankfuellungen > 0 || existierenderZaehler._count.aufenthalte > 0) {
      return new Response(JSON.stringify({ 
        error: 'Zähler kann nicht gelöscht werden, da er noch Tankfüllungen oder Aufenthalte zugeordnet hat.' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Zähler löschen
    await prisma.zaehler.delete({
      where: { id: zaehlerId },
    });

    return new Response(JSON.stringify({ message: 'Zähler erfolgreich gelöscht' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Zählers:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Löschen des Zählers' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
