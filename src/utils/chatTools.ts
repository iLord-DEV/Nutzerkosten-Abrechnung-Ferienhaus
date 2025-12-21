import { PrismaClient } from '@prisma/client';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { validateAufenthaltData, type AufenthaltData } from './aufenthaltValidation';

const prisma = new PrismaClient();

/**
 * Tool-Definitionen für Claude
 */
export const userTools: Tool[] = [
  {
    name: 'createAufenthalt',
    description:
      'Erstellt einen neuen Aufenthalt (Stay) für den aktuellen Benutzer. Verwende dieses Tool wenn der Benutzer einen Aufenthalt eintragen möchte. Stelle sicher, dass alle erforderlichen Daten vorhanden sind.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ankunft: {
          type: 'string',
          description: 'Ankunftsdatum im Format YYYY-MM-DD',
        },
        abreise: {
          type: 'string',
          description: 'Abreisedatum im Format YYYY-MM-DD',
        },
        zaehlerStart: {
          type: 'integer',
          description: 'Zählerstand bei Ankunft (ganze Zahl)',
        },
        zaehlerEnde: {
          type: 'integer',
          description: 'Zählerstand bei Abreise (ganze Zahl, muss größer als zaehlerStart sein)',
        },
        uebernachtungenMitglieder: {
          type: 'integer',
          description: 'Anzahl der Übernachtungen von Mitgliedern (mindestens 1)',
        },
        uebernachtungenGaeste: {
          type: 'integer',
          description: 'Anzahl der Übernachtungen von Gästen (optional, Standard: 0)',
        },
      },
      required: ['ankunft', 'abreise', 'zaehlerStart', 'zaehlerEnde', 'uebernachtungenMitglieder'],
    },
  },
  {
    name: 'queryAufenthalte',
    description: 'Ruft die Aufenthalte des Benutzers ab. Kann nach Jahr gefiltert werden.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jahr: {
          type: 'integer',
          description: 'Jahr zum Filtern (optional, ohne = alle Jahre)',
        },
        limit: {
          type: 'integer',
          description: 'Maximale Anzahl der Ergebnisse (Standard: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'queryStatistiken',
    description: 'Ruft Statistiken über Aufenthalte, Kosten und den aktuellen Zählerstand ab.',
    input_schema: {
      type: 'object' as const,
      properties: {
        typ: {
          type: 'string',
          enum: ['meine_aufenthalte_summary', 'aktiver_zaehler', 'letzte_tankfuellung'],
          description: 'Art der Statistik: meine_aufenthalte_summary (Übersicht aller Aufenthalte), aktiver_zaehler (aktueller Zählerstand), letzte_tankfuellung (letzte Öltankfüllung)',
        },
        jahr: {
          type: 'integer',
          description: 'Jahr für Aufenthalts-Statistik (optional)',
        },
      },
      required: ['typ'],
    },
  },
  {
    name: 'searchKnowledge',
    description:
      'Durchsucht die Wissensdatenbank nach relevanten Informationen über das Ferienhaus.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Suchbegriff oder Frage',
        },
        category: {
          type: 'string',
          description: 'Kategorie zum Filtern (optional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchImages',
    description:
      'Durchsucht die Medienbibliothek nach passenden Bildern und Videos anhand von Tags, Titel oder Beschreibung. Nutze dieses Tool um Medien zu finden, die du in deiner Antwort einbetten kannst (Bilder als Markdown, Videos als Link).',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Suchbegriff (z.B. "Siebenschläfer", "Heizung", "Alarm")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'getChecklists',
    description:
      'Zeigt den Fortschritt des Benutzers bei den Checklisten (z.B. Anreise-/Abreise-Aufgaben). Nutze dieses Tool wenn der Benutzer wissen möchte, welche Aufgaben er noch erledigen muss oder wie weit er mit einer Checkliste ist.',
    input_schema: {
      type: 'object' as const,
      properties: {
        checklistId: {
          type: 'integer',
          description: 'ID einer spezifischen Checkliste (optional, ohne = alle Checklisten)',
        },
      },
      required: [],
    },
  },
];

/**
 * Tool-Handler für User-Tools
 */
export async function handleUserTool(
  tool: { name: string; input: any },
  userId: number
): Promise<any> {
  switch (tool.name) {
    case 'createAufenthalt':
      return createAufenthaltHandler(tool.input, userId);
    case 'queryAufenthalte':
      return queryAufenthalteHandler(tool.input, userId);
    case 'queryStatistiken':
      return queryStatistikenHandler(tool.input, userId);
    case 'searchKnowledge':
      return searchKnowledgeHandler(tool.input);
    case 'searchImages':
      return searchImagesHandler(tool.input);
    case 'getChecklists':
      return getChecklistsHandler(tool.input, userId);
    default:
      return { error: `Unbekanntes Tool: ${tool.name}` };
  }
}

/**
 * Aufenthalt erstellen
 */
