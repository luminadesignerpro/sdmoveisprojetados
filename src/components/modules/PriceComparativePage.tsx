import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3, Plus, Trash2, Search, ShoppingCart, Eye, EyeOff,
  TrendingDown, Building, CheckCircle2, ChevronDown, Sparkles,
  Phone, Share2, Filter, ArrowUpDown, Award, X, Edit3, DollarSign,
  Layers, Package, Check
} from 'lucide-react';

const db = supabase as any;

export interface SupplierQuote {
  supplierId: string;
  supplierName: string;
  price: number;
  phone?: string;
  updatedAt?: string;
  inStock?: boolean;
}

export interface ComparativeProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  specs?: string;
  quotes: SupplierQuote[];
  active?: boolean;
}

export interface SupplierItem {
  id: string;
  name: string;
  phone?: string;
  category?: string;
}

// Initial mock data matching the user's screenshot
const INITIAL_SUPPLIERS: SupplierItem[] = [
  { id: 'sup-1', name: 'ITAIPU', phone: '5511999990001' },
  { id: 'sup-2', name: 'RIO BRANCO', phone: '5511999990002' },
  { id: 'sup-3', name: 'GMAD', phone: '5511999990003' },
  { id: 'sup-4', name: 'FLG', phone: '5511999990004' },
  { id: 'sup-5', name: 'LEO MADEIRAS', phone: '5511999990005' },
];

const INITIAL_PRODUCTS: ComparativeProduct[] = [
  {
    id: 'prod-1',
    name: 'Mdf 06 branco tx',
    category: 'MDF/MDP',
    unit: 'Chapa',
    specs: '2750 x 1830 x 6mm',
    active: true,
    quotes: [
      { supplierId: 'sup-1', supplierName: 'ITAIPU', price: 230.00, phone: '5511999990001' },
      { supplierId: 'sup-2', supplierName: 'RIO BRANCO', price: 235.00, phone: '5511999990002' },
      { supplierId: 'sup-3', supplierName: 'GMAD', price: 238.00, phone: '5511999990003' },
      { supplierId: 'sup-4', supplierName: 'FLG', price: 240.00, phone: '5511999990004' },
    ],
  },
  {
    id: 'prod-2',
    name: 'Mdf 15 branco tx',
    category: 'MDF/MDP',
    unit: 'Chapa',
    specs: '2750 x 1830 x 15mm',
    active: true,
    quotes: [
      { supplierId: 'sup-1', supplierName: 'ITAIPU', price: 285.00, phone: '5511999990001' },
      { supplierId: 'sup-2', supplierName: 'RIO BRANCO', price: 290.00, phone: '5511999990002' },
      { supplierId: 'sup-3', supplierName: 'GMAD', price: 295.00, phone: '5511999990003' },
      { supplierId: 'sup-4', supplierName: 'FLG', price: 300.00, phone: '5511999990004' },
    ],
  },
  {
    id: 'prod-3',
    name: 'Mdf 18 Louro Freijó',
    category: 'MDF/MDP',
    unit: 'Chapa',
    specs: '2750 x 1830 x 18mm Berneck',
    active: true,
    quotes: [
      { supplierId: 'sup-2', supplierName: 'RIO BRANCO', price: 335.00, phone: '5511999990002' },
      { supplierId: 'sup-1', supplierName: 'ITAIPU', price: 340.00, phone: '5511999990001' },
      { supplierId: 'sup-4', supplierName: 'FLG', price: 345.00, phone: '5511999990004' },
      { supplierId: 'sup-3', supplierName: 'GMAD', price: 350.00, phone: '5511999990003' },
    ],
  },
  {
    id: 'prod-4',
    name: 'Corrediça Telescópica 45cm 45kg',
    category: 'Ferragens',
    unit: 'Par',
    specs: 'Extração total com amortecedor',
    active: true,
    quotes: [
      { supplierId: 'sup-2', supplierName: 'RIO BRANCO', price: 18.50, phone: '5511999990002' },
      { supplierId: 'sup-1', supplierName: 'ITAIPU', price: 19.90, phone: '5511999990001' },
      { supplierId: 'sup-3', supplierName: 'GMAD', price: 22.00, phone: '5511999990003' },
    ],
  },
  {
    id: 'prod-5',
    name: 'Dobradiça 35mm com Amortecedor Reta',
    category: 'Ferragens',
    unit: 'Unidade',
    specs: 'Aço inox click rápido',
    active: true,
    quotes: [
      { supplierId: 'sup-1', supplierName: 'ITAIPU', price: 4.80, phone: '5511999990001' },
      { supplierId: 'sup-2', supplierName: 'RIO BRANCO', price: 5.20, phone: '5511999990002' },
      { supplierId: 'sup-4', supplierName: 'FLG', price: 5.50, phone: '5511999990004' },
    ],
  },
];

