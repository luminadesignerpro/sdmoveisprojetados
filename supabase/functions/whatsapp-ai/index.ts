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
DIRETRIZES:
1. JAMAIS dê prazos de entrega ou tempo de espera. Diga que o consultor vai analisar o cronograma.
2. JAMAIS dê preços. Explique que o projeto é exclusivo.
3. NÃO use saudações repetitivas como "Que prazer ter você aqui" se a conversa já começou. Seja direto.
4. Foque na qualidade do MDF 18mm e ferragens premium.
5. Use o Link do Studio AR para medidas: [LINK_STUDIO_AR].
6. Peça fotos e medidas para o projeto 3D gratuito.
Máximo 2 ou 3 frases curtas.`;

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
