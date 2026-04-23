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
          
          // --- CORREÇÃO DE NÚMERO (BRAZIL FIX) ---
          let phoneNumber = jidRaw;
          if (phoneNumber.startsWith("550")) {
            phoneNumber = "55" + phoneNumber.slice(3); // Corrige 55075 para 5575
          }
          if (phoneNumber.length >= 10 && phoneNumber.length <= 11 && !phoneNumber.startsWith("55")) {
            phoneNumber = "55" + phoneNumber;
          }
          console.log(`[JID Raw] ${jidRaw} -> Processado: ${phoneNumber}`);

          const msgBody = messageData.message || payload.data?.message || messageData || {};
          const messageContent =
            msgBody.conversation || msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption || msgBody.videoMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation || payload.data?.content || "";

          if (!messageContent && !fromMe) continue;

          const pushName = messageData.pushName || payload.data?.pushName || null;

          // Busca conversa existente pelos ultimos 8 digitos
          const last8 = phoneNumber.slice(-8);
          const { data: convs } = await supabase
            .from("whatsapp_conversations")
            .select("id, phone_number")
            .ilike("phone_number", `%${last8}`);

          let conversation = convs?.[0] || null;

          if (conversation) {
            phoneNumber = conversation.phone_number;
            console.log(`[Conversation] Encontrada: ${phoneNumber}`);
            if (pushName) {
              await supabase.from("whatsapp_conversations").update({ contact_name: pushName }).eq("id", conversation.id);
            }
          } else {
            console.log(`[Conversation] Criando nova para: ${phoneNumber}`);
            const { data: newConv, error: convError } = await supabase
              .from("whatsapp_conversations")
              .insert({ phone_number: phoneNumber, contact_name: pushName, status: "active", lead_status: "lead" })
              .select("id, phone_number").single();
            if (convError) { console.error("Erro ao criar conversa:", convError); continue; }
            conversation = newConv;
          }

          console.log(`[Processing] phone: ${phoneNumber} | fromMe: ${fromMe} | Content: "${messageContent.slice(0, 50)}"`);

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
              console.log(`[Rate Limit] Pulando resposta automática para evitar loop.`);
            } else {
              const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
              const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

              const cleanMessage = messageContent.trim().toLowerCase();
              let responseText = "";
              let messageTypeOut = "text";

              const { data: configData } = await supabase.from("atendimento_config").select("conteudo").eq("chave", "menu_principal").maybeSingle();
              const config = configData?.conteudo || {
                greeting: "Olá! Bem-vindo à SD Móveis!\nComo posso te ajudar?",
                responses: {},
              };

              const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|inicio|menu)$/i.test(cleanMessage);
              const normalizedMatch = cleanMessage.replace(/[^0-9]/g, "");
              if (isGreeting) responseText = config.greeting;
              else if (config.responses?.[normalizedMatch]) responseText = config.responses[normalizedMatch];

              if (!responseText) {
                try {
                  const groqKey = Deno.env.get("GROQ_API_KEY");
                  if (!groqKey) {
                    console.warn("[Groq] GROQ_API_KEY não configurada.");
                  } else {
                    console.log(`[Groq] Iniciando requisição com mensagem: "${messageContent.slice(0, 50)}"`);
                    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
                      body: JSON.stringify({
                        model: "mixtral-8x7b-32768",
                        messages: [
                          { role: "system", content: "Você é o Consultor Especialista da SD Móveis Projetados em Fortaleza. Tom persuasivo e elegante. Máximo 3 frases." },
                          { role: "user", content: messageContent }
                        ],
                        max_tokens: 150, temperature: 0.7,
                      }),
                      signal: AbortSignal.timeout(10000),
                    });

                    if (groqRes.ok) {
                      const groqData = await groqRes.json();
                      responseText = groqData.choices?.[0]?.message?.content || "";
                      messageTypeOut = "ai";
                      console.log(`[Groq] ✅ Resposta gerada: "${responseText.slice(0, 50)}..."`);
                    }
                  }
                } catch (e) { console.error("[Groq Error]:", e.message); }
              }

              if (responseText) {
                console.log(`[Auto-Response] Enviando para: ${phoneNumber}`);
                try {
                  const res = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "apikey": evolutionKey },
                    body: JSON.stringify({ 
                      number: phoneNumber, 
                      textMessage: { text: responseText }, 
                      options: { delay: 1200, presence: "composing" } 
                    }),
                  });

                  if (res.ok) {
                    await supabase.from("whatsapp_messages").insert({
                      conversation_id: conversation.id, direction: "outbound",
                      content: responseText, status: "sent", message_type: messageTypeOut,
                    });
                    console.log(`[Auto-Response] ✅ Mensagem entregue via Evolution.`);
                  }
                } catch (sendError) { console.error("[Auto-Response] ❌ Erro ao enviar:", sendError.message); }
              }
            }
          }
        } catch (itemError) { console.error("Erro no processamento do item:", itemError); }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Top-level error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
