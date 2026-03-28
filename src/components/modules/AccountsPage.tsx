import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Plus, Search, CheckCircle2, AlertCircle, X, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, User, Shield, Zap } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

interface AccountsPageProps {
  type?: 'receivable' | 'payable';
}

const AccountsPage: React.FC<AccountsPageProps> = ({ type }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'receivable' | 'payable'>(type || 'receivable');
  const [form, setForm] = useState({
    description: '',
    amount: 0,
    due_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'receivable',
    status: 'pending',
    client_id: '',
    supplier_id: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [accRes, cliRes, supRes] = await Promise.all([
      db.from('accounts').select('*, clients(name), suppliers(name)').order('due_date', { ascending: true }),
      db.from('clients').select('id, name').order('name'),
      db.from('suppliers').select('id, name').order('name'),
    ]);
    setAccounts(accRes.data || []);
    setClients(cliRes.data || []);
    setSuppliers(supRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.description || form.amount <= 0) {
      toast({ title: '⚠️ Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const payload = { 
      ...form, 
      type: tab,
      client_id: form.client_id || null, 
      supplier_id: form.supplier_id || null 
    };
    await db.from('accounts').insert(payload);
    toast({ title: '✅ Título SD Registrado' });
    setShowForm(false);
    fetchData();
  };

  const markAsPaid = async (id: string) => {
    const acc = accounts.find(a => a.id === id);
    await db.from('accounts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    
    // Register in cash register
    await db.from('cash_register').insert({
      description: `Liq: ${acc.description}`,
      amount: acc.amount,
      type: acc.type === 'receivable' ? 'income' : 'expense',
      category: acc.type === 'receivable' ? 'Venda' : 'Fornecedor',
      date: new Date().toISOString().split('T')[0]
    });

    toast({ title: '✅ Título Liquidado com Sucesso' });
    fetchData();
  };

  const filtered = accounts.filter(a => a.type === tab);
  const totalPending = filtered.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);
  const totalPaid = filtered.filter(a => a.status === 'paid').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="p-6 sm:p-8 space-y-8 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[18px] flex items-center justify-center text-black shadow-2xl">
               <Receipt className="w-6 h-6" />
            </div>
            Gestão <span className="text-[#D4AF37]">Contas</span>
          </h1>
          <p className="text-gray-500 mt-2 text-xs font-medium italic flex items-center gap-2">
             <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Controle de Adimplência e Integridade Fiscal SD
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="px-8 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-3 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-4 h-4" /> NOVO TÍTULO
        </button>
      </header>

      <div className="flex bg-[#111111] p-1 rounded-2xl max-w-[280px] relative z-10 border border-white/5">
        <button onClick={() => setTab('receivable')} className={`flex-1 py-2 px-4 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${tab === 'receivable' ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/10' : 'text-gray-500 hover:text-white'}`}>
          <ArrowUpRight className="w-3 h-3" /> A Receber
        </button>
        <button onClick={() => setTab('payable')} className={`flex-1 py-2 px-4 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${tab === 'payable' ? 'bg-red-600 text-white shadow-lg shadow-red-500/10' : 'text-gray-500 hover:text-white'}`}>
          <ArrowDownRight className="w-3 h-3" /> A Pagar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl flex items-center justify-between group hover:border-[#D4AF37]/20 transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Vencimentos Ativos</p>
            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalPending.toLocaleString('pt-BR')}</p>
          </div>
          <AlertCircle className="w-10 h-10 text-amber-500/20 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl flex items-center justify-between group hover:border-green-500/20 transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Total Contabilizado</p>
            <p className="text-3xl font-black text-green-500 italic tracking-tighter tabular-nums">R$ {totalPaid.toLocaleString('pt-BR')}</p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-green-500/20 transition-colors" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 relative z-10 animate-in zoom-in-95 duration-300 overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto luxury-scroll">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
            <div className="flex justify-between items-center text-white relative z-10">
              <h3 className="font-black text-xl italic uppercase tracking-tighter flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                 </div>
                 Lançamento Financeiro SD
              </h3>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Histórico Operacional</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-gray-700" placeholder="Ex: Parcela 01/03 - Projeto Living" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Valor Duplicata (R$)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-[#D4AF37] text-xl font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Data Vencimento</label>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Entidade (Cliente/Fornecedor)</label>
                {tab === 'receivable' ? (
                  <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-black text-gray-500 italic">Vincular Cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                  </select>
                ) : (
                  <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                    <option value="" className="bg-black text-gray-500 italic">Vincular Fornecedor...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-4 relative z-10 pt-4">
              <button onClick={handleSave} className="flex-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]">RESGISTRAR TÍTULO NO LIVRO CAIXA</button>
              <button onClick={() => setShowForm(false)} className="px-8 h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 text-gray-600 border border-white/5 hover:bg-white/10 transition-all italic">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-[4rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Beneficiário / Projeto</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Agenda</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Volume R$</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Status Fiscal</th>
                <th className="text-center p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="p-10">
                    <p className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter">{a.description}</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 italic flex items-center gap-2">
                       <DollarSign className="w-3.5 h-3.5 opacity-40" />
                      {a.clients?.name || a.suppliers?.name || <span className="opacity-40 tracking-normal underline underline-offset-4 decoration-white/10">Lançamento Direto Elite</span>}
                    </p>
                  </td>
                  <td className="p-10">
                    <div className="flex items-center gap-3 text-white/50 font-black text-sm italic tabular-nums">
                      <Calendar className="w-5 h-5 text-[#D4AF37]/40" />
                      {format(new Date(a.due_date), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="p-10">
                    <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">R$ {a.amount.toLocaleString('pt-BR')}</p>
                  </td>
                  <td className="p-10">
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${a.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}>
                      {a.status === 'paid' ? 'Contabilizado' : 'Aguardando'}
                    </span>
                  </td>
                  <td className="p-10">
                    <div className="flex justify-center">
                      {a.status === 'pending' && (
                        <button 
                          onClick={() => markAsPaid(a.id)} 
                          className="px-8 h-12 bg-white/5 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-[#D4AF37]/30 transition-all active:scale-95 italic"
                        >
                          EFETIVAR LIQUIDAÇÃO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center text-gray-800">
                         <Receipt className="w-12 h-12" />
                      </div>
                      <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-xs">Sem Títulos em Aberto no Momento</p>
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

export default AccountsPage;
