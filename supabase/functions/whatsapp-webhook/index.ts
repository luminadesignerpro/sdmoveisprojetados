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
    console.log(`[Webhook Event: ${payload.event}] Payload:`, JSON.stringify(payload).slice(0, 1000));

    const event = (payload.event || "").toUpperCase();

    if (event.includes("MESSAGES") && (event.includes("UPSERT") || event.includes("CREATE"))) {
      // Handle both single message and array of messages
      const dataItems = Array.isArray(payload.data?.messages) 
        ? payload.data.messages 
        : payload.data?.message ? [payload.data.message] : [payload.data || {}];

      for (const messageData of dataItems) {
        try {
          if (!messageData || (!messageData.key && !messageData.message)) continue;

          const key = messageData.key;
          const fromMe = key?.fromMe || false;
          const remoteJid = key?.remoteJid || messageData.remoteJid || payload.data?.key?.remoteJid || "";
          
          // Evolution API can have different structures for the message object
          const msgBody = messageData.message || payload.data?.message || {};
          
          const messageContent =
            msgBody.conversation ||
            msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption ||
            msgBody.videoMessage?.caption ||
            msgBody.documentWithCaptionMessage?.message?.documentMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation || 
            "";

          console.log(`Processing message from ${remoteJid}: "${messageContent.slice(0, 50)}..." (fromMe: ${fromMe})`);

          if (!remoteJid || remoteJid.includes('@g.us')) {
            console.log('Skipping: group or empty jid', remoteJid);
            continue;
          }

          if (!messageContent && !fromMe) {
            console.log('Skipping inbound message: no text content', { remoteJid });
            continue;
          }

          // Extract phone number from JID (handle multi-device suffixes like :0)
          const phoneNumber = remoteJid.split("@")[0].split(":")[0];
          const pushName = messageData.pushName || payload.data?.pushName || null;
          
          console.log(`Checking conversation for phone: ${phoneNumber}, name: ${pushName}`);

          // Find or create conversation
          let { data: conversation, error: selectError } = await supabase
            .from("whatsapp_conversations")
            .select("id")
            .eq("phone_number", phoneNumber)
            .maybeSingle();

          if (selectError) {
            console.error("Error selecting conversation:", selectError);
          }

          if (!conversation) {
            console.log(`Creating new conversation for ${phoneNumber}...`);
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
            console.log(`Conversation created with ID: ${conversation.id}`);
          } else if (pushName) {
            await supabase
              .from("whatsapp_conversations")
              .update({ contact_name: pushName })
              .eq("id", conversation.id);
          }

          // Deduplicate: avoid saving the same message twice
          const msgId = key?.id;
          if (msgId) {
            const { data: existing } = await supabase
              .from('whatsapp_messages')
              .select('id')
              .eq('external_id', msgId)
              .maybeSingle();
            if (existing) {
              console.log('Duplicate message skipped:', msgId);
              continue;
            }
          }

          // Save the message to database
          const { error: msgError } = await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: conversation.id,
              direction: fromMe ? 'outbound' : 'inbound',
              content: messageContent,
              status: fromMe ? 'delivered' : 'received',
              message_type: 'text',
              external_id: msgId || null,
            });

          if (msgError) {
            console.error('Error saving message:', msgError);
          }

          await supabase
            .from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversation.id);

          // AUTO-RESPONSE LOGIC
          if (!fromMe) {
            try {
              const geminiKey = Deno.env.get('GEMINI_API_KEY');
              const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://api-whatsapp-sdmoveis.onrender.com';
              const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') || 'Mv06061991';

              const cleanMessage = messageContent.trim().toLowerCase();
              let responseText = '';
              let messageTypeOut = 'text';

              const { data: configData } = await supabase
                .from('atendimento_config')
                .select('conteudo')
                .eq('chave', 'menu_principal')
                .maybeSingle();

              const config = configData?.conteudo || {
                greeting: 'Olá! 👋 Bem-vindo à *SD Móveis*!\nComo posso te ajudar?\n\n1️⃣ Orçamento\n2️⃣ Acompanhar projeto\n3️⃣ Pós-venda\n4️⃣ Falar com atendente',
                responses: {},
              };

              const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|bomdia|boatarde|boanoite|inicio|menu|opa|oie|hey|hi|hello)$/i.test(cleanMessage);

              const normalizedMessage = cleanMessage
                .replace(/1️⃣|1/g, '1')
                .replace(/2️⃣|2/g, '2')
                .replace(/3️⃣|3/g, '3')
                .replace(/4️⃣|4/g, '4')
                .replace(/5️⃣|5/g, '5')
                .trim();

              if (isGreeting) {
                responseText = config.greeting;
              } else if (config.responses && config.responses[normalizedMessage]) {
                responseText = config.responses[normalizedMessage];
              }

              if (!responseText && geminiKey) {
                console.log('Using Gemini for humanized AI response...');
                const systemPrompt = `Você é o Consultor Especialista da SD Móveis Projetados. Seu tom: Persuasivo, elegante, caloroso e de altíssimo padrão.`;
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemPrompt}\n\nMensagem do cliente: ${messageContent}\n\nResponda de forma natural, direta e em português. Máximo 3 frases.` }] }],
                }),
              }
            );

                const geminiData = await geminiRes.json();
                const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                responseText = rawText.trim();
                messageTypeOut = 'ai';
              }

              if (responseText) {
                const sendRes = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
                  body: JSON.stringify({
                    number: remoteJid,
                    text: responseText,
                    options: { delay: messageTypeOut === 'ai' ? 2000 : 500, presence: 'composing' },
                  }),
                });

                if (sendRes.ok) {
                  await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversation.id,
                    direction: 'outbound',
                    content: responseText,
                    status: 'sent',
                    message_type: messageTypeOut,
                  });
                }
              }
            } catch (aiError) {
              console.error('Auto-response error:', aiError);
            }
          }
        } catch (itemError) {
          console.error('Error processing message item:', itemError);
        }
      }

      return new Response(JSON.stringify({ ok: true, processed: dataItems.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connection events
    if (event === "CONNECTION.UPDATE" || event === "CONNECTION_UPDATE") {
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
