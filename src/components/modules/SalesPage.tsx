import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Search, Eye, Phone, Mail, DollarSign, CheckCircle, MessageCircle, Edit, X } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const SalesPage: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
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
      db.from('client_projects').select('*, clients(name, phone, email)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name, phone, email').order('name'),
    ]);
    setProjects(projRes.data || []);
    setClients(cliRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.client_id) {
      toast({ title: '⚠️ Preencha nome do projeto e cliente', variant: 'destructive' });
      return;
    }
    const payload = {
      client_id: form.client_id,
      name: form.name,
      description: form.description || null,
      value: form.value,
      status: form.status,
      project_type: form.project_type || null,
      material: form.material || null,
      deadline: form.deadline || null,
    };
    if (editingId) {
      await db.from('client_projects').update(payload).eq('id', editingId);
      toast({ title: '✅ Projeto atualizado' });
    } else {
      await db.from('client_projects').insert(payload);
      toast({ title: '✅ Novo projeto/venda criado' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await db.from('client_projects').update({ status }).eq('id', id);
    toast({ title: '✅ Status atualizado' });
    fetchData();
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-white/10 text-gray-400 border border-white/20',
    'em_negociacao': 'bg-amber-900/50 text-amber-500 border border-amber-500/30',
    assinado: 'bg-green-900/50 text-green-400 border border-green-500/30',
    producao: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    instalacao: 'bg-purple-900/50 text-purple-400 border border-purple-500/30',
    concluido: 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    'em_negociacao': 'Em Negociação',
    assinado: 'Assinado',
    assasinado: 'Assinado', // Mapeamento proativo de erro
    assassinado: 'Assinado', // Mapeamento proativo de erro
    producao: 'Produção',
    instalacao: 'Instalação',
    concluido: 'Concluído',
  };

  const totalRevenue = projects.reduce((sum, p) => sum + (p.value || 0), 0);
  const signedCount = projects.filter(p => p.status === 'assinado' || p.status === 'producao' || p.status === 'instalacao' || p.status === 'concluido').length;
  const inProduction = projects.filter(p => p.status === 'producao').length;
  const conversionRate = projects.length > 0 ? Math.round((signedCount / projects.length) * 100) : 0;

  const filtered = projects.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.clients?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] w-full text-white">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <FileText className="w-8 h-8 text-amber-500" />
            Negócios SD
          </h1>
          <p className="text-gray-400 mt-1">Acompanhamento de Vendas e Produção</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ client_id: '', name: '', description: '', value: 0, status: 'em_negociacao', project_type: 'Móveis Projetados', material: '', deadline: '' });
          }}
          className="text-black px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}
        >
          <FileText className="w-5 h-5" />
          + Novo Contrato
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-gray-400 uppercase font-bold">Total em Contratos</p>
          <p className="text-2xl font-black text-white mt-1">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#111111] border border-green-500/20 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-gray-400 uppercase font-bold">Assinados</p>
          <p className="text-2xl font-black text-green-400 mt-1">{signedCount} contratos</p>
        </div>
        <div className="bg-[#111111] border border-blue-500/20 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-gray-400 uppercase font-bold">Em Produção</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{inProduction} projetos</p>
        </div>
        <div className="bg-[#111111] border border-purple-500/20 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-gray-400 uppercase font-bold">Taxa de Conversão</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{conversionRate}%</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar projeto ou cliente..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-600" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#111111] border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg text-white">{editingId ? 'Editar' : 'Novo'} Projeto / Venda</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="">Selecionar Cliente *</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do Projeto *" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="draft">Rascunho</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="assinado">Assinado</option>
              <option value="producao">Produção</option>
              <option value="instalacao">Instalação</option>
              <option value="concluido">Concluído</option>
            </select>
            <input value={form.project_type} onChange={e => setForm({ ...form, project_type: e.target.value })} placeholder="Tipo (ex: Móveis Projetados)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="Material (ex: MDF Branco)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" placeholder="Prazo" />
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do projeto" className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" rows={2} />
          <div className="flex gap-3">
            <button onClick={handleSave} className="text-black px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all">Cancelar</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-[#111111] border border-amber-500/30 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black text-white">{selectedProject.name}</h2>
              <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-gray-400"><strong className="text-white">Cliente:</strong> {selectedProject.clients?.name || '-'}</p>
              {selectedProject.clients?.phone && <p className="text-gray-400 flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500" /> {selectedProject.clients.phone}</p>}
              {selectedProject.clients?.email && <p className="text-gray-400 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" /> {selectedProject.clients.email}</p>}
              <p className="text-gray-400"><strong className="text-white">Valor:</strong> <span className="text-amber-500 font-bold">R$ {(selectedProject.value || 0).toLocaleString('pt-BR')}</span></p>
              <p className="text-gray-400"><strong className="text-white">Status:</strong> <span className={`px-3 py-1 rounded-full text-[10px] tracking-wider font-bold uppercase ${statusColors[selectedProject.status] || ''}`}>{statusLabels[selectedProject.status] || selectedProject.status}</span></p>
              {selectedProject.project_type && <p className="text-gray-400"><strong className="text-white">Tipo:</strong> {selectedProject.project_type}</p>}
              {selectedProject.material && <p className="text-gray-400"><strong className="text-white">Material:</strong> {selectedProject.material}</p>}
              {selectedProject.description && <p className="text-gray-400"><strong className="text-white">Descrição:</strong> {selectedProject.description}</p>}
              <p className="text-gray-400"><strong className="text-white">Criado em:</strong> {format(new Date(selectedProject.created_at), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#1a1a1a] border-b border-white/10">
            <tr>
              <th className="text-left p-6 text-xs font-black text-gray-400 uppercase">Cliente / Projeto</th>
              <th className="text-left p-6 text-xs font-black text-gray-400 uppercase">Contato</th>
              <th className="text-left p-6 text-xs font-black text-gray-400 uppercase">Valor Total</th>
              <th className="text-left p-6 text-xs font-black text-gray-400 uppercase">Status</th>
              <th className="text-left p-6 text-xs font-black text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-6">
                  <p className="font-bold text-white">{p.clients?.name || '-'}</p>
                  <p className="text-sm text-gray-400">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{format(new Date(p.created_at), 'dd/MM/yyyy')}</p>
                </td>
                <td className="p-6">
                  {p.clients?.phone && <p className="text-sm text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-500" /> {p.clients.phone}</p>}
                  {p.clients?.email && <p className="text-sm text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3 text-amber-500" /> {p.clients.email}</p>}
                </td>
                <td className="p-6 font-black tracking-wide text-white text-lg">R$ {(p.value || 0).toLocaleString('pt-BR')}</td>
                <td className="p-6">
                  <select
                    value={p.status}
                    onChange={e => updateStatus(p.id, e.target.value)}
                    className={`px-4 py-2 rounded-full text-[10px] tracking-wider uppercase font-bold border-0 cursor-pointer focus:outline-none ${statusColors[p.status] || 'bg-[#1a1a1a] text-gray-400 border border-white/10'}`}
                  >
                    <option value="draft" className="bg-[#1a1a1a] text-white">Rascunho</option>
                    <option value="em_negociacao" className="bg-[#1a1a1a] text-white">Em Negociação</option>
                    <option value="assinado" className="bg-[#1a1a1a] text-white">Assinado</option>
                    <option value="producao" className="bg-[#1a1a1a] text-white">Produção</option>
                    <option value="instalacao" className="bg-[#1a1a1a] text-white">Instalação</option>
                    <option value="concluido" className="bg-[#1a1a1a] text-white">Concluído</option>
                  </select>
                </td>
                <td className="p-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedProject(p)}
                      className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-900/20 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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
                      className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhum projeto encontrado'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesPage;
