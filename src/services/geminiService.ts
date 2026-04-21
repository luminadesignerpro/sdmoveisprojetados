// Build: 2026-04-21 — Gemini chamado via Edge Function segura (chave protegida no servidor)
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
  role: "user" | "assistant";
  content: string;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

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
 * Analisa imagem(ns) com Gemini via Edge Function segura (backend).
 * A chave da API nunca é exposta no frontend.
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
      console.error("Erro na Edge Function gemini-vision:", error);
      throw new Error(error.message || "Falha na comunicação com o servidor de IA.");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.result || "";
  } catch (error) {
    console.error("analyzeImageWithGemini error:", error);
    throw error;
  }
}

export async function generateAiChatResponse(messages: ChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY not found in environment");
    return "Erro de configuração: Chave de API não encontrada.";
  }

  try {
    const systemPrompt = `Você é o assistente IA da SD Móveis, especialista em móveis planejados.
Responda sempre em português brasileiro, de forma profissional e amigável.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Erro na API do Groq');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
  } catch (error) {
    console.error("Failed to generate chat response:", error);
    return "Erro ao processar mensagem com Groq. Tente novamente.";
  }
}
