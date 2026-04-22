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
    const SUPABASE_PROJECT_ID = Deno.env.get("SUPABASE_PROJECT_ID") || "nglwscakhhdhelhbqkyb";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || `https://${SUPABASE_PROJECT_ID}.supabase.co`;

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Ignore empty body
    }

    const { action = "get-status", instanceName = "SD-Moveis" } = body;
    console.log(`[Action: ${action}] Instance: ${instanceName}`);

    if (action === "get-status") {
      const url = `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
      console.log(`[Status Check] Fetching: ${url}`);
      try {
        const res = await fetch(url, {
          headers: { "apikey": EVOLUTION_API_KEY }
        });
        const data = await res.json();
        console.log(`[Status Check] Response Status: ${res.status}`, data);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchErr) {
        console.error(`[Status Check] Fetch error:`, fetchErr);
        return new Response(JSON.stringify({ status: 500, error: fetchErr.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "sync-webhook") {
       const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
       const res = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
         method: "POST",
         headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
         body: JSON.stringify({
           enabled: true,
           url: webhookUrl,
           webhook_by_events: false,
           events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
         })
       });
       const data = await res.text();
       return new Response(JSON.stringify({ ok: res.ok, data }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    if (action === "logout") {
       const res = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
         method: "DELETE",
         headers: { "apikey": EVOLUTION_API_KEY }
       });
       // Try force delete if logout fails
       if (!res.ok) {
         await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
           method: "DELETE",
           headers: { "apikey": EVOLUTION_API_KEY }
         });
       }
       return new Response(JSON.stringify({ ok: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    if (action === "connect") {
       console.log(`[Connect] Triggering instance creation and connection for: ${instanceName}`);
       
       // Ensure instance exists first. For Evolution API v1.8.x, token is often required in body
       try {
         const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
           method: "POST",
           headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
           body: JSON.stringify({ 
             instanceName, 
             token: EVOLUTION_API_KEY, // Using the same API Key as the instance token for simplicity
             qrcode: true 
           })
         });
         const createData = await createRes.text();
         console.log(`[Connect] Create Instance Response (${createRes.status}):`, createData);
       } catch (err) {
         console.error(`[Connect] Create Instance Error (ignoring if already exists):`, err);
       }

       // Sync webhook immediately
       try {
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
       } catch (err) {
         console.error(`[Connect] Webhook sync error:`, err);
       }

       // Request connection (QR Code)
       console.log(`[Connect] Fetching QR Code from: ${EVOLUTION_API_URL}/instance/connect/${instanceName}`);
       const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
         headers: { "apikey": EVOLUTION_API_KEY }
       });
       
       const responseData = await res.json().catch(() => ({}));
       console.log(`[Connect] Connection Response (${res.status}):`, responseData);

       if (res.status === 404) {
         return new Response(JSON.stringify({ 
           error: "Instância não encontrada. Tente novamente em alguns segundos (Cold Start).",
           status: 404 
         }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }

       return new Response(JSON.stringify(responseData), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 with error object so UI can show it
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