async function createAufenthaltHandler(
  input: {
    ankunft: string;
    abreise: string;
    zaehlerStart: number;
    zaehlerEnde: number;
    uebernachtungenMitglieder: number;
    uebernachtungenGaeste?: number;
  },
  userId: number
): Promise<any> {
  const data: AufenthaltData = {
    userId,
    ankunft: input.ankunft,
    abreise: input.abreise,
    zaehlerStart: Math.round(input.zaehlerStart),
    zaehlerEnde: Math.round(input.zaehlerEnde),
    uebernachtungenMitglieder: input.uebernachtungenMitglieder,
    uebernachtungenGaeste: input.uebernachtungenGaeste || 0,
  };

  // Validierung
  const errors = await validateAufenthaltData(data);
  if (errors.length > 0) {
    return {
      success: false,
      errors: errors.map((e) => e.message),
    };
  }

  // Jahr aus Ankunftsdatum berechnen
  const ankunftDate = new Date(data.ankunft + 'T00:00:00');
  const jahr = ankunftDate.getFullYear();

  // Aktiven Zähler finden
  const aktiverZaehler = await prisma.zaehler.findFirst({
    where: { istAktiv: true },
  });

  // Aufenthalt erstellen
  const aufenthalt = await prisma.aufenthalt.create({
    data: {
      userId,
      ankunft: ankunftDate,
      abreise: new Date(data.abreise + 'T00:00:00'),
      zaehlerAnkunft: data.zaehlerStart,
      zaehlerAbreise: data.zaehlerEnde,
      uebernachtungenMitglieder: data.uebernachtungenMitglieder,
      uebernachtungenGaeste: data.uebernachtungenGaeste,
      jahr,
      zaehlerId: aktiverZaehler?.id,
      zaehlerAbreiseId: aktiverZaehler?.id,
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  return {
    success: true,
    aufenthalt: {
      id: aufenthalt.id,
      ankunft: aufenthalt.ankunft.toISOString().split('T')[0],
      abreise: aufenthalt.abreise.toISOString().split('T')[0],
      zaehlerAnkunft: aufenthalt.zaehlerAnkunft,
      zaehlerAbreise: aufenthalt.zaehlerAbreise,
      uebernachtungenMitglieder: aufenthalt.uebernachtungenMitglieder,
      uebernachtungenGaeste: aufenthalt.uebernachtungenGaeste,
      heizstunden: aufenthalt.zaehlerAbreise - aufenthalt.zaehlerAnkunft,
    },
    message: `Aufenthalt vom ${aufenthalt.ankunft.toISOString().split('T')[0]} bis ${aufenthalt.abreise.toISOString().split('T')[0]} wurde erfolgreich erstellt.`,
  };
}

/**
 * Aufenthalte abfragen
 */
async function queryAufenthalteHandler(
  input: { jahr?: number; limit?: number },
  userId: number
): Promise<any> {
  const aufenthalte = await prisma.aufenthalt.findMany({
    where: {
      userId,
      ...(input.jahr && { jahr: input.jahr }),
    },
    orderBy: { ankunft: 'desc' },
    take: input.limit || 10,
  });

  return {
    count: aufenthalte.length,
    aufenthalte: aufenthalte.map((a) => ({
      id: a.id,
      ankunft: a.ankunft.toISOString().split('T')[0],
      abreise: a.abreise.toISOString().split('T')[0],
      zaehlerAnkunft: a.zaehlerAnkunft,
      zaehlerAbreise: a.zaehlerAbreise,
      heizstunden: a.zaehlerAbreise - a.zaehlerAnkunft,
      uebernachtungenMitglieder: a.uebernachtungenMitglieder,
      uebernachtungenGaeste: a.uebernachtungenGaeste,
      jahr: a.jahr,
    })),
  };
}

/**
 * Statistiken abfragen
 */
async function queryStatistikenHandler(
  input: { typ: string; jahr?: number },
  userId: number
): Promise<any> {
  switch (input.typ) {
    case 'meine_aufenthalte_summary': {
      const aufenthalte = await prisma.aufenthalt.findMany({
        where: {
          userId,
          ...(input.jahr && { jahr: input.jahr }),
        },
      });

      const totalHeizstunden = aufenthalte.reduce(
        (sum, a) => sum + (a.zaehlerAbreise - a.zaehlerAnkunft),
        0
      );
      const totalUebernachtungen = aufenthalte.reduce(
        (sum, a) => sum + a.uebernachtungenMitglieder + a.uebernachtungenGaeste,
        0
      );

      return {
        anzahlAufenthalte: aufenthalte.length,
        gesamtHeizstunden: totalHeizstunden,
        gesamtUebernachtungen: totalUebernachtungen,
        jahr: input.jahr || 'alle Jahre',
      };
    }

    case 'aktiver_zaehler': {
      const zaehler = await prisma.zaehler.findFirst({
        where: { istAktiv: true },
      });

      if (!zaehler) {
        return { error: 'Kein aktiver Zähler gefunden' };
      }

      return {
        letzterStand: zaehler.letzterStand,
        einbauDatum: zaehler.einbauDatum.toISOString().split('T')[0],
      };
    }

    case 'letzte_tankfuellung': {
      const tankfuellung = await prisma.tankfuellung.findFirst({
        orderBy: { datum: 'desc' },
      });

      if (!tankfuellung) {
        return { message: 'Keine Tankfüllung gefunden' };
      }

      return {
        datum: tankfuellung.datum.toISOString().split('T')[0],
        liter: tankfuellung.liter,
        preisProLiter: tankfuellung.preisProLiter,
        zaehlerstand: tankfuellung.zaehlerstand,
      };
    }

    default:
      return { error: `Unbekannter Statistik-Typ: ${input.typ}` };
  }
}

/**
 * Wissensdatenbank durchsuchen
 */
async function searchKnowledgeHandler(input: { query: string; category?: string }): Promise<any> {
  const searchTerms = input.query.toLowerCase().split(/\s+/);

  const entries = await prisma.knowledgeBase.findMany({
    where: {
      isActive: true,
      ...(input.category && { category: input.category }),
    },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // Einfache Suche: Einträge die mindestens einen Suchbegriff enthalten
  const results = entries.filter((entry) => {
    const searchableText = `${entry.title} ${entry.content} ${entry.keywords || ''} ${entry.category}`.toLowerCase();
    return searchTerms.some((term) => searchableText.includes(term));
  });

  // Nach Relevanz sortieren (mehr Treffer = höhere Relevanz)
  results.sort((a, b) => {
    const aText = `${a.title} ${a.content} ${a.keywords || ''}`.toLowerCase();
    const bText = `${b.title} ${b.content} ${b.keywords || ''}`.toLowerCase();
    const aMatches = searchTerms.filter((term) => aText.includes(term)).length;
    const bMatches = searchTerms.filter((term) => bText.includes(term)).length;
    return bMatches - aMatches;
  });

  return {
    count: results.length,
    results: results.slice(0, 5).map((r) => ({
      category: r.category,
      title: r.title,
      content: r.content,
      images: r.images.map((img) => ({
        url: `/uploads/knowledge/${img.fileName}`,
        alt: img.alt || img.originalName,
        caption: img.caption,
      })),
    })),
  };
}

/**
 * Medienbibliothek durchsuchen (Bilder und Videos)
 */
async function searchImagesHandler(input: { query: string }): Promise<any> {
  const searchTerms = input.query.toLowerCase().split(/\s+/);

  const allMedia = await prisma.imageLibrary.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Suche in title, description und tags
  const results = allMedia.filter((media) => {
    const searchableText = `${media.title} ${media.description || ''} ${media.tags}`.toLowerCase();
    return searchTerms.some((term) => searchableText.includes(term));
  });

  // Nach Relevanz sortieren (mehr Treffer = höhere Relevanz)
  results.sort((a, b) => {
    const aText = `${a.title} ${a.description || ''} ${a.tags}`.toLowerCase();
    const bText = `${b.title} ${b.description || ''} ${b.tags}`.toLowerCase();
    const aMatches = searchTerms.filter((term) => aText.includes(term)).length;
    const bMatches = searchTerms.filter((term) => bText.includes(term)).length;
    return bMatches - aMatches;
  });

  return {
    count: results.length,
    media: results.slice(0, 5).map((m) => ({
      url: `/uploads/library/${m.fileName}`,
      title: m.title,
      description: m.description,
      tags: m.tags,
      mediaType: m.mediaType || 'image',
      thumbnailUrl: m.thumbnail ? `/uploads/library/${m.thumbnail}` : null,
    })),
  };
}

/**
 * Checklisten mit User-Fortschritt abrufen
 */
async function getChecklistsHandler(
  input: { checklistId?: number },
  userId: number
): Promise<any> {
  const whereClause: { isActive: boolean; id?: number } = { isActive: true };
  if (input.checklistId) {
    whereClause.id = input.checklistId;
  }

  const checklists = await prisma.checklist.findMany({
    where: whereClause,
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          progress: {
            where: { userId },
          },
        },
      },
    },
  });

  if (checklists.length === 0) {
    return {
      message: input.checklistId
        ? 'Checkliste nicht gefunden'
        : 'Keine Checklisten vorhanden',
    };
  }

  return {
    checklists: checklists.map((cl) => {
      const completedCount = cl.items.filter(
        (item) => item.progress.length > 0 && item.progress[0].isChecked
      ).length;
      const totalCount = cl.items.length;

      return {
        id: cl.id,
        title: cl.title,
        description: cl.description,
        progress: `${completedCount}/${totalCount}`,
        progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        isComplete: completedCount === totalCount && totalCount > 0,
        items: cl.items.map((item) => ({
          id: item.id,
          text: item.text,
          isChecked: item.progress.length > 0 && item.progress[0].isChecked,
        })),
      };
    }),
    hint: 'Die vollständige Checkliste mit Abhak-Funktion findest du unter [/checklisten](/checklisten)',
  };
}
