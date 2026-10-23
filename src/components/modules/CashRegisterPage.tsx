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
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] w-full text-white">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <Banknote className="w-8 h-8 text-amber-500" />
            Caixa
          </h1>
          <p className="text-gray-400 mt-1">Controle de movimentações financeiras</p>
        </div>
        <button onClick={() => setShowForm(true)} className="text-black px-6 py-3 rounded-2xl font-bold hover:opacity-90 flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
          <Plus className="w-5 h-5" /> Novo Lançamento
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-green-500/20 rounded-2xl p-5 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-green-400 uppercase font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Entradas</p>
          <p className="text-3xl font-black text-white mt-1">R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#111111] border border-red-500/20 rounded-2xl p-5 shadow-lg hover:border-amber-500/30 transition-colors">
          <p className="text-xs text-red-500 uppercase font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Saídas</p>
          <p className="text-3xl font-black text-white mt-1">R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`rounded-2xl p-5 shadow-lg bg-[#111111] border ${saldo >= 0 ? 'border-blue-500/20' : 'border-red-500/20'} hover:border-amber-500/30 transition-colors`}>
          <p className="text-xs text-gray-400 uppercase font-bold">Saldo</p>
          <p className={`text-3xl font-black mt-1 ${saldo >= 0 ? 'text-blue-400' : 'text-red-500'}`}>R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-lg text-white">Novo Lançamento</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="entrada">Entrada</option><option value="saida">Saída</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option>Geral</option><option>Material</option><option>Mão de Obra</option><option>Transporte</option><option>Venda</option><option>Recebimento</option><option>Pagamento Fornecedor</option><option>Outros</option>
            </select>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição *" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} placeholder="Valor (R$)" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-500" />
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="text-black px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
        <table className="w-full min-w-[700px]">
          <thead className="bg-[#1a1a1a] border-b border-white/10">
            <tr>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Data</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Tipo</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Categoria</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Forma Pgto</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-sm text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-500" /> {format(new Date(e.date), 'dd/MM/yyyy HH:mm')}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${e.type === 'entrada' ? 'bg-green-900/50 text-green-400 border-green-500/30' : 'bg-red-900/50 text-red-500 border-red-500/30'}`}>
                    {e.type === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </span>
                </td>
                <td className="p-4 font-bold text-white">{e.description}</td>
                <td className="p-4"><span className="bg-white/10 border border-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-bold">{e.category}</span></td>
                <td className="p-4 text-sm text-gray-400 uppercase tracking-wider">{e.payment_method}</td>
                <td className={`p-4 font-bold ${e.type === 'entrada' ? 'text-green-400' : 'text-red-500'}`}>
                  {e.type === 'entrada' ? '+' : '-'} R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhum lançamento'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashRegisterPage;
