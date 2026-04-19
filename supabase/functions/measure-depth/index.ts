import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image, points, refPoints } = await req.json();

    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Configuração pendente: REPLICATE_API_TOKEN não encontrado no Supabase." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Iniciar a predição no Replicate usando ZoeDepth
    // Este modelo gera um mapa de profundidade métrica
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "ae385199-5541-4796-9fcf-b962372f87a3", // ID estável do ZoeDepth
        input: {
          image: image,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Replicate API error: ${JSON.stringify(error)}`);
    }

    const prediction = await response.json();

    return new Response(
      JSON.stringify(prediction),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
