import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam, ContentBlock, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolResult {
  toolName: string;
  result: any;
}

export interface ChatResponse {
  message: string;
  toolResults: ToolResult[];
}

export type ToolHandler = (input: any, userId: number) => Promise<any>;

const MAX_TOOL_ITERATIONS = 10;

/**
 * Claude Chat mit Tool Use Support
 */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string,
  tools: Tool[],
  toolHandler: ToolHandler,
  userId: number
): Promise<ChatResponse> {
  const toolResults: ToolResult[] = [];

  // Messages in Anthropic-Format konvertieren
  const anthropicMessages: MessageParam[] = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    });

    // Prüfen ob Tool-Aufrufe vorhanden sind
    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0) {
      // Keine Tools, finale Antwort extrahieren
      const textBlock = response.content.find((block) => block.type === 'text');
      const finalMessage = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        message: finalMessage,
        toolResults,
      };
    }

    // Assistant-Nachricht mit Tool-Aufrufen hinzufügen
    anthropicMessages.push({
      role: 'assistant',
      content: response.content,
    });

    // Tools ausführen
    const toolResultsContent: ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      try {
        const result = await toolHandler(
          { name: toolBlock.name, input: toolBlock.input },
          userId
        );

        toolResults.push({
          toolName: toolBlock.name,
          result,
        });

        toolResultsContent.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        console.error(`Tool ${toolBlock.name} Fehler:`, error);

        toolResultsContent.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          }),
          is_error: true,
        });
      }
    }

    // Tool-Ergebnisse als User-Nachricht hinzufügen
    anthropicMessages.push({
      role: 'user',
      content: toolResultsContent,
    });
  }

  // Max iterations erreicht
  return {
    message: 'Entschuldigung, die Verarbeitung hat zu lange gedauert. Bitte versuche es erneut.',
    toolResults,
  };
}

/**
 * Baut den System-Prompt für den Chatbot
 */
export function buildSystemPrompt(
  knowledgeEntries: Array<{ category: string; title: string; content: string }>,
  userName: string,
  isAdmin: boolean
): string {
  const knowledgeSection = knowledgeEntries.length > 0
    ? knowledgeEntries.map((e) => `### ${e.category}: ${e.title}\n${e.content}`).join('\n\n')
    : 'Keine Einträge in der Wissensdatenbank vorhanden.';

  const adminSection = isAdmin
    ? `

## Admin-Funktionen
Du bist als Admin eingeloggt und hast zusätzliche Fähigkeiten:

### Wissensdatenbank verwalten:
- **saveToKnowledge**: Neue Einträge in der Wissensdatenbank speichern
- **updateKnowledge**: Bestehende Einträge aktualisieren
- **deleteKnowledge**: Einträge löschen
- **listKnowledge**: Alle Einträge auflisten

Wenn ein Admin dich bittet, Informationen zu speichern (z.B. "Trage WLAN-Infos ein" oder "Speichere unter Kategorie X"), nutze das saveToKnowledge Tool.
Du brauchst KEINEN speziellen Präfix wie # - erkenne einfach die Absicht des Admins.`
    : '';

  return `Du bist ein hilfreicher Assistent für das Ferienhaus Schloss Wüstenstein.
Du hilfst dem Benutzer ${userName} bei Fragen zum Haus und bei der Verwaltung von Aufenthalten.

## Deine Fähigkeiten:
1. Beantworte Fragen über das Ferienhaus anhand der Wissensdatenbank
2. Erstelle neue Aufenthalte wenn der Benutzer einen Besuch eintragen möchte
3. Zeige dem Benutzer seine bisherigen Aufenthalte und Statistiken

## Wissensdatenbank:
${knowledgeSection}

## Wichtige Regeln für Aufenthalte:
- Frage nach allen notwendigen Daten: Ankunft, Abreise, Zählerstände (Ankunft & Abreise), Übernachtungen (Mitglieder & Gäste)
- Zählerstände sind IMMER ganze Zahlen
- Das Abreisedatum muss nach dem Ankunftsdatum liegen
- Der Endzählerstand muss größer als der Anfangszählerstand sein
- Mindestens 1 Übernachtung für Mitglieder ist erforderlich

## Allgemeine Regeln:
- Antworte immer auf Deutsch
- Sei freundlich und hilfsbereit
- Wenn du etwas nicht weißt, sag es ehrlich
- Nutze die searchKnowledge-Funktion wenn du nach Informationen suchst${adminSection}`;
}
