import React, { useState } from 'react';
import {
  MessageCircle, Search, Send, Phone, Video, MoreVertical,
  Star, Clock, CheckCircle, User, Plus, Filter, Tag,
  Paperclip, Smile, Mic, Image, ChevronRight, Circle,
  Layout, Shield, Target, Zap
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: 'lead' | 'negotiation' | 'client' | 'after_sales';
  avatar: string;
  online: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact';
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

const CONTACTS: Contact[] = [
  { id: '1', name: 'Ricardo Almeida', phone: '(11) 98888-7777', lastMessage: 'Boa tarde! Gostaria de um orçamento para cozinha', time: '14:32', unread: 3, status: 'lead', avatar: '👨', online: true },
  { id: '2', name: 'Juliana Silva', phone: '(11) 97777-6666', lastMessage: 'O projeto ficou incrível! Quando começa a produção?', time: '13:15', unread: 0, status: 'negotiation', avatar: '👩', online: false },
  { id: '3', name: 'Marcos Oliveira', phone: '(11) 95555-4444', lastMessage: 'Preciso alterar a cor do acabamento', time: '11:45', unread: 1, status: 'client', avatar: '👨‍💼', online: true },
  { id: '4', name: 'Ana Paula Costa', phone: '(11) 94444-3333', lastMessage: 'A instalação ficou perfeita! Obrigada!', time: 'Ontem', unread: 0, status: 'after_sales', avatar: '👩‍💻', online: false },
  { id: '5', name: 'Carlos Eduardo', phone: '(11) 93333-2222', lastMessage: 'Vocês fazem home office planejado?', time: 'Ontem', unread: 2, status: 'lead', avatar: '🧑', online: false },
  { id: '6', name: 'Fernanda Lima', phone: '(11) 92222-1111', lastMessage: 'Quero agendar uma visita técnica', time: '2 dias', unread: 0, status: 'negotiation', avatar: '👩‍🦰', online: true },
];

const MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', text: 'Olá! Vi o trabalho de vocês no Instagram e adorei!', sender: 'contact', time: '14:20', status: 'read' },
    { id: 'm2', text: 'Boa tarde Ricardo! Obrigado pelo interesse! 😊', sender: 'user', time: '14:22', status: 'read' },
    { id: 'm3', text: 'Que tipo de projeto você está buscando?', sender: 'user', time: '14:22', status: 'read' },
    { id: 'm4', text: 'Estou reformando minha cozinha e gostaria de móveis planejados', sender: 'contact', time: '14:28', status: 'read' },
    { id: 'm5', text: 'Boa tarde! Gostaria de um orçamento para cozinha', sender: 'contact', time: '14:32', status: 'read' },
  ],
  '3': [
    { id: 'm1', text: 'Olá, como está a produção do meu projeto?', sender: 'contact', time: '11:30', status: 'read' },
    { id: 'm2', text: 'Bom dia Marcos! Está na fase de fitamento de bordas, 85% concluído!', sender: 'user', time: '11:35', status: 'read' },
    { id: 'm3', text: 'Preciso alterar a cor do acabamento', sender: 'contact', time: '11:45', status: 'read' },
  ],
};

const statusColors: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  lead: { bg: 'bg-[#D4AF37]/10', text: 'text-[#D4AF37]', label: 'Lead', icon: Zap },
  negotiation: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Negociação', icon: Clock },
  client: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Cliente', icon: Shield },
  after_sales: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Pós-Venda', icon: Star },
};

interface CRMWhatsAppProps {
  isClient?: boolean;
}

