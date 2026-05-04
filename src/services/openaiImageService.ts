import { supabase } from "@/integrations/supabase/client";

export async function generateOpenAIImage(prompt: string, image?: string, mask?: string): Promise<string | null> {
  const SUPABASE_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/openai-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: image && mask ? "edit" : "generation",
        prompt,
        image,
        mask
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`openai-image error:`, errText);
      throw new Error(`openai-image failed: ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error(`Failed to call openai-image:`, error);
    return null;
  }
}
