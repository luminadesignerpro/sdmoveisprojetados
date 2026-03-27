import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Plus, Search, CheckCircle2, AlertCircle, X, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, User, Shield, Zap } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const AccountsPage: React.FC = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'receivable' | 'payable'>('receivable');
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
    <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
               <Receipt className="w-8 h-8" />
            </div>
            Gestão <span className="text-[#D4AF37]">Contas</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Controle de Adimplência e Integridade Fiscal
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="px-10 h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-5 h-5" /> NOVO TÍTULO
        </button>
      </header>

      <div className="flex bg-[#111111] p-1.5 rounded-[1.8rem] max-w-sm relative z-10 border border-white/5">
        <button onClick={() => setTab('receivable')} className={`flex-1 py-3 px-6 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${tab === 'receivable' ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/10' : 'text-gray-500 hover:text-white'}`}>
          <ArrowUpRight className="w-4 h-4" /> A Receber
        </button>
        <button onClick={() => setTab('payable')} className={`flex-1 py-3 px-6 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${tab === 'payable' ? 'bg-red-600 text-white shadow-lg shadow-red-500/10' : 'text-gray-500 hover:text-white'}`}>
          <ArrowDownRight className="w-4 h-4" /> A Pagar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-amber-500/20 transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Volume Pendente</p>
            <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalPending.toLocaleString('pt-BR')}</p>
          </div>
          <AlertCircle className="w-12 h-12 text-amber-500/20 group-hover:text-amber-500 transition-colors relative z-10" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-green-500/20 transition-all overflow-hidden relative">
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Total Liquidado</p>
            <p className="text-4xl font-black text-green-500 italic tracking-tighter tabular-nums">R$ {totalPaid.toLocaleString('pt-BR')}</p>
          </div>
          <CheckCircle2 className="w-12 h-12 text-green-500/20 group-hover:text-green-500 transition-colors relative z-10" />
        </div>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3.5rem] p-12 shadow-2xl space-y-10 relative z-10 animate-in slide-in-from-top duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
          <div className="flex justify-between items-center text-white relative z-10">
            <h3 className="font-black text-2xl italic uppercase tracking-tighter flex items-center gap-5">
               <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                  <Receipt className="w-7 h-7" />
               </div>
               Gerador de Título Financeiro
            </h3>
            <button onClick={() => setShowForm(false)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-8 h-8" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Histórico Operacional</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" placeholder="Ex: Parcela 01/03 - Projeto Living" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Valor da Duplicata (R$)</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-xl font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Vencimento Acordado</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {tab === 'receivable' ? (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Titular do Crédito (Cliente)</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all cursor-pointer appearance-none">
                  <option value="" className="bg-black text-gray-500">Vincular Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Credor da Operação (Fornecedor)</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all cursor-pointer appearance-none">
                  <option value="" className="bg-black text-gray-500">Vincular Fornecedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={handleSave} className="w-full h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]">RESGISTRAR TÍTULO NO LIVRO CAIXA</button>
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
