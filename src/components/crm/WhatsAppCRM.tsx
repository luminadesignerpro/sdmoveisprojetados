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
  Bot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-warning/20 text-warning border-warning/30" },
  negociando: { label: "Negociando", className: "bg-accent/20 text-accent border-accent/30" },
  cliente: { label: "Cliente", className: "bg-success/20 text-success border-success/30" },
};

export function WhatsAppCRM() {
  const { conversations, messages, loading, sendingMessage, fetchConversations, fetchMessages, sendMessage } = useWhatsApp();
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      (c.contact_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number.includes(searchTerm)
  );

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;
    try {
      await sendMessage(selectedConversation.id, message);
      setMessage("");
    } catch (e) {
      // error handled in hook
    }
  };

  const generateAIResponse = async () => {
    if (!selectedConversation) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-ai", {
        body: {
          conversationId: selectedConversation.id,
          contactName: selectedConversation.contact_name,
          messageHistory: messages.map((m) => ({
            direction: m.direction,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      if (data?.content) {
        toast({ title: "IA respondeu", description: "Resposta gerada e enviada com sucesso!" });
        await fetchMessages(selectedConversation.id);
        await fetchConversations();
      }
    } catch (error: any) {
      console.error("AI error:", error);
      toast({
        title: "Erro na IA",
        description: error?.message || "Não foi possível gerar resposta.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-reply with AI when a new inbound message arrives
  useEffect(() => {
    if (!aiAutoReply || !selectedConversation || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.direction === "inbound" && lastMsg.message_type !== "ai") {
      generateAIResponse();
    }
  }, [messages.length, aiAutoReply]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border h-[700px] flex overflow-hidden">
      {/* Contacts sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-success" />
            <h3 className="font-semibold">CRM WhatsApp</h3>
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(conv.contact_name || conv.phone_number).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conv.contact_name || conv.phone_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                        {(conv.unreadCount || 0) > 0 && (
                          <span className="w-5 h-5 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-2 text-xs",
                          (statusConfig[conv.lead_status] || statusConfig.lead).className
                        )}
                      >
                        {(statusConfig[conv.lead_status] || statusConfig.lead).label}
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
                  {(selectedConversation.contact_name || selectedConversation.phone_number).charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">
                  {selectedConversation.contact_name || selectedConversation.phone_number}
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedConversation.phone_number}
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
          <ScrollArea className="flex-1 p-4 bg-muted/20" ref={scrollRef as any}>
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
                            msg.status === "read" ? "text-accent" : "opacity-50"
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Gerando resposta...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={generateAIResponse}
                className="shrink-0"
                title="Gerar resposta com IA"
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
              </Button>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={sendingMessage}
              />
              <Button
                onClick={handleSendMessage}
                className="bg-success hover:bg-success/90"
                disabled={sendingMessage || !message.trim()}
              >
                <Send className="w-4 h-4" />
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
