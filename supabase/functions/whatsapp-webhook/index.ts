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

    // Evolution API webhook format (can be v1 or v2)
    const event = (payload.event || "").toUpperCase();

    if (event === "MESSAGES.UPSERT" || event === "MESSAGES_UPSERT") {
      const messageData = payload.data;
      if (!messageData) {
        return new Response(JSON.stringify({ ok: true, skipped: "no data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const key = messageData.key;
      const fromMe = key?.fromMe || false;
      const remoteJid = key?.remoteJid || "";
      
      // Handle different message structures in v2
      const messageContent =
        messageData.message?.conversation ||
        messageData.message?.extendedTextMessage?.text ||
        messageData.message?.imageMessage?.caption ||
        messageData.message?.videoMessage?.caption ||
        messageData.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        messageData.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        messageData.message?.ephemeralMessage?.message?.conversation ||
        messageData.conversation || // Fallback 1
        payload.data?.message?.conversation || // Fallback 2
        "";

      if (!remoteJid || remoteJid.includes('@g.us')) {
        // Skip group messages and empty JIDs
        console.log('Skipping: group or empty jid', remoteJid);
        return new Response(JSON.stringify({ ok: true, skipped: 'group or empty jid' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!messageContent) {
        console.log('Skipping message: no content', { remoteJid });
        return new Response(JSON.stringify({ ok: true, skipped: 'no content' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone number from JID
      const phoneNumber = remoteJid.split("@")[0];
      const pushName = messageData.pushName || payload.data?.pushName || null;

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
          throw convError;
        }
        conversation = newConv;
      } else if (pushName) {
        await supabase
          .from("whatsapp_conversations")
          .update({ contact_name: pushName })
          .eq("id", conversation.id);
      }

      // Deduplicate: avoid saving the same message twice if the webhook fires twice
      const msgId = key?.id;
      if (msgId) {
        const { data: existing } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('external_id', msgId)
          .maybeSingle();
        if (existing) {
          console.log('Duplicate message skipped:', msgId);
          return new Response(JSON.stringify({ ok: true, skipped: 'duplicate' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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

      // ============================================
      // AUTO-RESPONSE LOGIC (Flow Menu + AI Fallback)
      // ============================================
      if (!fromMe) {
        try {
          const geminiKey = Deno.env.get('GEMINI_API_KEY');
          const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://api-whatsapp-sdmoveis.onrender.com';
          const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') || 'Mv06061991';

          const cleanMessage = messageContent.trim().toLowerCase();
          let responseText = '';
          let messageTypeOut = 'text';

          // --- Step 1: Check dynamic flow menu from atendimento_config ---
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

          // Normalização de números com emoji para as chaves do menu (1️⃣ -> 1)
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

          // --- Step 2: AI Gemini for all other messages (no flow matched OR always) ---
          if (!responseText && geminiKey) {
            console.log('Using Gemini for humanized AI response...');

            const systemPrompt = `Você é o Consultor Especialista da SD Móveis Projetados.
Seu tom: Persuasivo, elegante, caloroso e de altíssimo padrão.

REGRAS DE OURO:
1. NUNCA dê preços ou valores. Explique que o CEO orça pessoalmente após análise de fotos e medidas.
2. Mencione diferenciais: MDF 18mm, 5 anos de garantia, tecnologia AR exclusiva.
3. Tente capturar o lead: peça fotos do cômodo via Studio AR (https://sdmoveis.com.br/studio-ar).
4. Responda de forma natural, como um consultor humano no WhatsApp.
5. Respostas curtas e diretas. Máximo 3 parágrafos.

FORMATO DE RESPOSTA (JSON obrigatório):
{ "response": "Texto para o cliente", "score": nota_0_a_10, "summary": "Resumo do interesse" }`;

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemPrompt}\n\nMensagem do cliente: ${messageContent}` }] }],
                  generationConfig: { response_mime_type: 'application/json' },
                }),
              }
            );

            const geminiData = await geminiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            let aiResult: any = {};
            try { aiResult = JSON.parse(rawText); } catch { aiResult = { response: '' }; }

            responseText = aiResult.response || '';
            messageTypeOut = 'ai';

            // Update lead score and summary
            if (aiResult.score !== undefined) {
              await supabase
                .from('whatsapp_conversations')
                .update({
                  lead_score: aiResult.score,
                  ai_summary: aiResult.summary,
                  status: aiResult.score >= 8 ? 'hot' : 'active',
                })
                .eq('id', conversation.id);
            }
          }

          // --- Step 3: Send the response via Evolution API ---
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
              console.log(`Auto-response sent (${messageTypeOut}) to ${phoneNumber}`);
            } else {
              const errBody = await sendRes.text();
              console.error('Evolution send error:', sendRes.status, errBody);
            }
          }
        } catch (aiError) {
          console.error('Auto-response error:', aiError);
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
