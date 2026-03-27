import React, { useState } from 'react';
import {
  BookOpen, Star, MessageCircle, Phone, Calendar, CheckCircle,
  Clock, AlertCircle, Plus, Wrench, Shield, Heart, ThumbsUp,
  ChevronRight, Send, Layout, Activity, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceRequest {
  id: string;
  type: string;
  description: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

const SERVICE_REQUESTS: ServiceRequest[] = [
  { id: '1', type: 'Ajuste de Porta', description: 'Porta do armário superior desalinhada', date: '20/02/2026', status: 'in_progress', priority: 'medium' },
  { id: '2', type: 'Troca de Puxador', description: 'Puxador da gaveta 3 com defeito', date: '15/02/2026', status: 'completed', priority: 'low' },
  { id: '3', type: 'Revisão Geral', description: 'Revisão de 6 meses agendada', date: '28/02/2026', status: 'pending', priority: 'low' },
];

const TIPS = [
  { icon: '🧹', title: 'Limpeza dos Móveis', desc: 'Use pano úmido com sabão neutro. Evite produtos abrasivos.' },
  { icon: '💧', title: 'Cuidado com Umidade', desc: 'Seque imediatamente qualquer respingo de água.' },
  { icon: '🔧', title: 'Dobradiças Pro', desc: 'As dobradiças premium possuem regulagem fina 3D.' },
  { icon: '🛡️', title: 'Garantia SD Elite', desc: 'Cobertura total por 5 anos em defeitos de fabricação.' },
];

const AfterSales: React.FC = () => {
  const { toast } = useToast();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [newRequestType, setNewRequestType] = useState('');
  const [newRequestDesc, setNewRequestDesc] = useState('');

  const statusInfo: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: '⏳ Aguardando' },
    in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '🔧 Em Andamento' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: '✅ Concluído' },
  };

  const handleNewRequest = () => {
    if (!newRequestType || !newRequestDesc) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Solicitação Enviada!', description: 'Nossa equipe premium entrará em contato.' });
    setShowNewRequest(false);
    setNewRequestType('');
    setNewRequestDesc('');
  };

  return (
    <div className="h-full p-8 sm:p-12 overflow-auto bg-[#0a0a0a] flex flex-col luxury-scroll">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
               <Shield className="w-7 h-7" />
            </div>
            Pós-Venda <span className="text-[#D4AF37]">Premium</span>
          </h1>
          <p className="text-gray-500 mt-4 flex items-center gap-3 font-medium italic">
             <Heart className="w-4 h-4 text-red-500 fill-red-500" /> Fidelidade e Suporte SD Móveis Elite
          </p>
        </div>
        <button 
          onClick={() => setShowNewRequest(!showNewRequest)} 
          className="bg-[#D4AF37] text-black px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-amber-500/10 flex items-center gap-3 italic"
        >
          <Plus className="w-5 h-5" /> Abrir Chamado Elite
        </button>
      </header>

      {/* New Request Form */}
      {showNewRequest && (
        <div className="bg-[#111111] rounded-[3rem] p-10 shadow-2xl mb-12 border border-[#D4AF37]/20 animate-in slide-in-from-top-10 duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          <h3 className="font-black text-white text-xl mb-8 flex items-center gap-3 uppercase italic tracking-tighter">
             <Wrench className="w-6 h-6 text-[#D4AF37]" /> Solicitação de Assistência Técnica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-3 ml-2">Tipo de Intervenção</label>
              <select value={newRequestType} onChange={(e) => setNewRequestType(e.target.value)} className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 outline-none text-white text-sm italic font-medium">
                <option value="" className="bg-black">Selecione o serviço...</option>
                <option value="Ajuste" className="bg-black">Ajuste Técnico de Móvel</option>
                <option value="Troca" className="bg-black">Substituição de Componente</option>
                <option value="Revisão" className="bg-black">Consultoria / Revisão Semestral</option>
                <option value="Garantia" className="bg-black">Ativação de Garantia Elite</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-3 ml-2">Nível de Urgência</label>
              <select className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 outline-none text-white text-sm italic font-medium">
                <option value="low" className="bg-black">Rotineiro</option>
                <option value="medium" className="bg-black">Prioritário</option>
                <option value="high" className="bg-black">Imediato (Urgência)</option>
              </select>
            </div>
          </div>
          <div className="mb-8">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-3 ml-2">Detalhamento Técnico</label>
            <textarea 
               value={newRequestDesc} 
               onChange={(e) => setNewRequestDesc(e.target.value)} 
               placeholder="Descreva minuciosamente sua necessidade..." 
               className="w-full h-32 bg-white/5 border border-white/5 rounded-[2rem] p-6 outline-none text-white text-sm italic font-medium resize-none" 
            />
          </div>
          <div className="flex gap-4">
            <button onClick={handleNewRequest} className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-3">
              <Send className="w-4 h-4" /> Enviar para Engenharia
            </button>
            <button onClick={() => setShowNewRequest(false)} className="bg-white/5 border border-white/5 text-gray-500 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
        <div className="lg:col-span-2 bg-[#111111] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl">
          <h3 className="font-black text-white text-2xl mb-8 flex items-center gap-4 uppercase italic tracking-tighter">
             <Activity className="w-6 h-6 text-[#D4AF37]" /> Status de Atendimento
          </h3>
          <div className="space-y-6">
            {SERVICE_REQUESTS.map(req => (
              <div key={req.id} className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 hover:border-[#D4AF37]/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <p className="text-xl font-black text-white mb-2 italic uppercase tracking-tight">{req.type}</p>
                    <p className="text-sm text-gray-500 italic font-medium leading-relaxed">{req.description}</p>
                    <div className="mt-6 flex items-center gap-4">
                       <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{req.date}</span>
                       </div>
                       <div className="w-1 h-1 rounded-full bg-gray-800" />
                       <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Protocolo #{req.id}00X</span>
                    </div>
                  </div>
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 ${statusInfo[req.status].bg} ${statusInfo[req.status].text}`}>
                    {statusInfo[req.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#111111] rounded-[3rem] p-10 border border-white/5 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full" />
            <h3 className="font-black text-white text-xl mb-6 flex items-center justify-center gap-3 uppercase italic tracking-tighter">
               <Star className="w-6 h-6 text-[#D4AF37]" /> Experiência SD
            </h3>
            <p className="text-sm text-gray-600 mb-8 italic font-medium leading-relaxed">Avalie o atendimento da equipe técnica em sua residência.</p>
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map(n => (
                <button 
                  key={n} 
                  onClick={() => { setSatisfaction(n); toast({ title: `⭐ Obrigado pela avaliação premium!` }); }} 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all hover:scale-[1.15] border ${satisfaction && satisfaction >= n ? 'bg-[#D4AF37] border-transparent scale-110 shadow-lg' : 'bg-white/5 border-white/5'}`}
                >
                  {satisfaction && satisfaction >= n ? <Star className="w-6 h-6 text-black fill-black" /> : <Star className="w-6 h-6 text-gray-800" />}
                </button>
              ))}
            </div>
            {satisfaction && (
              <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 animate-bounce">
                 <Zap className="w-3.5 h-3.5 fill-green-500" /> Feedback Concluído
              </p>
            )}
          </div>

          <div className="rounded-[3rem] p-10 text-white shadow-2xl border border-[#D4AF37]/30 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 100%)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent pointer-events-none" />
            <h3 className="font-black text-2xl mb-4 flex items-center gap-4 italic tracking-tighter uppercase relative z-10">
               <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center text-black">
                  <Phone className="w-5 h-5" />
               </div>
               Suporte VIP
            </h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed italic font-medium relative z-10">Linha direta exclusiva para clientes SD Móveis Elite.</p>
            <button className="w-full h-16 bg-green-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-green-500 transition-all flex items-center justify-center gap-3 shadow-green-900/40 relative z-10 shadow-xl group/btn">
              <MessageCircle className="w-6 h-6 group-hover/btn:scale-110 transition-transform" /> WhatsApp Conceito
            </button>
            <p className="text-center text-gray-700 text-[9px] font-black uppercase tracking-widest mt-6 relative z-10 italic">Atendimento PRIORITÁRIO 24/7</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] rounded-[3.5rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full" />
        <h3 className="font-black text-white text-2xl mb-12 flex items-center gap-4 uppercase italic tracking-tighter">
           <Shield className="w-7 h-7 text-[#D4AF37]" /> Guia de Conservação & Longevidade
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIPS.map((tip, i) => (
            <div key={i} className="bg-black/30 border border-white/5 rounded-[2.5rem] p-8 text-center hover:border-[#D4AF37]/30 transition-all shadow-xl group">
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 group-hover:rotate-6 transition-transform shadow-inner">
                 {tip.icon}
              </div>
              <p className="font-black text-white text-base italic uppercase tracking-tight mb-3">{tip.title}</p>
              <p className="text-xs text-gray-500 italic font-medium leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AfterSales;
