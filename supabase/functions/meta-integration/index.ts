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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. VERIFICAÇÃO DE WEBHOOK (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("META_VERIFY_TOKEN") || "sdmoveis_crm";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. RECEBIMENTO DE MENSAGENS (POST)
  try {
    const body = await req.json();
    console.log("Webhook Meta Received:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messaging = entry?.messaging?.[0]; // Messenger/Instagram use a different structure

    let platform: "whatsapp" | "instagram" = "whatsapp";
    let senderId = "";
    let messageContent = "";
    let contactName = "";
    let externalId = "";

    // --- LÓGICA WHATSAPP ---
    if (changes?.value?.messages?.[0]) {
      platform = "whatsapp";
      const message = changes.value.messages[0];
      const contact = changes.value.contacts?.[0];
      
      senderId = message.from; // Número de telefone
      messageContent = message.text?.body || message.image?.caption || "Mídia recebida";
      contactName = contact?.profile?.name || "";
      externalId = message.id;
    } 
    // --- LÓGICA INSTAGRAM ---
    else if (messaging) {
      platform = "instagram";
      senderId = messaging.sender.id;
      messageContent = messaging.message?.text || "Mídia recebida";
      externalId = messaging.message?.mid;
      // Nome do contato requer uma chamada extra na API da Meta ou salvar vazio primeiro
      contactName = "Instagram User";
    }

    if (senderId && messageContent) {
      // 1. Buscar ou Criar Conversa
      let { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("platform_user_id", senderId)
        .eq("platform", platform)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv } = await supabase
          .from("whatsapp_conversations")
          .insert({
            phone_number: platform === "whatsapp" ? senderId : "instagram",
            platform_user_id: senderId,
            platform: platform,
            contact_name: contactName,
            status: "active",
            lead_status: "lead"
          })
          .select("id")
          .single();
        conversation = newConv;
      }

      // 2. Salvar Mensagem
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversation.id,
        direction: "inbound",
        content: messageContent,
        status: "received",
        external_id: externalId,
        metadata: { raw: body }
      });

      // 3. Atualizar Conversa
      await supabase
        .from("whatsapp_conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message: messageContent.slice(0, 100)
        })
        .eq("id", conversation.id);

      // (Opcional) Chamar Gemini para responder aqui
    }

    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Error processing Meta webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
