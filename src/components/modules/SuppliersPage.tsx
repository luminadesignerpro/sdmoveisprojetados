import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building, Plus, Search, Edit, Trash2, Phone, Mail, 
  TrendingDown, DollarSign, Award, CheckCircle2,
  BarChart3, ShoppingBag, Tag, Maximize2
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
  brand: string;
  pricePerM2: number | null;
  unitPrice: number;
  price: number; // for backwards compat
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
      { supplierId: 's1', supplierName: 'Leo Madeiras', brand: 'Duratex', pricePerM2: 39.00, unitPrice: 198.50, price: 198.50, updatedAt: '2026-08-16' },
      { supplierId: 's2', supplierName: 'Gmad', brand: 'Arauco', pricePerM2: 43.00, unitPrice: 219.00, price: 219.00, updatedAt: '2026-08-15' },
      { supplierId: 's3', supplierName: 'Eucatex Distribuidora', brand: 'Eucatex', pricePerM2: 41.20, unitPrice: 210.00, price: 210.00, updatedAt: '2026-08-14' },
    ]
  },
  {
    id: '2',
    productName: 'Dobradiça 35mm Curva c/ Amortecedor',
    category: 'Ferragens',
    unit: 'Par',
    quotes: [
      { supplierId: 's1', supplierName: 'Gmad', brand: 'FGV TN', pricePerM2: null, unitPrice: 6.90, price: 6.90, updatedAt: '2026-08-16' },
      { supplierId: 's2', supplierName: 'FGV Central', brand: 'FGV TN', pricePerM2: null, unitPrice: 7.20, price: 7.20, updatedAt: '2026-08-10' },
      { supplierId: 's3', supplierName: 'Leo Madeiras', brand: 'Häfele', pricePerM2: null, unitPrice: 8.50, price: 8.50, updatedAt: '2026-08-15' },
    ]
  },
  {
    id: '3',
    productName: 'Corrediça Telescópica 45cm 35kg',
    category: 'Ferragens',
    unit: 'Par',
    quotes: [
      { supplierId: 's1', supplierName: 'FGV Central', brand: 'FGV', pricePerM2: null, unitPrice: 15.80, price: 15.80, updatedAt: '2026-08-12' },
      { supplierId: 's2', supplierName: 'Gmad', brand: 'Light', pricePerM2: null, unitPrice: 16.50, price: 16.50, updatedAt: '2026-08-16' },
      { supplierId: 's3', supplierName: 'Leo Madeiras', brand: 'Häfele', pricePerM2: null, unitPrice: 18.90, price: 18.90, updatedAt: '2026-08-15' },
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
    const saved = localStorage.getItem('sd_supplier_comparisons_v2');
    return saved ? JSON.parse(saved) : DEFAULT_COMPARISONS;
  });
  const [compSearch, setCompSearch] = useState('');
  
  // New Product Modal State (includes all 5 requested fields)
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm] = useState({
    supplierName: '',
    supplierId: '',
    productName: '',
    brand: '',
    pricePerM2: '',
    unitPrice: '',
    category: 'MDF/MDP'
  });

  // New Quote Modal State (for adding quote to existing product)
  const [quoteModalProdId, setQuoteModalProdId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplierId: '',
    supplierName: '',
    brand: '',
    pricePerM2: '',
    unitPrice: ''
  });

  useEffect(() => {
    localStorage.setItem('sd_supplier_comparisons_v2', JSON.stringify(comparisons));
  }, [comparisons]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await db.from('suppliers').select('*').eq('active', true).order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSaveSupplier = async () => {
    if (!form.name.trim()) { toast({ title: '⚠️ Nome do fornecedor obrigatório', variant: 'destructive' }); return; }

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

  // Product + First Quote Handler
  const handleAddProductWithQuote = () => {
    if (!prodForm.productName.trim()) {
      toast({ title: '⚠️ Informe o nome do produto', variant: 'destructive' });
      return;
    }

    const unitPriceNum = parseFloat(prodForm.unitPrice.replace(',', '.'));
    if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
      toast({ title: '⚠️ Informe um valor unitário válido', variant: 'destructive' });
      return;
    }

    let sName = prodForm.supplierName.trim();
    if (prodForm.supplierId) {
      const found = suppliers.find(s => s.id === prodForm.supplierId);
      if (found) sName = found.name;
    }
    if (!sName) {
      toast({ title: '⚠️ Informe o nome do fornecedor', variant: 'destructive' });
      return;
    }

    const m2Num = prodForm.pricePerM2 ? parseFloat(prodForm.pricePerM2.replace(',', '.')) : null;

    const firstQuote: PriceQuote = {
      supplierId: prodForm.supplierId || Date.now().toString(),
      supplierName: sName,
      brand: prodForm.brand.trim() || 'Geral',
      pricePerM2: isNaN(m2Num as number) ? null : m2Num,
      unitPrice: unitPriceNum,
      price: unitPriceNum,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    const newProd: ProductComparison = {
      id: Date.now().toString(),
      productName: prodForm.productName.trim(),
      category: prodForm.category,
      unit: 'Un',
      quotes: [firstQuote]
    };

    setComparisons([newProd, ...comparisons]);
    setProdForm({ supplierName: '', supplierId: '', productName: '', brand: '', pricePerM2: '', unitPrice: '', category: 'MDF/MDP' });
    setShowProdForm(false);
    toast({ title: '✅ Produto e Cotação cadastrados no comparativo!' });
  };

  const handleDeleteProduct = (id: string) => {
    setComparisons(comparisons.filter(c => c.id !== id));
    toast({ title: '🗑️ Produto removido do comparativo' });
  };

  // Quote Only Handler (adding quote to existing product)
  const handleAddQuote = () => {
    if (!quoteModalProdId) return;
    const unitPriceNum = parseFloat(quoteForm.unitPrice.replace(',', '.'));
    if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
      toast({ title: '⚠️ Informe um valor unitário válido', variant: 'destructive' });
      return;
    }

    let sName = quoteForm.supplierName.trim();
    if (quoteForm.supplierId) {
      const found = suppliers.find(s => s.id === quoteForm.supplierId);
      if (found) sName = found.name;
    }
    if (!sName) {
      toast({ title: '⚠️ Informe o fornecedor', variant: 'destructive' });
      return;
    }

    const m2Num = quoteForm.pricePerM2 ? parseFloat(quoteForm.pricePerM2.replace(',', '.')) : null;

    setComparisons(prev => prev.map(p => {
      if (p.id !== quoteModalProdId) return p;
      const filteredQuotes = p.quotes.filter(q => q.supplierName.toLowerCase() !== sName.toLowerCase());
      const newQuote: PriceQuote = {
        supplierId: quoteForm.supplierId || Date.now().toString(),
        supplierName: sName,
        brand: quoteForm.brand.trim() || 'Geral',
        pricePerM2: isNaN(m2Num as number) ? null : m2Num,
        unitPrice: unitPriceNum,
        price: unitPriceNum,
        updatedAt: new Date().toISOString().split('T')[0]
      };
      return { ...p, quotes: [...filteredQuotes, newQuote] };
    }));

    setQuoteModalProdId(null);
    setQuoteForm({ supplierId: '', supplierName: '', brand: '', pricePerM2: '', unitPrice: '' });
    toast({ title: '💰 Cotação do fornecedor cadastrada com sucesso!' });
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

  // Statistics calculation
  const totalProducts = comparisons.length;
  let totalSavingsPotential = 0;
  const supplierWinCount: Record<string, number> = {};

  comparisons.forEach(c => {
    if (c.quotes.length >= 2) {
      const prices = c.quotes.map(q => q.unitPrice || q.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      totalSavingsPotential += (max - min);
    }
    if (c.quotes.length > 0) {
      const cheapest = c.quotes.reduce((prev, curr) => 
        (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev
      );
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

          {/* Form Modal: Add New Product (with 5 fields requested by user) */}
          {showProdForm && (
            <div className="bg-[#111111] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <Plus className="w-5 h-5" /> Cadastrar Produto & Primeiros Preços no Comparativo
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* 1. Nome do Fornecedor */}
                <div>
                  <label className="text-xs text-amber-400 font-bold block mb-1">1. Nome do Fornecedor *</label>
                  <select 
                    value={prodForm.supplierId} 
                    onChange={e => {
                      const sel = suppliers.find(s => s.id === e.target.value);
                      setProdForm({ ...prodForm, supplierId: e.target.value, supplierName: sel ? sel.name : prodForm.supplierName });
                    }} 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm mb-1"
                  >
                    <option value="">-- Selecione ou digite abaixo --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input 
                    value={prodForm.supplierName} 
                    onChange={e => setProdForm({ ...prodForm, supplierName: e.target.value, supplierId: '' })} 
                    placeholder="Ou digite o Fornecedor..." 
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs" 
                  />
                </div>

                {/* 2. Nome do Produto */}
                <div>
                  <label className="text-xs text-emerald-400 font-bold block mb-1">2. Produto / Material *</label>
                  <input 
                    value={prodForm.productName} 
                    onChange={e => setProdForm({ ...prodForm, productName: e.target.value })} 
                    placeholder="Ex: MDF 15mm Branco TX 2,75x1,85m..." 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" 
                  />
                  <select 
                    value={prodForm.category} 
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })} 
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs mt-1"
                  >
                    <option>MDF/MDP</option><option>Ferragens</option><option>Vidros</option><option>Pedras</option><option>Tintas</option><option>Acessórios</option><option>Outros</option>
                  </select>
                </div>

                {/* 3. Marca */}
                <div>
                  <label className="text-xs text-blue-400 font-bold block mb-1">3. Marca / Fabricante</label>
                  <input 
                    value={prodForm.brand} 
                    onChange={e => setProdForm({ ...prodForm, brand: e.target.value })} 
                    placeholder="Ex: Duratex, Arauco, FGV, Häfele..." 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" 
                  />
                </div>

                {/* 4. Valor Metro Quadrado */}
                <div>
                  <label className="text-xs text-purple-400 font-bold block mb-1">4. Valor Metro Quadrado (R$/m²)</label>
                  <input 
                    type="text" 
                    value={prodForm.pricePerM2} 
                    onChange={e => setProdForm({ ...prodForm, pricePerM2: e.target.value })} 
                    placeholder="Ex: 39,00 (opcional)" 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" 
                  />
                </div>

                {/* 5. Valor Unitario */}
                <div>
                  <label className="text-xs text-emerald-400 font-bold block mb-1">5. Valor Unitário (R$) *</label>
                  <input 
                    type="text" 
                    value={prodForm.unitPrice} 
                    onChange={e => setProdForm({ ...prodForm, unitPrice: e.target.value })} 
                    placeholder="Ex: 198,50" 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-bold text-emerald-400" 
                  />
                </div>

              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAddProductWithQuote} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm">Salvar Produto e Preço</button>
                <button onClick={() => setShowProdForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Form Modal: Add Quote to Existing Product */}
          {quoteModalProdId && (
            <div className="bg-[#111111] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white max-w-xl mx-auto">
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2 border-b border-white/10 pb-3">
                <DollarSign className="w-5 h-5" /> Adicionar Cotação de Outro Fornecedor
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fornecedor */}
                <div className="sm:col-span-2">
                  <label className="text-xs text-amber-400 font-bold block mb-1">Nome do Fornecedor *</label>
                  <select 
                    value={quoteForm.supplierId} 
                    onChange={e => {
                      const sel = suppliers.find(s => s.id === e.target.value);
                      setQuoteForm({ ...quoteForm, supplierId: e.target.value, supplierName: sel ? sel.name : quoteForm.supplierName });
                    }} 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm mb-1"
                  >
                    <option value="">-- Selecione ou digite abaixo --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input 
                    value={quoteForm.supplierName} 
                    onChange={e => setQuoteForm({ ...quoteForm, supplierName: e.target.value, supplierId: '' })} 
                    placeholder="Ou digite o nome do Fornecedor..." 
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs" 
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Marca / Fabricante</label>
                  <input 
                    value={quoteForm.brand} 
                    onChange={e => setQuoteForm({ ...quoteForm, brand: e.target.value })} 
                    placeholder="Ex: Duratex, Arauco..." 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                  />
                </div>

                {/* Valor m2 */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Valor Metro Quadrado (R$/m²)</label>
                  <input 
                    type="text" 
                    value={quoteForm.pricePerM2} 
                    onChange={e => setQuoteForm({ ...quoteForm, pricePerM2: e.target.value })} 
                    placeholder="Ex: 39,00" 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                  />
                </div>

                {/* Valor Unitario */}
                <div className="sm:col-span-2">
                  <label className="text-xs text-emerald-400 font-bold block mb-1">Valor Unitário (R$) *</label>
                  <input 
                    type="text" 
                    value={quoteForm.unitPrice} 
                    onChange={e => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })} 
                    placeholder="Ex: 198,50" 
                    className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-bold text-emerald-400" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAddQuote} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors text-sm w-full">Salvar Cotação</button>
                <button onClick={() => setQuoteModalProdId(null)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Product Comparison Cards */}
          <div className="space-y-6">
            {filteredComparisons.map(item => {
              const hasQuotes = item.quotes.length > 0;
              const cheapest = hasQuotes 
                ? item.quotes.reduce((prev, curr) => (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev)
                : null;
              const expensive = hasQuotes 
                ? item.quotes.reduce((prev, curr) => (curr.unitPrice || curr.price) > (prev.unitPrice || prev.price) ? curr : prev)
                : null;
              
              const cheapestVal = cheapest ? (cheapest.unitPrice || cheapest.price) : 0;
              const expensiveVal = expensive ? (expensive.unitPrice || expensive.price) : 0;

              const diff = (cheapest && expensive && cheapest !== expensive) 
                ? expensiveVal - cheapestVal 
                : 0;
              const percEconomy = (expensiveVal > 0 && diff > 0) 
                ? Math.round((diff / expensiveVal) * 100) 
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
                          setQuoteForm({ supplierId: '', supplierName: '', brand: '', pricePerM2: '', unitPrice: '' });
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
                          <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">🏆 PRODUTO MAIS BARATO AQUI!</p>
                          <p className="text-lg font-black text-emerald-300">
                            {cheapest.supplierName} 
                            {cheapest.brand && <span className="text-gray-400 text-xs font-normal ml-2">[{cheapest.brand}]</span>}
                            {' '}— <span className="text-white">R$ {cheapestVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un</span>
                            {cheapest.pricePerM2 && <span className="text-purple-300 text-xs font-normal ml-2">(R$ {cheapest.pricePerM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²)</span>}
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
                        const val = q.unitPrice || q.price;
                        const isCheapest = cheapest && q.supplierName === cheapest.supplierName && val === cheapestVal;
                        return (
                          <div 
                            key={idx} 
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                              isCheapest 
                                ? 'bg-emerald-900/20 border-emerald-500/50 shadow-lg shadow-emerald-950/50' 
                                : 'bg-[#1a1a1a] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                                {q.supplierName}
                                {isCheapest && <span className="text-emerald-400 text-xs font-extrabold">🏆 MAIS BARATO</span>}
                              </p>
                              {q.brand && (
                                <p className="text-xs text-blue-400 flex items-center gap-1">
                                  <Tag className="w-3 h-3" /> Marca: <span className="font-bold">{q.brand}</span>
                                </p>
                              )}
                              {q.pricePerM2 && (
                                <p className="text-xs text-purple-400 flex items-center gap-1">
                                  <Maximize2 className="w-3 h-3" /> R$ {q.pricePerM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²
                                </p>
                              )}
                              <p className="text-[10px] text-gray-500">Atualizado: {q.updatedAt}</p>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Valor Unitário</p>
                                <span className={`font-black text-base ${isCheapest ? 'text-emerald-400' : 'text-gray-200'}`}>
                                  R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
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
                      Nenhuma cotação cadastrada para este produto ainda. Clique em <b>+ Adicionar Cotação</b> para incluir os preços dos fornecedores.
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
