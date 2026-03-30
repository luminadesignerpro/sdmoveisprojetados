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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload).slice(0, 500));

    // Evolution API v2 webhook format
    const event = payload.event;

    if (event === "messages.upsert") {
      const messageData = payload.data;
      if (!messageData) {
        return new Response(JSON.stringify({ ok: true, skipped: "no data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const key = messageData.key;
      const fromMe = key?.fromMe || false;
      const remoteJid = key?.remoteJid || "";
      const messageContent =
        messageData.message?.conversation ||
        messageData.message?.extendedTextMessage?.text ||
        messageData.message?.imageMessage?.caption ||
        "";

      if (!messageContent || !remoteJid) {
        return new Response(JSON.stringify({ ok: true, skipped: "no content or jid" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract phone number from JID (format: 5511999991234@s.whatsapp.net)
      const phoneNumber = remoteJid.split("@")[0];
      const pushName = messageData.pushName || null;

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("phone_number", phoneNumber)
        .single();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("whatsapp_conversations")
          .insert({
            phone_number: phoneNumber,
            contact_name: pushName,
            status: "active",
            lead_status: "lead",
          })
          .select("id")
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
          throw convError;
        }
        conversation = newConv;
      } else if (pushName) {
        // Update contact name if we got a new pushName
        await supabase
          .from("whatsapp_conversations")
          .update({ contact_name: pushName })
          .eq("id", conversation.id);
      }

      // Save the message
      const { error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          conversation_id: conversation.id,
          direction: fromMe ? "outbound" : "inbound",
          content: messageContent,
          status: fromMe ? "delivered" : "received",
          message_type: "text",
        });

      if (msgError) {
        console.error("Error saving message:", msgError);
        throw msgError;
      }

      // Update last_message_at
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      // ============================================
      // AI VIRTUAL ASSISTANT LOGIC (AUTO-RESPONDER)
      // ============================================
      if (!fromMe) {
        try {
           const geminiKey = Deno.env.get("GEMINI_API_KEY");
           const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
           const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

           if (geminiKey) {
              // 1. Ask Gemini for an answer
              const systemPrompt = "Você é a Assistente Virtual Inteligente da SD Móveis Projetados. Seu objetivo é atender os clientes pelo WhatsApp de forma super educada, humanizada, curta e direta. NUNCA invente preços ou valores. O objetivo do atendimento é recolher o que o cliente quer fazer (Cozinha, Guarda-Roupa), pedir uma noção das medidas e agendar uma Visita Técnica gratuita ou orientar que ele pode usar o nosso App 3D pelo link. Seja breve. Aja como um humano prestativo, use emojis com moderação.";
              
              const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nCliente diz: ${messageContent}` }] }]
                 })
              });
              
              const geminiData = await geminiRes.json();
              const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

              if (aiReply) {
                  console.log("AI reply generated:", aiReply.substring(0, 50));
                  
                  // 2. Send via Evolution API
                  const sendRes = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'apikey': evolutionKey
                      },
                      body: JSON.stringify({
                          number: remoteJid,
                          options: { delay: 1500, presence: "composing" },
                          textMessage: { text: aiReply }
                      })
                  });
                  
                  if (sendRes.ok) {
                      // Save AI reply to DB
                      await supabase.from("whatsapp_messages").insert({
                          conversation_id: conversation.id,
                          direction: "outbound",
                          content: aiReply,
                          status: "sent",
                          message_type: "text",
                      });
                  } else {
                      console.error("Failed to send Evolution API message", await sendRes.text());
                  }
              }
           }
        } catch (aiError) {
           console.error("AI Assistant Error:", aiError);
        }
      }

      console.log(`Message saved: ${fromMe ? "outbound" : "inbound"} from ${phoneNumber}`);

      return new Response(JSON.stringify({ ok: true, saved: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connection events
    if (event === "connection.update") {
      console.log("Connection update:", payload.data?.state);
      return new Response(JSON.stringify({ ok: true, event: "connection.update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // QR Code events
    if (event === "qrcode.updated") {
      console.log("QR Code updated");
      return new Response(JSON.stringify({ ok: true, event: "qrcode.updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, event: event || "unknown" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
