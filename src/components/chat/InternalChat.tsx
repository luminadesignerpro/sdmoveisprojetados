import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle } from 'lucide-react';

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
  const roleBadge = (role: string) => role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : role === 'EMPLOYEE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400';
  const roleLabel = (role: string) => role === 'ADMIN' ? 'Admin' : role === 'EMPLOYEE' ? 'Func.' : 'Cliente';

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800">
      <header className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-white font-black text-sm sm:text-lg">Chat SD Móveis</h2>
          <p className="text-white/40 text-[10px] sm:text-xs">Comunicação interna</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
        {loading && <div className="text-center text-white/30 py-4 sm:py-8">Carregando mensagens...</div>}
        {!loading && messages.length === 0 && <div className="text-center text-white/30 py-4 sm:py-8">Nenhuma mensagem ainda. Seja o primeiro! 👋</div>}
        {messages.map((msg, i) => {
          const isMe = msg.sender_name === userName;
          return (
            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5 sm:gap-1`}>
                {!isMe && (
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[10px] sm:text-xs font-bold ${roleColor(msg.sender_role)}`}>{msg.sender_name}</span>
                    <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold ${roleBadge(msg.sender_role)}`}>{roleLabel(msg.sender_role)}</span>
                  </div>
                )}
                <div className={`px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
                  {msg.message}
                </div>
                <span className="text-[8px] sm:text-[10px] text-white/30 px-1">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 sm:p-4 border-t border-white/10">
        <div className="flex gap-2 sm:gap-3 items-center">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none border border-white/10 focus:border-primary/50"
          />
          <button onClick={sendMessage} disabled={!text.trim()} className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-primary/80 transition-all shrink-0">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
