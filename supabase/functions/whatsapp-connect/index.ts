import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://api-whatsapp-sdmoveis.onrender.com";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";
    const DB_PASSWORD = Deno.env.get("SUPABASE_DB_PASSWORD") || "Mv@1307202031011985";
    const SUPABASE_PROJECT_ID = Deno.env.get("SUPABASE_PROJECT_ID") || "nglwscakhhdhelhbqkyb";

    const { action, instanceName = "SD-Moveis" } = await req.json();

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
       // 1. Tentar criar ou garantir que existe com banco de dados
       console.log("Creating/Updating instance with DB persistence...");
       const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
       
       await fetch(`${EVOLUTION_API_URL}/instance/create`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
         body: JSON.stringify({
           instanceName,
           qrcode: true,
           integration: "WHATSAPP-BAILEYS",
           database: {
             enabled: true,
             type: "postgres",
             host: `db.${SUPABASE_PROJECT_ID}.supabase.co`,
             port: 5432,
             user: "postgres",
             password: DB_PASSWORD,
             database: "postgres",
             ssl: true
           }
         })
       });

       // 2. Registrar o Webhook
       console.log("Registering webhook...");
       await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
         body: JSON.stringify({
           enabled: true,
           url: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
           webhook_by_events: false,
           events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
         })
       });

       // 3. Pedir o QR Code
       const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
         headers: { "apikey": EVOLUTION_API_KEY }
       });
       const data = await res.json();

       return new Response(JSON.stringify(data), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
