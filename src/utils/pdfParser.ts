import { PDFParse } from 'pdf-parse';

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
 * Extrahiert Text aus einem PDF-Buffer
 * Verwendet pdf-parse v2 API
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const parser = new PDFParse({ data: buffer });

    // Text extrahieren
    const textResult = await parser.getText();

    // Info extrahieren (falls verfügbar)
    let info: ParsedDocument['info'] = {};
    try {
      const infoResult = await parser.getInfo();
      info = {
        title: infoResult.info?.Title,
        author: infoResult.info?.Author,
        subject: infoResult.info?.Subject,
      };
    } catch {
      // Info ist optional, Fehler ignorieren
    }

    // Seitenanzahl aus dem Text extrahieren (Format: "-- X of Y --")
    const pageMatch = textResult.text.match(/-- \d+ of (\d+) --/);
    const pageCount = pageMatch ? parseInt(pageMatch[1], 10) : 1;

    return {
      text: textResult.text.trim(),
      pageCount,
      info,
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
