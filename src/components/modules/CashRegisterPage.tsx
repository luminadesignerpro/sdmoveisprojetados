import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Search, ArrowUpCircle, ArrowDownCircle, Filter, X, TrendingUp, TrendingDown, DollarSign, Zap, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const CashRegisterPage: React.FC = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    description: '',
    amount: 0,
    type: 'income',
    category: 'Venda',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await db.from('cash_register').select('*').order('date', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.description || form.amount <= 0) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }
    await db.from('cash_register').insert(form);
    toast({ title: '✅ Lançamento Premium Realizado' });
    setShowForm(false);
    setForm({ description: '', amount: 0, type: 'income', category: 'Venda', date: format(new Date(), 'yyyy-MM-dd') });
    fetchData();
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const filtered = entries.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <Wallet className="w-8 h-8" />
            </div>
            Fluxo de <span className="text-[#D4AF37]">Caixa</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Zap className="w-4 h-4 text-[#D4AF37]" /> Gestão Financeira SD de Alta Performance
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="px-10 h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-5 h-5" /> NOVO LANÇAMENTO
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl group hover:border-green-500/20 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em]">Entradas</p>
            <TrendingUp className="w-6 h-6 text-green-500/30 group-hover:text-green-500 transition-colors" />
          </div>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalIncome.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl group hover:border-red-500/20 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.3em]">Saídas</p>
            <TrendingDown className="w-6 h-6 text-red-500/30 group-hover:text-red-500 transition-colors" />
          </div>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalExpense.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-3xl rounded-full" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.3em]">Balanço SD</p>
            <DollarSign className="w-6 h-6 text-[#D4AF37]/40 group-hover:text-[#D4AF37] transition-colors" />
          </div>
          <p className={`text-4xl font-black relative z-10 italic tracking-tighter tabular-nums ${balance >= 0 ? 'text-[#D4AF37]' : 'text-red-500'}`}>
            R$ {balance.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 relative z-10 p-1.5 bg-[#111111] border border-white/5 rounded-[1.8rem] w-fit">
        <button onClick={() => setFilter('all')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>Todos</button>
        <button onClick={() => setFilter('income')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'income' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Receitas</button>
        <button onClick={() => setFilter('expense')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Despesas</button>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3rem] p-10 shadow-2xl space-y-8 relative z-10 animate-in slide-in-from-top duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#D4AF37]/5 blur-[80px] rounded-full" />
          <div className="flex justify-between items-center text-white relative z-10">
            <h3 className="font-black text-2xl italic uppercase tracking-tighter flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center text-black">
                  <DollarSign className="w-6 h-6" />
               </div>
               Lançamento de Alta Precisão
            </h3>
            <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-7 h-7" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Identificação / Detalhamento</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" placeholder="Ex: Aquisição de Insumos Premium" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Montante Financeiro (R$)</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-xl font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Natureza da Operação</label>
              <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 min-h-[64px]">
                <button onClick={() => setForm({ ...form, type: 'income' })} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'income' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600'}`}>Crédito</button>
                <button onClick={() => setForm({ ...form, type: 'expense' })} className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === 'expense' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600'}`}>Débito</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Classificação de Centro de Custo</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all cursor-pointer appearance-none">
                <option className="bg-black">Venda Direta</option><option className="bg-black">Aquisição de Material</option><option className="bg-black">Mão de Obra Técnica</option><option className="bg-black">Custos Operacionais</option><option className="bg-black">Tributação</option><option className="bg-black">Marketing Elite</option><option className="bg-black">Diversos</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Data de Efetivação</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
            </div>
          </div>
          <button 
            onClick={handleSave} 
            className="w-full h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
          >
            CONFIRMAR LANÇAMENTO NO SISTEMA
          </button>
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[900px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Cronologia</th>
                <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Descrição Operacional</th>
                <th className="text-right p-8 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Montante Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(e => (
                <tr key={e.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 ${e.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {e.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <p className="text-white font-black text-base italic tracking-tighter tabular-nums">{format(new Date(e.date), 'dd/MM/yyyy')}</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <p className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter">{e.description}</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 italic flex items-center gap-2">
                       <div className="w-1 h-1 rounded-full bg-current opacity-40" /> {e.category}
                    </p>
                  </td>
                  <td className="p-8 text-right">
                    <p className={`text-2xl font-black italic tracking-tighter tabular-nums ${e.type === 'income' ? 'text-green-500' : 'text-red-600'}`}>
                      {e.type === 'income' ? '+' : '-'} R$ {e.amount.toLocaleString('pt-BR')}
                    </p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-800">
                         <Wallet className="w-10 h-10" />
                      </div>
                      <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-xs">Aguardando Movimentações SD</p>
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

export default CashRegisterPage;
