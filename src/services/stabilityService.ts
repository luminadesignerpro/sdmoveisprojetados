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

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stability-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return `data:image/jpeg;base64,${base64}`;
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
