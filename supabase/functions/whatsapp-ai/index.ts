import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { conversationId, contactName, messageHistory } = await req.json();

    const systemPrompt = `Você é a assistente virtual da SD Móveis, uma empresa especializada em móveis planejados de alta qualidade.

REGRAS:
- Responda SEMPRE em português brasileiro, de forma simpática e profissional.
- Seja objetiva mas acolhedora.
- Quando o cliente perguntar sobre preços, dê faixas estimadas e sugira agendar uma visita técnica gratuita.
- Sugira sempre os diferenciais: projeto 3D gratuito, 5 anos de garantia, materiais de primeira linha.
- Se o cliente quiser agendar, peça data e horário preferidos.
- Use emojis com moderação para tornar a conversa mais amigável.
- Nunca invente informações técnicas específicas que não foram fornecidas.

PRODUTOS E SERVIÇOS:
- Cozinhas planejadas (a partir de R$ 8.000)
- Quartos planejados (a partir de R$ 6.000)
- Escritórios (a partir de R$ 4.500)
- Closets e guarda-roupas (a partir de R$ 5.000)
- Banheiros planejados (a partir de R$ 3.500)
- Áreas de serviço (a partir de R$ 3.000)

DIFERENCIAIS:
- Projeto 3D fotorrealista gratuito
- Garantia de 5 anos
- Instalação inclusa
- Materiais certificados
- Atendimento personalizado

O nome do cliente é: ${contactName || "Cliente"}`;

    // Build messages array from history
    const messages = [
      { role: "system", content: systemPrompt },
      ...(messageHistory || []).map((msg: { direction: string; content: string }) => ({
        role: msg.direction === "inbound" ? "user" : "assistant",
        content: msg.content,
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar. Tente novamente.";

    // Save the AI response as an outbound message
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (conversationId) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: aiContent,
        status: "delivered",
        message_type: "ai",
      });

      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return new Response(JSON.stringify({ content: aiContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("whatsapp-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
