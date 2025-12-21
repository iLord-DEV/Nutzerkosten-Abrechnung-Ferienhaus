import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Upload-Verzeichnis
const IS_PROD = import.meta.env.PROD;
const UPLOAD_DIR = IS_PROD ? 'dist/client/uploads/knowledge' : 'public/uploads/knowledge';

// GET: Einzelnen Eintrag abrufen
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const entry = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Eintrag nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(entry), {
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
    console.error('Fehler beim Laden des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Eintrag aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { category, title, content, keywords, priority, isActive, sortOrder } = body;

    const entry = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(category !== undefined && { category: category.trim() }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(keywords !== undefined && { keywords: keywords?.trim() || null }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return new Response(JSON.stringify(entry), {
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
    console.error('Fehler beim Aktualisieren des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Eintrag löschen
export const DELETE: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Erst Bilder aus Dateisystem löschen
    const entry = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: { images: true },
    });

    if (entry?.images) {
      for (const image of entry.images) {
        const filepath = path.join(UPLOAD_DIR, image.fileName);
        if (existsSync(filepath)) {
          try {
            await unlink(filepath);
          } catch {
            // Ignorieren wenn Datei nicht gelöscht werden kann
          }
        }
      }
    }

    // Dann Datenbank-Eintrag löschen (Bilder werden durch Cascade gelöscht)
    await prisma.knowledgeBase.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
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
    console.error('Fehler beim Löschen des KB-Eintrags:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
