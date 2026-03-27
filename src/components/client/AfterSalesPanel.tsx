import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, Wrench, Camera, Send, ChevronRight, 
  Droplets, Sun, ThermometerSun, AlertTriangle, 
  CheckCircle, Upload, MessageCircle, Sparkles,
  ShieldCheck, ArrowRight, Heart
} from 'lucide-react';

const CONSERVATION_TIPS = [
  {
    icon: <Droplets className="w-6 h-6 text-blue-500" />,
    title: 'Limpeza do MDF',
    desc: 'Use pano levemente umedecido com detergente neutro. Evite álcool ou excesso de água. Seque imediatamente com flanela macia para preservar o brilho.',
  },
  {
    icon: <Sun className="w-6 h-6 text-[#D4AF37]" />,
    title: 'Exposição Solar',
    desc: 'A luz direta pode alterar a tonalidade dos padrões amadeirados. Utilize cortinas para proteger seus móveis nos horários de pico solar.',
  },
  {
    icon: <ThermometerSun className="w-6 h-6 text-red-500" />,
    title: 'Clima e Umidade',
    desc: 'O MDF é sensível a variações extremas. Mantenha os ambientes ventilados para evitar o estufamento das bordas por umidade acumulada.',
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    title: 'Carga e Pesos',
    desc: 'Distribua o peso uniformemente. Prateleiras longas exigem atenção especial para evitar o empenamento estrutural ao longo dos anos.',
  },
];

interface ServiceRequest {
  subject: string;
  description: string;
  photos: string[];
}

const AfterSalesPanel: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'manual' | 'service'>('manual');
  const [serviceForm, setServiceForm] = useState<ServiceRequest>({
    subject: '',
    description: '',
    photos: [],
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitService = () => {
    if (!serviceForm.subject || !serviceForm.description) {
      toast({ title: "⚠️ Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ 
      title: "🚀 Protocolo Aberto!", 
      description: `Sua solicitação #${Date.now().toString().slice(-6)} já está na fila de prioridade.` 
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 overflow-auto h-full bg-[#0f0f0f] relative luxury-scroll">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-xl">
            <Heart className="w-8 h-8 text-black" />
          </div>
          Pós-Venda <span className="text-[#D4AF37]">Premium</span>
        </h1>
        <p className="text-gray-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Cuidado Contínuo com Cada Detalhe</p>
      </header>

      {/* Modern Tabs */}
      <div className="flex p-1 bg-[#111111] border border-white/5 rounded-[2rem] w-fit relative z-10">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-500 ${
            activeTab === 'manual'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Manual de Conservação
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-500 ${
            activeTab === 'service'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Assistência Técnica
        </button>
      </div>

      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {activeTab === 'manual' && (
          <div className="space-y-8">
            {/* Warranty Status Banner */}
            <div className="bg-[#111111] border border-green-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 blur-3xl rounded-full" />
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shrink-0">
                  <ShieldCheck className="w-10 h-10 text-green-500" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-black text-2xl uppercase italic tracking-tighter mb-2">Sua Garantia está <span className="text-green-500">Ativa</span></h3>
                  <p className="text-gray-400 text-sm font-medium max-w-xl">
                    Sua tranquilidade é nossa prioridade. Este projeto possui cobertura total até <strong>2029</strong> contra qualquer vício de fabricação.
                  </p>
                </div>
                <button className="sm:ml-auto px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                   Baixar Certificado <Sparkles className="w-3 h-3 text-amber-500" />
                </button>
              </div>
            </div>

            {/* Conservation Tips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {CONSERVATION_TIPS.map((tip, i) => (
                <div key={i} className="bg-[#111111] border border-white/5 rounded-[2rem] p-8 shadow-xl hover:border-[#D4AF37]/30 transition-all group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all duration-500">
                      {tip.icon}
                    </div>
                    <h3 className="font-black text-white text-lg uppercase italic tracking-tighter">{tip.title}</h3>
                  </div>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed group-hover:text-gray-300 transition-colors">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'service' && (
          <div className="max-w-4xl mx-auto">
            {submitted ? (
              <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-16 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div>
                   <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">Solicitação Enviada!</h2>
                   <p className="text-gray-500 font-medium italic">Protocolo de Emergência: #{Date.now().toString().slice(-6)}</p>
                </div>
                <div className="p-6 bg-black/50 rounded-2xl border border-white/5 inline-block">
                  <p className="text-sm text-gray-400">Tempo estimado de resposta: <span className="text-amber-500 font-black">2 Horas Úteis</span></p>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setServiceForm({ subject: '', description: '', photos: [] }); }}
                  className="block mx-auto text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
                >
                  Abrir Novo Ticket de Suporte
                </button>
              </div>
            ) : (
              <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 sm:p-14 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                
                <header className="mb-12">
                  <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-4">
                    <MessageCircle className="w-6 h-6 text-[#D4AF37]" />
                    Central de Assistência
                  </h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Suporte técnico especializado SD</p>
                </header>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Natureza do Chamado</label>
                      <select
                        value={serviceForm.subject}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full h-14 bg-black/50 border border-white/10 rounded-2xl px-6 text-white text-sm focus:border-[#D4AF37]/50 outline-none transition-all appearance-none cursor-pointer italic font-bold"
                      >
                        <option value="" className="bg-[#111111]">Selecione a categoria...</option>
                        <option value="porta_desalinhada" className="bg-[#111111]">Portas e Alinhamentos</option>
                        <option value="gaveta_travando" className="bg-[#111111]">Sistemas de Corrediças</option>
                        <option value="defeito_acabamento" className="bg-[#111111]">Superfícies e Bordas</option>
                        <option value="ferragem_quebrada" className="bg-[#111111]">Substituição de Ferragens</option>
                        <option value="outro" className="bg-[#111111]">Outros Serviços</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Detalhes Técnicos</label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva a ocorrência com o máximo de detalhes para nossa engenharia..."
                      className="w-full h-40 bg-black/50 border border-white/10 rounded-2xl p-6 text-white text-sm resize-none focus:border-[#D4AF37]/50 outline-none transition-all italic font-medium placeholder:text-gray-700"
                    />
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Evidências Visuais</label>
                    <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-12 text-center hover:border-[#D4AF37]/30 transition-all cursor-pointer group/upload bg-black/20">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover/upload:scale-110 transition-all duration-500">
                        <Upload className="w-8 h-8 text-gray-700 group-hover/upload:text-[#D4AF37]" />
                      </div>
                      <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Arraste ou Clique para Anexar Fotos</p>
                      <p className="text-[9px] text-gray-700 mt-1 uppercase font-bold">Resolução Recomendada: HD (720p+)</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitService}
                    className="w-full h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20"
                  >
                    <Send className="w-5 h-5" />
                    Protocolar Solicitação
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AfterSalesPanel;
