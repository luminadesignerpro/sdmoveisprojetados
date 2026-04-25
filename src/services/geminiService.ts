// Build: 2026-04-25 — Unificado para Groq & Railway via Edge Functions
import { supabase } from "@/integrations/supabase/client";

export interface RenderParams {
  room: string;
  finish: string;
  modules?: Array<{
    type: string;
    width: number;
    height: number;
    depth: number;
    finish: string;
  }>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Gera render realista (Simulação ou API externa)
 */
export async function generateRealisticRender(params: RenderParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-render", {
      body: params,
    });

    if (error) {
      console.error("Render error:", error);
      throw error;
    }

    return data?.imageUrl || null;
  } catch (error) {
    console.error("Failed to generate render:", error);
    return null;
  }
}

/**
 * Analisa imagem(ns) com Groq Vision via Edge Function segura.
 * @param base64Image - Uma imagem base64 ou múltiplas separadas por '|'
 * @param prompt - Instrução para a IA
 */
export async function analyzeImageWithGemini(base64Image: string, prompt: string): Promise<string> {
  try {
    // Divide múltiplas imagens separadas por '|'
    const images = base64Image.split('|');

    const { data, error } = await supabase.functions.invoke("gemini-vision", {
      body: { images, prompt },
    });

    if (error) {
      console.error("Erro na Edge Function ai-vision (gemini-vision):", error);
      throw new Error(error.message || "Falha na comunicação com o servidor de IA.");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.result || "";
  } catch (error) {
    console.error("analyzeImageWithGroqVision error:", error);
    throw error;
  }
}

/**
 * Gera resposta de chat usando a Edge Function ai-chat (Groq Llama 3.3)
 */
export async function generateAiChatResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { 
        messages: messages.map(m => ({ 
          role: m.role === 'assistant' ? 'assistant' : m.role, 
          content: m.content 
        })) 
      },
    });

    if (error) {
      console.error("Erro na Edge Function ai-chat:", error);
      throw new Error(error.message || "Erro ao processar chat.");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.result || "Desculpe, não consegui processar sua mensagem.";
  } catch (error) {
    console.error("Failed to generate chat response:", error);
    return "Erro ao processar mensagem com Groq. Verifique a conexão.";
  }
}
