import { useState, useEffect, useRef } from "react";
// Version: 1.0.5 - Connection Stability Fix
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  MoreVertical,
  CheckCheck,
  Sparkles,
  Loader2,
  WifiOff,
  Wifi,
  RefreshCw,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  lead: { label: "Lead", className: "bg-warning/20 text-warning border-warning/30" },
  negotiating: { label: "Negociando", className: "bg-accent/20 text-accent border-accent/30" },
  client: { label: "Cliente", className: "bg-success/20 text-success border-success/30" },
};

export function WhatsAppCRMReal() {
  const { toast } = useToast();
  const {
    conversations,
    messages,
    loading,
    sendingMessage,
    fetchConversations,
    fetchMessages,
    sendMessage,
  } = useWhatsApp();

  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/fetchInstances', {
        headers: { 'apikey': 'Mv06061991' },
        cache: 'no-store'
      });
      
      if (!res.ok) {
        // Se a API der erro 500/404, não mudamos o status para desconectado imediatamente
        // para evitar "piscar" o status caso o servidor Render esteja instável
        return;
      }
      
      const data = await res.json();
      const instances = Array.isArray(data) ? data : (data.instances || []);
      
      // Busca Inteligente (Deep Search)
      const instance = instances.find((i: any) => {
        const name = (i?.instanceName || i?.name || i?.instance?.instanceName || i?.instance?.name || "").toLowerCase();
        const status = (i?.status || i?.state || i?.connectionStatus || i?.instance?.status || i?.instance?.state || "").toLowerCase();
        
        console.log(`Verificando: ${name} | Status: ${status}`);
        
        return name.includes('sd-moveis') && (status === 'open' || status === 'connected');
      });
      
      if (instance) {
        setApiStatus("connected");
      } else {
        // Se não achou pelo nome mas só tem UMA instância e ela tá aberta, confia nela
        const anyOpen = instances.find((i: any) => 
          (i?.status || i?.instance?.status) === 'open' || 
          (i?.state || i?.instance?.state) === 'open'
        );
        if (anyOpen) setApiStatus("connected");
        else setApiStatus("disconnected");
      }
    } catch (err) {
      console.warn("Retrying status check...", err);
      // Mantém o status atual em caso de erro de rede transiente
    }
  };

  useEffect(() => {
    // Dá um "puxão de orelha" na API do Render para ela acordar mais rápido
    fetch('https://api-whatsapp-sdmoveis.onrender.com/').catch(() => {});
    
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredConversations = conversations.filter(
    (c) =>
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number.includes(searchTerm)
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;
    
    const message = messageInput;
    setMessageInput("");
    await sendMessage(selectedConversation.id, message);
  };

  const generateAIResponse = async () => {
    if (!selectedConversation) return;
    
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai', {
        body: { 
          conversationId: selectedConversation.id,
          contactName: selectedConversation.contact_name,
          messageHistory: messages.map((m) => ({
            direction: m.direction,
            content: m.content,
          })),
        }
      });

      if (error) throw error;

      if (data?.content) {
        toast({
          title: "IA respondeu",
          description: "Resposta gerada e enviada com sucesso!",
        });
        await fetchMessages(selectedConversation.id);
        await fetchConversations();
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "Erro ao gerar resposta",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Auto-reply with AI when new inbound message arrives
  useEffect(() => {
    if (!aiAutoReply || !selectedConversation || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.direction === "inbound" && lastMsg.message_type !== "ai") {
      generateAIResponse();
    }
  }, [messages.length, aiAutoReply]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length === 13) {
      return `(${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  return (
    <div className="bg-card rounded-xl border border-border h-[700px] flex overflow-hidden">
      {/* Contacts sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-success" />
              <h3 className="font-semibold">CRM WhatsApp</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchConversations}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs flex items-center gap-1 transition-colors",
                apiStatus === "connected" ? "bg-success/20 text-success border-success/30" : "",
                apiStatus === "checking" ? "text-muted-foreground" : ""
              )}
            >
              {apiStatus === "checking" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : apiStatus === "connected" ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {apiStatus === "checking" ? "Verificando..." : apiStatus === "connected" ? "Conectado à API" : "Desconectado da API"}
            </Badge>
            <Button
              size="sm"
              disabled={isLoadingQR}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-7"
              onClick={async () => {
                setIsLoadingQR(true);
                setQrCodeData(null);
                try {
                  const EVOLUTION_API_URL = "https://api-whatsapp-sdmoveis.onrender.com";
                  const EVOLUTION_API_KEY = "Mv06061991";
                  const instanceName = "SD-Moveis";
                  const SUPABASE_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";

                  // 1. Acordar o servidor Render (cold start pode demorar até 60s)
                  toast({ title: "⏳ Iniciando servidor...", description: "Aguarde, isso pode levar alguns segundos." });
                  
                  // Tenta acordar o servidor com um ping simples
                  try {
                    await fetch(`${EVOLUTION_API_URL}/`, { method: 'GET' });
                  } catch { /* ignora */ }

                  // 2. Tenta deletar se já existir (reset total)
                  try {
                    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                      method: "DELETE",
                      headers: { "apikey": EVOLUTION_API_KEY }
                    });
                  } catch { /* ignora se já não existe */ }

                  // Aguarda um momento para garantir a deleção
                  await new Promise(r => setTimeout(r, 2000));

                  // 3. Criar nova instância COM PERSISTÊNCIA (Banco de Dados)
                  const SUPABASE_PROJECT_ID = "nglwscakhhdhelhbqkyb";
                  const DB_PASSWORD = "Mv@1307202031011985";

                  await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
                    body: JSON.stringify({
                      instanceName,
                      qrcode: true,
                      integration: "WHATSAPP-BAILEYS",
                      chatPersistence: true,
                      webhook: "https://nglwscakhhdhelhbqkyb.supabase.co/functions/v1/whatsapp-webhook",
                      webhookByEvents: true,
                      events: [
                        "MESSAGES_UPSERT",
                        "MESSAGES_UPDATE",
                        "MESSAGES_DELETE",
                        "SEND_MESSAGE",
                        "CONNECTION_UPDATE",
                        "TYPEING_START"
                      ],
                      database: {
                        enabled: true,
                        type: 'postgres',
                        host: `db.${SUPABASE_PROJECT_ID}.supabase.co`,
                        port: 5432,
                        user: 'postgres',
                        password: DB_PASSWORD,
                        database: 'postgres',
                        ssl: true
                      }
                    })
                  });

                  // Aguarda a instância ser criada
                  await new Promise(r => setTimeout(r, 1500));

                  // 4. Buscar o QR Code
                  const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                    headers: { "apikey": EVOLUTION_API_KEY },
                    cache: "no-store"
                  });

                  const data = await qrRes.json();
                  const finalQR = data.base64 || data.qrcode?.base64;

                  if (finalQR || data.instance?.state === "open") {
                    if (finalQR) setQrCodeData(finalQR);
                    if (data.instance?.state === "open") toast({ title: "✅ Já Conectado", description: "WhatsApp já está ativo!" });

                    // CONFIGURAR O WEBHOOK PARA GARANTIR QUE OS EVENTOS CHEGUEM NO SUPABASE
                    console.log("Configurando webhook...");
                    await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                      body: JSON.stringify({
                         enabled: true,
                         url: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
                         webhook_by_events: false,
                         base64: false,
                         events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
                      })
                    });
                    
                    checkApiStatus();
                  } else {
                    throw new Error("Erro ao gerar QR Code. Tente novamente em 20 segundos.");
                  }

                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  toast({
                    title: "❌ Erro na Conexão",
                    description: msg,
                    variant: "destructive"
                  });
                } finally {
                  setIsLoadingQR(false);
                }
              }}
            >
              {isLoadingQR ? <Loader2 className="w-3 h-3 animate-spin" /> : "Exibir QR Code"}
            </Button>
          </div>

          {/* QR Code Modal Inline */}
          {qrCodeData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setQrCodeData(null)}>
              <div className="bg-zinc-900 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-green-400 text-xl font-bold">Conectar WhatsApp SD</h2>
                <p className="text-zinc-400 text-sm text-center">Escaneie o QR Code com seu WhatsApp</p>
                <div className="bg-white p-3 rounded-xl">
                  <img src={qrCodeData} alt="QR Code WhatsApp" className="w-56 h-56" />
                </div>
                <p className="text-green-400 text-xs">✓ Sessão salva automaticamente no banco de dados</p>
                <Button variant="outline" size="sm" onClick={() => setQrCodeData(null)}>Fechar</Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contatos..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conversation.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(conversation.contact_name || conversation.phone_number).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conversation.contact_name || formatPhoneDisplay(conversation.phone_number)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage || "Sem mensagens"}
                        </p>
                        {(conversation.unreadCount ?? 0) > 0 && (
                          <span className="w-5 h-5 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("mt-2 text-xs", statusConfig[conversation.lead_status as keyof typeof statusConfig]?.className)}
                      >
                        {statusConfig[conversation.lead_status as keyof typeof statusConfig]?.label || conversation.lead_status}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(selectedConversation.contact_name || selectedConversation.phone_number).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">
                  {selectedConversation.contact_name || formatPhoneDisplay(selectedConversation.phone_number)}
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {formatPhoneDisplay(selectedConversation.phone_number)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">IA Auto</span>
                <Switch checked={aiAutoReply} onCheckedChange={setAiAutoReply} />
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-muted/20">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      msg.direction === "outbound"
                        ? msg.message_type === "ai"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-success text-success-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    )}
                  >
                    {msg.message_type === "ai" && (
                      <div className="flex items-center gap-1 mb-1 opacity-80">
                        <Bot className="w-3 h-3" />
                        <span className="text-xs font-medium">IA</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {formatTime(msg.created_at)}
                      </span>
                      {msg.direction === "outbound" && (
                        <CheckCheck
                          className={cn(
                            "w-4 h-4",
                            msg.status === "read" || msg.status === "delivered"
                              ? "text-accent"
                              : "opacity-50"
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={generateAIResponse}
                disabled={isGeneratingAI}
                className="shrink-0"
                title="Gerar resposta com IA"
              >
                {isGeneratingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
              </Button>
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                disabled={sendingMessage}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={sendingMessage || !messageInput.trim()}
                className="bg-success hover:bg-success/90"
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Selecione um contato para iniciar</p>
          </div>
        </div>
      )}
    </div>
  );
}
