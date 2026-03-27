import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User, Bot, Lightbulb, Loader2, Zap, Shield, Star, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  "Como otimizar o espaço de uma cozinha pequena?",
  "Qual a melhor disposição para um guarda-roupa?",
  "Sugira cores para um escritório moderno",
  "Monte um orçamento para cozinha projetada",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou a Inteligência Artificial da SD Móveis. Estou pronta para projetar o seu sonho. Como posso ajudar com seu design premium hoje?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [
          ...prev,
          { id: "streaming", role: "assistant" as const, content: assistantSoFar, timestamp: new Date() },
        ];
      });
    };

    try {
      const apiMessages = messages
        .filter((m) => m.id !== "1")
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: currentInput });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao conectar com a IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
      );
    } catch (error: any) {
      console.error("AI error:", error);
      toast({
        title: "Erro na Rede Neural",
        description: "Não foi possível gerar resposta agora.",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] h-[600px] flex flex-col overflow-hidden shadow-2xl relative">
       {/* Luxury background glow */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
       
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] flex items-center justify-center shadow-lg group">
              <Bot className="w-6 h-6 text-black group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h3 className="font-black text-white italic uppercase tracking-tighter text-lg">AI Assistant</h3>
              <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-[0.3em]">SD Neural Core v4.0</p>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[8px] font-black text-white uppercase tracking-widest">Active</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6 luxury-scroll">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${message.role === "user"
                  ? "bg-[#D4AF37] border-[#D4AF37]/20 text-black"
                  : "bg-[#1a1a1a] border-white/5 text-[#D4AF37]"
                  }`}
              >
                {message.role === "user" ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div
                className={`rounded-[1.5rem] p-4 max-w-[80%] shadow-xl animate-in ${message.role === "user" 
                    ? "bg-[#D4AF37] text-black font-black italic slide-in-from-right" 
                    : "bg-[#0a0a0a] border border-white/5 text-gray-300 font-medium italic slide-in-from-left"
                  }`}
              >
                <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                <p className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-40 ${message.role === 'user' ? 'text-black' : 'text-gray-500'}`}>
                   {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-[#D4AF37]">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-[1.5rem] p-4 w-20">
                <div className="flex gap-1.5">
                   {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-6 pb-4 relative z-10">
          <div className="flex items-center gap-2 mb-3 text-gray-500">
            <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Sugestões de Projeto</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="bg-white/5 border border-white/5 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#D4AF37]/40 hover:text-white transition-all shadow-xl"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5 relative z-10">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Perguntar ao núcleo neural..."
            className="flex-1 h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm outline-none focus:border-[#D4AF37]/40 transition-all italic font-medium tracking-tight shadow-inner"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            className="w-14 h-14 bg-[#D4AF37] text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
