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

    const systemPrompt = `Você é o Consultor Especialista da SD Móveis, um vendedor de alto nível, extremamente persuasivo e encantador.
DIRETRIZES:
- Nunca dê preços. Explique que o projeto é exclusivo.
- Foque na qualidade do MDF 18mm e ferragens premium.
- Use o Link do Studio AR para medidas: [LINK_STUDIO_AR].
- Peça fotos e medidas para o projeto 3D gratuito.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nCliente: ${contactName || "Cliente"}\nHistórico:\n${(messageHistory || []).map((m: any) => `${m.direction}: ${m.content}`).join('\n')}\n\nAssistente:` }] }],
        }),
      }
    );

    if (!response.ok) {
        const errData = await response.json();
        console.error("Gemini Error:", errData);
        throw new Error(`Gemini API error: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, tive um probleminha. Pode repetir?";

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
        const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
        const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";
        
        try {
          await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionKey },
            body: JSON.stringify({
              number: targetPhone,
              text: aiContent,
              options: { delay: 1000, presence: 'composing' }
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
