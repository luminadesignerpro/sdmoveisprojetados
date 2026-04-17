import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error("Nenhum arquivo enviado");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    const prompt = `Você é um especialista em extração de dados de ordens de serviço da marcenaria SD Móveis Projetados.
Analise o documento PDF fornecido e extraia as seguintes informações em formato JSON rigoroso:

{
  "identificacao": {
    "numero_os": "string (ex: 000965)",
    "data": "YYYY-MM-DD",
    "hora": "HH:MM (24h)"
  },
  "cliente": {
    "nome": "string (nome completo)",
    "cidade": "string",
    "endereco": "string (se disponível)",
    "telefone": "string (se disponível)"
  },
  "itens": [
    {
      "descricao": "string (ex: MDF 15 ALMERIA)",
      "valor_unitario": number (ex: 250.00),
      "quantidade": number (ex: 1),
      "valor_total": number (ex: 250.00)
    }
  ],
  "financeiro": {
    "valor_total_os": number (ex: 1003.18),
    "condicoes_pagamento": "string (ex: 50% na entrada ou 10x sem juros)"
  }
}

Regras:
1. Formate datas como YYYY-MM-DD. Se encontrar 05/04/2026, retorne 2026-04-05.
2. Remova símbolos de moeda (R$) e use pontos para decimais em campos numéricos.
3. Se algum campo não for encontrado, retorne null.
4. Identifique todos os itens da tabela de materiais/serviços.
5. Retorne APENAS o JSON, sem markdown ou explicações.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates[0].content.parts[0].text;
    
    // Parse the JSON to ensure it's valid
    const extractedData = JSON.parse(textResponse);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-pdf-data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
