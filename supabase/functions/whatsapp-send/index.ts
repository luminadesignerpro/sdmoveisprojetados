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

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";

    const { conversationId, message, phoneNumber, mediaUrl, fileName } = await req.json();

    if (!conversationId || (!message && !mediaUrl)) {
      return new Response(
        JSON.stringify({ error: "conversationId and either message or mediaUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get conversation phone number if not provided
    let targetPhone = phoneNumber;
    if (!targetPhone) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("phone_number")
        .eq("id", conversationId)
        .single();
      targetPhone = conv?.phone_number;
    }

    if (!targetPhone) {
      return new Response(
        JSON.stringify({ error: "Could not determine phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number from suffixes (:1, etc)
    targetPhone = targetPhone.split(":")[0].replace(/[^0-9]/g, "");

    let sendResult = { mode: "simulation", sent: false };

    // Try to send via Evolution API if configured
    if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      try {
        let endpoint = `${EVOLUTION_API_URL}/message/sendText/SD-Moveis`;
        let body: any = {
          number: targetPhone,
          text: message,
        };

        if (mediaUrl) {
          endpoint = `${EVOLUTION_API_URL}/message/sendMedia/SD-Moveis`;
          body = {
            number: targetPhone,
            media: mediaUrl,
            mediatype: "document",
            caption: message || "",
            fileName: fileName || "documento.pdf"
          };
        }

        const evolutionResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify(body),
        });

        if (evolutionResponse.ok) {
          sendResult = { mode: "real", sent: true };
          console.log(`Message sent via Evolution API to ${targetPhone}`);
        } else {
          const errText = await evolutionResponse.text();
          console.error("Evolution API error:", evolutionResponse.status, errText);
          sendResult = { mode: "simulation", sent: false };
        }
      } catch (evoError) {
        console.error("Evolution API connection error:", evoError);
        sendResult = { mode: "simulation", sent: false };
      }
    } else {
      console.log("Evolution API not configured, running in simulation mode");
    }

    // Save message to database regardless of send mode
    const { data: savedMsg, error: msgError } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: mediaUrl ? (message || "PDF: " + (fileName || "documento.pdf")) : message,
        status: sendResult.sent ? "delivered" : "pending",
        message_type: mediaUrl ? "document" : "text",
      })
      .select()
      .single();

    if (msgError) {
      console.error("Error saving message:", msgError);
      throw msgError;
    }

    // Update last_message_at
    await supabase
      .from("whatsapp_conversations")
      .update({ 
        last_message_at: new Date().toISOString(),
        last_message: mediaUrl ? "📄 PDF Enviado" : message
      })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: savedMsg,
        mode: sendResult.mode,
        sent: sendResult.sent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("whatsapp-send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
