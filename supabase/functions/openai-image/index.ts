import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://sdmoveisprojetados-zeta.vercel.app",
  "https://sdmoveisprojetados.vercel.app",
  "http://localhost:5173"
];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin || "") ? origin! : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY nao configurada.");

    const { task, image, mask, prompt } = await req.json();

    // DALL-E 3 não aceita imagem de entrada via API ainda, apenas texto.
    // DALL-E 2 aceita imagem + máscara para "Edits" (Inpainting).
    
    let endpoint = "https://api.openai.com/v1/images/generations";
    let body: any = {
      model: "dall-e-3",
      prompt: prompt || "A high-end modern living room with luxury furniture",
      n: 1,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json"
    };

    // Se tivermos imagem e máscara, tentamos o Edit (DALL-E 2)
    if (image && mask && task === "edit") {
      endpoint = "https://api.openai.com/v1/images/edits";
      // O DALL-E 2 Edit requer Multipart Form Data e imagens PNG RGBA.
      // Para simplificar e garantir a qualidade ChatGPT, vamos focar no DALL-E 3 
      // gerando uma versão inspirada no ambiente.
    }

    console.log(`[openai-image] Chamando DALL-E 3 para: ${prompt}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`OpenAI API Error: ${err.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const base64 = result.data[0].b64_json;

    return new Response(base64ToBuffer(base64), {
      headers: { ...corsHeaders(origin), "Content-Type": "image/png" },
    });

  } catch (error) {
    console.error("openai-image error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});

function base64ToBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
