import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Sparkles, User, ShieldCheck, Wrench } from 'lucide-react';

interface InternalChatProps { userName: string; userRole: 'ADMIN' | 'CLIENT' | 'EMPLOYEE'; }

export default function InternalChat({ userName, userRole }: InternalChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await (supabase as any).from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100);
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const channel = (supabase as any).channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
      setMessages(prev => [...prev, payload.new]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await (supabase as any).from('chat_messages').insert([{ sender_name: userName, sender_role: userRole, message: text.trim() }]);
    setText('');
  };

  const roleColor = (role: string) => role === 'ADMIN' ? 'text-amber-500' : role === 'EMPLOYEE' ? 'text-blue-400' : 'text-green-400';
  const roleBadge = (role: string) => role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : role === 'EMPLOYEE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20';
  const roleLabel = (role: string) => role === 'ADMIN' ? 'Diretoria' : role === 'EMPLOYEE' ? 'Logística' : 'Cliente';
  const roleIcon = (role: string) => role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : role === 'EMPLOYEE' ? <Wrench className="w-3 h-3" /> : <User className="w-3 h-3" />;

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] relative overflow-hidden flex-1">
      {/* Premium Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <header className="p-6 border-b border-white/5 flex items-center justify-between relative z-10 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] flex items-center justify-center shadow-xl shadow-amber-500/20">
            <MessageCircle className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-white font-black text-xl italic tracking-tighter uppercase">Canal <span className="text-[#D4AF37]">Interno</span></h2>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Protocolo Seguro P2P</p>
            </div>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-gray-800" />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 luxury-scroll relative z-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Sincronizando Mensagens...</p>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-20 space-y-4 opacity-30">
             <MessageCircle className="w-12 h-12 mx-auto text-gray-700" />
             <p className="font-black uppercase tracking-widest text-[10px] text-gray-500">Inicie uma conversa segura</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_name === userName;
          return (
            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                {!isMe && (
                  <div className="flex items-center gap-3 px-1 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${roleColor(msg.sender_role)}`}>{msg.sender_name}</span>
                    <span className={`flex items-center gap-1.5 text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border ${roleBadge(msg.sender_role)}`}>
                       {roleIcon(msg.sender_role)}
                       {roleLabel(msg.sender_role)}
                    </span>
                  </div>
                )}
                <div className={`px-5 py-3.5 rounded-[1.8rem] text-sm font-medium leading-relaxed shadow-xl ${
                  isMe 
                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-tr-sm italic font-bold' 
                    : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[9px] text-gray-600 font-bold px-2">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
        <div className="flex gap-4 items-center max-w-5xl mx-auto w-full">
          <div className="flex-1 relative group">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Digite sua mensagem de negócio..."
              className="w-full bg-white/5 text-white placeholder-gray-700 rounded-2xl px-6 py-4 text-sm outline-none border border-white/5 focus:border-[#D4AF37]/40 transition-all font-medium italic"
            />
          </div>
          <button 
            onClick={sendMessage} 
            disabled={!text.trim()} 
            className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-2xl flex items-center justify-center disabled:opacity-20 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-amber-500/20 group"
          >
            <Send className="w-6 h-6 text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