const CATEGORIES = ['Todos', 'MDF/MDP', 'Ferragens', 'Vidros', 'Fitas de Borda', 'Puxadores', 'Acessórios'];

export const PriceComparativePage: React.FC = () => {
  const { toast } = useToast();

  // State
  const [products, setProducts] = useState<ComparativeProduct[]>(() => {
    const saved = localStorage.getItem('sd_comparativo_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(() => {
    const saved = localStorage.getItem('sd_comparativo_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(['sup-1', 'sup-2', 'sup-3', 'sup-4']);
  const [selectedProject, setSelectedProject] = useState('TIAGO CARVALHO');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [currentProductForQuote, setCurrentProductForQuote] = useState<ComparativeProduct | null>(null);

  // Forms
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'MDF/MDP',
    unit: 'Chapa',
    specs: '',
  });

  const [newQuoteForm, setNewQuoteForm] = useState({
    supplierId: '',
    price: '',
  });

  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    phone: '',
  });

  // Sync with Supabase on mount if available
  useEffect(() => {
    const syncWithSupabase = async () => {
      try {
        const { data: dbSuppliers } = await db.from('suppliers').select('id, name, phone').eq('active', true);
        if (dbSuppliers && dbSuppliers.length > 0) {
          // Merge db suppliers
          setSuppliers(prev => {
            const existingIds = new Set(prev.map(s => s.name.toUpperCase()));
            const newOnes = dbSuppliers
              .filter((s: any) => !existingIds.has(s.name.toUpperCase()))
              .map((s: any) => ({ id: s.id, name: s.name.toUpperCase(), phone: s.phone }));
            const merged = [...prev, ...newOnes];
            localStorage.setItem('sd_comparativo_suppliers', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        // Fallback silently to localStorage
      }
    };
    syncWithSupabase();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('sd_comparativo_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sd_comparativo_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Toggle supplier filter chip
  const toggleSupplierFilter = (id: string) => {
    setSelectedSuppliers(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast({ title: 'Aviso', description: 'Mantenha pelo menos um fornecedor selecionado.' });
          return prev;
        }
        return prev.filter(sId => sId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.specs && p.specs.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let totalSavings = 0;
    const cheapestSupplierCount: Record<string, number> = {};

    products.forEach(p => {
      if (!p.quotes || p.quotes.length < 2) return;
      const activeQuotes = p.quotes
        .filter(q => selectedSuppliers.includes(q.supplierId))
        .sort((a, b) => a.price - b.price);

      if (activeQuotes.length >= 2) {
        const lowest = activeQuotes[0].price;
        const secondLowest = activeQuotes[1].price;
        totalSavings += Math.max(0, secondLowest - lowest);

        const cheapestName = activeQuotes[0].supplierName;
        cheapestSupplierCount[cheapestName] = (cheapestSupplierCount[cheapestName] || 0) + 1;
      }
    });

    let bestSupplier = 'ITAIPU';
    let maxWins = 0;
    Object.entries(cheapestSupplierCount).forEach(([sup, wins]) => {
      if (wins > maxWins) {
        maxWins = wins;
        bestSupplier = sup;
      }
    });

    return {
      productCount: filteredProducts.length,
      totalSavings,
      bestSupplier,
    };
  }, [products, selectedSuppliers, filteredProducts]);

  // Handle Add Product
  const handleAddProduct = () => {
    if (!newProductForm.name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do produto', variant: 'destructive' });
      return;
    }

    const newProd: ComparativeProduct = {
      id: `prod-${Date.now()}`,
      name: newProductForm.name.trim(),
      category: newProductForm.category,
      unit: newProductForm.unit || 'Chapa',
      specs: newProductForm.specs,
      active: true,
      quotes: [],
    };

    setProducts(prev => [newProd, ...prev]);
    setNewProductForm({ name: '', category: 'MDF/MDP', unit: 'Chapa', specs: '' });
    setShowProductModal(false);
    toast({ title: '✅ Produto Adicionado', description: 'Agora você pode incluir as cotações.' });
  };

  // Handle Add/Update Quote
  const handleSaveQuote = () => {
    if (!currentProductForQuote) return;
    if (!newQuoteForm.supplierId) {
      toast({ title: 'Atenção', description: 'Selecione um fornecedor', variant: 'destructive' });
      return;
    }
    const priceNum = parseFloat(newQuoteForm.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Atenção', description: 'Informe um valor válido em R$', variant: 'destructive' });
      return;
    }

    const selectedSup = suppliers.find(s => s.id === newQuoteForm.supplierId);
    if (!selectedSup) return;

    setProducts(prev => prev.map(p => {
      if (p.id !== currentProductForQuote.id) return p;

      const existingIndex = p.quotes.findIndex(q => q.supplierId === selectedSup.id);
      let newQuotes = [...p.quotes];

      if (existingIndex >= 0) {
        newQuotes[existingIndex] = {
          ...newQuotes[existingIndex],
          price: priceNum,
          supplierName: selectedSup.name,
          phone: selectedSup.phone,
          updatedAt: new Date().toISOString(),
        };
      } else {
        newQuotes.push({
          supplierId: selectedSup.id,
          supplierName: selectedSup.name,
          price: priceNum,
          phone: selectedSup.phone,
          updatedAt: new Date().toISOString(),
        });
      }

      return { ...p, quotes: newQuotes };
    }));

    setShowQuoteModal(false);
    setNewQuoteForm({ supplierId: '', price: '' });
    toast({ title: '✅ Cotação Registrada', description: `Preço para ${selectedSup.name} atualizado.` });
  };

  // Handle Add Supplier
  const handleAddSupplier = () => {
    if (!newSupplierForm.name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do fornecedor', variant: 'destructive' });
      return;
    }

    const newSup: SupplierItem = {
      id: `sup-${Date.now()}`,
      name: newSupplierForm.name.trim().toUpperCase(),
      phone: newSupplierForm.phone.replace(/\D/g, ''),
    };

    setSuppliers(prev => [...prev, newSup]);
    setSelectedSuppliers(prev => [...prev, newSup.id]);
    setNewSupplierForm({ name: '', phone: '' });
    setShowSupplierModal(false);
    toast({ title: '✅ Fornecedor Criado', description: `${newSup.name} adicionado ao comparativo.` });
  };

  // WhatsApp order/quote trigger
  const handleBuyWhatsApp = (productName: string, quote: SupplierQuote) => {
    const rawPhone = quote.phone || '5511999999999';
    const message = encodeURIComponent(
      `Olá ${quote.supplierName}! Tudo bem? Gostaria de confirmar disponibilidade e fechar pedido do item:\n\n*${productName}*\n💰 Valor cotado: *R$ ${quote.price.toFixed(2)}*\n\nOrigem: SD Móveis Projetados (Comparativo)`
    );
    window.open(`https://wa.me/${rawPhone}?text=${message}`, '_blank');
  };

  // Delete product
  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Deseja realmente remover "${name}" do comparativo?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Item removido', description: `O item ${name} foi excluído.` });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans pb-16">
      {/* TOP HEADER */}
      <header className="bg-[#0b111e]/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              <div className="w-full h-full bg-[#0a0f1d] rounded-[14px] flex items-center justify-center flex-col">
                <span className="text-amber-400 font-black text-sm tracking-tighter leading-none">SD</span>
                <span className="text-[7px] text-amber-200/90 font-bold uppercase tracking-widest leading-none mt-0.5">COMP</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                  SD COMPARATIVO
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Atualizado
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Cotação de fornecedores em tempo real
              </p>
            </div>
          </div>

          {/* RIGHT BADGES & ACTIONS */}
          <div className="flex items-center gap-2">
            <span className="inline-flex sm:hidden items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Atualizado
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-full px-2.5 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-semibold text-[11px]">admin</span>
            </div>
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Produto</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUBNAV / PROJECT SELECTION BAR */}
      <section className="bg-[#0e1626]/80 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          {/* TAB BUTTON */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition-all">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparativo ({filteredProducts.length})</span>
            </button>
          </div>

          {/* PROJECT SELECTOR DROPDOWN */}
          <div className="flex items-center gap-2 bg-[#141e33] border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold hover:border-amber-500/60 transition-all cursor-pointer">
            <span className="text-amber-400">📁</span>
            <span>{selectedProject}</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>
      </section>

      {/* SUPPLIERS FILTER CHIPS BAR */}
      <section className="bg-[#0b101c] px-4 py-2.5 border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {suppliers.map(sup => {
            const isSelected = selectedSuppliers.includes(sup.id);
            return (
              <button
                key={sup.id}
                onClick={() => toggleSupplierFilter(sup.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 border ${
                  isSelected
                    ? 'bg-[#162238] border-slate-600 text-slate-100 shadow-sm'
                    : 'bg-[#0f1726]/40 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{sup.name}</span>
                {isSelected && <X className="w-3 h-3 text-slate-400 hover:text-red-400 ml-0.5" />}
              </button>
            );
          })}

          {/* ADD SUPPLIER BUTTON */}
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1 bg-[#102422] border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Fornecedor</span>
          </button>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-5 flex-1 w-full space-y-4">
        {/* KPI CARDS (Matches Screenshot 3 boxes) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {/* CARD 1: PRODUTOS */}
          <div className="bg-[#0f192b] border border-cyan-500/20 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-md">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                PRODUTOS
              </div>
              <div className="text-lg sm:text-2xl font-black text-cyan-300">
                {stats.productCount}
              </div>
            </div>
          </div>

          {/* CARD 2: ECONOMIA */}
          <div className="bg-[#1b191a] border border-amber-500/20 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-md">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                ECONOMIA
              </div>
              <div className="text-base sm:text-2xl font-black text-emerald-400 truncate">
                R$ {stats.totalSavings.toFixed(2)}
              </div>
            </div>
          </div>

          {/* CARD 3: MAIS BARATO */}
          <div className="bg-[#11192e] border border-indigo-500/20 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-md">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                MAIS BARATO
              </div>
              <div className="text-sm sm:text-xl font-black text-amber-400 truncate">
                {stats.bestSupplier}
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar produto, marca ou categoria..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c1424] border border-slate-700/60 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* CATEGORY PILLS (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map(cat => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  isCatActive
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-[#11192a] text-slate-300 hover:bg-[#18233b] border border-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* PRODUCT LIST */}
        <div className="space-y-4 mt-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-[#0e1627] rounded-3xl border border-dashed border-slate-800 p-8">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tente ajustar sua busca ou adicione um novo item para começar o comparativo de preços.
              </p>
              <button
                onClick={() => setShowProductModal(true)}
                className="mt-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Primeiro Produto
              </button>
            </div>
          ) : (
            filteredProducts.map(product => {
              // Visible quotes filtered by supplier chip selection
              const visibleQuotes = product.quotes
                .filter(q => selectedSuppliers.includes(q.supplierId))
                .sort((a, b) => a.price - b.price);

              const lowestPrice = visibleQuotes.length > 0 ? visibleQuotes[0].price : 0;

              return (
                <div
                  key={product.id}
                  className="bg-[#0b1220] border border-slate-800/80 hover:border-amber-500/30 rounded-3xl p-4 sm:p-5 transition-all shadow-lg relative overflow-hidden"
                >
                  {/* PRODUCT HEADER */}
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-[11px] px-2.5 py-0.5 rounded-lg uppercase tracking-wide">
                        {product.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                        {product.name}
                      </h3>
                      {product.specs && (
                        <span className="text-xs text-slate-400 font-medium">
                          ({product.specs})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SUPPLIER QUOTES GRID (Matches Screenshot) */}
                  {visibleQuotes.length === 0 ? (
                    <div className="bg-[#0e1628]/60 rounded-2xl p-4 text-center border border-dashed border-slate-800">
                      <p className="text-xs text-slate-400">
                        Nenhuma cotação cadastrada para os fornecedores selecionados.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                      {visibleQuotes.map((quote, idx) => {
                        const isCheapest = idx === 0 && quote.price > 0;
                        const diffFromCheapest = quote.price - lowestPrice;

                        return (
                          <div
                            key={quote.supplierId}
                            className={`rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-all border ${
                              isCheapest
                                ? 'bg-gradient-to-b from-[#09221b] to-[#071612] border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                : 'bg-[#101728] border-slate-800/90 hover:border-slate-700'
                            }`}
                          >
                            {/* SUPPLIER ROW */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {isCheapest ? (
                                  <span className="text-amber-400 text-sm">🥇</span>
                                ) : (
                                  <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                )}
                                <span className={`text-xs font-black truncate ${isCheapest ? 'text-emerald-300' : 'text-slate-200'}`}>
                                  {quote.supplierName}
                                </span>
                              </div>

                              {/* BADGES */}
                              {isCheapest ? (
                                <span className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-1.5 py-0.5 rounded-md flex-shrink-0">
                                  MENOR
                                </span>
                              ) : diffFromCheapest > 0 ? (
                                <span className="bg-rose-950/70 border border-rose-500/40 text-rose-300 font-bold text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0">
                                  +R$ {diffFromCheapest.toFixed(0)}
                                </span>
                              ) : null}
                            </div>

                            {/* PRICE */}
                            <div className="my-1.5">
                              <span className="text-[10px] text-slate-400 block font-medium">R$</span>
                              <span className={`text-lg sm:text-xl font-black ${isCheapest ? 'text-emerald-400' : 'text-slate-100'}`}>
                                {quote.price.toFixed(2)}
                              </span>
                            </div>

                            {/* BUY BUTTON */}
                            <button
                              onClick={() => handleBuyWhatsApp(product.name, quote)}
                              className={`w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-2 rounded-xl transition-all active:scale-95 ${
                                isCheapest
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md font-black'
                                  : 'bg-[#162238] hover:bg-[#1d2d4a] text-slate-200 border border-slate-700/60'
                              }`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Comprar</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* BOTTOM ACTION BAR */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    {/* ADD QUOTE BUTTON */}
                    <button
                      onClick={() => {
                        setCurrentProductForQuote(product);
                        setShowQuoteModal(true);
                      }}
                      className="flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Cotação</span>
                    </button>

                    {/* VIEW DETAILS */}
                    <button
                      onClick={() => {
                        toast({
                          title: product.name,
                          description: `Categoria: ${product.category} | Especificação: ${product.specs || 'Padrão'}`
                        });
                      }}
                      className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-all"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* DELETE PRODUCT */}
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-all"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL: ADD PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1728] border border-amber-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-amber-400 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Produto para Cotação
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mdf 18 Branco Tx"
                  value={newProductForm.name}
                  onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={newProductForm.category}
                    onChange={e => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.filter(c => c !== 'Todos').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    placeholder="Chapa, Par, Unidade..."
                    value={newProductForm.unit}
                    onChange={e => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Especificações / Medidas
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2750 x 1830 x 15mm"
                  value={newProductForm.specs}
                  onChange={e => setNewProductForm({ ...newProductForm, specs: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddProduct}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md"
                >
                  Salvar Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / UPDATE QUOTE */}
      {showQuoteModal && currentProductForQuote && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1728] border border-amber-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowQuoteModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-amber-400 mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Lançar Cotação
            </h3>
            <p className="text-xs text-slate-400 mb-4 truncate font-medium">
              Produto: <strong className="text-slate-200">{currentProductForQuote.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Selecione o Fornecedor
                </label>
                <select
                  value={newQuoteForm.supplierId}
                  onChange={e => setNewQuoteForm({ ...newQuoteForm, supplierId: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Selecione...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Preço Cotado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newQuoteForm.price}
                    onChange={e => setNewQuoteForm({ ...newQuoteForm, price: e.target.value })}
                    className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveQuote}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md"
                >
                  Salvar Preço
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1728] border border-emerald-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSupplierModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-emerald-400 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Adicionar Fornecedor
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nome do Fornecedor / Madeireira
                </label>
                <input
                  type="text"
                  placeholder="Ex: MADEIREIRA CENTRAL"
                  value={newSupplierForm.name}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  WhatsApp (para pedidos rápidos)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 11999998888"
                  value={newSupplierForm.phone}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                  className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceComparativePage;
