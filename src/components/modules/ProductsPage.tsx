import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, Shield, Zap, Box, Layers, DollarSign } from 'lucide-react';

const db = supabase as any;

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock: number;
  supplier_id: string | null;
  active: boolean;
}

const ProductsPage: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sku: '', category: 'Geral', unit: 'un', cost_price: 0, sell_price: 0, stock_quantity: 0, min_stock: 0, supplier_id: '' });

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, supRes] = await Promise.all([
      db.from('products').select('*').eq('active', true).order('name'),
      db.from('suppliers').select('id, name').eq('active', true).order('name'),
    ]);
    setProducts(prodRes.data || []);
    setSuppliers(supRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: '⚠️ Nome obrigatório', variant: 'destructive' }); return; }
    const payload = { ...form, supplier_id: form.supplier_id || null };
    if (editingId) {
      await db.from('products').update(payload).eq('id', editingId);
      toast({ title: '✅ Produto Atualizado no Inventário' });
    } else {
      await db.from('products').insert(payload);
      toast({ title: '✅ Novo Produto Catalogado' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', sku: p.sku || '', category: p.category, unit: p.unit, cost_price: p.cost_price, sell_price: p.sell_price, stock_quantity: p.stock_quantity, min_stock: p.min_stock, supplier_id: p.supplier_id || '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await db.from('products').update({ active: false }).eq('id', id);
    toast({ title: '🗑️ Item Removido do Catálogo' });
    fetchData();
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter(p => p.stock_quantity <= p.min_stock).length;

  return (
    <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <Package className="w-8 h-8" />
            </div>
            Produtos & <span className="text-[#D4AF37]">Estoque</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Gestão Patrimonial e Inventário Estratégico
          </p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', sku: '', category: 'Geral', unit: 'un', cost_price: 0, sell_price: 0, stock_quantity: 0, min_stock: 0, supplier_id: '' }); }} 
          className="px-10 h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-5 h-5" /> NOVO LANÇAMENTO
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-amber-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Total Sku's</p>
            <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">{products.length}</p>
          </div>
          <Box className="w-12 h-12 text-amber-500/20 group-hover:text-amber-500 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group hover:border-[#D4AF37]/50 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Valor Patrimonial</p>
            <p className="text-4xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">R$ {products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0).toLocaleString('pt-BR')}</p>
          </div>
          <DollarSign className="w-12 h-12 text-[#D4AF37]/20 transition-colors" />
        </div>
        <div className={`bg-[#111111] border rounded-[2.5rem] p-10 shadow-2xl flex items-center justify-between group transition-all overflow-hidden relative ${lowStock > 0 ? 'border-red-500/30 shadow-red-500/5' : 'border-white/5'}`}>
          <div className={`absolute top-0 right-0 w-24 h-24 blur-2xl rounded-full ${lowStock > 0 ? 'bg-red-500/10' : 'bg-gray-500/5'}`} />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Ruptura de Estoque</p>
            <p className={`text-4xl font-black italic tracking-tighter tabular-nums ${lowStock > 0 ? 'text-red-500' : 'text-white'}`}>{lowStock} <span className="text-xs uppercase font-medium">Itens</span></p>
          </div>
          <AlertTriangle className={`w-12 h-12 transition-colors ${lowStock > 0 ? 'text-red-500/40 animate-pulse' : 'text-gray-900'}`} />
        </div>
      </div>

      <div className="relative max-w-2xl z-10">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#D4AF37]/40" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rastrear item por nome ou identificação SKU..." 
          className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-white/5 bg-[#111111] text-white text-sm italic font-medium tracking-tight placeholder:text-gray-700 focus:border-[#D4AF37]/40 transition-all outline-none shadow-2xl" 
        />
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3.5rem] p-12 shadow-2xl space-y-10 relative z-10 animate-in slide-in-from-top duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
          <div className="flex justify-between items-center text-white relative z-10">
            <h3 className="font-black text-2xl italic uppercase tracking-tighter flex items-center gap-5">
               <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                  <Package className="w-7 h-7" />
               </div>
               {editingId ? 'Refinar Cadastro' : 'Catalogação de Ativo'}
            </h3>
            <button onClick={() => setShowForm(false)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-8 h-8" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Designação do Produto</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Identificação SKU</label>
              <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Classificação de Material</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                <option className="bg-black">Geral</option><option className="bg-black">MDF</option><option className="bg-black">MDP</option><option className="bg-black">Ferragens</option><option className="bg-black">Vidros</option><option className="bg-black">Pedras</option><option className="bg-black">Tintas</option><option className="bg-black">Acessórios</option><option className="bg-black">Puxadores</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Custo de Aquisição (R$)</label>
              <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-lg font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Preço de Saída SD (R$)</label>
              <input type="number" value={form.sell_price} onChange={e => setForm({ ...form, sell_price: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-[#D4AF37] text-lg font-black italic tracking-tighter outline-none focus:border-[#D4AF37] transition-all tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Unidade Logística</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                <option value="un" className="bg-black">Unidade</option><option value="m" className="bg-black">Metro</option><option value="m²" className="bg-black">m²</option><option value="kg" className="bg-black">Kg</option><option value="L" className="bg-black">Litro</option><option value="chapa" className="bg-black">Chapa</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Volume em Estoque</label>
              <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-lg font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Alerta de Ruptura</label>
              <input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: +e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-red-500 text-lg font-bold tracking-tight outline-none focus:border-red-500/40 transition-all tabular-nums" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Provedor Homologado</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                <option value="" className="bg-black">Sem Vínculo Específico</option>
                {suppliers.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-3 relative z-10">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">Especificações Técnicas e Notas</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-6 bg-white/5 border border-white/5 rounded-2xl text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" rows={3} />
          </div>

          <button 
            onClick={handleSave} 
            className="w-full h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
          >
            EFETIVAR LANÇAMENTO NO CATÁLOGO
          </button>
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-[4rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Designação Ativo</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Segmento</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Custo</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Saída SD</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Posição Estoque</th>
                <th className="text-center p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => (
                <tr key={p.id} className={`group hover:bg-white/[0.02] transition-colors ${p.stock_quantity <= p.min_stock ? 'bg-red-500/[0.02]' : ''}`}>
                  <td className="p-10">
                    <p className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter">{p.name}</p>
                    {p.sku && <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-2 italic">SKU: {p.sku}</p>}
                  </td>
                  <td className="p-10">
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/20">
                      {p.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-10 text-gray-600 font-black italic tabular-nums text-sm">R$ {p.cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-10 font-black text-white italic tracking-tighter text-2xl tabular-nums">R$ {p.sell_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-10">
                    <div className="flex items-center gap-4">
                      <p className={`text-2xl font-black italic tracking-tighter tabular-nums ${p.stock_quantity <= p.min_stock ? 'text-red-600' : 'text-green-500'}`}>
                        {p.stock_quantity}
                      </p>
                      <span className="text-[10px] font-black text-gray-700 uppercase italic tracking-widest">{p.unit}</span>
                      {p.stock_quantity <= p.min_stock && <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />}
                    </div>
                  </td>
                  <td className="p-10">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => handleEdit(p)} className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"><Edit className="w-6 h-6" /></button>
                      <button onClick={() => handleDelete(p.id)} className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-95"><Trash2 className="w-6 h-6" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center text-gray-800">
                         <Package className="w-12 h-12" />
                      </div>
                      <p className="text-gray-700 font-black uppercase tracking-[0.4em] text-xs">
                        {loading ? 'Sincronizando Ativos...' : 'Inventário Limpo ou Nenhum Match'}
                      </p>
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

export default ProductsPage;
