import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../../utils/auth';
import { validateCsrf, CsrfError, csrfErrorResponse } from '../../../../../utils/csrf';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// In Production: dist/client, in Development: public
const IS_PROD = import.meta.env.PROD;
const UPLOAD_DIR = IS_PROD ? 'dist/client/uploads/knowledge' : 'public/uploads/knowledge';
const PUBLIC_PATH = '/uploads/knowledge';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// GET: Alle Bilder eines Eintrags
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

    const images = await prisma.knowledgeBaseImage.findMany({
      where: { knowledgeBaseId: id },
      orderBy: { sortOrder: 'asc' },
    });

    return new Response(JSON.stringify(images), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Laden der Bilder:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Bild(er) hochladen
export const POST: APIRoute = async (context) => {
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

    // Prüfen ob Wissenseintrag existiert
    const entry = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Eintrag nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // FormData parsen
    const formData = await context.request.formData();
    const files = formData.getAll('images') as File[];
    const alt = formData.get('alt') as string | null;
    const caption = formData.get('caption') as string | null;

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'Keine Bilder hochgeladen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload-Verzeichnis erstellen falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Maximale sortOrder ermitteln
    let maxSortOrder = entry.images.length > 0
      ? Math.max(...entry.images.map(img => img.sortOrder))
      : -1;

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Dateityp prüfen
      if (!ALLOWED_TYPES.includes(file.type)) {
        continue; // Ungültige Dateien überspringen
      }

      // Dateigröße prüfen
      if (file.size > MAX_FILE_SIZE) {
        continue; // Zu große Dateien überspringen
      }

      // Eindeutigen Dateinamen generieren
      const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
      const filename = `kb-${id}-${Date.now()}-${i}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // Datei speichern
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      // Datenbank-Eintrag erstellen
      maxSortOrder++;
      const image = await prisma.knowledgeBaseImage.create({
        data: {
          knowledgeBaseId: id,
          fileName: filename,
          originalName: file.name,
          alt: alt || null,
          caption: caption || null,
          sortOrder: maxSortOrder,
        },
      });

      uploadedImages.push({
        ...image,
        url: `${PUBLIC_PATH}/${filename}`,
      });
    }

    if (uploadedImages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Keine gültigen Bilder hochgeladen. Erlaubt: JPEG, PNG, GIF, WebP (max. 5MB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(uploadedImages), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof CsrfError) {
      return csrfErrorResponse(error);
    }
    console.error('Fehler beim Hochladen:', error);
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

    const knowledgeBaseId = parseInt(context.params.id || '');
    const url = new URL(context.request.url);
    const imageId = parseInt(url.searchParams.get('imageId') || '');

    if (isNaN(knowledgeBaseId) || isNaN(imageId)) {
      return new Response(JSON.stringify({ error: 'Ungültige IDs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bild finden
    const image = await prisma.knowledgeBaseImage.findFirst({
      where: {
        id: imageId,
        knowledgeBaseId: knowledgeBaseId,
      },
    });

    if (!image) {
      return new Response(JSON.stringify({ error: 'Bild nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Datei löschen
    const filepath = path.join(UPLOAD_DIR, image.fileName);
    if (existsSync(filepath)) {
      try {
        await unlink(filepath);
      } catch {
        // Ignorieren wenn Datei nicht gelöscht werden kann
      }
    }

    // Datenbank-Eintrag löschen
    await prisma.knowledgeBaseImage.delete({
      where: { id: imageId },
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

// PATCH: Bild-Reihenfolge oder Metadaten aktualisieren
export const PATCH: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const knowledgeBaseId = parseInt(context.params.id || '');
    if (isNaN(knowledgeBaseId)) {
      return new Response(JSON.stringify({ error: 'Ungültige ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();

    // Einzelnes Bild aktualisieren
    if (body.imageId) {
      const image = await prisma.knowledgeBaseImage.update({
        where: { id: body.imageId },
        data: {
          ...(body.alt !== undefined && { alt: body.alt }),
          ...(body.caption !== undefined && { caption: body.caption }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        },
      });

      return new Response(JSON.stringify(image), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Reihenfolge mehrerer Bilder aktualisieren
    if (body.order && Array.isArray(body.order)) {
      const updates = body.order.map((imageId: number, index: number) =>
        prisma.knowledgeBaseImage.update({
          where: { id: imageId },
          data: { sortOrder: index },
        })
      );

      await Promise.all(updates);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ungültige Anfrage' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