const CRMWhatsApp: React.FC<CRMWhatsAppProps> = ({ isClient = false }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(CONTACTS[0]);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(MESSAGES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredContacts = CONTACTS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      text: messageInput,
      sender: 'user',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }));
    setMessageInput('');
  };

  const contactMessages = selectedContact ? (messages[selectedContact.id] || []) : [];

  if (isClient) {
    return (
      <div className="h-full p-8 bg-[#0a0a0a] flex flex-col luxury-scroll">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
               <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 shadow-lg">
                  <MessageCircle className="w-6 h-6" />
               </div>
               Chat <span className="text-[#D4AF37]">Premium</span>
            </h1>
            <div className="flex items-center gap-4 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl shadow-xl">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Designer SD Ativo</span>
            </div>
        </header>

        <div className="flex-1 bg-[#111111] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-[#0a0a0a] px-8 py-5 border-b border-white/5 flex items-center gap-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[18px] flex items-center justify-center text-2xl shadow-xl">👨‍🎨</div>
            <div className="flex-1">
              <p className="font-black text-white italic uppercase tracking-tighter">Projetista Elite SD</p>
              <p className="text-[10px] text-green-500 font-bold flex items-center gap-2 uppercase tracking-widest mt-1">
                 <Circle className="w-2 h-2 fill-green-500" /> Online agora
              </p>
            </div>
            <div className="flex gap-4">
               <button className="w-12 h-12 bg-white/5 rounded-[15px] flex items-center justify-center text-gray-500 hover:text-white transition-all"><Phone className="w-5 h-5" /></button>
               <button className="w-12 h-12 bg-white/5 rounded-[15px] flex items-center justify-center text-gray-500 hover:text-white transition-all"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 p-8 space-y-6 overflow-auto luxury-scroll" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))' }}>
              <div className="flex justify-start animate-in slide-in-from-left duration-500">
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[2rem] rounded-tl-sm px-6 py-4 max-w-[70%] shadow-xl">
                  <p className="text-sm text-gray-300 italic font-medium leading-relaxed">Olá! Sou seu projetista elite na SD Móveis. Como posso transformar seu sonho em realidade hoje?</p>
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-3">10:00</p>
                </div>
              </div>
              <div className="flex justify-end animate-in slide-in-from-right duration-500">
                <div className="bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] rounded-tr-sm px-6 py-4 max-w-[70%] shadow-2xl">
                  <p className="text-sm font-black italic">Boa tarde! O projeto da cozinha já entrou em produção?</p>
                  <p className="text-[9px] text-black/40 font-black uppercase tracking-widest mt-3">14:32</p>
                </div>
              </div>
          </div>

          <div className="p-6 bg-[#0a0a0a] border-t border-white/5 flex items-center gap-4">
            <button className="w-12 h-12 text-gray-600 hover:text-[#D4AF37] transition-all"><Paperclip className="w-6 h-6" /></button>
            <input
              type="text"
              placeholder="Sua mensagem premium..."
              className="flex-1 h-16 bg-white/5 border border-white/5 rounded-[20px] px-6 outline-none text-white text-sm italic font-medium tracking-tight"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="w-16 h-16 bg-[#D4AF37] rounded-[22px] flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all">
              <Send className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#0a0a0a] overflow-hidden">
      {/* Contact List */}
      <div className="w-[420px] bg-[#111111] border-r border-white/5 flex flex-col luxury-scroll">
        <div className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
              <MessageCircle className="w-7 h-7 text-[#D4AF37]" /> CRM <span className="text-[#D4AF37]">WhatsApp</span>
            </h2>
            <button className="w-12 h-12 bg-[#D4AF37] rounded-[18px] flex items-center justify-center text-black hover:scale-105 transition-all shadow-xl">
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#D4AF37] transition-colors" />
            <input 
              type="text" 
              placeholder="Explorar contatos..." 
              className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 text-sm text-gray-300 outline-none focus:border-[#D4AF37]/40 transition-all font-medium italic" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {['all', 'lead', 'negotiation', 'client', 'after_sales'].map(s => {
               const StatusIcon = statusColors[s]?.icon || Circle;
               return (
                  <button 
                    key={s} 
                    onClick={() => setFilterStatus(s)} 
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border flex items-center gap-2 ${filterStatus === s ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/5 text-gray-600 hover:text-white'}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {s === 'all' ? 'Ver Todos' : statusColors[s]?.label}
                  </button>
               );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-10 luxury-scroll space-y-4">
          {filteredContacts.map(contact => (
            <button 
              key={contact.id} 
              onClick={() => setSelectedContact(contact)} 
              className={`w-full flex items-center gap-5 p-6 rounded-[2rem] transition-all text-left border relative group ${selectedContact?.id === contact.id ? 'bg-white/5 border-[#D4AF37]/30 shadow-2xl' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
            >
              <div className="relative">
                <div className="w-16 h-16 bg-[#1a1a1a] border border-white/5 rounded-[22px] flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">{contact.avatar}</div>
                {contact.online && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-[#111111]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-black text-white italic uppercase tracking-tighter text-base truncate">{contact.name}</p>
                  <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{contact.time}</span>
                </div>
                <p className="text-xs text-gray-500 italic font-medium truncate mb-3">{contact.lastMessage}</p>
                <div className="flex items-center gap-2">
                   <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[contact.status].bg} ${statusColors[contact.status].text}`}>
                     <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                     {statusColors[contact.status].label}
                   </span>
                </div>
              </div>
              {contact.unread > 0 && (
                <div className="w-6 h-6 bg-[#D4AF37] rounded-full flex items-center justify-center text-black text-[10px] font-black shadow-lg animate-pulse">{contact.unread}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
           
           <header className="bg-black/40 backdrop-blur-3xl border-b border-white/5 p-8 flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 bg-[#1a1a1a] border border-white/5 rounded-[22px] flex items-center justify-center text-3xl shadow-2xl">{selectedContact.avatar}</div>
              {selectedContact.online && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-black" />}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{selectedContact.name}</h3>
              <p className="text-[10px] text-gray-600 font-bold flex items-center gap-2 uppercase tracking-widest mt-1">
                 {selectedContact.online ? (
                    <><span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> Conectado agora</>
                 ) : (
                    <><Clock className="w-3 h-3" /> Visto por último hoje</>
                 )}
              </p>
            </div>
            <div className="flex gap-4">
              <button className="w-14 h-14 bg-white/5 border border-white/5 rounded-[20px] flex items-center justify-center text-gray-500 hover:text-[#D4AF37] transition-all hover:scale-105 shadow-xl"><Phone className="w-6 h-6" /></button>
              <button className="w-14 h-14 bg-white/5 border border-white/5 rounded-[20px] flex items-center justify-center text-gray-500 hover:text-blue-400 transition-all hover:scale-105 shadow-xl"><Video className="w-6 h-6" /></button>
              <button className="w-14 h-14 bg-white/5 border border-white/5 rounded-[20px] flex items-center justify-center text-gray-500 hover:text-white transition-all shadow-xl"><MoreVertical className="w-6 h-6" /></button>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-12 luxury-scroll relative z-10 flex flex-col gap-6">
            {contactMessages.map(msg => (
               <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[65%] p-6 rounded-[2.5rem] shadow-2xl relative animate-in ${msg.sender === 'user' ? 'bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-tr-sm slide-in-from-right' : 'bg-[#111111] border border-white/5 text-gray-300 rounded-tl-sm slide-in-from-left'}`}>
                     <p className={`text-base italic font-medium leading-relaxed ${msg.sender === 'user' ? 'font-black' : ''}`}>{msg.text}</p>
                     <div className={`flex items-center gap-2 mt-4 opacity-40 group-hover:opacity-100 transition-opacity ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${msg.sender === 'user' ? 'text-black' : 'text-gray-500'}`}>{msg.time}</p>
                        {msg.sender === 'user' && <CheckCircle className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-700' : 'text-black/40'}`} />}
                     </div>
                  </div>
               </div>
            ))}
          </div>

          <div className="p-10 bg-black/40 backdrop-blur-3xl border-t border-white/5 relative z-10">
            <div className="flex items-center gap-6 max-w-6xl mx-auto">
               <div className="flex gap-4">
                  <button className="w-14 h-14 bg-white/5 rounded-[20px] flex items-center justify-center text-gray-600 hover:text-[#D4AF37] transition-all"><Smile className="w-7 h-7" /></button>
                  <button className="w-14 h-14 bg-white/5 rounded-[20px] flex items-center justify-center text-gray-600 hover:text-[#D4AF37] transition-all"><Paperclip className="w-7 h-7" /></button>
               </div>
               <input
                 type="text"
                 placeholder="Sua resposta de elite..."
                 className="flex-1 h-18 bg-white/5 border border-white/5 rounded-[24px] px-8 outline-none text-white italic font-medium tracking-tight text-lg shadow-inner focus:border-[#D4AF37]/40 transition-all"
                 value={messageInput}
                 onChange={(e) => setMessageInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
               />
               <button onClick={sendMessage} className="w-18 h-18 bg-[#D4AF37] rounded-[24px] flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all shadow-amber-500/20">
                 <Send className="w-8 h-8" />
               </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] relative">
           <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent blur-3xl rounded-full w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
           <div className="text-center relative z-10 animate-in zoom-in duration-1000">
             <div className="w-24 h-24 bg-white/5 border border-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-700 mx-auto mb-8 shadow-2xl">
                <MessageCircle className="w-12 h-12" />
             </div>
             <h3 className="text-3xl font-black text-gray-600 italic uppercase tracking-tighter">Selecione um Cliente SD</h3>
             <p className="text-gray-700 text-sm font-bold uppercase tracking-[0.4em] mt-4">Comunicação Premium Ininterrupta</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default CRMWhatsApp;
