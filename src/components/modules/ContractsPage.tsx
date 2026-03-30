import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileSignature, Plus, Search, Edit, Sparkles, Key } from 'lucide-react';
import { format } from 'date-fns';
import ContractGenerator from './ContractGenerator';

const db = supabase as any;

const ContractsPage: React.FC = () => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ client_id: '', client_name: '', title: '', content: '', value: 0, status: 'rascunho', notes: '' });
  const [showGenerator, setShowGenerator] = useState<'contrato_servico' | 'ordem_servico' | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [contRes, cliRes] = await Promise.all([
      db.from('contracts').select('*, clients(name, phone, email, address)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name, phone, email, address').order('name'),
    ]);
    setContracts(contRes.data || []);
    setClients(cliRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: '⚠️ Título obrigatório', variant: 'destructive' }); return; }

    let clientId = form.client_id || null;

    // Se digitou nome manual e não selecionou cliente existente, cria um novo
    if (!clientId && form.client_name.trim()) {
      const { data: newClient, error: clientErr } = await db.from('clients').insert({ name: form.client_name.trim() }).select('id').single();
      if (clientErr) {
        toast({ title: '❌ Erro ao criar cliente', description: clientErr.message, variant: 'destructive' });
        return;
      }
      clientId = newClient.id;
      fetchData(); // refresh clients list
    }

    const payload = { client_id: clientId, title: form.title, content: form.content, value: form.value, status: form.status, notes: form.notes };
    let result;
    if (editingId) {
      result = await db.from('contracts').update(payload).eq('id', editingId);
    } else {
      result = await db.from('contracts').insert(payload);
    }
    if (result.error) {
      console.error('Contract save error:', result.error);
      toast({ title: '❌ Erro ao salvar contrato', description: result.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? '✅ Contrato atualizado' : '✅ Contrato criado' });
    setShowForm(false);
    setEditingId(null);
    setForm({ client_id: '', client_name: '', title: '', content: '', value: 0, status: 'rascunho', notes: '' });
    fetchData();
  };

  const statusColors: Record<string, string> = {
    rascunho: 'bg-white/10 text-gray-400 border border-white/20',
    ativo: 'bg-green-900/50 text-green-400 border border-green-500/30',
    assinado: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    assassinado: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    assasinado: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    cancelado: 'bg-red-900/50 text-red-500 border border-red-500/30',
    finalizado: 'bg-purple-900/50 text-purple-400 border border-purple-500/30',
  };

  const generateClientLogin = async (contract: any) => {
    if (!contract.clients) {
      toast({ title: '⚠️ Cliente não vinculado', description: 'Associe um cliente ao contrato primeiro.', variant: 'destructive' });
      return;
    }

    const clientName = contract.clients.name;
    const clientPhone = contract.clients.phone || contract.client_id;
    // Generate a simple 6 digit password or use phone number
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // Create user in employees table (acting as our users table)
      const payload = {
        name: clientName,
        email: `cliente_${contract.client_id}@sdmoveis.com`, // fake email just for id
        password: tempPassword,
        role: 'Cliente',
        active: true
      };

      const { error } = await db.from('employees').insert([payload]);
      if (error) throw error;

      toast({
        title: '🔑 Acesso Gerado!',
        description: `A senha do cliente ${clientName} é: ${tempPassword}`,
        duration: 10000 // keep it longer so they can copy
      });
      // Optionally theoretically send a whatsapp message with these credentials via our API...
    } catch (error: any) {
      console.error(error);
      toast({
        title: '❌ Ops',
        description: 'Não foi possível gerar no banco. Gerando localmente para teste.',
        variant: 'destructive'
      });
      // Mock generation alert
      alert(`[MODO LOCAL] A senha de acesso gerada para o cliente ${clientName} é: ${tempPassword}`);
    }
  };

  const filtered = contracts.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || (c.clients?.name || '').toLowerCase().includes(search.toLowerCase()));

  const openGenerator = (type: 'contrato_servico' | 'ordem_servico') => {
    setShowGenerator(type);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] w-full text-white">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <FileSignature className="w-8 h-8 text-amber-500" />
            Contratos
          </h1>
          <p className="text-gray-400 mt-1">Gestão de contratos e ordens de serviço</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <button onClick={() => openGenerator('contrato_servico')} className="bg-[#1a1a1a] border border-amber-500/30 text-amber-500 px-5 py-3 rounded-2xl font-bold hover:bg-amber-500/10 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto transition-colors">
            <Sparkles className="w-5 h-5" /> Gerar Contrato (IA)
          </button>
          <button onClick={() => openGenerator('ordem_servico')} className="bg-[#1a1a1a] border border-blue-500/30 text-blue-400 px-5 py-3 rounded-2xl font-bold hover:bg-blue-500/10 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto transition-colors">
            <Sparkles className="w-5 h-5" /> Gerar OS (IA)
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ client_id: '', client_name: '', title: '', content: '', value: 0, status: 'rascunho', notes: '' }); }} className="text-black px-5 py-3 rounded-2xl font-bold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto transition-opacity" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
            <Plus className="w-5 h-5" /> Manual
          </button>
        </div>
      </header>

      {/* Generator */}
      {showGenerator && (
        <ContractGenerator
          templateType={showGenerator}
          clients={clients}
          onClose={() => setShowGenerator(null)}
          onSaved={fetchData}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['rascunho', 'ativo', 'assinado', 'finalizado'].map(st => (
          <div key={st} className="bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-lg shrink-0 hover:border-amber-500/30 transition-colors">
            <p className="text-xs text-gray-400 uppercase font-bold">{st.charAt(0).toUpperCase() + st.slice(1)}s</p>
            <p className="text-2xl font-black text-white mt-1">{contracts.filter(c => c.status === st).length}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-600" />
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg text-white">{editingId ? 'Editar' : 'Novo'} Contrato</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título *" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none flex-1">
              <option value="">Selecionar Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Nome do cliente (manual)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="assinado">Assinado</option>
              <option value="assassinado">Assinado (Correção)</option>
              <option value="assasinado">Assinado (Correção)</option>
              <option value="cancelado">Cancelado</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Conteúdo do contrato" className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" rows={4} />
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observações" className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" rows={2} />
          <div className="flex gap-3">
            <button onClick={handleSave} className="text-black px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
        <table className="w-full min-w-[800px]">
          <thead className="bg-[#1a1a1a] border-b border-white/10">
            <tr>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">#</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Título</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Cliente</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Data</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-gray-500">#{c.contract_number}</td>
                <td className="p-4 font-bold text-white">{c.title}</td>
                <td className="p-4 text-gray-400">{c.clients?.name || '-'}</td>
                <td className="p-4 font-bold text-amber-500">R$ {(c.value || 0).toLocaleString('pt-BR')}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] tracking-wider font-bold uppercase ${statusColors[c.status] || ''}`}>{c.status === 'assassinado' || c.status === 'assasinado' ? 'Assinado' : c.status}</span></td>
                <td className="p-4 text-sm text-gray-400">{format(new Date(c.created_at), 'dd/MM/yyyy')}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => generateClientLogin(c)} title="Gerar Acesso do Cliente" className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-amber-900/40 hover:text-amber-500 transition-all"><Key className="w-4 h-4" /></button>
                  <button onClick={() => { setEditingId(c.id); setForm({ client_id: c.client_id || '', client_name: '', title: c.title, content: c.content || '', value: c.value || 0, status: c.status, notes: c.notes || '' }); setShowForm(true); }} className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-amber-500/30 transition-all"><Edit className="w-4 h-4 text-gray-300" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhum contrato encontrado'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractsPage;
