/**
 * Brave Search API Wrapper
 * https://brave.com/search/api/
 */

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

/**
 * Sucht im Web mit Brave Search API
 */
export async function webSearch(query: string, count: number = 5): Promise<SearchResponse> {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    throw new Error('BRAVE_API_KEY nicht konfiguriert');
  }

  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
    search_lang: 'de',
    country: 'DE',
  });

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave Search Fehler: ${response.status} - ${error}`);
  }

  const data = await response.json();

  const results: SearchResult[] = (data.web?.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    description: r.description || '',
  }));

  return {
    results,
    query,
  };
}

/**
 * Ruft eine Webseite ab und extrahiert den Text
 */
export async function fetchWebPage(url: string): Promise<{ url: string; title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WuestensteinBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Nur HTML verarbeiten
    if (!contentType.includes('text/html')) {
      return {
        url,
        title: 'Nicht-HTML Inhalt',
        content: `Diese URL enthält ${contentType} - kein HTML-Text verfügbar.`,
      };
    }

    const html = await response.text();

    // Einfache HTML zu Text Konvertierung
    const title = extractTitle(html);
    const content = htmlToText(html);

    return {
      url,
      title,
      content: truncateContent(content, 10000),
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen von ${url}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
  }
}

/**
 * Extrahiert den Titel aus HTML
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : 'Kein Titel';
}

/**
 * Konvertiert HTML zu reinem Text
 */
function htmlToText(html: string): string {
  return html
    // Script und Style Tags entfernen
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // HTML-Kommentare entfernen
    .replace(/<!--[\s\S]*?-->/g, '')
    // Block-Elemente durch Zeilenumbrüche ersetzen
    .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
    // Alle übrigen Tags entfernen
    .replace(/<[^>]+>/g, ' ')
    // HTML-Entities dekodieren
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Mehrfache Leerzeichen/Zeilenumbrüche reduzieren
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Kürzt den Inhalt auf eine maximale Länge
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '\n\n[... Inhalt gekürzt ...]';
}
