import { PrismaClient } from '@prisma/client';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

const prisma = new PrismaClient();

/**
 * Admin-Only Tool-Definitionen für Claude
 */
export const adminTools: Tool[] = [
  {
    name: 'saveToKnowledge',
    description:
      'Speichert Informationen in der Wissensdatenbank. Nur für Admins verfügbar. Verwende dieses Tool wenn ein Admin Informationen zur Wissensdatenbank hinzufügen möchte.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Kategorie des Eintrags (z.B. "Heizung", "WLAN", "Küche", "Hausregeln")',
        },
        title: {
          type: 'string',
          description: 'Titel des Eintrags',
        },
        content: {
          type: 'string',
          description: 'Der Inhalt/die Information die gespeichert werden soll',
        },
        keywords: {
          type: 'string',
          description: 'Optionale Suchbegriffe, komma-getrennt',
        },
      },
      required: ['category', 'title', 'content'],
    },
  },
  {
    name: 'updateKnowledge',
    description:
      'Aktualisiert einen bestehenden Eintrag in der Wissensdatenbank. Nur für Admins verfügbar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'integer',
          description: 'ID des zu aktualisierenden Eintrags',
        },
        category: {
          type: 'string',
          description: 'Neue Kategorie (optional)',
        },
        title: {
          type: 'string',
          description: 'Neuer Titel (optional)',
        },
        content: {
          type: 'string',
          description: 'Neuer Inhalt (optional)',
        },
        keywords: {
          type: 'string',
          description: 'Neue Suchbegriffe (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteKnowledge',
    description:
      'Löscht einen Eintrag aus der Wissensdatenbank. Nur für Admins verfügbar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'integer',
          description: 'ID des zu löschenden Eintrags',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'listKnowledge',
    description:
      'Listet alle Einträge in der Wissensdatenbank auf. Nur für Admins verfügbar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Optional: Nur Einträge dieser Kategorie anzeigen',
        },
      },
      required: [],
    },
  },
];

/**
 * Tool-Handler für Admin-Tools
 */
export async function handleAdminTool(
  tool: { name: string; input: any },
  userId: number
): Promise<any> {
  switch (tool.name) {
    case 'saveToKnowledge':
      return saveToKnowledgeHandler(tool.input);
    case 'updateKnowledge':
      return updateKnowledgeHandler(tool.input);
    case 'deleteKnowledge':
      return deleteKnowledgeHandler(tool.input);
    case 'listKnowledge':
      return listKnowledgeHandler(tool.input);
    default:
      return { error: `Unbekanntes Admin-Tool: ${tool.name}` };
  }
}

/**
 * Speichert neuen Eintrag in der Wissensdatenbank
 */
async function saveToKnowledgeHandler(input: {
  category: string;
  title: string;
  content: string;
  keywords?: string;
}): Promise<any> {
  try {
    const entry = await prisma.knowledgeBase.create({
      data: {
        category: input.category.trim(),
        title: input.title.trim(),
        content: input.content.trim(),
        keywords: input.keywords?.trim() || null,
        sourceType: 'manual',
      },
    });

    return {
      success: true,
      entry: {
        id: entry.id,
        category: entry.category,
        title: entry.title,
      },
      message: `Eintrag "${entry.title}" wurde in Kategorie "${entry.category}" gespeichert.`,
    };
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    return {
      success: false,
      error: 'Fehler beim Speichern des Eintrags',
    };
  }
}

/**
 * Aktualisiert bestehenden Eintrag
 */
async function updateKnowledgeHandler(input: {
  id: number;
  category?: string;
  title?: string;
  content?: string;
  keywords?: string;
}): Promise<any> {
  try {
    const entry = await prisma.knowledgeBase.update({
      where: { id: input.id },
      data: {
        ...(input.category && { category: input.category.trim() }),
        ...(input.title && { title: input.title.trim() }),
        ...(input.content && { content: input.content.trim() }),
        ...(input.keywords !== undefined && { keywords: input.keywords?.trim() || null }),
      },
    });

    return {
      success: true,
      entry: {
        id: entry.id,
        category: entry.category,
        title: entry.title,
      },
      message: `Eintrag "${entry.title}" wurde aktualisiert.`,
    };
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    return {
      success: false,
      error: 'Eintrag nicht gefunden oder Fehler beim Aktualisieren',
    };
  }
}

/**
 * Löscht Eintrag aus der Wissensdatenbank
 */
async function deleteKnowledgeHandler(input: { id: number }): Promise<any> {
  try {
    const entry = await prisma.knowledgeBase.delete({
      where: { id: input.id },
    });

    return {
      success: true,
      message: `Eintrag "${entry.title}" wurde gelöscht.`,
    };
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    return {
      success: false,
      error: 'Eintrag nicht gefunden oder Fehler beim Löschen',
    };
  }
}

/**
 * Listet alle Einträge auf
 */
async function listKnowledgeHandler(input: { category?: string }): Promise<any> {
  try {
    const entries = await prisma.knowledgeBase.findMany({
      where: {
        ...(input.category && { category: input.category }),
        isActive: true,
      },
      select: {
        id: true,
        category: true,
        title: true,
        createdAt: true,
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });

    // Nach Kategorie gruppieren
    const grouped: Record<string, typeof entries> = {};
    entries.forEach((entry) => {
      if (!grouped[entry.category]) {
        grouped[entry.category] = [];
      }
      grouped[entry.category].push(entry);
    });

    return {
      count: entries.length,
      categories: Object.keys(grouped).length,
      entries: grouped,
    };
  } catch (error) {
    console.error('Fehler beim Auflisten:', error);
    return {
      success: false,
      error: 'Fehler beim Laden der Einträge',
    };
  }
}
