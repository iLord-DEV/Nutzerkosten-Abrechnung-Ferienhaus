import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../../utils/csrf';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Upload-Verzeichnis
const IS_PROD = import.meta.env.PROD;
const UPLOAD_DIR = IS_PROD ? 'dist/client/uploads/library' : 'public/uploads/library';
const PUBLIC_PATH = '/uploads/library';

// GET: Einzelnes Bild
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const image = await prisma.imageLibrary.findUnique({
      where: { id },
    });

    if (!image) {
      return new Response(JSON.stringify({ error: 'Bild nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ...image,
        url: `${PUBLIC_PATH}/${image.fileName}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PUT: Bild-Metadaten aktualisieren
export const PUT: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const { title, description, tags } = body;

    const image = await prisma.imageLibrary.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(tags !== undefined && { tags: tags.trim() }),
      },
    });

    return new Response(
      JSON.stringify({
        ...image,
        url: `${PUBLIC_PATH}/${image.fileName}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Bild löschen
export const DELETE: APIRoute = async (context) => {
  try {
    await validateCsrf(context);
    await requireAdmin(context);

    const id = parseInt(context.params.id || '');
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bild finden
    const image = await prisma.imageLibrary.findUnique({
      where: { id },
    });

    if (!image) {
      return new Response(JSON.stringify({ error: 'Bild nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hauptdatei löschen
    const filePath = path.join(UPLOAD_DIR, image.fileName);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch {
        // Ignorieren wenn Datei nicht gelöscht werden kann
      }
    }

    // Thumbnail löschen (falls vorhanden)
    if (image.thumbnail) {
      const thumbnailPath = path.join(UPLOAD_DIR, image.thumbnail);
      if (existsSync(thumbnailPath)) {
        try {
          await unlink(thumbnailPath);
        } catch {
          // Ignorieren
        }
      }
    }

    // Datenbank-Eintrag löschen
    await prisma.imageLibrary.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Fehler beim Löschen:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
