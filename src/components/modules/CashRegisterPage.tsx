import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Banknote, Plus, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const CashRegisterPage: React.FC = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'entrada', category: 'Geral', description: '', amount: 0, payment_method: 'dinheiro' });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await db.from('cash_register').select('*').order('date', { ascending: false }).limit(100);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.description.trim()) { toast({ title: '⚠️ Descrição obrigatória', variant: 'destructive' }); return; }
    await db.from('cash_register').insert(form);
    toast({ title: '✅ Lançamento registrado' });
    setShowForm(false);
    setForm({ type: 'entrada', category: 'Geral', description: '', amount: 0, payment_method: 'dinheiro' });
    fetchData();
  };

  const totalEntradas = entries.filter(e => e.type === 'entrada').reduce((s, e) => s + e.amount, 0);
  const totalSaidas = entries.filter(e => e.type === 'saida').reduce((s, e) => s + e.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 flex items-center gap-3">
            <Banknote className="w-8 h-8 text-amber-500" />
            Caixa
          </h1>
          <p className="text-gray-500 mt-1">Controle de movimentações financeiras</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Novo Lançamento
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-2xl p-5 shadow-lg">
          <p className="text-xs text-green-600 uppercase font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Entradas</p>
          <p className="text-3xl font-black text-green-700 mt-1">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 shadow-lg">
          <p className="text-xs text-red-600 uppercase font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Saídas</p>
          <p className="text-3xl font-black text-red-700 mt-1">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-lg ${saldo >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-600 uppercase font-bold">Saldo</p>
          <p className={`text-3xl font-black mt-1 ${saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg">Novo Lançamento</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="entrada">Entrada</option><option value="saida">Saída</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option>Geral</option><option>Material</option><option>Mão de Obra</option><option>Transporte</option><option>Venda</option><option>Recebimento</option><option>Pagamento Fornecedor</option><option>Outros</option>
            </select>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição *" className="p-3 rounded-xl border border-gray-200" />
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-gray-200" />
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="p-3 rounded-xl border border-gray-200">
              <option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option>
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
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Data</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Tipo</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Categoria</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Forma Pgto</th>
              <th className="text-left p-4 text-xs font-black text-gray-500 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-600 flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(e.date), 'dd/MM/yyyy HH:mm')}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${e.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {e.type === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </span>
                </td>
                <td className="p-4 text-gray-700">{e.description}</td>
                <td className="p-4"><span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{e.category}</span></td>
                <td className="p-4 text-sm text-gray-600">{e.payment_method}</td>
                <td className={`p-4 font-bold ${e.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                  {e.type === 'entrada' ? '+' : '-'} R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">{loading ? 'Carregando...' : 'Nenhum lançamento'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashRegisterPage;
