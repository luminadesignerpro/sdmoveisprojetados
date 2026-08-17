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
    const images = await Promise.all(base64Image.split('|').map(async (img) => {
      if (img.startsWith('blob:')) {
        const response = await fetch(img);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      return img;
    }));

    // Tentar via Edge Function primeiro
    try {
      const { data, error: edgeError } = await supabase.functions.invoke("gemini-vision", {
        body: { images, prompt },
      });

      if (edgeError) {
        console.warn("Edge Function gemini-vision retornou erro:", edgeError);
        // Se for um erro do Supabase (ex: 404, 500), tentamos o fallback mas registramos o erro
      } else if (data?.error) {
        console.error("Erro dentro da Edge Function:", data.error);
        throw new Error(`Erro no servidor (Supabase): ${data.error}`);
      } else if (data?.result) {
        return data.result;
      }
      
      console.warn("Edge Function gemini-vision não retornou resultado. Tentando fallback direto para Groq...");
    } catch (err: any) {
      console.warn("Falha ao chamar Edge Function:", err);
      if (err.message && err.message.includes("servidor (Supabase)")) {
        throw err; // Repassa o erro específico do servidor
      }
    }

    const activeGroqKey = GROQ_API_KEY || "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";
    if (!activeGroqKey) {
      throw new Error("Chave de API Groq não configurada e Edge Function indisponível.");
    }

    const content: any[] = [{ type: "text", text: prompt }];

    for (const img of images) {
      let cleanBase64 = img;
      
      // Skip non-image data (raw PDF bytes can't be sent as image)
      if (cleanBase64.startsWith("data:application/pdf") || cleanBase64.startsWith("data:application/octet-stream")) {
        console.warn("Skipping non-image data URL in vision request");
        continue;
      }
      
      if (!cleanBase64.startsWith("data:")) {
        cleanBase64 = `data:image/jpeg;base64,${cleanBase64}`;
      }
      
      content.push({
        type: "image_url",
        image_url: {
          url: cleanBase64,
        },
      });
    }

    // Try current vision models in order of availability
    const visionModels = ["llama-3.2-90b-vision-preview", "llama-3.2-11b-vision-preview"];
    let lastError = "";

    for (const modelName of visionModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeGroqKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "user",
                content: content,
              },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Groq Vision API error (${modelName}): ${response.status} - ${errText}`;
          console.warn(`Tentativa com ${modelName} falhou:`, lastError);
          continue;
        }

        const data = await response.json();
        const resText = data.choices?.[0]?.message?.content || "";
        if (resText) return resText;
      } catch (err: any) {
        lastError = err.message || String(err);
        console.warn(`Erro na tentativa com ${modelName}:`, lastError);
      }
    }

    throw new Error(lastError || "Falha ao processar imagem com os modelos Groq Vision disponíveis.");
  } catch (error: any) {
    console.error("analyzeImageWithGemini error:", error);
    throw new Error(error.message || "Erro desconhecido na análise de imagem.");
  }
}

/**
 * Analisa texto de orçamento diretamente com Llama 3.3 (ultra rápido e sem limite de visão)
 */
export async function analyzeTextWithGroq(textContext: string, prompt: string): Promise<string> {
  const activeGroqKey = GROQ_API_KEY || "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";
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeGroqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especialista em orçamentos de marcenaria e materiais para móveis planejados. Responda estritamente no formato solicitado.",
          },
          {
            role: "user",
            content: `${prompt}\n\n--- TEXTO EXTRAÍDO DO DOCUMENTO ---\n${textContext}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Text API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    console.error("analyzeTextWithGroq error:", error);
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
