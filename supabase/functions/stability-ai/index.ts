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
    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    if (!stabilityKey) throw new Error("STABILITY_API_KEY is not configured in Supabase");

    const { task, image, mask, prompt } = await req.json();

    if (!task || !image) {
      throw new Error("Task and Image are required");
    }

    const formData = new FormData();
    
    // Helper to convert base64 to Blob in Deno
    const base64ToBlob = (base64: string, type: string) => {
      const byteString = atob(base64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type });
    };

    const imageBlob = base64ToBlob(image, 'image/jpeg');
    formData.append('image_file', imageBlob);

    if (mask) {
      const maskBlob = base64ToBlob(mask, 'image/png');
      formData.append('mask_file', maskBlob);
    }

    if (prompt) {
      formData.append('prompt', prompt);
    }

    let endpoint = "";
    switch (task) {
      case "cleanup": endpoint = "https://clipdrop-api.co/cleanup/v1"; break;
      case "relight": endpoint = "https://clipdrop-api.co/relight/v1"; break;
      case "inpaint": endpoint = "https://clipdrop-api.co/text-to-inpainting/v1"; break;
      case "style": endpoint = "https://clipdrop-api.co/reimagine/v1"; break;
      default: throw new Error("Invalid task: " + task);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-api-key': stabilityKey },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Stability API Error (${task}):`, response.status, errText);
      throw new Error(`Stability API returned ${response.status}: ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    
    return new Response(buffer, {
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "image/jpeg",
      },
    });

  } catch (error) {
    console.error("stability-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
