import React, { useState } from 'react';
import { DollarSign, Send, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, Wallet, Zap, Shield, Sparkles, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdvanceRequestData {
  id: string;
  date: string;
  value: number;
  reason: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  approvedBy?: string;
  responseDate?: string;
  responseNote?: string;
}

const ADVANCE_HISTORY: AdvanceRequestData[] = [
  { id: '1', date: '15/02/2026', value: 500, reason: 'Despesas médicas urgentes', status: 'aprovado', approvedBy: 'Jerffeson', responseDate: '15/02/2026', responseNote: 'Aprovado. Desconto em folha.' },
  { id: '2', date: '10/01/2026', value: 300, reason: 'Manutenção do veículo', status: 'aprovado', approvedBy: 'Jerffeson', responseDate: '11/01/2026', responseNote: 'Aprovado.' },
  { id: '3', date: '20/12/2025', value: 1000, reason: 'Despesas de fim de ano', status: 'recusado', approvedBy: 'Jerffeson', responseDate: '21/12/2025', responseNote: 'Valor excede o limite de 50%.' },
];

interface AdvanceRequestProps {
  employeeName: string;
}

const AdvanceRequest: React.FC<AdvanceRequestProps> = ({ employeeName }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState(ADVANCE_HISTORY);
  const [showForm, setShowForm] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');

  const handleSubmit = () => {
    if (!newValue || !newReason.trim()) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const value = parseFloat(newValue);
    if (isNaN(value) || value <= 0) {
      toast({ title: '⚠️ Valor inválido', variant: 'destructive' });
      return;
    }
    if (value > 1400) {
      toast({ title: '⚠️ Limite excedido', description: 'O valor máximo é R$ 1.400 (50% do salário).', variant: 'destructive' });
      return;
    }

    const newRequest: AdvanceRequestData = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-BR'),
      value,
      reason: newReason,
      status: 'pendente',
    };
    setRequests(prev => [newRequest, ...prev]);
    setNewValue('');
    setNewReason('');
    setShowForm(false);
    toast({ title: '✅ Solicitação Enviada!', description: `Vale de R$ ${value.toFixed(2)} registrado.` });
  };

  const statusConfig = {
    pendente: { icon: <Clock className="w-4 h-4" />, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'PENDENTE DE ANÁLISE' },
    aprovado: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'LIBERADO / APROVADO' },
    recusado: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'REQUISIÇÃO INDEFERIDA' },
  };

  const pendingCount = requests.filter(r => r.status === 'pendente').length;
  const approvedTotal = requests.filter(r => r.status === 'aprovado').reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="h-full p-8 sm:p-12 overflow-auto bg-[#0a0a0a] flex flex-col luxury-scroll gap-12 rounded-[3rem] border border-white/5 relative">
       <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5 leading-none">
             <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
                <Wallet className="w-8 h-8" />
             </div>
             Acesso ao <span className="text-[#D4AF37]">Capital</span>
          </h1>
          <p className="text-gray-500 mt-4 flex items-center gap-3 font-medium italic">
             <Zap className="w-4 h-4 text-[#D4AF37]" /> {employeeName.toUpperCase()} • Gestão de Adiantamentos Proativos
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#D4AF37] text-black px-10 h-20 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 italic"
        >
          {showForm ? <XCircle className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
          {showForm ? 'CANCELAR PROTOCOLO' : 'NOVA REQUISIÇÃO VIP'}
        </button>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Limite de Crédito Disponível</p>
          <p className="text-4xl font-black text-green-400 italic tracking-tighter tabular-nums">R$ 1.400,00</p>
          <div className="mt-6 flex items-center gap-3 text-gray-800 italic text-[10px] font-black uppercase tracking-tighter">
             <Shield className="w-4 h-4" /> Diretriz de Risco: 50% Salário
          </div>
        </div>
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Fluxo de Análise</p>
          <p className="text-4xl font-black text-amber-500 italic tracking-tighter tabular-nums">{pendingCount} <span className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-40">Sob Revisão</span></p>
          <div className="mt-6 flex items-center gap-3 text-gray-800 italic text-[10px] font-black uppercase tracking-tighter">
             <Clock className="w-4 h-4" /> Monitoramento em Tempo Real
          </div>
        </div>
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Consumo de Ciclo</p>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">R$ {approvedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          <div className="mt-6 flex items-center gap-3 text-gray-800 italic text-[10px] font-black uppercase tracking-tighter">
             <FileText className="w-4 h-4" /> Histórico Operacional
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#111111] rounded-[3.5rem] p-12 shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-[#D4AF37]/30 animate-in slide-in-from-top-12 duration-700 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12 flex items-center gap-5 leading-none">
             <div className="w-12 h-12 rounded-[18px] bg-[#D4AF37] text-black flex items-center justify-center shadow-lg"><Send className="w-6 h-6" /></div>
             Protocolo de Requisição Proativa
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ventrículo Financeiro (R$)</label>
              <div className="relative">
                 <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D4AF37] w-6 h-6" />
                 <input
                    type="number"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="EX: 500"
                    className="w-full h-20 bg-black border border-white/5 rounded-[2rem] pl-16 pr-8 outline-none text-white text-2xl font-black italic tracking-tighter shadow-inner focus:border-[#D4AF37]/40 transition-all tabular-nums"
                 />
              </div>
              <p className="text-[9px] text-[#D4AF37]/40 font-black uppercase tracking-widest mt-2 ml-4 italic">Capacidade Residual: R$ 1.400,00</p>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Memorial Descritivo / Motivo</label>
              <textarea
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="REGISTRE A FINALIDADE DESTA SOLICITAÇÃO TÉCNICA..."
                className="w-full h-20 bg-black border border-white/5 rounded-[2rem] px-8 py-6 outline-none text-white text-xs font-medium italic resize-none shadow-inner focus:border-[#D4AF37]/40 transition-all uppercase"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-12">
            <button onClick={handleSubmit} className="flex-1 h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl italic flex items-center justify-center gap-4">
              <Send className="w-6 h-6" /> TRANSMITIR REQUISIÇÃO
            </button>
            <button onClick={() => setShowForm(false)} className="px-12 h-20 bg-white/5 border border-white/10 text-gray-700 hover:text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all italic">
              ABORTAR
            </button>
          </div>
          <div className="mt-10 p-8 bg-black border border-white/5 rounded-[2.5rem] flex items-start gap-6 relative overflow-hidden group/alert">
            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 opacity-20" />
            <AlertCircle className="w-8 h-8 text-amber-500 shrink-0 group-hover/alert:scale-110 transition-transform" />
            <div>
               <p className="text-[11px] text-white font-black uppercase italic tracking-widest mb-1">Atenção Técnica</p>
               <p className="text-[10px] text-gray-500 font-medium italic leading-relaxed">A aprovação deste protocolo implica na retenção automática em folha de pagamento. Requisições acima do limite técnico sofrerão redirecionamento imediato para auditoria da presidência.</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-[#111111] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden relative z-10 animate-in slide-in-from-bottom-8 duration-700">
        <div className="p-10 border-b border-white/5 bg-black/40 flex justify-between items-center">
          <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-5 leading-none">
            <FileText className="w-8 h-8 text-[#D4AF37]" /> Log de Transações Financeiras
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {requests.map(req => (
            <div key={req.id} className="p-10 hover:bg-white/[0.02] transition-colors group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                <div className="flex items-start gap-8">
                  <div className={`w-18 h-18 rounded-[25px] flex items-center justify-center shadow-2xl border transition-all duration-700 group-hover:rotate-[360deg] ${
                    req.status === 'aprovado' ? 'bg-green-500/10 text-green-400 border-green-500/10' : req.status === 'recusado' ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                  }`}>
                    {statusConfig[req.status].icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                       <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {req.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest italic flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> {req.date}
                       </span>
                    </div>
                    <p className="text-sm text-gray-500 italic font-medium leading-relaxed max-w-md">{req.reason.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                  <span className={`px-6 h-10 flex items-center rounded-full text-[9px] font-black uppercase tracking-widest border italic group-hover:scale-105 transition-all shadow-lg ${statusConfig[req.status].color}`}>
                    {statusConfig[req.status].label}
                  </span>
                  {req.responseNote && (
                    <div className="bg-black/40 p-5 rounded-2xl border-r-4 border-r-[#D4AF37] border-white/5 animate-in fade-in slide-in-from-right-4 duration-1000">
                       <p className="text-[10px] text-gray-500 font-bold italic text-right max-w-[200px] leading-relaxed uppercase">{req.responseNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvanceRequest;
