import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../utils/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { generateVideoThumbnail } from '../../../utils/videoThumbnail';

const prisma = new PrismaClient();

// Upload-Verzeichnis
const IS_PROD = import.meta.env.PROD;
const UPLOAD_DIR = IS_PROD ? 'dist/client/uploads/library' : 'public/uploads/library';
const PUBLIC_PATH = '/uploads/library';

// Dateigrößen-Limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB für Bilder
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB für Videos

// Erlaubte Dateitypen
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// GET: Alle Bilder oder suchen
export const GET: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const url = new URL(context.request.url);
    const search = url.searchParams.get('search');

    let images;

    if (search) {
      // Volltextsuche über title, description, tags
      const searchTerms = search.toLowerCase().split(/\s+/);

      const allImages = await prisma.imageLibrary.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Filtern nach Suchbegriffen
      images = allImages.filter((img) => {
        const searchableText = `${img.title} ${img.description || ''} ${img.tags}`.toLowerCase();
        return searchTerms.some((term) => searchableText.includes(term));
      });
    } else {
      images = await prisma.imageLibrary.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    // URL und Thumbnail-URL hinzufügen
    const imagesWithUrl = images.map((img) => ({
      ...img,
      url: `${PUBLIC_PATH}/${img.fileName}`,
      thumbnailUrl: img.thumbnail ? `${PUBLIC_PATH}/${img.thumbnail}` : null,
    }));

    return new Response(JSON.stringify(imagesWithUrl), {
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

// POST: Bild oder Video hochladen
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const formData = await context.request.formData();
    const file = formData.get('image') as File | null;
    const title = formData.get('title') as string | null;
    const tags = formData.get('tags') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Keine Datei hochgeladen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: 'Titel erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tags?.trim()) {
      return new Response(JSON.stringify({ error: 'Tags erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Medientyp bestimmen
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

    // Dateityp prüfen
    if (!isVideo && !isImage) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger Dateityp. Erlaubt: JPEG, PNG, GIF, WebP, MP4, WebM, MOV' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dateigröße prüfen (unterschiedliche Limits für Bild/Video)
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeLabel = isVideo ? '50 MB' : '5 MB';
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `Datei zu groß. Maximum: ${maxSizeLabel}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload-Verzeichnis erstellen falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Eindeutigen Dateinamen generieren
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const timestamp = Date.now();
    const fileName = `lib-${timestamp}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Datei speichern
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Für Videos: Thumbnail generieren
    let thumbnailName: string | null = null;
    if (isVideo) {
      try {
        thumbnailName = `thumb-${timestamp}.jpg`;
        const thumbnailPath = path.join(UPLOAD_DIR, thumbnailName);
        await generateVideoThumbnail(filePath, thumbnailPath);
      } catch (thumbnailError) {
        console.warn('Thumbnail-Generierung fehlgeschlagen:', thumbnailError);
        // Fortfahren ohne Thumbnail
        thumbnailName = null;
      }
    }

    // Datenbank-Eintrag erstellen
    const media = await prisma.imageLibrary.create({
      data: {
        fileName,
        originalName: file.name,
        title: title.trim(),
        description: description?.trim() || null,
        tags: tags.trim(),
        mediaType: isVideo ? 'video' : 'image',
        mimeType: file.type,
        thumbnail: thumbnailName,
      },
    });

    return new Response(
      JSON.stringify({
        ...media,
        url: `${PUBLIC_PATH}/${fileName}`,
        thumbnailUrl: thumbnailName ? `${PUBLIC_PATH}/${thumbnailName}` : null,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ error: `Interner Serverfehler: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
