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
    
    // Normaliza o evento para maiúsculo (Evolution v2 envia em minúsculo)
    const event = (payload.event || "").toUpperCase();
    console.log(`[WEBHOOK] Evento recebido: ${event}`);

    if (event.includes("MESSAGES") && (event.includes("UPSERT") || event.includes("CREATE"))) {
      const dataItems = Array.isArray(payload.data?.messages)
        ? payload.data.messages
        : [payload.data || {}];

      for (const messageData of dataItems) {
        try {
          if (!messageData) continue;
          
          const key = messageData.key || {};
          const fromMe = key.fromMe || messageData.fromMe || false;
          const remoteJid = key.remoteJid || messageData.remoteJid || payload.data?.key?.remoteJid || payload.data?.remoteJid || "";
          
          if (!remoteJid || remoteJid.includes("@g.us")) {
            console.log("[WEBHOOK] Mensagem ignorada (vazia ou grupo)");
            continue;
          }

          // NORMALIZAÇÃO DE NÚMERO (BRASIL)
          const jidRaw = remoteJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
          let phoneNumber = jidRaw;
          
          // Se o número vier sem o 55, adiciona
          if (phoneNumber.length >= 10 && phoneNumber.length <= 11 && !phoneNumber.startsWith("55")) {
            phoneNumber = "55" + phoneNumber;
          }
          
          // Garante o formato 55DD9XXXXXXXX para números do Brasil com 12 dígitos (faltando o 9)
          if (phoneNumber.startsWith("55") && phoneNumber.length === 12) {
            phoneNumber = phoneNumber.slice(0, 4) + "9" + phoneNumber.slice(4);
          }

          console.log(`[WEBHOOK] Processando número: ${phoneNumber} (Original: ${jidRaw})`);

          // Extração de conteúdo
          const msgBody = messageData.message || payload.data?.message || messageData || {};
          
          // Detecta se é áudio, figurinha ou mídia sem texto
          const isAudio = msgBody.audioMessage || msgBody.ephemeralMessage?.message?.audioMessage || false;
          const isSticker = msgBody.stickerMessage || msgBody.ephemeralMessage?.message?.stickerMessage || false;
          const isMedia = isAudio || isSticker || msgBody.imageMessage || msgBody.videoMessage || msgBody.documentMessage;

          let messageContent =
            msgBody.conversation || 
            msgBody.extendedTextMessage?.text ||
            msgBody.imageMessage?.caption || 
            msgBody.videoMessage?.caption ||
            msgBody.ephemeralMessage?.message?.extendedTextMessage?.text ||
            msgBody.ephemeralMessage?.message?.conversation ||
            messageData.conversation || 
            payload.data?.content || "";

          // Se for áudio, figurinha ou mídia sem legenda, define um conteúdo simbólico para processar
          if (!messageContent && isMedia && !fromMe) {
            messageContent = isAudio ? "[AUDIO]" : (isSticker ? "[STICKER]" : "[MEDIA]");
            console.log(`[WEBHOOK] Mídia detectada (${messageContent}), processando fluxo.`);
          }

          if (!messageContent && !fromMe) {
            console.log("[WEBHOOK] Mensagem sem conteúdo ignorada.");
            continue;
          }

          console.log(`[WEBHOOK] Conteúdo: ${messageContent.slice(0, 50)}...`);

          const pushName = messageData.pushName || payload.data?.pushName || "Cliente";
          
          // Busca conversa usando os últimos 8 dígitos (mais seguro para evitar confusão com o 9º dígito)
          const last8 = phoneNumber.slice(-8);
          const { data: convs, error: searchError } = await supabase
            .from("whatsapp_conversations")
            .select("id, phone_number")
            .ilike("phone_number", `%${last8}`);

          if (searchError) console.error("[WEBHOOK] Erro ao buscar conversa:", searchError);

          let conversation = convs?.[0] || null;

          if (conversation) {
            // Atualiza nome se disponível
            if (pushName && pushName !== "Cliente") {
              await supabase.from("whatsapp_conversations").update({ contact_name: pushName }).eq("id", conversation.id);
            }
          } else {
            console.log(`[WEBHOOK] Criando nova conversa para ${phoneNumber}`);
            const { data: newConv, error: convError } = await supabase
              .from("whatsapp_conversations")
              .insert({ 
                phone_number: phoneNumber, 
                contact_name: pushName, 
                status: "active", 
                lead_status: "lead" 
              })
              .select("id, phone_number").single();
            
            if (convError) {
              console.error("[WEBHOOK] Erro ao criar conversa:", convError);
              continue;
            }
            conversation = newConv;
          }

          // Salva a mensagem no banco
          const externalId = key.id || messageData.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (externalId) {
            await supabase.from("whatsapp_messages").upsert({
              external_id: externalId, 
              conversation_id: conversation.id,
              direction: fromMe ? "outbound" : "inbound",
              content: messageContent, 
              status: fromMe ? "delivered" : "received", 
              message_type: "text",
            }, { onConflict: "external_id" });
          }

          // Atualiza metadados da conversa
          await supabase.from("whatsapp_conversations")
            .update({ 
              last_message_at: new Date().toISOString(), 
              last_message: messageContent.slice(0, 100) 
            })
            .eq("id", conversation.id);

          // RESPOSTA AUTOMÁTICA (Apenas se não for mensagem nossa)
          if (!fromMe) {
            // Anti-loop: Verifica se já respondemos nos últimos 10 segundos
            const { data: recentResponses } = await supabase.from("whatsapp_messages")
              .select("id").eq("conversation_id", conversation.id).eq("direction", "outbound")
              .gt("created_at", new Date(Date.now() - 2000).toISOString()).limit(1);

            if (recentResponses && recentResponses.length > 0) {
              console.log("[WEBHOOK] Resposta ignorada (anti-loop: mensagem enviada recentemente)");
              continue;
            }

            const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "https://evolution-api-production-202b.up.railway.app";
            const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "Mv06061991";
            const instanceName = "SD-Moveis"; // Ajuste se o nome no Railway for diferente

            let responseText = "";
            let messageTypeOut = "text";

            // 1. Lógica do Menu Principal
            const { data: configData } = await supabase.from("atendimento_config").select("conteudo").eq("chave", "menu_principal").maybeSingle();
            const config = configData?.conteudo || { greeting: "Olá! Como posso ajudar?", responses: {} };

            const cleanMessage = messageContent.trim();
            const cleanMessageLower = cleanMessage.toLowerCase();
            const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|inicio|menu|ei|opa|oie|olá tudo bem|tudo bem)$/i.test(cleanMessageLower);
            const normalizedMatch = cleanMessageLower.replace(/[^0-9]/g, "");
            
            // VERIFICA SE ESTAMOS NO FLUXO DE BUSCA DE CONTRATO
            const isWaitingForContract = conversation.lead_status === "awaiting_contract";

            // Tenta processar como busca de contrato se estiver no estado correto OU se a mensagem for longa (provavelmente um nome) e não for um comando
            if ((isWaitingForContract || (cleanMessage.length > 3 && !isGreeting && !config.responses?.[normalizedMatch])) && !responseText) {
              console.log("[WEBHOOK] Tentando busca de contrato para:", cleanMessage);
              
              let foundEmployee = null;
              
              // 1. Tenta buscar por nome
              const { data: empsByName } = await supabase.from("employees")
                .select("name, password")
                .eq("role", "Cliente")
                .ilike("name", `%${cleanMessage}%`)
                .limit(1);
              
              if (empsByName && empsByName.length > 0) {
                foundEmployee = empsByName[0];
              } else {
                // 2. Tenta buscar por número do contrato
                const contractNumOnly = cleanMessage.replace(/[^0-9]/g, "");
                if (contractNumOnly.length > 0 && contractNumOnly.length < 5) {
                  const { data: contract } = await supabase.from("contracts")
                    .select("client_id")
                    .eq("contract_number", parseInt(contractNumOnly))
                    .maybeSingle();
                  
                  if (contract?.client_id) {
                    const { data: empsByEmail } = await supabase.from("employees")
                      .select("name, password")
                      .eq("role", "Cliente")
                      .eq("email", `cliente_${contract.client_id}@sdmoveis.com`)
                      .limit(1);
                    
                    if (empsByEmail && empsByEmail.length > 0) {
                      foundEmployee = empsByEmail[0];
                    }
                  }
                }
              }

              if (foundEmployee) {
                // Se achou, limpa o estado e define a resposta
                await supabase.from("whatsapp_conversations").update({ lead_status: "lead" }).eq("id", conversation.id);
                responseText = `Localizei seu cadastro, *${foundEmployee.name}*! 🎉\n\n` +
                  `🔐 *Sua senha de acesso:* ${foundEmployee.password}\n\n` +
                  `📱 *Acesse nosso app aqui:* https://sdmoveisprojetados-zeta.vercel.app/\n\n` +
                  `Selecione "Cliente" na tela inicial e use sua senha para acompanhar seu projeto!`;
              } else if (isWaitingForContract) {
                // Se estava esperando e não achou, avisa e limpa
                await supabase.from("whatsapp_conversations").update({ lead_status: "lead" }).eq("id", conversation.id);
                responseText = "Desculpe, não localizei nenhum cadastro com esse nome ou número de contrato. 😕\n\n" +
                  "Verifique se o nome está correto ou escolha uma opção do menu:\n\n" + config.greeting;
              }
            }

            // Se ainda não tiver resposta, tenta o menu normal ou trata mídia
            if (!responseText) {
              if (isGreeting) {
                responseText = config.greeting;
              } else if (messageContent === "[AUDIO]" || messageContent === "[STICKER]" || messageContent === "[MEDIA]") {
                // Resposta especial para mídias que o bot não processa mas deve responder
                const mediaLabel = messageContent === "[AUDIO]" ? "áudios" : (messageContent === "[STICKER]" ? "figurinhas" : "mídias");
                responseText = `Ainda não consigo processar ${mediaLabel}, mas estou à disposição! 😊\n\n` + config.greeting;
              } else if (config.responses?.[normalizedMatch]) {
                responseText = config.responses[normalizedMatch];
                
                // Se escolheu a opção 2, ativa o estado de espera
                if (normalizedMatch === "2") {
                  await supabase.from("whatsapp_conversations").update({ lead_status: "awaiting_contract" }).eq("id", conversation.id);
                }
              }
            }

            // 2. Lógica da IA (GROQ)
            if (!responseText) {
              const groqKey = Deno.env.get("GROQ_API_KEY");
              if (groqKey) {
                console.log(`[WEBHOOK] Chamando Groq AI para: "${messageContent}"`);
                try {
                  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json", 
                      "Authorization": `Bearer ${groqKey}` 
                    },
                    body: JSON.stringify({
                      model: "llama-3.3-70b-versatile", // Modelo mais robusto e inteligente
                      messages: [
                        { 
                          role: "system", 
                          content: "Você é o Consultor Especialista da SD Móveis. DIRETRIZES: 1. JAMAIS dê prazos de entrega (como 7-10 dias). 2. NÃO use saudações genéricas como 'Que prazer ter você aqui' no meio da conversa. 3. Seja direto e focado em converter o cliente para um projeto 3D gratuito. Use MDF 18mm e ferragens premium. Máximo 2 frases." 
                        }, 
                        { role: "user", content: messageContent }
                      ],
                      temperature: 0.7,
                      max_tokens: 500
                    }),
                  });
                  
                  if (groqRes.ok) {
                    const groqData = await groqRes.json();
                    responseText = groqData.choices?.[0]?.message?.content || "";
                    messageTypeOut = "ai";
                    console.log("[WEBHOOK] Resposta da IA gerada com sucesso.");
                  } else {
                    const errorText = await groqRes.text();
                    console.error(`[WEBHOOK] Erro na API do Groq (${groqRes.status}):`, errorText);
                    // Fallback para o menu principal se a IA falhar
                    responseText = "Olá! Não consegui processar sua mensagem agora, mas estou aqui para ajudar. 😊\n\n" + config.greeting;
                  }
                } catch (e) {
                  console.error("[WEBHOOK] Exceção ao chamar Groq:", e);
                  responseText = "Olá! Como posso te ajudar hoje? 😊\n\n" + config.greeting;
                }
              } else {
                console.warn("[WEBHOOK] GROQ_API_KEY não configurada nas Secrets.");
                responseText = "Olá! Como posso te ajudar hoje? 😊\n\n" + config.greeting;
              }
            }

            // ENVIAR RESPOSTA
            if (responseText) {
              // Garante que o número tenha o formato JID se necessário para a v2
              const recipient = phoneNumber.includes("@") ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
              
              console.log(`[WEBHOOK] Enviando resposta para ${recipient}...`);
              
              const sendRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json", 
                  "apikey": evolutionKey 
                },
                body: JSON.stringify({ 
                  number: recipient, 
                  text: responseText, // Algumas versões da v2 usam 'text' direto
                  textMessage: { text: responseText } // Outras usam o padrão v1
                }),
              });

              if (sendRes.ok) {
                console.log("[WEBHOOK] Resposta enviada com sucesso para o WhatsApp.");
                await supabase.from("whatsapp_messages").insert({
                  conversation_id: conversation.id, 
                  direction: "outbound", 
                  content: responseText, 
                  status: "sent", 
                  message_type: messageTypeOut,
                });
              } else {
                const errorDetail = await sendRes.text();
                console.error(`[WEBHOOK] Erro ao enviar para Evolution API (${sendRes.status}):`, errorDetail);
              }
            }
          }
        } catch (e) { 
          console.error("[WEBHOOK] Erro no loop de mensagens:", e); 
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    return new Response(JSON.stringify({ ok: true, event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
  } catch (error: any) {
    console.error("[WEBHOOK] Erro crítico:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

