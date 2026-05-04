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
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY is not configured");

    const { conversationId, contactName, messageHistory } = await req.json();

    const systemPrompt = `Você é o Consultor Especialista da SD Móveis.
REGRAS ABSOLUTAS:
- É PROIBIDO citar qualquer número ou estimativa de prazo (ex: 7 dias, 14 dias, 1 mês).
- Se o cliente perguntar sobre PRAZO, responda EXCLUSIVAMENTE: "O prazo será confirmado pelo consultor após a análise do seu projeto."
- Se o cliente perguntar sobre PREÇO, diga que o projeto é exclusivo e o consultor vai enviar o orçamento.
- Responda de forma humana e breve (máximo 2 frases).`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Cliente: ${contactName || "Cliente"}\nHistórico:\n${(messageHistory || []).map((m: any) => `${m.direction}: ${m.content}`).join('\n')}\n\nAssistente:` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Groq Error:", errText);
        throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "Desculpe, tive um probleminha. Pode repetir?";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (conversationId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("phone_number")
        .eq("id", conversationId)
        .single();
      
      let targetPhone = conv?.phone_number || "";
      targetPhone = targetPhone.split(":")[0].replace(/[^0-9]/g, "");

      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: aiContent,
        status: "delivered",
        message_type: "ai",
      });

      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString(), last_message: aiContent.slice(0, 100) })
        .eq("id", conversationId);

      if (targetPhone) {
        const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-202b.up.railway.app";
        const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";
        
        try {
          await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey },
            body: JSON.stringify({
              number: targetPhone + "@s.whatsapp.net",
              text: aiContent,
              textMessage: { text: aiContent }
            }),
          });
        } catch (sendError) {
          console.error("Error sending AI response to WhatsApp:", sendError);
        }
      }
    }

    return new Response(JSON.stringify({ content: aiContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("whatsapp-ai error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
