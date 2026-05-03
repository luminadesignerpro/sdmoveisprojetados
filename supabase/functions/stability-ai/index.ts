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

// Helper: base64 DataURL -> Blob
const base64ToBlob = (base64: string, type: string) => {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error("Imagem base64 invalida ou vazia.");
  }
  
  // Se ja for uma URL de blob, nao conseguimos processar aqui no servidor Deno sem fetch
  if (base64.startsWith('blob:')) {
    throw new Error("A Edge Function recebeu uma blob URL em vez de base64. O cliente deve converter antes de enviar.");
  }

  const data = (base64.includes(',') ? base64.split(',')[1] : base64).replace(/\s/g, '');
  try {
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type });
  } catch (e) {
    console.error("Erro ao decodificar base64. Inicio da string:", data.slice(0, 50));
    throw new Error("Falha ao decodificar base64: A string fornecida nao e um base64 valido.");
  }
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    if (!stabilityKey) throw new Error("STABILITY_API_KEY nao configurada no Supabase.");

    const { task, image, mask, prompt } = await req.json();
    if (!task || !image) throw new Error("task e image sao obrigatorios.");

    console.log(`[stability-ai] task=${task}, prompt="${prompt?.slice(0, 60)}"`);

    const imageBlob = base64ToBlob(image, 'image/jpeg');
    const maskBlob = mask ? base64ToBlob(mask, 'image/png') : null;

    const formData = new FormData();
    let endpoint = "";

    if (task === "cleanup") {
      endpoint = "https://clipdrop-api.co/cleanup/v1";
      formData.append('image_file', imageBlob, 'image.jpg');
      if (maskBlob) formData.append('mask_file', maskBlob, 'mask.png');
    } else if (task === "relight") {
      endpoint = "https://clipdrop-api.co/relight/v1";
      formData.append('image_file', imageBlob, 'image.jpg');
      if (prompt) formData.append('prompt', prompt);
    } else if (task === "inpaint") {
      // Inpainting real: troca apenas a area da mascara
      endpoint = "https://clipdrop-api.co/inpaint/v1";
      formData.append('image_file', imageBlob, 'image.jpg');
      if (maskBlob) {
        formData.append('mask_file', maskBlob, 'mask.png');
      } else {
        throw new Error("Mascara (mask) e obrigatoria para a tarefa de inpaint.");
      }
    } else if (task === "style") {
      // replace-background: mantém móveis (foreground) e troca paredes/piso (background)
      endpoint = "https://clipdrop-api.co/replace-background/v1";
      formData.append('image_file', imageBlob, 'image.jpg');
      formData.append('prompt', prompt || "same room interior with freshly painted walls");
    } else {
      throw new Error("Task invalida: " + task);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-api-key': stabilityKey },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ClipDrop API Error [${task}] ${response.status}:`, errText);
      throw new Error(`ClipDrop API ${response.status}: ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      headers: { ...corsHeaders(origin), "Content-Type": "image/jpeg" },
    });

  } catch (error) {
    console.error("stability-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
