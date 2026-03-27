import React, { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Plus, Trash2, TrendingUp, TrendingDown, Package, Clock, Truck, Calculator, PieChart, ArrowUpRight, ArrowDownRight, Sparkles, X, Shield } from 'lucide-react';

interface ProjectCostPanelProps {
  projectId: string;
  projectName: string;
  totalValue: number;
}

interface CostItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
}

const CATEGORIES = ['Material', 'Mão de Obra', 'Deslocamento', 'Ferragem', 'Acabamento', 'Outro'];

export default function ProjectCostPanel({ projectId, projectName, totalValue }: ProjectCostPanelProps) {
  const { toast } = useToast();
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCost, setNewCost] = useState({ category: 'Material', description: '', amount: '', quantity: '1', unit: 'un' });
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(0);

  useEffect(() => {
    fetchCosts();
    fetchLaborCost();
  }, [projectId]);

  const fetchCosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_costs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');
    if (data) setCosts(data);
    setLoading(false);
  };

  const fetchLaborCost = async () => {
    const { data: project } = await supabase
      .from('client_projects')
      .select('client_id')
      .eq('id', projectId)
      .maybeSingle();
    
    if (project) {
      const { data: employees } = await supabase.from('employees').select('hourly_rate').limit(10);
      if (employees && employees.length > 0) {
        const avgRate = employees.reduce((s: any, e: any) => s + Number(e.hourly_rate), 0) / employees.length;
        setLaborRate(avgRate || 50); // Default fallback
      }
    }
  };

  const addCost = async () => {
    if (!newCost.description || !newCost.amount) {
      toast({ title: '⚠️ Dados Incompletos', description: 'Preencha descrição e valor.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('project_costs').insert({
      project_id: projectId,
      category: newCost.category,
      description: newCost.description,
      amount: parseFloat(newCost.amount),
      quantity: parseFloat(newCost.quantity) || 1,
      unit: newCost.unit,
    });
    if (error) {
      toast({ title: '❌ Falha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✨ Custo Registrado' });
      setNewCost({ category: 'Material', description: '', amount: '', quantity: '1', unit: 'un' });
      setShowAdd(false);
      fetchCosts();
    }
  };

  const deleteCost = async (id: string) => {
    await supabase.from('project_costs').delete().eq('id', id);
    fetchCosts();
  };

  const totalCosts = costs.reduce((s, c) => s + (Number(c.amount) * Number(c.quantity)), 0);
  const laborCost = laborHours * laborRate;
  const totalWithLabor = totalCosts + laborCost;
  const profit = totalValue - totalWithLabor;
  const margin = totalValue > 0 ? ((profit / totalValue) * 100) : 0;

  const costsByCategory = CATEGORIES.map(cat => ({
    category: cat,
    total: costs.filter(c => c.category === cat).reduce((s, c) => s + (Number(c.amount) * Number(c.quantity)), 0),
  })).filter(c => c.total > 0);

  return (
    <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col rounded-[3.5rem] border border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter flex items-center gap-5 uppercase">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <Calculator className="w-8 h-8" />
            </div>
            DRE do Projeto <span className="text-[#D4AF37] opacity-60 ml-3">#{projectId.slice(0, 6)}</span>
          </h2>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Visão Analítica de Margem e Custos Reais Premium
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-8 h-16 bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-[#D4AF37]/30 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-2xl italic active:scale-95"
        >
          {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5 text-[#D4AF37]" />}
          {showAdd ? 'ABORTAR LANÇAMENTO' : 'LANÇAR DESPESA'}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-6 italic">Insumos & Materiais</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <Package className="w-8 h-8 text-[#D4AF37] opacity-20 group-hover:opacity-60 transition-all duration-500" />
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-6 italic">Investimento em Lábore</p>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="number"
              value={laborHours || ''}
              onChange={e => setLaborHours(parseFloat(e.target.value) || 0)}
              className="w-24 h-12 text-lg font-black text-amber-500 bg-black border border-white/5 rounded-xl px-4 focus:border-amber-500/40 outline-none transition-all tabular-nums italic"
              placeholder="Hrs"
            />
            <span className="text-[10px] text-gray-700 font-black uppercase italic tracking-widest">Hrs Alocadas</span>
          </div>
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic flex items-center gap-2">
            <Clock className="w-3 h-3 text-amber-500/50" /> R$ {laborRate.toFixed(2)}/h active rate
          </p>
        </div>

        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
          <p className="text-[10px] text-[#D4AF37]/60 font-black uppercase tracking-widest mb-6 italic">Valor Bruto Venda</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <DollarSign className="w-9 h-9 text-[#D4AF37] opacity-40 group-hover:scale-110 transition-transform duration-700" />
          </div>
        </div>

        <div className={`bg-[#111111] border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group transition-all duration-700 ${profit >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
          <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-40 ${profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`} />
          <p className={`text-[10px] font-black uppercase tracking-widest mb-6 italic ${profit >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>Net Margem / EBITDA</p>
          <div className="space-y-3">
            <p className={`text-3xl font-black italic tracking-tighter tabular-nums leading-none ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border w-fit italic ${profit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
               {profit >= 0 ? <ArrowUpRight className="w-5 h-5 text-green-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
               <span className={`text-[10px] font-black uppercase tracking-widest ${profit >= 0 ? 'text-green-500' : 'text-red-600'}`}>EFICIÊNCIA: {margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        <div className="lg:col-span-2 space-y-10">
           {showAdd && (
            <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-[3rem] p-10 shadow-[0_0_80px_rgba(212,175,55,0.05)] animate-in zoom-in-95 duration-500 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
               <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  Inserir Lançamento Analítico
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Vetor de Custo</label>
                    <select
                      value={newCost.category}
                      onChange={e => setNewCost({ ...newCost, category: e.target.value })}
                      className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map(c => <option key={c} className="bg-black">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Identificador do Item</label>
                    <input
                      value={newCost.description}
                      onChange={e => setNewCost({ ...newCost, description: e.target.value })}
                      placeholder="NOME DO MATERIAL OU SERVIÇO"
                      className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white placeholder:text-gray-800 text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all uppercase italic shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Valor de Aquisição (UND)</label>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-700 text-xs font-black italic">R$</span>
                       <input
                        type="number"
                        value={newCost.amount}
                        onChange={e => setNewCost({ ...newCost, amount: e.target.value })}
                        className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Volume</label>
                      <input
                        type="number"
                        value={newCost.quantity}
                        onChange={e => setNewCost({ ...newCost, quantity: e.target.value })}
                        className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Unidade</label>
                      <select
                        value={newCost.unit}
                        onChange={e => setNewCost({ ...newCost, unit: e.target.value })}
                        className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer"
                      >
                        <option className="bg-black">un</option>
                        <option className="bg-black">m</option>
                        <option className="bg-black">m²</option>
                        <option className="bg-black">kg</option>
                        <option className="bg-black">L</option>
                      </select>
                    </div>
                  </div>
               </div>
               <button
                onClick={addCost}
                className="w-full h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-4 italic"
              >
                EFETIVAR LANÇAMENTO FISCAL
              </button>
            </div>
          )}

          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4 italic shadow-sm">
               <Package className="w-6 h-6 text-gray-800" /> Registro de Despesas Localizadas
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-auto luxury-scroll pr-6">
              {costs.map(cost => (
                <div key={cost.id} className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-[2rem] group/item hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <span className="px-5 py-2 bg-white/5 border border-white/5 text-gray-600 rounded-full text-[9px] font-black uppercase tracking-widest group-hover/item:text-[#D4AF37] group-hover/item:border-[#D4AF37]/20 transition-all italic">{cost.category}</span>
                    <span className="text-white font-black italic uppercase tracking-tighter text-lg leading-none group-hover/item:translate-x-1 transition-transform">{cost.description}</span>
                  </div>
                  <div className="flex items-center gap-10">
                    <span className="text-[11px] text-gray-700 font-bold uppercase tracking-widest italic">{cost.quantity} {cost.unit}</span>
                    <span className="font-black text-white text-xl italic tracking-tighter tabular-nums leading-none">R$ {(Number(cost.amount) * Number(cost.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <button onClick={() => deleteCost(cost.id)} className="w-12 h-12 bg-red-500/5 text-red-900 hover:text-red-500 hover:bg-red-500/10 rounded-2xl flex items-center justify-center transition-all opacity-0 group-hover/item:opacity-100 group-hover/item:scale-110 active:scale-95">
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
              {costs.length === 0 && (
                <div className="text-center py-24 opacity-20">
                   <Calculator className="w-20 h-20 mx-auto mb-8 text-gray-700" />
                   <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Silêncio Fiscal: Sem Registros</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-10">
           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-12 flex items-center gap-4 italic shadow-sm">
                 <PieChart className="w-6 h-6 text-[#D4AF37]" /> Alocação de Recursos
              </h3>
              <div className="space-y-8">
                {costsByCategory.map(cat => (
                  <div key={cat.category} className="space-y-3 group">
                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest italic leading-none">
                       <span className="text-gray-600 group-hover:text-white transition-colors">{cat.category}</span>
                       <span className="text-[#D4AF37] tabular-nums">R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-black rounded-full h-2 overflow-hidden border border-white/5">
                      <div
                        className="bg-gradient-to-r from-[#D4AF37] to-[#b8952a] h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]"
                        style={{ width: `${totalWithLabor > 0 ? (cat.total / totalWithLabor * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-black border border-[#D4AF37]/10 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden text-center group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent group-hover:via-[#D4AF37] transition-all duration-1000" />
              <TrendingUp className="w-14 h-14 text-gray-800 mx-auto mb-8 group-hover:text-[#D4AF37] group-hover:rotate-12 transition-all duration-700" />
              <h4 className="text-white font-black text-2xl italic uppercase tracking-tighter mb-4 leading-none">Saúde Operacional</h4>
              <p className="text-gray-500 text-xs font-medium leading-relaxed italic uppercase tracking-tight opacity-60">
                 Este dossiê utiliza metadados de custos em tempo real para consolidar a performance tributária e produtiva do contrato SD.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
