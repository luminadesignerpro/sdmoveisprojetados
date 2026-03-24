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
    aberta: 'bg-blue-100 text-blue-700',
    em_andamento: 'bg-amber-100 text-amber-700',
    concluida: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const priorityColors: Record<string, string> = {
    baixa: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    alta: 'bg-orange-100 text-orange-600',
    urgente: 'bg-red-100 text-red-600',
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
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-amber-500" />
            Ordens de Serviço
          </h1>
          <p className="text-gray-500 mt-1">Gerenciamento de OS</p>
        </div>
        <button onClick={() => openForm()} className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Nova OS
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['aberta', 'em_andamento', 'concluida', 'cancelada'].map(st => (
          <div key={st} className="bg-white rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 uppercase font-bold">{statusLabels[st]}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{orders.filter(o => o.status === st).length}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, cliente ou responsável..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg">{editingId ? 'Editar' : 'Nova'} Ordem de Serviço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="">Selecionar Cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="">Responsável (Funcionário)</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <input type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-gray-200" />
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={form.estimated_date}
                onChange={e => setForm({ ...form, estimated_date: e.target.value })}
                className="w-full pl-10 p-3 rounded-xl border border-gray-200 text-sm"
                placeholder="Data/Hora Prevista"
              />
            </div>
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" className="w-full p-3 rounded-xl border border-gray-200" rows={2} />
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observações" className="w-full p-3 rounded-xl border border-gray-200" rows={2} />
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700">Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">OS #</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Cliente</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Responsável</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Prioridade</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Previsto</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Concluído</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-900">#{o.order_number}</td>
                <td className="p-4 text-gray-700">
                  <div className="font-bold">{o.clients?.name || '-'}</div>
                  {o.clients?.address && <div className="text-[10px] text-gray-400 leading-tight max-w-[150px]">{o.clients.address}</div>}
                </td>
                <td className="p-4 text-gray-700 text-sm">{o.employees?.name || <span className="text-gray-400 italic">Não atribuído</span>}</td>
                <td className="p-4 text-gray-600 text-sm max-w-xs truncate">{o.description || '-'}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityColors[o.priority] || ''}`}>{o.priority}</span></td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[o.status] || ''}`}>{statusLabels[o.status] || o.status}</span></td>
                <td className="p-4 text-xs text-gray-500">
                  {o.estimated_date
                    ? new Date(o.estimated_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="p-4 text-xs text-green-600 font-medium">
                  {o.completed_at
                    ? new Date(o.completed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="p-4 font-bold text-gray-900">R$ {(o.total_value || 0).toLocaleString('pt-BR')}</td>
                <td className="p-4">
                  <button onClick={() => openForm(o)} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-400">{loading ? 'Carregando...' : 'Nenhuma OS encontrada'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceOrdersPage;
