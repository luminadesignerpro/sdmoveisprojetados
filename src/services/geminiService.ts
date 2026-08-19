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

    // 1. Tentar via Google Gemini (1.5 Flash / 2.0 Flash)
    const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCv3n-NwYyL4qghfbkAWvqCIXyio18mQsA").trim().replace(/[\r\n\s]/g, "");
    if (geminiApiKey) {
      const geminiModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
      
      const parts: any[] = [{ text: prompt }];
      for (const img of images) {
        let cleanBase64 = img;
        let mimeType = "image/jpeg";

        if (cleanBase64.startsWith("data:")) {
          const commaIdx = cleanBase64.indexOf(",");
          const header = cleanBase64.slice(0, commaIdx);
          cleanBase64 = cleanBase64.slice(commaIdx + 1);
          if (header.includes("image/png")) mimeType = "image/png";
          else if (header.includes("image/webp")) mimeType = "image/webp";
          else if (header.includes("image/gif")) mimeType = "image/gif";
        }

        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: cleanBase64
          }
        });
      }

      for (const model of geminiModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
              }
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          } else {
            const errText = await res.text();
            console.warn(`Gemini (${model}) API error:`, res.status, errText);
          }
        } catch (geminiErr) {
          console.warn(`Falha no Gemini (${model}):`, geminiErr);
        }
      }
    }

    // 2. Fallback: Llama 3.3 Text na Groq
    const activeGroqKey = GROQ_API_KEY || "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";
    if (activeGroqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeGroqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: "Você é um assistente especialista em orçamentos de marcenaria e materiais para móveis planejados. Responda estritamente no formato JSON solicitado.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const out = groqData.choices?.[0]?.message?.content;
          if (out) return out;
        }
      } catch (gErr) {
        console.warn("Falha no fallback Groq:", gErr);
      }
    }

    throw new Error("Não foi possível processar a imagem. Verifique a conexão com a internet.");
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
        model: "openai/gpt-oss-120b",
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
