import { supabase } from "@/integrations/supabase/client";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

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
    const images = base64Image.split('|');

    // Tentar via Edge Function primeiro
    try {
      const { data, error } = await supabase.functions.invoke("gemini-vision", {
        body: { images, prompt },
      });

      if (!error && data?.result) {
        return data.result;
      }
      
      console.warn("Edge Function gemini-vision falhou ou não retornou resultado. Tentando fallback direto para Groq...");
    } catch (edgeError) {
      console.warn("Erro ao chamar Edge Function:", edgeError);
    }

    // Fallback Direto para Groq (Client-side)
    if (!GROQ_API_KEY) {
      throw new Error("Chave de API Groq não configurada e Edge Function indisponível.");
    }

    const content: any[] = [{ type: "text", text: prompt }];

    for (const img of images) {
      const cleanBase64 = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      content.push({
        type: "image_url",
        image_url: {
          url: cleanBase64,
        },
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Vision API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";

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
