import { useState, useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/connectionState/SD-Moveis', {
        headers: { 'apikey': 'Mv06061991' },
        cache: 'no-store'
      });
      const stateData = await res.json();
      if (stateData.instance?.state === 'open') {
        setApiStatus("connected");
      } else {
        setApiStatus("disconnected");
      }
    } catch {
      setApiStatus("disconnected");
    }
  };

  useEffect(() => {
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
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-7"
              onClick={async () => {
                try {
                  const usePairingCode = window.confirm("Você quer tentar pelo QR Code de novo? \n\n(Se o celular rejeitar com 'Verifique a internet', clique em CANCELAR para usar o pareamento por Código Numérico seguro!)");
                  let phoneForPairing = '';
                  
                  if (!usePairingCode) {
                    phoneForPairing = window.prompt("Digite seu número WhatsApp (55 + DDD + Número).\n\n⚠️ IMPORTANTE: Se o celular der 'Código Inválido' ou falhar, tente novamente COM ou SEM o dígito 9! Ex: 5581999999999 ou 558199999999", "55") || '';
                    if (!phoneForPairing || phoneForPairing.length < 12) {
                      alert("Número inválido. Operação cancelada.");
                      return;
                    }
                  }

                  // 1. Verificar estado atual primeiro
                  let res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/connectionState/SD-Moveis', {
                    headers: { 'apikey': 'Mv06061991' },
                    cache: 'no-store'
                  });
                  let stateData = await res.json();
                  
                  if (stateData.instance?.state === 'open') {
                    alert('Seu WhatsApp já está conectado e pronto para uso!');
                    return;
                  }

                  // 2. Limpar qualquer sessão travada/expirada na API
                  await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/logout/SD-Moveis', {
                     method: 'DELETE', headers: { 'apikey': 'Mv06061991' }, cache: 'no-store'
                  }).catch(()=>{});

                  await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/delete/SD-Moveis', {
                     method: 'DELETE', headers: { 'apikey': 'Mv06061991' }, cache: 'no-store'
                  }).catch(()=>{});

                  // 3. Criar uma do zero
                  res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/create', {
                    method: 'POST',
                    headers: { 
                      'apikey': 'Mv06061991',
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                      instanceName: "SD-Moveis", 
                      qrcode: usePairingCode,
                      number: !usePairingCode ? phoneForPairing.replace(/\D/g, '') : undefined
                    }),
                    cache: 'no-store'
                  });
                  let data = await res.json();

                  let qrCodeBase64 = data.base64 || data.qrcode?.base64;
                  let pairingCode = data.pairingCode || data.code;
                  let retries = 5;

                  const checkUrl = usePairingCode 
                    ? 'https://api-whatsapp-sdmoveis.onrender.com/instance/connect/SD-Moveis?t=' + Date.now()
                    : 'https://api-whatsapp-sdmoveis.onrender.com/instance/connect/SD-Moveis?t=' + Date.now() + '&number=' + phoneForPairing.replace(/\D/g, '');

                  // Se ainda não tiver os dados
                  while (!qrCodeBase64 && !pairingCode && retries > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                    res = await fetch(checkUrl, {
                      headers: { 'apikey': 'Mv06061991' },
                      cache: 'no-store'
                    });
                    data = await res.json();
                    qrCodeBase64 = data.base64 || data.qrcode?.base64;
                    pairingCode = data.pairingCode || data.code;
                    retries--;
                  }

                  if (!usePairingCode && pairingCode) {
                    const newWindow = window.open('', '_blank');
                    newWindow?.document.write(`
                      <html style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;font-family:sans-serif;text-align:center;">
                        <div style="background:#222;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                          <h1 style="color:#25D366;margin-bottom:10px;">Ligar SD Móveis ao WhatsApp</h1>
                          <p style="color:#aaa;margin-bottom:30px;">Vá no seu WhatsApp > Dispositivos Vinculados > <br><b>"Conectar com Número de Telefone"</b></p>
                          <div style="background:white;padding:20px 40px;border-radius:10px;display:inline-block;">
                            <h2 style="color:black;font-size:3rem;letter-spacing:10px;margin:0;">${pairingCode}</h2>
                          </div>
                          <p style="margin-top:20px;color:#aaa;">Digite esse código lá no seu WhatsApp!</p>
                          <p style="margin-top:15px;color:#eab308;font-size:0.9rem;max-width:500px;margin-left:auto;margin-right:auto;background:rgba(234, 179, 8, 0.1);padding:15px;border-radius:10px;">
                            ⚠️ <b>ATENÇÃO:</b> Se o WhatsApp disser "Código Inválido" ou der erro na conexão, o problema é o dígito 9! <br/><br/>Nesse caso, feche essa tela, clique em "Exibir QR Code" novamente e digite o número testando a outra variação (com o 9 ou sem o 9).
                          </p>
                        </div>
                      </html>
                    `);
                  } else if (usePairingCode && qrCodeBase64) {
                    const newWindow = window.open('', '_blank');
                    newWindow?.document.write(`
                      <html style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;font-family:sans-serif;">
                        <div style="background:#222;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.5);text-align:center;">
                          <h1 style="color:#25D366;margin-bottom:20px;">Ligar SD Móveis ao WhatsApp</h1>
                          <img src="${qrCodeBase64}" style="width:300px;height:300px;border:2px solid #333;border-radius:10px;padding:10px;background:white;" />
                          <p style="margin-top:20px;color:#aaa;">Abra seu WhatsApp > Dispositivos Vinculados > Escanear QR Code</p>
                        </div>
                      </html>
                    `);
                  } else {
                    alert('A API está demorando muito para gerar o acesso. Tente novamente em alguns instantes.');
                  }
                } catch (err) {
                  alert('Erro ao conectar na API. Verifique se ela está Live no Render.');
                }
              }}
            >
              Exibir QR Code
            </Button>
          </div>

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
