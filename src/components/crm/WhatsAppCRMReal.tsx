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
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/fetchInstances', {
        headers: { 'apikey': 'Mv06061991' },
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      const instances = Array.isArray(data) ? data : (data.instances || []);
      const instance = instances.find((i: any) => {
        const name = (i?.instanceName || i?.name || "").toLowerCase();
        const status = (i?.status || i?.state || "").toLowerCase();
        return name.includes('sd-moveis') && (status === 'open' || status === 'connected');
      });
      if (instance) {
        setApiStatus("connected");
        setQrCodeData(null);
      } else {
        setApiStatus("disconnected");
      }
    } catch (err) {
      console.error("Status error:", err);
    }
  };

  const getQrCode = async () => {
    setIsLoadingQR(true);
    try {
      // Tentar conectar
      const res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/connect/SD-Moveis', {
        headers: { 'apikey': 'Mv06061991' }
      });
      
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        console.warn("Evolution API response was not JSON or was empty");
      }

      // Se a instância não existe (404), vamos criar
      if (res.status === 404 || data.error?.includes('not found') || data.message?.includes('not found')) {
        toast({ title: "Configurando Ambiente...", description: "Criando instância 'SD-Moveis' no servidor." });
        const createRes = await fetch('https://api-whatsapp-sdmoveis.onrender.com/instance/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': 'Mv06061991' },
          body: JSON.stringify({
            instanceName: "SD-Moveis",
            token: "Mv06061991",
            qrcode: true
          })
        });
        
        const createData = await createRes.json();
        if (createData.qrcode?.base64 || createData.base64) {
          setQrCodeData(createData.qrcode?.base64 || createData.base64);
          toast({ title: "Instância Criada!", description: "Escaneie o QR Code agora." });
          return;
        }
      }

      
      if (data.base64 || data.qrcode?.base64) {
        setQrCodeData(data.base64 || data.qrcode?.base64);
        toast({ title: "QR Code Gerado", description: "Escaneie com seu WhatsApp." });
      } else if (data.status === 'open' || data.instance?.status === 'open' || data.state === 'open') {
        setApiStatus("connected");
        toast({ title: "Já Conectado", description: "A instância já está ativa." });
      } else {
        throw new Error("Não foi possível obter o QR Code");
      }
    } catch (err) {
      console.error("Connect error:", err);
      toast({ title: "Erro ao conectar", description: "Falha ao iniciar conexão. Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setIsLoadingQR(false);
    }
  };

  const syncWebhook = async () => {
    setIsSyncingWebhook(true);
    try {
      const webhookUrl = 'https://nglwscakhhdhelhbqkyb.supabase.co/functions/v1/whatsapp-webhook';
      const res = await fetch('https://api-whatsapp-sdmoveis.onrender.com/webhook/set/SD-Moveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'Mv06061991' },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CONTACTS_UPSERT",
            "CONTACTS_UPDATE",
            "PRESENCE_UPDATE",
            "CHATS_UPSERT",
            "CHATS_UPDATE",
            "CHATS_DELETE",
            "GROUPS_UPSERT",
            "GROUPS_UPDATE",
            "GROUP_PARTICIPANTS_UPDATE",
            "CONNECTION_UPDATE"
          ]
        })
      });
      
      if (res.ok) {
        toast({ title: "Webhook Sincronizado", description: "O CRM agora receberá mensagens em tempo real." });
      } else {
        throw new Error("Falha ao registrar webhook");
      }
    } catch (err) {
      toast({ title: "Erro no Webhook", description: "Não foi possível configurar o receptor de mensagens.", variant: "destructive" });
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation.id);
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;
    const msg = messageInput;
    setMessageInput("");
    await sendMessage(selectedConversation.id, msg);
  };

  const generateAIResponse = async () => {
    if (!selectedConversation) return;
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai', {
        body: { 
          conversationId: selectedConversation.id,
          contactName: selectedConversation.contact_name,
          messageHistory: messages.slice(-5).map(m => ({ direction: m.direction, content: m.content }))
        }
      });
      if (error) throw error;
      if (data?.content) {
        toast({ title: "IA Respondeu", description: "Mensagem gerada com sucesso." });
        await fetchMessages(selectedConversation.id);
      }
    } catch (err) {
      toast({ title: "Erro na IA", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    (c.contact_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number.includes(searchTerm)
  );

  return (
    <div className="bg-card rounded-xl border border-border h-[700px] flex overflow-hidden">
      {/* Sidebar de contatos */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-success" />
              <h3 className="font-semibold">CRM WhatsApp</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchConversations} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn(
              "text-[10px] flex items-center gap-1 py-1 px-2 uppercase tracking-widest font-black",
              apiStatus === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              {apiStatus === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {apiStatus === "connected" ? "Conectado" : apiStatus === "checking" ? "Verificando..." : "Desconectado"}
            </Badge>
            
            {apiStatus === "connected" && (
              <Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase text-success hover:bg-success/10" onClick={syncWebhook} disabled={isSyncingWebhook}>
                {isSyncingWebhook ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Sync Webhook
              </Button>
            )}
            
            {apiStatus === "disconnected" && !qrCodeData && (
              <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={getQrCode} disabled={isLoadingQR}>
                {isLoadingQR ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Conectar
              </Button>
            )}
          </div>

          {qrCodeData && apiStatus === "disconnected" && (
            <div className="bg-white p-3 rounded-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
              <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48" />
              <p className="text-[10px] text-black font-bold uppercase text-center">Escaneie para conectar</p>
              <Button size="sm" variant="ghost" className="text-[9px] h-6 text-red-500 hover:text-red-600" onClick={() => setQrCodeData(null)}>Cancelar</Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              className="pl-9 h-9 bg-black/20 border-white/5 rounded-xl text-sm" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredConversations.map(conversation => (
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
                      {(conversation.contact_name || "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conversation.contact_name || conversation.phone_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{conversation.lastMessage || "Sem mensagens"}</p>
                    <Badge variant="outline" className={cn("mt-2 text-[10px]", statusConfig[conversation.lead_status as keyof typeof statusConfig]?.className)}>
                      {statusConfig[conversation.lead_status as keyof typeof statusConfig]?.label || conversation.lead_status}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Area do Chat */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{(selectedConversation.contact_name || "C").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <h4 className="font-medium">{selectedConversation.contact_name || selectedConversation.phone_number}</h4>
            </div>
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-xs">IA Auto</span>
              <Switch checked={aiAutoReply} onCheckedChange={setAiAutoReply} />
            </div>
          </div>

          <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-muted/20">
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    msg.direction === "outbound" ? "bg-success text-success-foreground" : "bg-card border border-border"
                  )}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border flex gap-2">
            <Button variant="outline" size="icon" onClick={generateAIResponse} disabled={isGeneratingAI}>
              {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
            </Button>
            <Input 
              value={messageInput} 
              onChange={e => setMessageInput(e.target.value)} 
              placeholder="Digite..." 
              onKeyDown={e => e.key === "Enter" && handleSendMessage()} 
            />
            <Button onClick={handleSendMessage} disabled={!messageInput.trim() || sendingMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Selecione uma conversa</p>
          </div>
        </div>
      )}
    </div>
  );
}
