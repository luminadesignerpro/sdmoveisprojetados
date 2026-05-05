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
    let targetUrl = "";

    // Mapeamento para Stability Platform API (DreamStudio)
    const engineId = "stable-diffusion-xl-1024-v1-0";
    
    if (task === "cleanup" || task === "inpaint") {
      targetUrl = `https://api.stability.ai/v1/generation/${engineId}/image-to-image/masking`;
      formData.append('init_image', imageBlob);
      formData.append('mask_source', 'MASK_IMAGE_WHITE');
      if (maskBlob) {
        formData.append('mask_image', maskBlob);
      } else {
        throw new Error("Mascara obrigatoria para inpaint/cleanup.");
      }
      formData.append('text_prompts[0][text]', prompt || "clean luxury interior design, professional photography");
      formData.append('text_prompts[0][weight]', '1');
      formData.append('cfg_scale', '7');
      formData.append('clip_guidance_preset', 'FAST_BLUE');
      formData.append('samples', '1');
      formData.append('steps', '30');
    } else if (task === "style") {
      targetUrl = `https://api.stability.ai/v1/generation/${engineId}/image-to-image`;
      formData.append('init_image', imageBlob);
      formData.append('image_strength', '0.35');
      formData.append('text_prompts[0][text]', prompt || "modern luxury interior");
      formData.append('text_prompts[0][weight]', '1');
      formData.append('cfg_scale', '7');
      formData.append('samples', '1');
      formData.append('steps', '30');
    } else {
      // Fallback para ClipDrop se for uma tarefa não suportada pela API V1 da Stability
      targetUrl = `https://clipdrop-api.co/${task}/v1`;
      formData.append('image_file', imageBlob, 'image.jpg');
      if (maskBlob) formData.append('mask_file', maskBlob, 'mask.png');
    }

    console.log(`[stability-ai] Iniciando fetch para Stability Platform: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${stabilityKey}`,
        'Accept': 'application/json' 
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Erro Stability (${response.status})`;
      try {
        const json = JSON.parse(errText);
        msg = json.message || json.error || msg;
      } catch(e) {}
      throw new Error(msg);
    }

    const resultJson = await response.json();
    if (!resultJson.artifacts || resultJson.artifacts.length === 0) {
      throw new Error("Nenhum artefato retornado pela Stability.");
    }

    const base64Image = resultJson.artifacts[0].base64;
    const binary = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));

    return new Response(binary, {
      headers: { ...corsHeaders(origin), "Content-Type": "image/png" },
    });

  } catch (error) {
    console.error("stability-ai error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno",
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
