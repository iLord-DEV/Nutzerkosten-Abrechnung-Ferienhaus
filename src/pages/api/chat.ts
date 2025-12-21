import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../utils/auth';
import { chat, buildSystemPrompt, type ChatMessage } from '../../utils/claude';
import { userTools, handleUserTool } from '../../utils/chatTools';
import { adminTools, handleAdminTool } from '../../utils/adminChatTools';

const prisma = new PrismaClient();

export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);

    const body = await context.request.json();
    const { message, conversationHistory } = body as {
      message: string;
      conversationHistory?: ChatMessage[];
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Nachricht ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // User-Details laden
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, role: true },
    });

    if (!fullUser) {
      return new Response(JSON.stringify({ error: 'User nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = fullUser.role === 'ADMIN';

    // Wissensdatenbank laden (nach Priorität sortiert: höchste zuerst)
    const knowledgeEntries = await prisma.knowledgeBase.findMany({
      where: { isActive: true },
      select: { category: true, title: true, content: true, priority: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }],
    });

    // System-Prompt bauen
    const systemPrompt = buildSystemPrompt(knowledgeEntries, fullUser.name, isAdmin);

    // Nachrichten-Verlauf aufbauen
    const messages: ChatMessage[] = conversationHistory || [];
    messages.push({ role: 'user', content: message });

    // Tools basierend auf Rolle - Admins bekommen zusätzliche Tools
    const tools = isAdmin ? [...userTools, ...adminTools] : userTools;

    // Kombinierter Tool-Handler
    const toolHandler = async (tool: { name: string; input: any }, userId: number) => {
      // Prüfen ob es ein Admin-Tool ist
      const adminToolNames = adminTools.map((t) => t.name);
      if (adminToolNames.includes(tool.name)) {
        if (!isAdmin) {
          return { error: 'Keine Berechtigung für dieses Tool' };
        }
        return handleAdminTool(tool, userId);
      }
      return handleUserTool(tool, userId);
    };

    // Chat-Request an Claude
    const response = await chat(messages, systemPrompt, tools, toolHandler, user.id);

    return new Response(
      JSON.stringify({
        message: response.message,
        toolResults: response.toolResults,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht authentifiziert') {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('Chat-Fehler:', error);
    return new Response(
      JSON.stringify({
        error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
