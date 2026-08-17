import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, Plus, Search, Edit, Trash2, Phone, Mail, 
  TrendingDown, DollarSign, Award, ArrowDown, Tag, CheckCircle2,
  BarChart3, Layers, ShoppingBag
} from 'lucide-react';

const db = supabase as any;

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string;
  notes: string | null;
  active: boolean;
}

interface PriceQuote {
  supplierId: string;
  supplierName: string;
  price: number;
  updatedAt: string;
}

interface ProductComparison {
  id: string;
  productName: string;
  category: string;
  unit: string;
  quotes: PriceQuote[];
}

const DEFAULT_COMPARISONS: ProductComparison[] = [
  {
    id: '1',
    productName: 'Chapa MDF 15mm Branco TX 2,75x1,85m',
    category: 'MDF/MDP',
    unit: 'Chapa',
    quotes: [
      { supplierId: 's1', supplierName: 'Leo Madeiras', price: 219.00, updatedAt: '2026-08-15' },
      { supplierId: 's2', supplierName: 'Gmad', price: 198.50, updatedAt: '2026-08-16' },
      { supplierId: 's3', supplierName: 'Duratex Distribuidora', price: 210.00, updatedAt: '2026-08-14' },
    ]
  },
  {
    id: '2',
    productName: 'Dobradiça 35mm Curva c/ Amortecedor (Par)',
    category: 'Ferragens',
    unit: 'Par',
    quotes: [
      { supplierId: 's1', supplierName: 'Leo Madeiras', price: 8.50, updatedAt: '2026-08-15' },
      { supplierId: 's2', supplierName: 'Gmad', price: 6.90, updatedAt: '2026-08-16' },
      { supplierId: 's4', supplierName: 'FGV Central', price: 7.20, updatedAt: '2026-08-10' },
    ]
  },
  {
    id: '3',
    productName: 'Corrediça Telescópica 45cm 35kg (Par)',
    category: 'Ferragens',
    unit: 'Par',
    quotes: [
      { supplierId: 's1', supplierName: 'Leo Madeiras', price: 18.90, updatedAt: '2026-08-15' },
      { supplierId: 's2', supplierName: 'Gmad', price: 16.50, updatedAt: '2026-08-16' },
      { supplierId: 's4', supplierName: 'FGV Central', price: 15.80, updatedAt: '2026-08-12' },
    ]
  },
  {
    id: '4',
    productName: 'Fita de Borda PVC 22mm x 20m Branco TX',
    category: 'Acessórios',
    unit: 'Rolo',
    quotes: [
      { supplierId: 's1', supplierName: 'Leo Madeiras', price: 28.00, updatedAt: '2026-08-15' },
      { supplierId: 's2', supplierName: 'Gmad', price: 24.90, updatedAt: '2026-08-16' },
    ]
  }
];

const SuppliersPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'comparison'>('suppliers');
  
  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' });

  // Comparisons state
  const [comparisons, setComparisons] = useState<ProductComparison[]>(() => {
    const saved = localStorage.getItem('sd_supplier_comparisons');
    return saved ? JSON.parse(saved) : DEFAULT_COMPARISONS;
  });
  const [compSearch, setCompSearch] = useState('');
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm] = useState({ productName: '', category: 'MDF/MDP', unit: 'Un' });
  const [quoteModalProdId, setQuoteModalProdId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ supplierId: '', supplierName: '', price: '' });

  useEffect(() => {
    localStorage.setItem('sd_supplier_comparisons', JSON.stringify(comparisons));
  }, [comparisons]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await db.from('suppliers').select('*').eq('active', true).order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSaveSupplier = async () => {
    if (!form.name.trim()) { toast({ title: '⚠️ Nome obrigatório', variant: 'destructive' }); return; }

    if (editingId) {
      await db.from('suppliers').update(form).eq('id', editingId);
      toast({ title: '✅ Fornecedor atualizado' });
    } else {
      await db.from('suppliers').insert(form);
      toast({ title: '✅ Fornecedor cadastrado' });
    }
    setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' });
    setShowForm(false);
    setEditingId(null);
    fetchSuppliers();
  };

  const handleEditSupplier = (s: Supplier) => {
    setForm({ name: s.name, cnpj: s.cnpj || '', phone: s.phone || '', email: s.email || '', address: s.address || '', category: s.category, notes: s.notes || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDeleteSupplier = async (id: string) => {
    await db.from('suppliers').update({ active: false }).eq('id', id);
    toast({ title: '🗑️ Fornecedor removido' });
    fetchSuppliers();
  };

  // Product Comparison Handlers
  const handleAddProduct = () => {
    if (!prodForm.productName.trim()) {
      toast({ title: '⚠️ Informe o nome do produto', variant: 'destructive' });
      return;
    }
    const newProd: ProductComparison = {
      id: Date.now().toString(),
      productName: prodForm.productName.trim(),
      category: prodForm.category,
      unit: prodForm.unit,
      quotes: []
    };
    setComparisons([newProd, ...comparisons]);
    setProdForm({ productName: '', category: 'MDF/MDP', unit: 'Un' });
    setShowProdForm(false);
    toast({ title: '✅ Produto adicionado ao comparativo!' });
  };

  const handleDeleteProduct = (id: string) => {
    setComparisons(comparisons.filter(c => c.id !== id));
    toast({ title: '🗑️ Produto removido do comparativo' });
  };

  const handleAddQuote = () => {
    if (!quoteModalProdId) return;
    const priceNum = parseFloat(quoteForm.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: '⚠️ Informe um preço válido', variant: 'destructive' });
      return;
    }
    
    // Nome do fornecedor (digitado ou selecionado)
    let sName = quoteForm.supplierName.trim();
    if (quoteForm.supplierId) {
      const found = suppliers.find(s => s.id === quoteForm.supplierId);
      if (found) sName = found.name;
    }
    if (!sName) {
      toast({ title: '⚠️ Informe o fornecedor', variant: 'destructive' });
      return;
    }

    setComparisons(prev => prev.map(p => {
      if (p.id !== quoteModalProdId) return p;
      const existingFilter = p.quotes.filter(q => q.supplierName.toLowerCase() !== sName.toLowerCase());
      const newQuote: PriceQuote = {
        supplierId: quoteForm.supplierId || Date.now().toString(),
        supplierName: sName,
        price: priceNum,
        updatedAt: new Date().toISOString().split('T')[0]
      };
      return { ...p, quotes: [...existingFilter, newQuote] };
    }));

    setQuoteModalProdId(null);
    setQuoteForm({ supplierId: '', supplierName: '', price: '' });
    toast({ title: '💰 Cotação registrada com sucesso!' });
  };

  const handleDeleteQuote = (prodId: string, supplierName: string) => {
    setComparisons(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      return { ...p, quotes: p.quotes.filter(q => q.supplierName !== supplierName) };
    }));
    toast({ title: '🗑️ Cotação removida' });
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || (s.cnpj || '').includes(search)
  );

  const filteredComparisons = comparisons.filter(c => 
    c.productName.toLowerCase().includes(compSearch.toLowerCase()) || 
    c.category.toLowerCase().includes(compSearch.toLowerCase())
  );

  // Statistics calculation for comparison view
  const totalProducts = comparisons.length;
  let totalSavingsPotential = 0;
  const supplierWinCount: Record<string, number> = {};

  comparisons.forEach(c => {
    if (c.quotes.length >= 2) {
      const prices = c.quotes.map(q => q.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      totalSavingsPotential += (max - min);
    }
    if (c.quotes.length > 0) {
      const cheapest = c.quotes.reduce((prev, curr) => curr.price < prev.price ? curr : prev);
      supplierWinCount[cheapest.supplierName] = (supplierWinCount[cheapest.supplierName] || 0) + 1;
    }
  });

  let topSupplierName = '-';
  let topSupplierWins = 0;
  Object.entries(supplierWinCount).forEach(([name, count]) => {
    if (count > topSupplierWins) {
      topSupplierWins = count;
      topSupplierName = name;
    }
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] relative w-full pt-16">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-amber-500" />
            Gestão de Fornecedores
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Cadastros e Cotação/Comparativo de Preços de Materiais</p>
        </div>

        {/* Action Button depending on tab */}
        {activeTab === 'suppliers' ? (
          <button 
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' }); }} 
            className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> Novo Fornecedor
          </button>
        ) : (
          <button 
            onClick={() => setShowProdForm(true)} 
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> Adicionar Produto ao Comparativo
          </button>
        )}
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-b-2 ${
            activeTab === 'suppliers'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500'
              : 'text-gray-400 hover:text-white border-transparent'
          }`}
        >
          <Building className="w-4 h-4" />
          Fornecedores Cadastrados ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-b-2 ${
            activeTab === 'comparison'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500'
              : 'text-gray-400 hover:text-white border-transparent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          📊 Comparativo de Preços (Mais Barato)
        </button>
      </div>

      {/* ─── TAB 1: SUPPLIERS LIST ────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar fornecedor por nome ou CNPJ..." 
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-gray-500 text-sm" 
            />
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 text-white">
              <h3 className="font-bold text-lg text-amber-500">{editingId ? 'Editar' : 'Novo'} Fornecedor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do Fornecedor *" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" />
                <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="CNPJ" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" />
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Telefone / WhatsApp" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" />
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" />
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço Completo" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm sm:col-span-2" />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm">
                  <option>Geral</option><option>MDF/MDP</option><option>Ferragens</option><option>Vidros</option><option>Pedras</option><option>Tintas</option><option>Acessórios</option>
                </select>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observações..." className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveSupplier} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors text-sm">Salvar</button>
                <button onClick={() => setShowForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[#1a1a1a] border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Fornecedor</th>
                  <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">CNPJ</th>
                  <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Contato</th>
                  <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Categoria</th>
                  <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">{s.name}</td>
                    <td className="p-4 text-gray-400 text-sm">{s.cnpj || '-'}</td>
                    <td className="p-4">
                      {s.phone && <p className="text-sm text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3 text-amber-500" /> {s.phone}</p>}
                      {s.email && <p className="text-sm text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3 text-amber-500" /> {s.email}</p>}
                    </td>
                    <td className="p-4"><span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold">{s.category}</span></td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => handleEditSupplier(s)} className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all" title="Editar"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhum fornecedor encontrado'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMPARATIVO DE PREÇOS (PRODUTO MAIS BARATO) ───────────── */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">

          {/* Stats Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Produtos Cotados</p>
                <p className="text-2xl font-black text-white mt-0.5">{totalProducts}</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Economia Potencial Total</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  R$ {totalSavingsPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Fornecedor Mais Competitivo</p>
                <p className="text-lg font-black text-amber-400 mt-0.5 truncate max-w-[180px]">
                  {topSupplierName} {topSupplierWins > 0 ? `(${topSupplierWins}x mais barato)` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Search + Add Product */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input 
                value={compSearch} 
                onChange={e => setCompSearch(e.target.value)} 
                placeholder="Buscar por produto ou categoria..." 
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-500 text-sm" 
              />
            </div>
          </div>

          {/* Form Modal: Add New Product */}
          {showProdForm && (
            <div className="bg-[#111111] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Adicionar Novo Produto para Comparação de Preços
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Nome do Produto / Material *</label>
                  <input 
                    value={prodForm.productName} 
                    onChange={e => setProdForm({ ...prodForm, productName: e.target.value })} 
                    placeholder="Ex: Dobradiça 35mm Amortecedor, MDF 18mm Louro Freijó..." 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Categoria</label>
                  <select 
                    value={prodForm.category} 
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })} 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  >
                    <option>MDF/MDP</option><option>Ferragens</option><option>Vidros</option><option>Pedras</option><option>Tintas</option><option>Acessórios</option><option>Outros</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddProduct} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm">Criar Produto</button>
                <button onClick={() => setShowProdForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Form Modal: Add Quote to a Product */}
          {quoteModalProdId && (
            <div className="bg-[#111111] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white max-w-lg mx-auto">
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Adicionar Cotação de Preço
              </h3>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Selecionar Fornecedor Cadastrado</label>
                <select 
                  value={quoteForm.supplierId} 
                  onChange={e => {
                    const sel = suppliers.find(s => s.id === e.target.value);
                    setQuoteForm({ 
                      ...quoteForm, 
                      supplierId: e.target.value, 
                      supplierName: sel ? sel.name : quoteForm.supplierName 
                    });
                  }} 
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm mb-2"
                >
                  <option value="">-- Ou digite o nome abaixo --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome do Fornecedor / Loja *</label>
                <input 
                  value={quoteForm.supplierName} 
                  onChange={e => setQuoteForm({ ...quoteForm, supplierName: e.target.value, supplierId: '' })} 
                  placeholder="Ex: Leo Madeiras, Gmad, Fornecedor X..." 
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Preço Cotado (R$) *</label>
                <input 
                  type="text" 
                  value={quoteForm.price} 
                  onChange={e => setQuoteForm({ ...quoteForm, price: e.target.value })} 
                  placeholder="Ex: 198,50" 
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-bold text-emerald-400" 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAddQuote} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors text-sm w-full">Salvar Preço</button>
                <button onClick={() => setQuoteModalProdId(null)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Product Comparison Cards */}
          <div className="space-y-6">
            {filteredComparisons.map(item => {
              const hasQuotes = item.quotes.length > 0;
              const cheapest = hasQuotes 
                ? item.quotes.reduce((prev, curr) => curr.price < prev.price ? curr : prev)
                : null;
              const expensive = hasQuotes 
                ? item.quotes.reduce((prev, curr) => curr.price > prev.price ? curr : prev)
                : null;
              
              const diff = (cheapest && expensive && cheapest !== expensive) 
                ? expensive.price - cheapest.price 
                : 0;
              const percEconomy = (expensive && diff > 0) 
                ? Math.round((diff / expensive.price) * 100) 
                : 0;

              return (
                <div key={item.id} className="bg-[#111111] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                  
                  {/* Top Bar of Card */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-0.5 rounded-full text-xs font-bold">
                          {item.category}
                        </span>
                        <h3 className="text-lg font-black text-white">{item.productName}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setQuoteModalProdId(item.id);
                          setQuoteForm({ supplierId: '', supplierName: '', price: '' });
                        }}
                        className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Cotação
                      </button>

                      <button 
                        onClick={() => handleDeleteProduct(item.id)} 
                        className="w-9 h-9 bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl flex items-center justify-center transition-all"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Highlight Banner for Cheapest Supplier */}
                  {cheapest && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">🏆 MAIS BARATO AQUI!</p>
                          <p className="text-lg font-black text-emerald-300">
                            {cheapest.supplierName} — <span className="text-white">R$ {cheapest.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </p>
                        </div>
                      </div>

                      {diff > 0 && (
                        <div className="text-left sm:text-right">
                          <span className="bg-emerald-500 text-black font-black text-xs px-3 py-1 rounded-full inline-block mb-1">
                            Economia de R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percEconomy}%)
                          </span>
                          <p className="text-[11px] text-gray-400">Em relação ao fornecedor mais caro</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quotes Grid / Table */}
                  {hasQuotes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {item.quotes.map((q, idx) => {
                        const isCheapest = cheapest && q.supplierName === cheapest.supplierName && q.price === cheapest.price;
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                              isCheapest 
                                ? 'bg-emerald-900/20 border-emerald-500/50 shadow-lg shadow-emerald-950/50' 
                                : 'bg-[#1a1a1a] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-sm text-white flex items-center gap-1.5">
                                {q.supplierName}
                                {isCheapest && <span className="text-emerald-400 text-xs"> (Mais Barato)</span>}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">Atualizado em: {q.updatedAt}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`font-black text-base ${isCheapest ? 'text-emerald-400' : 'text-gray-300'}`}>
                                R$ {q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <button 
                                onClick={() => handleDeleteQuote(item.id, q.supplierName)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                title="Remover cotação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500 bg-[#161616] rounded-2xl border border-dashed border-white/10">
                      Nenhuma cotação cadastrada para este produto ainda. Clicque em <b>+ Adicionar Cotação</b> para incluir os preços dos fornecedores.
                    </div>
                  )}

                </div>
              );
            })}

            {filteredComparisons.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-[#111111] rounded-3xl border border-white/10">
                Nenhum produto cadastrado no comparativo ainda. Clique em <b>+ Adicionar Produto ao Comparativo</b> acima para começar a cotar!
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default SuppliersPage;
