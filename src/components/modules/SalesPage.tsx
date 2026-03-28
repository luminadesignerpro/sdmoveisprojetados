import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Edit, Eye, X, User, Phone, Mail, Box, Layers, DollarSign, Calendar, Zap, Shield, TrendingUp, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const SalesPage: React.FC = () => {
  const { toast } = useToast();
  const [client_projects, setProjects] = useState<any[]>([]);
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
      db.from('client_projects').select('*, clients(name, email, phone)').order('created_at', { ascending: false }),
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
      await db.from('client_projects').update(payload).eq('id', editingId);
      toast({ title: '✅ Negócio SD Atualizado' });
    } else {
      await db.from('client_projects').insert(payload);
      toast({ title: '✅ Novo Contrato Registrado' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await db.from('client_projects').update({ status }).eq('id', id);
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

  const totalRevenue = client_projects.reduce((sum, p) => sum + (p.value || 0), 0);
  const signedCount = client_projects.filter(p => ['assinado', 'producao', 'instalacao', 'concluido'].includes(p.status)).length;
  const conversionRate = client_projects.length > 0 ? Math.round((signedCount / client_projects.length) * 100) : 0;

  const filtered = client_projects.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.clients?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-xl flex items-center justify-center text-black shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            Pipeline <span className="text-[#D4AF37]">Vendas</span>
          </h1>
          <p className="text-gray-500 mt-2 text-[10px] font-medium italic flex items-center gap-2">
             <TrendingUp className="w-3 h-3 text-[#D4AF37]" /> Acompanhamento Comercial SD
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ client_id: '', name: '', description: '', value: 0, status: 'draft', project_type: 'Móveis Projetados', material: '', deadline: '' });
          }}
          className="px-6 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl text-black flex items-center gap-2 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-4 h-4" /> NOVO NEGÓCIO
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 shadow-2xl flex items-center justify-between group hover:border-amber-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Volume Global</p>
            <p className="text-xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
          </div>
          <DollarSign className="w-6 h-6 text-amber-500/10 group-hover:text-amber-500 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-between group hover:border-green-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Assinados</p>
            <p className="text-2xl font-black text-green-500 italic tracking-tighter tabular-nums">{signedCount} <span className="text-xs">UN</span></p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-500/10 group-hover:text-green-500 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-3xl p-6 shadow-2xl flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Conversão SD</p>
            <p className="text-2xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">{conversionRate}%</p>
          </div>
          <Zap className="w-8 h-8 text-[#D4AF37]/10" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-between group overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Portfolio Ativo</p>
            <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{client_projects.length} <span className="text-[8px]">PROJETOS</span></p>
          </div>
          <Layers className="w-8 h-8 text-white/5" />
        </div>
      </div>

      <div className="relative max-w-xl z-10">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]/40" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rastrear contrato por cliente ou designação do projeto..." 
          className="w-full pl-14 pr-6 py-4 rounded-2xl border border-white/5 bg-[#111111] text-white text-xs italic font-medium tracking-tight placeholder:text-gray-700 focus:border-[#D4AF37]/40 transition-all outline-none shadow-2xl" 
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 relative z-10 animate-in zoom-in-95 duration-300 overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto luxury-scroll">
            <div className="flex justify-between items-center text-white relative z-10">
              <h3 className="font-black text-lg italic uppercase tracking-tighter flex items-center gap-3">
                 Novo Projeto / Venda
              </h3>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-1">
                <select 
                  value={form.client_id} 
                  onChange={e => setForm({ ...form, client_id: e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-amber-500/50 rounded-xl px-4 text-white text-xs font-bold outline-none appearance-none cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                  <option value="" className="bg-black text-gray-700">Selecione o Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <input 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs font-medium outline-none focus:border-amber-500/40 transition-all shadow-inner" 
                  placeholder="Nome do Proj" 
                />
              </div>
              <div className="space-y-1">
                <input 
                  type="number" 
                  value={form.value} 
                  onChange={e => setForm({ ...form, value: +e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-lg font-black italic tracking-tighter outline-none focus:border-amber-500/40 transition-all" 
                />
              </div>
              <div className="space-y-1">
                <select 
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs font-bold outline-none appearance-none cursor-pointer"
                >
                  {Object.entries(statusLabels).map(([val, lab]) => <option key={val} value={val} className="bg-black">{lab}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <input 
                  value={form.project_type} 
                  onChange={e => setForm({ ...form, project_type: e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs font-bold outline-none focus:border-amber-500/40" 
                />
              </div>
              <div className="space-y-1">
                <input 
                  value={form.material} 
                  onChange={e => setForm({ ...form, material: e.target.value })} 
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs italic font-medium" 
                  placeholder="Material (ex: MDF)" 
                />
              </div>
              <div className="col-span-2 space-y-1">
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs italic font-medium outline-none focus:border-amber-500/40 transition-all" 
                  rows={3} 
                  placeholder="Descrição do projeto"
                />
              </div>
            </div>
            
            <div className="flex gap-4 relative z-10 pt-2">
              <button 
                onClick={handleSave} 
                className="flex-1 h-14 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-xl italic bg-gradient-to-r from-amber-500 to-amber-600"
              >
                SALVAR
              </button>
              <button onClick={() => setShowForm(false)} className="px-8 h-14 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10 transition-all italic">CANCELAR</button>
            </div>
          </div>
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

      <div className="bg-[#111111] border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Cliente / Designação</th>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Contatos</th>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Volume R$</th>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Pipeline</th>
                <th className="text-center p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="p-6">
                    <p className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter leading-none">{p.clients?.name || '-'}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1.5 italic flex items-center gap-1.5">
                       <Box className="w-3 h-3 opacity-40 text-[#D4AF37]" /> {p.name}
                    </p>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                      {p.clients?.phone && <p className="text-xs text-gray-500 flex items-center gap-2 italic font-medium tabular-nums"><Phone className="w-3 h-3 text-[#D4AF37]/30" /> {p.clients.phone}</p>}
                      {p.clients?.email && <p className="text-[9px] text-gray-700 flex items-center gap-2 font-black tracking-tighter truncate max-w-[150px]"><Mail className="w-3 h-3 text-[#D4AF37]/30" /> {p.clients.email.toLowerCase()}</p>}
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {(p.value || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[9px] text-gray-700 uppercase font-black mt-1.5 tracking-widest">{format(new Date(p.created_at), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="p-6">
                    <select
                      value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none appearance-none italic shadow-xl ${statusStyles[p.status] || ''}`}
                      style={{ textAlignLast: 'center' }}
                    >
                      {Object.keys(statusLabels).map(st => <option key={st} value={st} className="bg-black text-white">{statusLabels[st].toUpperCase()}</option>)}
                    </select>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedProject(p)} className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"><Eye className="w-5 h-5" /></button>
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
                        className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
                      >
                        <Edit className="w-5 h-5" />
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
