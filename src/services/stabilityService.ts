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
        prompt: params.prompt
      }
    });

    if (error) {
      console.error(`Edge Function stability-ai (${task}) error:`, error);
      throw error;
    }

    if (data instanceof Blob) {
      return URL.createObjectURL(data);
    }
    
    // Se o retorno for um arrayBuffer ou similar que não veio como Blob automático
    if (data) {
      const blob = new Blob([data], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }

    return null;
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
