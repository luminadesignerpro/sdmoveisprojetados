import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-202b.up.railway.app";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";
    const SUPABASE_PROJECT_ID = Deno.env.get("SUPABASE_PROJECT_ID") || "nglwscakhhdhelhbqkyb";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || `https://${SUPABASE_PROJECT_ID}.supabase.co`;

    let body: any = {};
    try { body = await req.json(); } catch (e) { }

    const { action = "get-status", instanceName = "SD-Moveis" } = body;

    if (action === "sync-webhook") {
       const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
       
       // FIX V2: Eventos em minúsculo para compatibilidade total
       const webhookConfig = {
         enabled: true,
         url: webhookUrl,
         webhook_by_events: false,
         events: [
           "messages.upsert",
           "messages.update",
           "messages.delete",
           "send.message",
           "connection.update",
           "type.change"
         ]
       };

       const res = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
         body: JSON.stringify({ webhook: webhookConfig })
       });
       
       const data = await res.text();
       return new Response(JSON.stringify({ ok: res.ok, data }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    if (action === "get-status") {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, { 
        headers: { "apikey": EVOLUTION_API_KEY } 
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "connect") {
       const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
         headers: { "apikey": EVOLUTION_API_KEY }
       });
       const responseData = await res.json().catch(() => ({}));
       return new Response(JSON.stringify(responseData), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
