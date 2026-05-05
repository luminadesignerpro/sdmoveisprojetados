import { supabase } from "@/integrations/supabase/client";

export interface StabilityCleanupParams {
  image: string; // base64
  mask: string;  // base64
}

/**
 * Chama a Edge Function segura para processamento de imagem com Stability AI/ClipDrop
 */
async function callStabilityEdgeFunction(task: string, params: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("stability-ai", {
      body: {
        task,
        image: params.image,
        mask: params.mask,
        prompt: params.prompt,
      },
    });

    if (error) {
      console.error(`stability-ai (${task}) error:`, error);
      throw error;
    }

    if (data instanceof Blob || data instanceof ArrayBuffer) {
      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      return `data:image/jpeg;base64,${base64}`;
    }

    // Se a Edge Function retornar JSON com erro
    if (data?.error) {
      console.error(`stability-ai error:`, data.error);
      return null;
    }

    return data;
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
