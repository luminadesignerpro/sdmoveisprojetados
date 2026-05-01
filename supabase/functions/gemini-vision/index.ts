import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://sdmoveisprojetados-zeta.vercel.app",
  "https://sdmoveisprojetados.vercel.app",
  "http://localhost:5173"
];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin || "") ? origin! : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      throw new Error("GROQ_API_KEY não configurada no Supabase.");
    }

    const { images, prompt } = await req.json();
    console.log(`[GEMINI-VISION] Recebido: ${images?.length || 0} imagens, prompt: "${prompt?.slice(0, 50)}..."`);

    if (!images || images.length === 0 || !prompt) {
      throw new Error("Parâmetros inválidos: imagens e prompt são obrigatórios.");
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
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
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
      console.error("Groq Vision API Error:", response.status, errText);
      throw new Error(`Groq Vision API retornou ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result: text }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("gemini-vision error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
