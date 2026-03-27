import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Edit, Eye, X, User, Phone, Mail, Box, Layers, DollarSign, Calendar, Zap, Shield, TrendingUp, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const SalesPage: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [form, setForm] = useState({
    client_id: '',
    name: '',
    description: '',
    value: 0,
    status: 'draft',
    project_type: 'Móveis Projetados',
    material: '',
    deadline: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [projRes, cliRes] = await Promise.all([
      db.from('projects').select('*, clients(name, email, phone)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name').order('name'),
    ]);
    setProjects(projRes.data || []);
    setClients(cliRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.client_id || !form.name) {
      toast({ title: '⚠️ Campos obrigatórios', variant: 'destructive' });
      return;
    }

    const payload = { ...form, value: Number(form.value) };
    if (editingId) {
      await db.from('projects').update(payload).eq('id', editingId);
      toast({ title: '✅ Negócio SD Atualizado' });
    } else {
      await db.from('projects').insert(payload);
      toast({ title: '✅ Novo Contrato Registrado' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await db.from('projects').update({ status }).eq('id', id);
    toast({ title: '✅ Status Contratual Atualizado' });
    fetchData();
  };

  const statusStyles: Record<string, string> = {
    draft: 'bg-white/5 text-gray-400 border-white/10',
    em_negociacao: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5',
    assinado: 'bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5',
    producao: 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5',
    instalacao: 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-purple-500/5',
    concluido: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Pre-Venda',
    em_negociacao: 'Proposta',
    assinado: 'Fechado',
    producao: 'Em Fábrica',
    instalacao: 'Em Obra',
    concluido: 'Entregue',
  };

  const totalRevenue = projects.reduce((sum, p) => sum + (p.value || 0), 0);
  const signedCount = projects.filter(p => ['assinado', 'producao', 'instalacao', 'concluido'].includes(p.status)).length;
  const conversionRate = projects.length > 0 ? Math.round((signedCount / projects.length) * 100) : 0;

  const filtered = projects.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.clients?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <FileText className="w-8 h-8" />
            </div>
            Pipeline <span className="text-[#D4AF37]">Vendas</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <TrendingUp className="w-4 h-4 text-[#D4AF37]" /> Acompanhamento de Performance e Performance Comercial
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ client_id: '', name: '', description: '', value: 0, status: 'draft', project_type: 'Móveis Projetados', material: '', deadline: '' });
          }}
          className="px-10 h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-5 h-5" /> NOVO NEGÓCIO
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-amber-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Volume Global</p>
            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
          </div>
          <DollarSign className="w-10 h-10 text-amber-500/10 group-hover:text-amber-500 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-green-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Assinados</p>
            <p className="text-3xl font-black text-green-500 italic tracking-tighter tabular-nums">{signedCount} <span className="text-xs">UN</span></p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-green-500/10 group-hover:text-green-500 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Conversão SD</p>
            <p className="text-3xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">{conversionRate}%</p>
          </div>
          <Zap className="w-10 h-10 text-[#D4AF37]/10" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Portfolio Ativo</p>
            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{projects.length} <span className="text-xs">PROJETOS</span></p>
          </div>
          <Layers className="w-10 h-10 text-white/5" />
        </div>
      </div>

      <div className="relative max-w-2xl z-10">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#D4AF37]/40" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rastrear contrato por cliente ou designação do projeto..." 
          className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-white/5 bg-[#111111] text-white text-sm italic font-medium tracking-tight placeholder:text-gray-700 focus:border-[#D4AF37]/40 transition-all outline-none shadow-2xl" 
        />
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3.5rem] p-12 shadow-2xl space-y-10 relative z-10 animate-in slide-in-from-top duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
          <div className="flex justify-between items-center text-white relative z-10">
            <h3 className="font-black text-2xl italic uppercase tracking-tighter flex items-center gap-5">
               <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                  <FileText className="w-7 h-7" />
               </div>
               {editingId ? 'Refinar Negócio SD' : 'Iniciação de Novos Negócios'}
            </h3>
            <button onClick={() => setShowForm(false)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-8 h-8" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Seleção de Titular (Cliente)</label>
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                <option value="" className="bg-black text-gray-700">Identificar Cliente SD...</option>
                {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Identificação do Projeto / Obra</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" placeholder="Ex: Loft Premium JK" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Valor Estimado do Contrato (R$)</label>
              <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-[#D4AF37] text-2xl font-black italic tracking-tighter outline-none focus:border-[#D4AF37] transition-all tabular-nums shadow-inner" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Status do Pipeline</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                <option value="draft" className="bg-black">Pré-Venda</option>
                <option value="em_negociacao" className="bg-black">Em Proposta</option>
                <option value="assinado" className="bg-black">Contrato Assinado</option>
                <option value="producao" className="bg-black">Em Fábrica</option>
                <option value="instalacao" className="bg-black">Em Montagem</option>
                <option value="concluido" className="bg-black">Certificado de Conclusão</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Classificação de Projeto</label>
              <input value={form.project_type} onChange={e => setForm({ ...form, project_type: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Vencimento da Entrega</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Material Predominante / Texture Pack</label>
            <input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight" />
          </div>
          <div className="space-y-3 relative z-10">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Detalhamento Técnico do Escopo</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-6 bg-white/5 border border-white/5 rounded-2xl text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" rows={3} />
          </div>
          
          <button 
            onClick={handleSave} 
            className="w-full h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
          >
            EFETIVAR CRONOGRAMA DE VENDA
          </button>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-6" onClick={() => setSelectedProject(null)}>
          <div className="bg-[#0f0f0f] border border-[#D4AF37]/30 rounded-[3.5rem] p-12 max-w-2xl w-full shadow-[0_0_100px_rgba(212,175,55,0.1)] relative animate-in zoom-in-95 duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{selectedProject.name}</h2>
                <div className="flex items-center gap-3">
                   <Shield className="w-4 h-4 text-[#D4AF37]" />
                   <p className="text-gray-500 font-bold text-[10px] tracking-[0.3em] uppercase italic">Briefing de Alta Performance</p>
                </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-600 hover:text-white rounded-2xl transition-all"><X className="w-8 h-8" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mb-10">
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 group hover:border-[#D4AF37]/30 transition-all">
                  <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Identidade do Titular</p>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-[18px] bg-[#D4AF37] flex items-center justify-center text-black">
                        <User className="w-6 h-6" />
                     </div>
                     <div>
                        <p className="text-white font-black text-lg italic tracking-tight uppercase leading-none">{selectedProject.clients?.name || 'Venda Direta Elite'}</p>
                        <p className="text-gray-600 text-[10px] font-bold mt-1 tracking-widest">{selectedProject.clients?.phone || 'Central de Atendimento SD'}</p>
                     </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Valor Contratual Final</p>
                  <p className="text-3xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">R$ {(selectedProject.value || 0).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5">
                   <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Material & Estética</p>
                   <div className="flex items-center gap-3 text-white">
                      <Layers className="w-5 h-5 text-[#D4AF37]/50" />
                      <p className="font-bold italic uppercase tracking-tight">{selectedProject.material || 'Padrão SD Premium'}</p>
                   </div>
                 </div>

                 <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5">
                   <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-3 italic">Status Estratégico</p>
                   <span className={`inline-block px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusStyles[selectedProject.status] || ''}`}>
                    {statusLabels[selectedProject.status]?.toUpperCase() || selectedProject.status.toUpperCase()}
                  </span>
                 </div>
              </div>
            </div>

            {selectedProject.description && (
              <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative z-10 mb-10">
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 italic">Memória Descritiva Técnica</p>
                <p className="text-gray-500 text-sm leading-relaxed italic font-medium">{selectedProject.description}</p>
              </div>
            )}

            <button onClick={() => setSelectedProject(null)} className="w-full h-20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.4em] bg-white/5 text-gray-500 border border-white/5 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all italic">RETORNAR AO DASHBOARD</button>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-[4rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Cliente / Designação</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Canais de Contato</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Volume R$</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Pipeline</th>
                <th className="text-center p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="p-10">
                    <p className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter leading-none">{p.clients?.name || '-'}</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 italic flex items-center gap-2">
                       <Box className="w-3.5 h-3.5 opacity-40 text-[#D4AF37]" /> {p.name}
                    </p>
                  </td>
                  <td className="p-10">
                    <div className="space-y-2">
                      {p.clients?.phone && <p className="text-sm text-gray-500 flex items-center gap-3 italic font-medium tabular-nums"><Phone className="w-4 h-4 text-[#D4AF37]/30" /> {p.clients.phone}</p>}
                      {p.clients?.email && <p className="text-[10px] text-gray-700 flex items-center gap-3 font-black tracking-tighter truncate max-w-[180px]"><Mail className="w-4 h-4 text-[#D4AF37]/30" /> {p.clients.email.toLowerCase()}</p>}
                    </div>
                  </td>
                  <td className="p-10">
                    <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {(p.value || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-gray-700 uppercase font-black mt-2 tracking-widest">{format(new Date(p.created_at), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="p-10">
                    <select
                      value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none appearance-none italic shadow-xl ${statusStyles[p.status] || ''}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      {Object.keys(statusLabels).map(st => <option key={st} value={st} className="bg-black text-white">{statusLabels[st].toUpperCase()}</option>)}
                    </select>
                  </td>
                  <td className="p-10">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setSelectedProject(p)} className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"><Eye className="w-6 h-6" /></button>
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setForm({
                            client_id: p.client_id || '',
                            name: p.name,
                            description: p.description || '',
                            value: p.value || 0,
                            status: p.status,
                            project_type: p.project_type || '',
                            material: p.material || '',
                            deadline: p.deadline ? p.deadline.split('T')[0] : '',
                          });
                          setShowForm(true);
                        }}
                        className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
                      >
                        <Edit className="w-6 h-6" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center text-gray-800">
                         <FileText className="w-12 h-12" />
                      </div>
                      <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-xs">Aguardando novos fechamentos</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
