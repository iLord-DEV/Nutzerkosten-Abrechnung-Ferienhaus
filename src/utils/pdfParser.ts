export interface ParsedDocument {
  text: string;
  pageCount: number;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * Lädt pdf-parse dynamisch (CommonJS-Modul in ESM-Umgebung)
 */
async function getPdfParser() {
  const pdfParse = await import('pdf-parse');
  return pdfParse.default;
}

/**
 * Extrahiert Text aus einem PDF-Buffer
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const pdf = await getPdfParser();
    const data = await pdf(buffer);

    return {
      text: data.text.trim(),
      pageCount: data.numpages,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
      },
    };
  } catch (error) {
    console.error('PDF-Parsing Fehler:', error);
    throw new Error('PDF konnte nicht gelesen werden');
  }
}

/**
 * Extrahiert Text aus Markdown (gibt es unverändert zurück)
 */
export function parseMarkdown(content: string): ParsedDocument {
  return {
    text: content.trim(),
    pageCount: 1,
  };
}

/**
 * Erkennt den Dateityp und extrahiert den Text
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  const extension = filename.toLowerCase().split('.').pop();

  switch (extension) {
    case 'pdf':
      return parsePdf(buffer);
    case 'md':
    case 'markdown':
    case 'txt':
      return parseMarkdown(buffer.toString('utf-8'));
    default:
      throw new Error(`Dateityp .${extension} wird nicht unterstützt`);
  }
}

/**
 * Kürzt Text auf maximale Länge (für sehr große Dokumente)
 */
export function truncateText(text: string, maxLength: number = 100000): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '\n\n[... Text wurde gekürzt ...]';
}
