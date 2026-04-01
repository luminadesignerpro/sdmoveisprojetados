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
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) btn.disabled = true;
                
                try {
                  toast({
                    title: "⏳ Gerando QR Code",
                    description: "Preparando conexão segura com persistência no banco de dados...",
                  });

                  // 1. Chamar a nossa nova função segura (Ponte)
                  const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
                    body: { action: "connect" }
                  });

                  if (error) throw error;

                  const qrCodeBase64 = data.base64 || data.qrcode?.base64;
                  
                  if (qrCodeBase64) {
                    // Abrir em uma janela bonita
                    const newWindow = window.open('', '_blank', 'width=500,height=600');
                    newWindow?.document.write(`
                      <html style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;font-family:sans-serif;text-align:center;color:white;">
                        <div style="background:#222;padding:40px;border-radius:25px;box-shadow:0 10px 50px rgba(0,0,0,0.8);max-width:400px;margin:20px;">
                          <h1 style="color:#25D366;font-size:24px;margin-bottom:10px;">Conectar WhatsApp SD</h1>
                          <p style="color:#888;font-size:14px;margin-bottom:25px;">Escaneie o código abaixo. O login ficará salvo automaticamente no banco de dados.</p>
                          <div style="background:white;padding:15px;border-radius:15px;display:inline-block;box-shadow:0 0 20px rgba(37,211,102,0.3);">
                            <img src="${qrCodeBase64}" style="width:250px;height:250px;display:block;" />
                          </div>
                          <div style="margin-top:25px;padding:15px;background:rgba(37,211,102,0.1);border-radius:12px;border:1px solid rgba(37,211,102,0.2);">
                            <p style="font-size:12px;color:#25D366;margin:0;">✓ Persistência em Banco de Dados Ativa</p>
                            <p style="font-size:12px;color:#25D366;margin:5px 0 0 0;">✓ Fluxo AI Ativado</p>
                          </div>
                        </div>
                      </html>
                    `);
                    
                    toast({
                      title: "✅ QR Code Gerado",
                      description: "Escaneie na janela que abriu para conectar.",
                    });
                  } else if (data.instance?.state === 'open') {
                    toast({
                      title: "✅ Já Conectado",
                      description: "Seu WhatsApp já está ativo e pronto para uso!",
                    });
                  } else {
                    throw new Error("Não foi possível obter o QR Code.");
                  }
                } catch (err) {
                  console.error("Connect error:", err);
                  toast({
                    title: "❌ Erro na Conexão",
                    description: "Verifique se a API está online ou tente novamente.",
                    variant: "destructive"
                  });
                } finally {
                  if (btn) btn.disabled = false;
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
