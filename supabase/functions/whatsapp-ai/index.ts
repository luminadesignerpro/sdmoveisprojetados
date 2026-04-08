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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured");

    const { conversationId, contactName, messageHistory } = await req.json();

    const systemPrompt = `Você é o Consultor Especialista da SD Móveis, um vendedor de alto nível, extremamente persuasivo e encantador. Seu objetivo único é transformar um interessado em um cliente qualificado (Lead Quente).

DIRETRIZES DE ATENDIMENTO:
- **Zero Preço**: Nunca, sob hipótese alguma, dê preços ou estimativas. Explique que cada projeto é exclusivo e que o valor final depende das escolhas técnicas e do design que o proprietário (CEO) definirá após a análise.
- **Construção de Valor**: Foque na qualidade absoluta do nosso MDF (18mm), ferragens premium e na durabilidade do móvel.
- **Diferencial Tecnológico**: Use o Studio AR como seu maior aliado! Diga: "Para que eu possa te dar um atendimento personalizado, use nossa tecnologia de Realidade Aumentada para medir seu espaço em 1 minuto: [LINK_STUDIO_AR]".
- **Captura de Dados**: Peça fotos do local e as medidas. Diga que isso é essencial para que o projeto 3D (que é gratuito) seja feito com perfeição.
- **Persuasão**: Use frases como "Transformamos sua casa em um ambiente de revista", "Móveis que duram uma vida inteira", "Seu sonho merece o selo de qualidade SD Móveis".

AÇÃO FINAL:
Tente sempre conseguir a medição via AR ou as fotos. Quando o cliente enviar, diga que "O proprietário da SD Móveis agora vai analisar pessoalmente para te passar o melhor valor possível".

O nome do cliente é: ${contactName || "Cliente"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nHistórico:\n${(messageHistory || []).map((m: any) => `${m.direction}: ${m.content}`).join('\n')}\n\nAssistente:` }] }],
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini API error:", response.status, text);
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar. Tente novamente.";

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
