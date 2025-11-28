import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../../../utils/auth';
import { parseDocument, truncateText } from '../../../../utils/pdfParser';

const prisma = new PrismaClient();

// POST: Datei hochladen und Text extrahieren
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);

    const formData = await context.request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const title = formData.get('title') as string | null;
    const saveDirectly = formData.get('saveDirectly') === 'true';

    if (!file) {
      return new Response(JSON.stringify({ error: 'Keine Datei hochgeladen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Unterstützte Dateitypen prüfen
    const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
    const allowedExtensions = ['pdf', 'md', 'markdown', 'txt'];
    const extension = file.name.toLowerCase().split('.').pop() || '';

    if (!allowedExtensions.includes(extension)) {
      return new Response(
        JSON.stringify({
          error: `Dateityp .${extension} wird nicht unterstützt. Erlaubt: PDF, MD, TXT`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Datei in Buffer konvertieren
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Text extrahieren
    const parsed = await parseDocument(buffer, file.name);
    const extractedText = truncateText(parsed.text);

    // Wenn direkt speichern gewünscht
    if (saveDirectly && category && title) {
      const entry = await prisma.knowledgeBase.create({
        data: {
          category: category.trim(),
          title: title.trim(),
          content: extractedText,
          sourceType: 'upload',
          fileName: file.name,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          entry,
          preview: extractedText.substring(0, 500),
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Nur Vorschau zurückgeben
    return new Response(
      JSON.stringify({
        success: true,
        fileName: file.name,
        pageCount: parsed.pageCount,
        info: parsed.info,
        textLength: extractedText.length,
        preview: extractedText.substring(0, 2000),
        fullText: extractedText,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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

    console.error('Fehler beim Verarbeiten der Datei:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Fehler beim Verarbeiten der Datei',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
