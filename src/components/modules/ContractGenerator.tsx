import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, Download, Eye, CheckCircle, AlertCircle, X, ChevronRight, Gavel, User, Banknote, MapPin, Home, Plus, Tag, Sparkles, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { generateAiChatResponse } from '@/services/geminiService';

const db = supabase as any;

const ContractGenerator: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    cidade: 'Fortaleza',
    bairro: '',
    cep: '00000-000',
    environments: [] as string[],
    shipping_cost: '0',
    discount: '0',
    contract_date: format(new Date(), 'yyyy-MM-dd'),
    payment_terms: '',
    deadline_days: '60',
    warranty_years: '5',
    clauses: '',
    ai_instructions: '',
  });
  
  const [newEnv, setNewEnv] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: cls } = await db.from('clients').select('id, name, document, address');
      const { data: projs } = await db.from('client_projects').select('id, name, value, client_id');
      setClients(cls || []);
      setProjects(projs || []);
    };
    fetchData();
  }, []);

  const selectedClient = clients.find(c => c.id === form.client_id);
  const selectedProject = projects.find(p => p.id === form.project_id);

  const saveContract = async () => {
    if (!form.client_id || !form.project_id) {
      toast({ title: 'Selecione cliente e projeto primeiro', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const finalValue = (selectedProject?.value || 0) + Number(form.shipping_cost) - Number(form.discount);

    const { data: contractData, error: contractError } = await db.from('contracts').insert({
      client_id: form.client_id,
      project_id: form.project_id,
      content: form.clauses,
      terms: form.payment_terms,
      status: 'active',
      value: finalValue,
      notes: `Frete: R$ ${form.shipping_cost} | Desconto: R$ ${form.discount} | Bairro: ${form.bairro} | Ambientes: ${form.environments.join(', ')}`,
      title: `Contrato: ${selectedClient?.name} - ${selectedProject?.name}`
    }).select().single();
    
    if (contractError) {
      toast({ title: 'Erro ao salvar contrato', variant: 'destructive' });
      setLoading(false);
      return;
    }

    await db.from('service_orders').insert({
      client_id: form.client_id,
      project_id: form.project_id,
      description: `INSTALAÇÃO: ${selectedProject?.name}. AMBIENTES: ${form.environments.join(', ')}. LOCAL: ${form.bairro}, ${form.cidade}.`,
      status: 'pending',
      priority: 'high',
      total_value: finalValue,
      notes: `CONTRATO EMITIDO EM ${format(new Date(), 'dd/MM/yyyy')}. Prazo: ${form.deadline_days} dias.`
    });

    toast({ title: '✅ Contrato e OS gerados com sucesso' });
    onComplete();
    setLoading(false);
  };

  const handleAiGenerate = async () => {
    if (!form.client_id || !form.project_id) {
      toast({ title: 'Selecione cliente e projeto primeiro', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const finalValue = (selectedProject?.value || 0) + Number(form.shipping_cost) - Number(form.discount);
      const prompt = `Gere as cláusulas de um contrato profissional de móveis projetados para a SD Móveis.
      CLIENTE: ${selectedClient?.name}
      PROJETO: ${selectedProject?.name}
      AMBIENTES: ${form.environments.join(', ')}
      VALOR TOTAL: R$ ${finalValue.toLocaleString('pt-BR')}
      PAGAMENTO: ${form.payment_terms}
      PRAZO: ${form.deadline_days} dias
      LOCAL: ${form.bairro}, ${form.cidade}
      INSTRUÇÕES ADICIONAIS: ${form.ai_instructions}
      
      Gere apenas o texto das cláusulas, numeradas e profissionais.`;
      
      const response = await generateAiChatResponse([{ role: 'user', content: prompt }]);
      setForm({ ...form, clauses: response });
      toast({ title: 'Contrato gerado pela IA com sucesso' });
    } catch (error) {
      toast({ title: 'Erro ao gerar com IA', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#0c0c0c] text-white flex flex-col h-[75vh]">
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10 luxury-scroll">
        
        {/* Header and Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest ml-1 italic">Vincular Cliente</label>
            <select 
              value={form.client_id} 
              onChange={e => setForm({ ...form, client_id: e.target.value })} 
              className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none"
            >
              <option value="">Selecione o Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest ml-1 italic">Vincular Projeto</label>
            <select 
              value={form.project_id} 
              onChange={e => setForm({ ...form, project_id: e.target.value })}
              className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none"
            >
              <option value="">Vincular Projeto</option>
              {projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.value.toLocaleString('pt-BR')}</option>)}
            </select>
          </div>
        </div>

        {/* Localidade Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
             <MapPin className="w-5 h-5 text-amber-500" /> LOCALIDADE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">BAIRRO</label>
              <input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} placeholder="Bairro" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">CIDADE</label>
              <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Fortaleza" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">CEP</label>
              <input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
          </div>
        </div>

        {/* Ambientes Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
               <Home className="w-5 h-5 text-amber-500" /> Ambientes
            </h3>
            <button onClick={() => { if (newEnv) { setForm({ ...form, environments: [...form.environments, newEnv] }); setNewEnv(''); } }} className="text-amber-500 font-bold text-[10px] uppercase">+ Adicionar</button>
          </div>
          <input 
            value={newEnv} 
            onChange={e => setNewEnv(e.target.value)} 
            placeholder="Ex: Suite Casal, Closet, Cozinha" 
            className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none"
            onKeyDown={e => { if (e.key === 'Enter') { setForm({ ...form, environments: [...form.environments, newEnv] }); setNewEnv(''); } }}
          />
          <div className="flex flex-wrap gap-2">
            {form.environments.map((env, i) => (
              <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 border border-amber-500/20">
                {env}
                <button onClick={() => setForm({ ...form, environments: form.environments.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Valores e Pagamento */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
             <Banknote className="w-5 h-5 text-amber-500" /> Valores e Pagamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">VALOR TOTAL (R$)</label>
              <input value={selectedProject?.value || '0'} readOnly className="w-full p-4 rounded-xl bg-black/50 border border-white/5 text-gray-500 text-xs outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">PRAZO DE ENTREGA</label>
              <input value={form.deadline_days} onChange={e => setForm({ ...form, deadline_days: e.target.value })} placeholder="60 dias" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">FRETE (R$)</label>
              <input value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} placeholder="500,00" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">DESCONTO (R$)</label>
              <input value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0,00" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">FORMA DE PAGAMENTO</label>
            <input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} placeholder="Ex: 50% entrada + 50% na entre" className="w-full p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
          </div>
        </div>

        {/* Observações Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
             <FileText className="w-5 h-5 text-amber-500" /> Observações e Instruções
          </h3>
          <textarea 
            value={form.clauses} 
            onChange={e => setForm({ ...form, clauses: e.target.value })} 
            placeholder="Observações gerais do contrato..." 
            className="w-full h-40 p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none resize-none"
          />
          <textarea 
            value={form.ai_instructions} 
            onChange={e => setForm({ ...form, ai_instructions: e.target.value })} 
            placeholder="Instruções adicionais para a IA (opcional)..." 
            className="w-full h-24 p-4 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none resize-none"
          />
        </div>

        {/* Final Button */}
        <div className="flex flex-col gap-4 mt-10">
          <button 
            onClick={handleAiGenerate}
            disabled={loading}
            className="w-full h-20 rounded-2xl bg-[#d97706] text-white font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl italic"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6" /> Gerar Contrato Preenchido com IA</>}
          </button>

          <button 
            onClick={saveContract}
            disabled={loading}
            className="w-full h-16 rounded-2xl border border-white/5 bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
          >
            {loading ? 'Salvando...' : 'Salvar Manualmente (Sem IA)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractGenerator;
