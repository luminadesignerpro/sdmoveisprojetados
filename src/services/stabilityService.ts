import { supabase } from "@/integrations/supabase/client";

export interface StabilityCleanupParams {
  image: string; // base64
  mask: string;  // base64
}

/**
 * Chama a Edge Function segura para processamento de imagem com Stability AI/ClipDrop
 */
async function callStabilityEdgeFunction(task: string, params: any): Promise<string | null> {
  const SUPABASE_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FiaGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDYzNjgsImV4cCI6MjA4NzEyMjM2OH0.MidIwMPLT17szfNnG9VRTnisoPzDAFnEw7IVLpqJj6A";

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stability-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        task,
        image: params.image,
        mask: params.mask,
        prompt: params.prompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`stability-ai (${task}) error ${response.status}:`, errText);
      throw new Error(`stability-ai returned ${response.status}: ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: "image/jpeg" });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Failed to call stability-ai (${task}):`, error);
    return null;
  }
}

export async function cleanupObject(params: StabilityCleanupParams): Promise<string | null> {
  return callStabilityEdgeFunction("cleanup", params);
}

export async function relightImage(image: string, prompt: string): Promise<string | null> {
  return callStabilityEdgeFunction("relight", { image, prompt });
}

export async function inpaintObject(image: string, mask: string, prompt: string): Promise<string | null> {
  return callStabilityEdgeFunction("inpaint", { image, mask, prompt });
}

export async function generativeFill(image: string, prompt: string, mask?: string): Promise<string | null> {
  return callStabilityEdgeFunction("inpaint", { image, mask, prompt });
}

export async function styleTransfer(image: string, prompt: string): Promise<string | null> {
  return callStabilityEdgeFunction("style", { image, prompt });
}
