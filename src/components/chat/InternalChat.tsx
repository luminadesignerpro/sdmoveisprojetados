import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Shield } from 'lucide-react';

interface InternalChatProps { userName: string; userRole: 'ADMIN' | 'CLIENT' | 'EMPLOYEE'; }

export default function InternalChat({ userName, userRole }: InternalChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState<{name: string, role: string} | null>(null);
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    let query = (supabase as any).from('chat_messages').select('*');
    if (userRole !== 'ADMIN') {
      query = query.or(`sender_name.eq."${userName}",recipient_name.eq."${userName}",sender_role.eq.ADMIN`);
    }
    const { data } = await query.order('created_at', { ascending: true }).limit(100);
    if (data) setMessages(data);
    setLoading(false);
  };

  const fetchRecipients = async () => {
    if (userRole !== 'ADMIN') return;
    const { data } = await (supabase as any).from('chat_messages').select('sender_name, sender_role');
    if (data) {
      const unique = Array.from(new Set(data.filter((d: any) => d.sender_role !== 'ADMIN').map((d: any) => JSON.stringify({name: d.sender_name, role: d.sender_role})))).map((s: any) => JSON.parse(s));
      setAvailableRecipients(unique);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchRecipients();
    const channel = (supabase as any).channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload: any) => {
      const msg = payload.new;
      const isForMe = userRole === 'ADMIN' || 
                     msg.sender_name === userName || 
                     msg.recipient_name === userName ||
                     (msg.sender_role === 'ADMIN' && !msg.recipient_name);
      if (isForMe) setMessages(prev => [...prev, msg]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userName, userRole]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const payload: any = { 
      sender_name: userName, 
      sender_role: userRole, 
      message: text.trim(),
      created_at: new Date().toISOString()
    };
    if (userRole === 'ADMIN' && recipient) {
      payload.recipient_name = recipient.name;
      payload.recipient_role = recipient.role;
    } else if (userRole !== 'ADMIN') {
      payload.recipient_name = 'Administrador';
      payload.recipient_role = 'ADMIN';
    }
    const { error } = await (supabase as any).from('chat_messages').insert([payload]);
    if (!error) setText('');
  };

  const roleColor = (role: string) => role === 'ADMIN' ? 'text-amber-500' : role === 'EMPLOYEE' ? 'text-blue-400' : 'text-green-400';
  const roleBadge = (role: string) => role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : role === 'EMPLOYEE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400';
  const roleLabel = (role: string) => role === 'ADMIN' ? 'Admin' : role === 'EMPLOYEE' ? 'Func.' : 'Cliente';

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <header className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
            <MessageCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-white font-black text-lg">Chat SD</h2>
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Privado & Seguro</p>
          </div>
        </div>
        {userRole === 'ADMIN' && (
          <select 
            className="bg-white/5 text-white text-[10px] border border-white/10 rounded-xl px-2 py-1 outline-none font-bold"
            onChange={(e) => setRecipient(e.target.value ? JSON.parse(e.target.value) : null)}
          >
            <option value="">Falar com Todos</option>
            {availableRecipients.map(r => (
              <option key={r.name} value={JSON.stringify(r)}>{r.role === 'CLIENT' ? '👤' : '👷'} {r.name}</option>
            ))}
          </select>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="text-center text-amber-500/50 py-8 text-xs font-bold uppercase tracking-widest animate-pulse">Conectando...</div>}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
            <Shield className="w-12 h-12 text-amber-500 mb-4" />
            <p className="text-white text-sm">Nenhuma mensagem aqui.<br/><span className="text-xs">Este canal é 100% privado.</span></p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_name === userName;
          return (
            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
              <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isMe && (
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[9px] font-black uppercase ${roleColor(msg.sender_role)}`}>{msg.sender_name}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded font-black uppercase ${roleBadge(msg.sender_role)}`}>{roleLabel(msg.sender_role)}</span>
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-amber-600 text-white rounded-tr-none' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'}`}>
                  {msg.message}
                </div>
                <span className="text-[8px] text-white/20 font-bold px-1">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-black/40 border-t border-white/5">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={userRole === 'ADMIN' && recipient ? `Falar com ${recipient.name}...` : "Escreva sua mensagem..."}
            className="flex-1 bg-white/5 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-amber-500/30"
          />
          <button onClick={sendMessage} disabled={!text.trim()} className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center disabled:opacity-20 hover:bg-amber-500 transition-all shadow-lg shadow-amber-600/10">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
