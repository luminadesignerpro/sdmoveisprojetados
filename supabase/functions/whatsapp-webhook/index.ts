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
      const dataItems = Array.isArray(payload.data?.messages)
        ? payload.data.messages
        : payload.data?.message ? [payload.data.message] : [payload.data || {}];

      for (const messageData of dataItems) {
        try {
          if (!messageData) continue;
          const key = messageData.key || {};
          const fromMe = key.fromMe || messageData.fromMe || false;
          const remoteJid = key.remoteJid || messageData.remoteJid || payload.data?.key?.remoteJid || payload.data?.remoteJid || "";
          if (!remoteJid || remoteJid.includes("@g.us")) continue;

          const jidRaw = remoteJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
          console.log(`[JID Raw] ${jidRaw}`);

          const msgBody = messageData.message || payload.data?.message || messageData || {};
          const messageContent =
            msgBody.conversation || msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption || msgBody.videoMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation || payload.data?.content || "";

          if (!messageContent && !fromMe) continue;

          const pushName = messageData.pushName || payload.data?.pushName || null;

          // Busca conversa existente pelos ultimos 8 digitos do JID
          const last8 = jidRaw.slice(-8);
          const { data: convs } = await supabase
            .from("whatsapp_conversations")
            .select("id, phone_number")
            .ilike("phone_number", `%${last8}`);

          let conversation = convs?.[0] || null;
          let phoneNumber: string;

          if (conversation) {
            phoneNumber = conversation.phone_number;
            console.log(`[Conversation] Found: ${phoneNumber}`);
            if (pushName) {
              await supabase.from("whatsapp_conversations").update({ contact_name: pushName }).eq("id", conversation.id);
            }
          } else {
            // Cria nova conversa com numero montado
            const newPhone = jidRaw.startsWith("55") ? jidRaw : "55" + jidRaw.slice(-11);
            phoneNumber = newPhone;
            console.log(`[Conversation] Creating new: ${phoneNumber}`);
            const { data: newConv, error: convError } = await supabase
              .from("whatsapp_conversations")
              .insert({ phone_number: phoneNumber, contact_name: pushName, status: "active", lead_status: "lead" })
              .select("id, phone_number").single();
            if (convError) { console.error("Error creating conversation:", convError); continue; }
            conversation = newConv;
          }

          console.log(`[Processing] phone: ${phoneNumber} | fromMe: ${fromMe} | "${messageContent.slice(0, 50)}"`);

          const externalId = key.id || messageData.id;
          if (externalId) {
            await supabase.from("whatsapp_messages").upsert({
              external_id: externalId, conversation_id: conversation.id,
              direction: fromMe ? "outbound" : "inbound",
              content: messageContent, status: fromMe ? "delivered" : "received", message_type: "text",
            }, { onConflict: "external_id" });
          } else {
            await supabase.from("whatsapp_messages").insert({
              conversation_id: conversation.id, direction: fromMe ? "outbound" : "inbound",
              content: messageContent, status: fromMe ? "delivered" : "received", message_type: "text",
            });
          }

          await supabase.from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString(), last_message: messageContent.slice(0, 100) })
            .eq("id", conversation.id);

          if (!fromMe) {
            const { data: recentResponses } = await supabase.from("whatsapp_messages")
              .select("created_at").eq("conversation_id", conversation.id).eq("direction", "outbound")
              .gt("created_at", new Date(Date.now() - 30000).toISOString()).limit(1);

            if (recentResponses && recentResponses.length > 0) {
              console.log(`[Rate Limit] Pulando resposta`);
            } else {
              const geminiKey = Deno.env.get("GEMINI_API_KEY");
              const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
              const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

              const cleanMessage = messageContent.trim().toLowerCase();
              let responseText = "";
              let messageTypeOut = "text";

              const { data: configData } = await supabase.from("atendimento_config").select("conteudo").eq("chave", "menu_principal").maybeSingle();
              const config = configData?.conteudo || {
                greeting: "Ola! Bem-vindo a SD Moveis!\nComo posso te ajudar?\n\n1 - Orcamento\n2 - Acompanhar projeto\n3 - Pos-venda\n4 - Falar com atendente",
                responses: {},
              };

              const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|inicio|menu|oi!|ola!)$/i.test(cleanMessage.trim());
              const normalizedMatch = cleanMessage.replace(/[^0-9]/g, "");
              if (isGreeting) responseText = config.greeting;
              else if (config.responses?.[normalizedMatch]) responseText = config.responses[normalizedMatch];

              if (!responseText && geminiKey) {
                try {
                  const groqKey = "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";
                  
                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${groqKey}`
                    },
                    body: JSON.stringify({
                      model: "mixtral-8x7b-32768",
                      messages: [{
                        role: "system",
                        content: "Voce e o Consultor Especialista da SD Moveis Projetados, loja de moveis planejados em Fortaleza-CE. Tom persuasivo, elegante e caloroso. Maximo 3 frases. Sem markdown."
                      }, {
                        role: "user",
                        content: messageContent
                      }],
                      max_tokens: 150,
                      temperature: 0.7,
                    }),
                    signal: AbortSignal.timeout(10000),
                  });

                  if (groqRes.ok) {
                    const groqData = await groqRes.json();
                    responseText = groqData.choices?.[0]?.message?.content || "";
                    messageTypeOut = "ai";
                    console.log(`[Groq] Resposta gerada com sucesso`);
                  } else {
                    const errorText = await groqRes.text();
                    console.error(`[Groq] Erro ${groqRes.status}: ${errorText}`);
                  }
                } catch (e) { 
                  console.error("[Groq Error]:", e?.message); 
                }
              }

              if (responseText) {
                console.log(`[Auto-Response] Enviando para: ${phoneNumber}`);
                try {
                  const res = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: evolutionKey },
                    body: JSON.stringify({ number: phoneNumber, textMessage: { text: responseText }, options: { delay: 1200, presence: "composing" } }),
                    signal: AbortSignal.timeout(15000),
                  });
                  if (res.ok) {
                    await supabase.from("whatsapp_messages").insert({
                      conversation_id: conversation.id, direction: "outbound",
                      content: responseText, status: "sent", message_type: messageTypeOut,
                    });
                    console.log(`[Auto-Response] Enviado para ${phoneNumber}`);
                  } else {
                    console.error(`[Auto-Response] Falhou ${res.status}: ${await res.text()}`);
                  }
                } catch (sendError) { console.error("[Auto-Response] Erro:", sendError); }
              }
            }
          }
        } catch (itemError) { console.error("Item error:", itemError); }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Top-level error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
