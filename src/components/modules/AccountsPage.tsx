import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Plus, Check, AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

interface AccountsPageProps {
  type: 'payable' | 'receivable';
}

const AccountsPage: React.FC<AccountsPageProps> = ({ type }) => {
  const { toast } = useToast();
  const table = type === 'payable' ? 'accounts_payable' : 'accounts_receivable';
  const isPay = type === 'payable';
  const [entries, setEntries] = useState<any[]>([]);
  const [refs, setRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: 0, due_date: '', category: 'Geral', notes: '', ref_id: '' });

  const fetchData = async () => {
    setLoading(true);
    const refTable = isPay ? 'suppliers' : 'clients';
    const [entriesRes, refsRes] = await Promise.all([
      db.from(table).select(`*, ${refTable}(name)`).order('due_date', { ascending: true }),
      db.from(refTable).select('id, name').order('name'),
    ]);
    setEntries(entriesRes.data || []);
    setRefs(refsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [type]);

  const handleSave = async () => {
    if (!form.description.trim() || !form.due_date) { toast({ title: '⚠️ Preencha os campos obrigatórios', variant: 'destructive' }); return; }
    const payload: any = { description: form.description, amount: form.amount, due_date: form.due_date, category: form.category, notes: form.notes || null };
    if (isPay) payload.supplier_id = form.ref_id || null;
    else payload.client_id = form.ref_id || null;
    await db.from(table).insert(payload);
    toast({ title: `✅ Conta ${isPay ? 'a pagar' : 'a receber'} registrada` });
    setShowForm(false);
    fetchData();
  };

  const markDone = async (id: string) => {
    const field = isPay ? 'paid' : 'received';
    const atField = isPay ? 'paid_at' : 'received_at';
    await db.from(table).update({ [field]: true, [atField]: new Date().toISOString() }).eq('id', id);
    toast({ title: isPay ? '✅ Pago!' : '✅ Recebido!' });
    fetchData();
  };

  const totalPending = entries.filter(e => !(isPay ? e.paid : e.received)).reduce((s, e) => s + e.amount, 0);
  const totalDone = entries.filter(e => (isPay ? e.paid : e.received)).reduce((s, e) => s + e.amount, 0);
  const overdue = entries.filter(e => !(isPay ? e.paid : e.received) && new Date(e.due_date) < new Date()).length;

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-amber-500" />
            Contas a {isPay ? 'Pagar' : 'Receber'}
          </h1>
          <p className="text-gray-500 mt-1">Gestão financeira</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ description: '', amount: 0, due_date: '', category: 'Geral', notes: '', ref_id: '' }); }} className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Nova Conta
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 shadow-lg ${isPay ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-xs text-gray-600 uppercase font-bold">Pendente</p>
          <p className={`text-3xl font-black mt-1 ${isPay ? 'text-red-700' : 'text-green-700'}`}>R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <p className="text-xs text-gray-600 uppercase font-bold">{isPay ? 'Pago' : 'Recebido'}</p>
          <p className="text-3xl font-black text-gray-700 mt-1">R$ {totalDone.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-lg ${overdue > 0 ? 'bg-red-50' : 'bg-white'}`}>
          <p className="text-xs text-gray-600 uppercase font-bold flex items-center gap-1">{overdue > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />} Vencidas</p>
          <p className={`text-3xl font-black mt-1 ${overdue > 0 ? 'text-red-600' : 'text-gray-700'}`}>{overdue}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg">Nova Conta a {isPay ? 'Pagar' : 'Receber'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição *" className="p-3 rounded-xl border border-gray-200" />
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-gray-200" />
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="p-3 rounded-xl border border-gray-200" />
            <select value={form.ref_id} onChange={e => setForm({ ...form, ref_id: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="">{isPay ? 'Fornecedor' : 'Cliente'} (opcional)</option>
              {refs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option>Geral</option><option>Material</option><option>Mão de Obra</option><option>Transporte</option><option>Aluguel</option><option>Impostos</option><option>Projeto</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700">Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">{isPay ? 'Fornecedor' : 'Cliente'}</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Vencimento</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Ação</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => {
              const done = isPay ? e.paid : e.received;
              const isOverdue = !done && new Date(e.due_date) < new Date();
              const refName = isPay ? e.suppliers?.name : e.clients?.name;
              return (
                <tr key={e.id} className={`border-t hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                  <td className="p-4 font-bold text-gray-900">{e.description}</td>
                  <td className="p-4 text-gray-600">{refName || '-'}</td>
                  <td className="p-4 text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}>{format(new Date(e.due_date), 'dd/MM/yyyy')}</span>
                  </td>
                  <td className="p-4 font-bold text-gray-900">R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${done ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {done ? (isPay ? 'Pago' : 'Recebido') : isOverdue ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-4">
                    {!done && (
                      <button onClick={() => markDone(e.id)} className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center hover:bg-green-200 text-green-700">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">{loading ? 'Carregando...' : 'Nenhuma conta encontrada'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountsPage;
