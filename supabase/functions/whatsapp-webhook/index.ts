import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = await req.json();
    const event = (payload.event || "").toUpperCase();
    console.log(`[Webhook Event: ${event}]`);

    if (event.includes("MESSAGES") && (event.includes("UPSERT") || event.includes("CREATE"))) {
      // FIX V2: Garante que pegamos o objeto correto da Evolution v2
      const dataItems = Array.isArray(payload.data?.messages)
        ? payload.data.messages
        : [payload.data || {}];

      for (const messageData of dataItems) {
        try {
          if (!messageData) continue;
          const key = messageData.key || {};
          const fromMe = key.fromMe || messageData.fromMe || false;
          const remoteJid = key.remoteJid || messageData.remoteJid || payload.data?.key?.remoteJid || payload.data?.remoteJid || "";
          if (!remoteJid || remoteJid.includes("@g.us")) continue;

          const jidRaw = remoteJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
          let phoneNumber = jidRaw;
          
          if (phoneNumber.startsWith("550")) {
            phoneNumber = "55" + phoneNumber.slice(3);
          } else if (phoneNumber.length >= 10 && phoneNumber.length <= 11 && !phoneNumber.startsWith("55")) {
            phoneNumber = "55" + phoneNumber;
          }

          const msgBody = messageData.message || payload.data?.message || messageData || {};
          const messageContent =
            msgBody.conversation || msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption || msgBody.videoMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation || payload.data?.content || "";

          if (!messageContent && !fromMe) continue;

          const pushName = messageData.pushName || payload.data?.pushName || null;
          const last8 = phoneNumber.slice(-8);
          const { data: convs } = await supabase
            .from("whatsapp_conversations")
            .select("id, phone_number")
            .ilike("phone_number", `%${last8}`);

          let conversation = convs?.[0] || null;

          if (conversation) {
            if (pushName) {
              await supabase.from("whatsapp_conversations").update({ contact_name: pushName }).eq("id", conversation.id);
            }
          } else {
            const { data: newConv, error: convError } = await supabase
              .from("whatsapp_conversations")
              .insert({ phone_number: phoneNumber, contact_name: pushName, status: "active", lead_status: "lead" })
              .select("id, phone_number").single();
            if (convError) continue;
            conversation = newConv;
          }

          const externalId = key.id || messageData.id;
          if (externalId) {
            await supabase.from("whatsapp_messages").upsert({
              external_id: externalId, 
              conversation_id: conversation.id,
              direction: fromMe ? "outbound" : "inbound",
              content: messageContent, 
              status: fromMe ? "delivered" : "received", 
              message_type: "text",
            }, { onConflict: "external_id" });
          }

          await supabase.from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString(), last_message: messageContent.slice(0, 100) })
            .eq("id", conversation.id);

          if (!fromMe) {
            const { data: recentResponses } = await supabase.from("whatsapp_messages")
              .select("id").eq("conversation_id", conversation.id).eq("direction", "outbound")
              .gt("created_at", new Date(Date.now() - 30000).toISOString()).limit(1);

            if (!recentResponses || recentResponses.length === 0) {
              const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-202b.up.railway.app";
              const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

              const cleanMessage = messageContent.trim().toLowerCase();
              let responseText = "";
              let messageTypeOut = "text";

              // LÓGICA DO MENU (MANTIDA)
              const { data: configData } = await supabase.from("atendimento_config").select("conteudo").eq("chave", "menu_principal").maybeSingle();
              const config = configData?.conteudo || { greeting: "Olá! Como posso ajudar?", responses: {} };

              const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|inicio|menu)$/i.test(cleanMessage);
              const normalizedMatch = cleanMessage.replace(/[^0-9]/g, "");
              
              if (isGreeting) responseText = config.greeting;
              else if (config.responses?.[normalizedMatch]) responseText = config.responses[normalizedMatch];

              // LÓGICA DA GROQ AI (MANTIDA)
              if (!responseText) {
                const groqKey = Deno.env.get("GROQ_API_KEY");
                if (groqKey) {
                  try {
                    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
                      body: JSON.stringify({
                        model: "mixtral-8x7b-32768",
                        messages: [{ role: "system", content: "Você é o Consultor da SD Móveis. Elegante e persuasivo. Máximo 3 frases." }, { role: "user", content: messageContent }],
                      }),
                    });
                    if (groqRes.ok) {
                      const groqData = await groqRes.json();
                      responseText = groqData.choices?.[0]?.message?.content || "";
                      messageTypeOut = "ai";
                    }
                  } catch (e) { console.error(e); }
                }
              }

              if (responseText) {
                await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "apikey": evolutionKey },
                  body: JSON.stringify({ number: phoneNumber, textMessage: { text: responseText } }),
                });
                await supabase.from("whatsapp_messages").insert({
                  conversation_id: conversation.id, direction: "outbound", content: responseText, status: "sent", message_type: messageTypeOut,
                });
              }
            }
          }
        } catch (e) { console.error(e); }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
