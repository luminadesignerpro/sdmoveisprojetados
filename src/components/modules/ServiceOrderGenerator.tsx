import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, Sparkles, X, ChevronRight, User, Briefcase, Clock, AlertCircle } from 'lucide-react';
import { generateAiChatResponse } from '@/services/geminiService';
import { format } from 'date-fns';

const db = supabase as any;

const ServiceOrderGenerator: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<any[]>([]);
  const [client_projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    description: '',
    priority: 'high',
    estimated_date: format(new Date(), 'yyyy-MM-dd'),
    total_value: 0,
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: cls } = await db.from('clients').select('id, name');
      const { data: projs } = await db.from('client_projects').select('id, name, value, client_id');
      setClients(cls || []);
      setProjects(projs || []);
    };
    fetchData();
  }, []);

  const selectedClient = clients.find(c => c.id === form.client_id);
  const selectedProject = client_projects.find(p => p.id === form.project_id);

  const handleAiGenerate = async () => {
    if (!form.project_id) {
      toast({ title: 'Selecione um projeto primeiro', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const prompt = `Gere uma descrição técnica e lista de tarefas para uma Ordem de Serviço (OS) de instalação de móveis.
      PROJETO: ${selectedProject?.name}
      CLIENTE: ${selectedClient?.name}
      ESTILO: SD Móveis Projetados (Luxo)
      
      Gere um checklist de instalação profissional.`;
      
      const response = await generateAiChatResponse([{ role: 'user', content: prompt }]);
      setForm({ ...form, description: response });
      toast({ title: 'OS gerada pela IA' });
    } catch (error) {
      toast({ title: 'Erro na IA', variant: 'destructive' });
    }
    setLoading(false);
  };

  const saveOS = async () => {
    setLoading(true);
    const { error } = await db.from('service_orders').insert({
      client_id: form.client_id,
      project_id: form.project_id,
      description: form.description,
      priority: form.priority,
      estimated_date: form.estimated_date,
      total_value: Number(form.total_value) || selectedProject?.value || 0,
      status: 'pending'
    });
    
    if (error) {
      toast({ title: 'Erro ao salvar OS', variant: 'destructive' });
    } else {
      toast({ title: '✅ Ordem de Serviço Gerada' });
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#0c0c0c] text-white overflow-hidden rounded-3xl flex flex-col h-[75vh]">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] flex items-center justify-center text-black shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tighter italic mr-4">Gerador de OS <span className="text-[#D4AF37]">Inteligente</span></h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest ml-1 italic">Vincular Cliente</label>
            <select 
              value={form.client_id} 
              onChange={e => setForm({ ...form, client_id: e.target.value })} 
              className="w-full p-3.5 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none focus:border-[#D4AF37]/50"
            >
              <option value="">Selecione...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest ml-1 italic">Vincular Projeto</label>
            <select 
              value={form.project_id} 
              onChange={e => setForm({ ...form, project_id: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none focus:border-[#D4AF37]/50"
            >
              <option value="">Selecione...</option>
              {client_projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest ml-1 italic">Escopo Técnico</label>
            <button 
              onClick={handleAiGenerate}
              className="px-4 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] rounded-lg text-black font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Sparkles className="w-3 h-3" /> GERAR COM IA
            </button>
          </div>
          <textarea 
            value={form.description} 
            onChange={e => setForm({ ...form, description: e.target.value })} 
            className="w-full p-5 rounded-2xl bg-[#111111] border border-white/10 text-gray-300 focus:border-blue-500/50 outline-none font-mono text-xs min-h-[180px]"
            placeholder="A IA pode gerar isto para você..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-3">
             <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1 italic">Prioridade</label>
             <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full p-3.5 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none">
               <option value="low">Baixa</option>
               <option value="medium">Média</option>
               <option value="high">Alta / Urgente</option>
             </select>
           </div>
           <div className="space-y-3">
             <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1 italic">Data Estimada</label>
             <input type="date" value={form.estimated_date} onChange={e => setForm({ ...form, estimated_date: e.target.value })} className="w-full p-3.5 rounded-xl bg-[#111111] border border-white/10 text-white text-xs outline-none" />
           </div>
        </div>
      </div>

       <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 flex justify-end">
        <button 
          onClick={saveOS}
          disabled={loading}
          className="px-10 py-4 rounded-xl font-black text-[10px] tracking-widest bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-all uppercase flex items-center gap-3 disabled:opacity-50 italic"
        >
          {loading ? 'Processando...' : <><Save className="w-4 h-4" /> PUBLICAR OS ELITE</>}
        </button>
      </div>
    </div>
  );
};

export default ServiceOrderGenerator;
