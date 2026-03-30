import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Plus, Search, Edit, Calendar } from 'lucide-react';

const db = supabase as any;

const ServiceOrdersPage: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: '',
    description: '',
    status: 'aberta',
    priority: 'normal',
    assigned_to: '',
    total_value: 0,
    notes: '',
    estimated_date: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [ordRes, cliRes, empRes] = await Promise.all([
      db.from('service_orders').select('*, clients(name, address), employees(name)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name, address').eq('status', 'active').order('name'),
      db.from('employees').select('id, name').eq('active', true).order('name'),
    ]);
    setOrders(ordRes.data || []);
    setClients(cliRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const payload = {
      ...form,
      assigned_to: form.assigned_to || null,
      client_id: form.client_id || null,
      estimated_date: form.estimated_date || null,
    };
    if (editingId) {
      await db.from('service_orders').update(payload).eq('id', editingId);
      toast({ title: '✅ OS atualizada' });
    } else {
      await db.from('service_orders').insert(payload);
      toast({ title: '✅ OS criada' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const statusColors: Record<string, string> = {
    aberta: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    em_andamento: 'bg-amber-900/50 text-amber-500 border border-amber-500/30',
    concluida: 'bg-green-900/50 text-green-400 border border-green-500/30',
    cancelada: 'bg-red-900/50 text-red-500 border border-red-500/30',
  };

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const priorityColors: Record<string, string> = {
    baixa: 'bg-white/10 text-gray-400 border border-white/20',
    normal: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    alta: 'bg-orange-900/50 text-orange-400 border border-orange-500/30',
    urgente: 'bg-red-900/50 text-red-500 border border-red-500/30',
  };

  const filtered = orders.filter(o =>
    (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.employees?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (o?: any) => {
    if (o) {
      setEditingId(o.id);
      setForm({
        client_id: o.client_id || '',
        description: o.description || '',
        status: o.status,
        priority: o.priority,
        assigned_to: o.assigned_to || '',
        total_value: o.total_value || 0,
        notes: o.notes || '',
        estimated_date: o.estimated_date ? o.estimated_date.slice(0, 16) : '',
      });
    } else {
      setEditingId(null);
      setForm({ client_id: '', description: '', status: 'aberta', priority: 'normal', assigned_to: '', total_value: 0, notes: '', estimated_date: '' });
    }
    setShowForm(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] w-full text-white">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-amber-500" />
            Ordens de Serviço
          </h1>
          <p className="text-gray-400 mt-1">Gerenciamento de OS</p>
        </div>
        <button onClick={() => openForm()} className="text-black px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
          <Plus className="w-5 h-5" /> Nova OS
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['aberta', 'em_andamento', 'concluida', 'cancelada'].map(st => (
          <div key={st} className="bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
            <p className="text-xs text-gray-500 uppercase font-bold">{statusLabels[st]}</p>
            <p className="text-2xl font-black text-white mt-1">{orders.filter(o => o.status === st).length}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, cliente ou responsável..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-600" />
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg text-white">{editingId ? 'Editar' : 'Nova'} Ordem de Serviço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="">Selecionar Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="">Responsável (Funcionário)</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <input type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={form.estimated_date}
                onChange={e => setForm({ ...form, estimated_date: e.target.value })}
                className="w-full pl-10 p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500"
                placeholder="Data/Hora Prevista"
              />
            </div>
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" rows={2} />
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
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">OS #</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Cliente</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Responsável</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Prioridade</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Previsto</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Concluído</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">#{o.order_number}</td>
                <td className="p-4 text-white">
                  <div className="font-bold">{o.clients?.name || '-'}</div>
                  {o.clients?.address && <div className="text-[10px] text-gray-500 leading-tight max-w-[150px]">{o.clients.address}</div>}
                </td>
                <td className="p-4 text-gray-400 text-sm">{o.employees?.name || <span className="text-gray-600 italic">Não atribuído</span>}</td>
                <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{o.description || '-'}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityColors[o.priority] || ''}`}>{o.priority}</span></td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[o.status] || ''}`}>{statusLabels[o.status] || o.status}</span></td>
                <td className="p-4 text-xs text-gray-400">
                  {o.estimated_date
                    ? new Date(o.estimated_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-gray-600">—</span>
                  }
                </td>
                <td className="p-4 text-xs text-green-400 font-medium">
                  {o.completed_at
                    ? new Date(o.completed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-gray-600">—</span>
                  }
                </td>
                <td className="p-4 font-bold text-white">R$ {(o.total_value || 0).toLocaleString('pt-BR')}</td>
                <td className="p-4">
                  <button onClick={() => openForm(o)} className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-amber-500/30 transition-all">
                    <Edit className="w-4 h-4 text-gray-300" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhuma OS encontrada'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceOrdersPage;
