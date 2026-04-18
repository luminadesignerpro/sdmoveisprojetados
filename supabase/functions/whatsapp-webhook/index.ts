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
    console.log(`[Webhook Event: ${payload.event}] Payload data received`);

    const event = (payload.event || "").toUpperCase();

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
          
          if (!remoteJid) continue;

          // Skip groups
          if (remoteJid.includes('@g.us')) continue;

          const msgBody = messageData.message || payload.data?.message || messageData || {};
          
          const messageContent =
            msgBody.conversation ||
            msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption ||
            msgBody.videoMessage?.caption ||
            msgBody.templateButtonReplyMessage?.selectedDisplayText ||
            msgBody.buttonsResponseMessage?.selectedDisplayText ||
            msgBody.listResponseMessage?.title ||
            msgBody.documentWithCaptionMessage?.message?.documentMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation ||
            payload.data?.content || 
            "";

          if (!messageContent && !fromMe) continue;

          // Extract and clean phone number
          const rawId = remoteJid.split("@")[0] || "";
          let phoneNumber = rawId.split(":")[0].replace(/[^0-9]/g, ""); 
          
          if (phoneNumber.length >= 10 && !phoneNumber.startsWith("55") && !phoneNumber.startsWith("1")) {
            phoneNumber = "55" + phoneNumber;
          }
          
          if (!phoneNumber || phoneNumber.length < 5) continue;

          const pushName = messageData.pushName || payload.data?.pushName || null;
          console.log(`[Processing] From: ${phoneNumber} | Content: ${messageContent.slice(0, 30)}...`);

          // Find or create conversation
          let { data: conversation } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("phone_number", phoneNumber)
            .maybeSingle();

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
              continue;
            }
            conversation = newConv;
          } else if (pushName) {
            await supabase
              .from("whatsapp_conversations")
              .update({ contact_name: pushName })
              .eq("id", conversation.id);
          }

          // Save message
          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversation.id,
            direction: fromMe ? 'outbound' : 'inbound',
            content: messageContent,
            status: fromMe ? 'delivered' : 'received',
            message_type: 'text',
            external_id: key.id || messageData.id
          });

          await supabase
            .from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString(), last_message: messageContent.slice(0, 100) })
            .eq("id", conversation.id);

          // AUTO-RESPONSE LOGIC (Only for inbound)
          if (!fromMe) {
            const geminiKey = Deno.env.get('GEMINI_API_KEY');
            const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://api-whatsapp-sdmoveis.onrender.com';
            const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') || 'Mv06061991';

            const cleanMessage = messageContent.trim().toLowerCase();
            let responseText = '';
            let messageTypeOut = 'text';

            // 1. Menu Logic
            const { data: configData } = await supabase
              .from('atendimento_config')
              .select('conteudo')
              .eq('chave', 'menu_principal')
              .maybeSingle();

            const config = configData?.conteudo || {
              greeting: 'Olá! 👋 Bem-vindo à SD Móveis!\nComo posso te ajudar?\n\n1️⃣ Orçamento\n2️⃣ Acompanhar projeto\n3️⃣ Pós-venda\n4️⃣ Falar com atendente',
              responses: {},
            };

            const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|inicio|menu)$/i.test(cleanMessage);
            const normalizedMatch = cleanMessage.replace(/[^0-9]/g, '');

            if (isGreeting) {
              responseText = config.greeting;
            } else if (config.responses && config.responses[normalizedMatch]) {
              responseText = config.responses[normalizedMatch];
            }

            // 2. AI Logic (Gemini)
            if (!responseText && geminiKey) {
              const systemPrompt = `Você é o Consultor Especialista da SD Móveis Projetados. Seu tom: Persuasivo, elegante e caloroso. Responda de forma direta em no máximo 3 frases.`;
              try {
                const geminiRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: `${systemPrompt}\n\nCliente: ${messageContent}\n\nConsultor:` }] }],
                    }),
                  }
                );
                const geminiData = await geminiRes.json();
                responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                messageTypeOut = 'ai';
              } catch (e) {
                console.error('Gemini Error:', e);
              }
            }

            // 3. Send via Evolution API
            if (responseText) {
              const res = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
                body: JSON.stringify({
                  number: phoneNumber, // Use clean phone number
                  text: responseText,
                  options: { delay: 1200, presence: 'composing' },
                }),
              });

              if (res.ok) {
                await supabase.from('whatsapp_messages').insert({
                  conversation_id: conversation.id,
                  direction: 'outbound',
                  content: responseText,
                  status: 'sent',
                  message_type: messageTypeOut,
                });
              }
            }
          }
        } catch (itemError) {
          console.error('Item processing error:', itemError);
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, event: event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Webhook top-level error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
