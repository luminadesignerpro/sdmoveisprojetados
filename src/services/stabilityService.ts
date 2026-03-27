const STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY;

export interface StabilityCleanupParams {
  image: string; // base64
  mask: string;  // base64
}

export async function cleanupObject(params: StabilityCleanupParams): Promise<string | null> {
  if (!STABILITY_API_KEY) {
    console.warn("Stability API Key not found. Using simulation.");
    return null;
  }

  try {
    // Convert base64 to Blob
    const imageBlob = await fetch(params.image).then(r => r.blob());
    const maskBlob = await fetch(params.mask).then(r => r.blob());

    const formData = new FormData();
    formData.append('image_file', imageBlob);
    formData.append('mask_file', maskBlob);

    const response = await fetch('https://clipdrop-api.co/cleanup/v1', {
      method: 'POST',
      headers: {
        'x-api-key': STABILITY_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`Stability Cleanup Error: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to cleanup with Stability AI:", error);
    return null;
  }
}

export async function relightImage(image: string, prompt: string): Promise<string | null> {
  if (!STABILITY_API_KEY) return null;

  try {
    const imageBlob = await fetch(image).then(r => r.blob());
    const formData = new FormData();
    formData.append('image_file', imageBlob);
    formData.append('prompt', prompt);

    const response = await fetch('https://clipdrop-api.co/relight/v1', {
      method: 'POST',
      headers: {
        'x-api-key': STABILITY_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) throw new Error(`Stability Relight Error: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to relight with Stability AI:", error);
    return null;
  }
}
