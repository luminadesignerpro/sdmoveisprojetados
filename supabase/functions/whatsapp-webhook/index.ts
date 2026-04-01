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
        payload.data?.message?.conversation || // Fallback
        "";

      if (!messageContent || !remoteJid) {
        console.log("Skipping message: no content or jid", { remoteJid, content: !!messageContent });
        return new Response(JSON.stringify({ ok: true, skipped: "no content or jid" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

      // Save the message to database
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
      }

      await supabase
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      // ============================================
      // DYNAMIC ATTENDANCE FLOW (Synced with App)
      // ============================================
      const { data: configData } = await supabase
        .from('atendimento_config')
        .select('conteudo')
        .eq('chave', 'menu_principal')
        .single();
      
      const config = configData?.conteudo || {
        greeting: "Olá! 👋 Bem-vindo à *SD Móveis*!\nComo posso te ajudar hoje?\n\n1️⃣ Orçamento\n2️⃣ Acompanhar projeto\n3️⃣ Pós-venda\n4️⃣ Atendente\n5️⃣ Horário",
        responses: {}
      };

      const cleanMessage = messageContent.trim().toLowerCase();
      let responseText = "";
      let usedFlow = false;

      // 1. Better Greeting Detection (No gaps)
      const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|bomdia|boatarde|boanoite|inicio|menu|ola|opa|oie)$/i.test(cleanMessage);

      // 2. Check for menu numbers OR greetings
      if (config.responses && config.responses[cleanMessage]) {
        responseText = config.responses[cleanMessage];
        usedFlow = true;
      } else if (isGreeting) {
        responseText = config.greeting;
        usedFlow = true;
      }

      // AI VIRTUAL ASSISTANT LOGIC (Fallback or Humanized Support)
      if (!fromMe) {
        try {
            const geminiKey = Deno.env.get("GEMINI_API_KEY");
            const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
            const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

            if (!usedFlow && geminiKey) {
               console.log("Using Gemini for humanized response...");
               const systemPrompt = `Você é a Assistente Virtual da SD Móveis Projetados.
               Seu objetivo: ajudar o cliente de forma educada e guiá-lo para as opções do menu.
               Menu atual: 1. Orçamento, 2. Acompanhar Projeto, 3. Pós-venda, 4. Atendente, 5. Horário.
               Dica: Se ele for novo, apresente o menu. Se ele tiver dúvida, responda e cite o menu.
               Informação importante: ${config.responses["5"] || "Consulte o menu para horários."}`;
               
               const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     contents: [{ parts: [{ text: `${systemPrompt}\n\nCliente: ${messageContent}` }] }]
                  })
               });
               
               const geminiData = await geminiRes.json();
               responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }

            if (responseText) {
                const sendRes = await fetch(`${evolutionUrl}/message/sendText/SD-Moveis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
                    body: JSON.stringify({
                        number: remoteJid,
                        text: responseText,
                        options: { delay: usedFlow ? 500 : 1500, presence: "composing" }
                    })
                });
                
                if (sendRes.ok) {
                    await supabase.from("whatsapp_messages").insert({
                        conversation_id: conversation.id,
                        direction: "outbound",
                        content: responseText,
                        status: "sent",
                        message_type: usedFlow ? "text" : "ai",
                    });
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
