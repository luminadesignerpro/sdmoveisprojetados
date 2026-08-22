import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageWithGemini, analyzeTextWithGroq } from '@/services/geminiService';
import { 
  Building, Plus, Search, Edit, Trash2, Phone, Mail, 
  TrendingDown, DollarSign, Award, CheckCircle2,
  BarChart3, ShoppingBag, Tag, Maximize2, ClipboardList,
  Printer, ShoppingCart, CheckSquare, Sparkles, Camera, Eye, X, Loader2,
  FileText, ExternalLink, Check, Download, User, PenLine
} from 'lucide-react';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

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
  price: number;
  updatedAt: string;
  photoUrl?: string | null;
  specifications?: string | null;
}

interface ProductComparison {
  id: string;
  productName: string;
  category: string;
  unit: string;
  description?: string;
  quotes: PriceQuote[];
}

interface MaterialListItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  selectedSupplierName: string;
  selectedBrand: string;
  selectedUnitPrice: number;
  quantity: number;
  total: number;
  isCheapestSelected: boolean;
}

interface BatchImportItem {
  productName: string;
  category: string;
  brand: string;
  unitPrice: number;
  quantity: number;
}

const DEFAULT_COMPARISONS: ProductComparison[] = [
  {
    id: '1',
    productName: 'Chapa MDF 15mm Branco TX 2,75x1,85m',
    category: 'MDF/MDP',
    unit: 'Chapa',
    description: 'MDF melamínico de alta densidade 15mm com revestimento Texturizado Branco.',
    quotes: [
      { supplierId: 's1', supplierName: 'Leo Madeiras', brand: 'Duratex', pricePerM2: 39.00, unitPrice: 198.50, price: 198.50, updatedAt: '2026-08-16', specifications: 'Chapa inteira. Entrega em até 2 dias.' },
      { supplierId: 's2', supplierName: 'Gmad', brand: 'Arauco', pricePerM2: 43.00, unitPrice: 219.00, price: 219.00, updatedAt: '2026-08-15', specifications: 'Melamina resistente a riscos.' },
      { supplierId: 's3', supplierName: 'Eucatex Distribuidora', brand: 'Eucatex', pricePerM2: 41.20, unitPrice: 210.00, price: 210.00, updatedAt: '2026-08-14' },
    ]
  },
  {
    id: '2',
    productName: 'Dobradiça 35mm Curva c/ Amortecedor',
    category: 'Ferragens',
    unit: 'Par',
    description: 'Dobradiça caneco 35mm pistão de amortecimento soft-close.',
    quotes: [
      { supplierId: 's1', supplierName: 'Gmad', brand: 'FGV TN', pricePerM2: null, unitPrice: 6.90, price: 6.90, updatedAt: '2026-08-16', specifications: 'Acompanha calço 4 furos e parafusos.' },
      { supplierId: 's2', supplierName: 'FGV Central', brand: 'FGV TN', pricePerM2: null, unitPrice: 7.20, price: 7.20, updatedAt: '2026-08-10' },
      { supplierId: 's3', supplierName: 'Leo Madeiras', brand: 'Häfele', pricePerM2: null, unitPrice: 8.50, price: 8.50, updatedAt: '2026-08-15' },
    ]
  }
];

const SuppliersPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('suppliers_overview');
  
  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' });

  // Comparisons state
  const [comparisons, setComparisons] = useState<ProductComparison[]>(() => {
    const saved = localStorage.getItem('sd_supplier_comparisons_v3');
    return saved ? JSON.parse(saved) : DEFAULT_COMPARISONS;
  });
  const [compSearch, setCompSearch] = useState('');
  
  // Detail Modal State
  const [selectedProdDetail, setSelectedProdDetail] = useState<ProductComparison | null>(null);

  // Photo & AI Extraction State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Text-Description AI Import State (free-text registration, like the Newbox app)
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [textImportInput, setTextImportInput] = useState('');
  const [analyzingText, setAnalyzingText] = useState(false);

  // Batch PDF / Image / Text Confirmation Modal State
  const [batchImportModal, setBatchImportModal] = useState<{
    isOpen: boolean;
    clientName: string;
    supplierName: string;
    fileUrl: string;
    isPdf: boolean;
    sourceType: 'file' | 'text';
    sourceText?: string;
    items: BatchImportItem[];
    addToMaterialList: boolean;
  } | null>(null);

  // New Product Modal State
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm] = useState({
    supplierName: '',
    supplierId: '',
    productName: '',
    brand: '',
    pricePerM2: '',
    unitPrice: '',
    category: 'MDF/MDP',
    description: '',
    specifications: '',
    photoUrl: ''
  });

  // New Quote Modal State
  const [quoteModalProdId, setQuoteModalProdId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    supplierId: '',
    supplierName: '',
    brand: '',
    pricePerM2: '',
    unitPrice: '',
    specifications: '',
    photoUrl: ''
  });

  // Material List State (Tab 3)
  const [materialList, setMaterialList] = useState<MaterialListItem[]>(() => {
    const saved = localStorage.getItem('sd_material_list_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [showAddMatForm, setShowAddMatForm] = useState(false);
  const [addMatMode, setAddMatMode] = useState<'select' | 'new'>('select');

  const [matForm, setMatForm] = useState({
    productId: '',
    supplierName: '',
    brand: '',
    unitPrice: 0,
    quantity: 1,
    isCheapest: true
  });

  const [newMatForm, setNewMatForm] = useState({
    supplierName: '',
    supplierId: '',
    productName: '',
    brand: '',
    pricePerM2: '',
    unitPrice: '',
    quantity: 1,
    category: 'MDF/MDP',
    photoUrl: '',
    specifications: ''
  });

  useEffect(() => {
    localStorage.setItem('sd_supplier_comparisons_v3', JSON.stringify(comparisons));
  }, [comparisons]);

  useEffect(() => {
    localStorage.setItem('sd_material_list_v1', JSON.stringify(materialList));
  }, [materialList]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await db.from('suppliers').select('*').eq('active', true).order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // ─── PDF Render & Text Extraction Helper ────────────────────────────────────
  const convertFileToImageAndText = async (file: File): Promise<{ base64Image: string; text: string }> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      try {
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(true);
              } else {
                reject(new Error('pdfjsLib não disponível'));
              }
            };
            script.onerror = () => reject(new Error('Erro ao baixar PDF.js CDN'));
            document.head.appendChild(script);
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
          try {
            const pageObj = await pdf.getPage(p);
            const textContent = await pageObj.getTextContent();
            const pageStrings = textContent.items.map((it: any) => it.str).filter(Boolean);
            fullText += `\n--- PÁGINA ${p} ---\n` + pageStrings.join(' ');
          } catch (e) {
            console.warn(`Erro ao extrair texto da página ${p}:`, e);
          }
        }

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        return { base64Image: imgData, text: fullText.trim() };
      } catch (pdfErr) {
        console.error("Erro ao renderizar PDF com PDF.js:", pdfErr);
        throw new Error('Não foi possível ler o PDF. Por favor, tire uma foto do documento com a câmera.');
      }
    } else {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { base64Image: base64, text: '' };
    }
  };

  const convertFileToImageBase64 = async (file: File): Promise<string> => {
    const res = await convertFileToImageAndText(file);
    return res.base64Image;
  };

  // ─── Single Photo Capture (AI extraction) ──────────────────────────────
  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>, targetForm: 'prod' | 'quote' | 'newMat') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    toast({ title: '📸 Lendo arquivo com IA...', description: 'Extraindo dados do produto, marca, especificações e valor!' });

    try {
      const { base64Image, text } = await convertFileToImageAndText(file);

      const prompt = `Analise este documento/foto de um produto/material de marcenaria.
Extraia e retorne EXATAMENTE um JSON válido neste formato:
{
  "productName": "Nome do produto",
  "brand": "Marca ou fabricante se houver",
  "unitPrice": "Preço em numero com ponto ou vazio",
  "pricePerM2": "Preço por m2 se houver ou vazio",
  "specifications": "Resumo detalhado das características"
}`;

      let aiResponse = "";
      if (text && text.length > 30) {
        try {
          aiResponse = await analyzeTextWithGroq(text, prompt);
        } catch (tErr) {
          console.warn("Falha ao analisar texto do PDF, tentando visão:", tErr);
        }
      }
      if (!aiResponse) {
        aiResponse = await analyzeImageWithGemini(base64Image, prompt);
      }

      let extractedData: any = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) extractedData = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn("Parse error:", aiResponse);
      }

      if (targetForm === 'prod') {
        setProdForm(prev => ({
          ...prev,
          productName: extractedData.productName || prev.productName,
          brand: extractedData.brand || prev.brand,
          unitPrice: extractedData.unitPrice ? String(extractedData.unitPrice) : prev.unitPrice,
          pricePerM2: extractedData.pricePerM2 ? String(extractedData.pricePerM2) : prev.pricePerM2,
          specifications: extractedData.specifications || prev.specifications || aiResponse.slice(0, 150),
          photoUrl: base64Image
        }));
      } else if (targetForm === 'quote') {
        setQuoteForm(prev => ({
          ...prev,
          brand: extractedData.brand || prev.brand,
          unitPrice: extractedData.unitPrice ? String(extractedData.unitPrice) : prev.unitPrice,
          pricePerM2: extractedData.pricePerM2 ? String(extractedData.pricePerM2) : prev.pricePerM2,
          specifications: extractedData.specifications || prev.specifications || aiResponse.slice(0, 150),
          photoUrl: base64Image
        }));
      } else if (targetForm === 'newMat') {
        setNewMatForm(prev => ({
          ...prev,
          productName: extractedData.productName || prev.productName,
          brand: extractedData.brand || prev.brand,
          unitPrice: extractedData.unitPrice ? String(extractedData.unitPrice) : prev.unitPrice,
          pricePerM2: extractedData.pricePerM2 ? String(extractedData.pricePerM2) : prev.pricePerM2,
          specifications: extractedData.specifications || prev.specifications || aiResponse.slice(0, 150),
          photoUrl: base64Image
        }));
      }

      toast({ title: '✨ Dados extraídos com sucesso!', description: 'Os campos foram preenchidos automaticamente.' });
    } catch (err) {
      console.error("Erro na leitura:", err);
      toast({ title: '📸 Foto anexada com sucesso!' });
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ─── Batch PDF & Photo Budget Scan Processing ────────────────────────────
  const handleImportBatchFromBudgetPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const objectUrl = URL.createObjectURL(file);

    setAnalyzingImage(true);
    toast({ 
      title: isPdf ? '📄 Lendo Arquivo PDF com IA...' : '📸 Lendo Foto de Orçamento com IA...', 
      description: 'Identificando cliente, produtos, quantidades e valores unitários...' 
    });

    try {
      const { base64Image, text } = await convertFileToImageAndText(file);

      const prompt = `Analise esta foto ou arquivo PDF de uma folha de orçamento, pedido de compra ou lista de materiais de marcenaria.
Localize o Nome do Cliente (ex: "SANDRA", "SANDRA - COZINHA") ou Fornecedor no topo do documento.
Extraia SOMENTE a lista de produtos/materiais, suas quantidades e seus valores unitários.

Retorne EXATAMENTE um JSON válido com esta estrutura:
{
  "clientName": "Nome do cliente encontrado na nota ex: SANDRA",
  "supplierName": "Nome do fornecedor ou 'Orçamento Importado'",
  "items": [
    {
      "productName": "Nome exato do produto ex: MDF 15 2F BRANCO TX",
      "category": "MDF/MDP ou Ferragens ou Acessórios ou Outros",
      "brand": "Marca se constar ou Geral",
      "unitPrice": 259.64,
      "quantity": 9
    }
  ]
}`;

      let aiResponse = "";
      if (text && text.length > 30) {
        try {
          aiResponse = await analyzeTextWithGroq(text, prompt);
        } catch (tErr) {
          console.warn("Falha ao analisar texto do PDF com Groq, tentando visão:", tErr);
        }
      }
      if (!aiResponse) {
        aiResponse = await analyzeImageWithGemini(base64Image, prompt);
      }
      let parsedData: any = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn("Parse error em lote:", aiResponse);
      }

      const extractedItems: BatchImportItem[] = [];
      if (parsedData && Array.isArray(parsedData.items)) {
        parsedData.items.forEach((it: any) => {
          if (!it.productName) return;
          const uVal = typeof it.unitPrice === 'number' 
            ? it.unitPrice 
            : parseFloat(String(it.unitPrice).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
          
          extractedItems.push({
            productName: String(it.productName).trim(),
            category: it.category || 'MDF/MDP',
            brand: it.brand || 'Geral',
            unitPrice: uVal,
            quantity: Math.max(1, parseInt(String(it.quantity)) || 1)
          });
        });
      }

      if (extractedItems.length > 0) {
        // Opens Modal for Side-by-Side PDF/Photo preview & validation!
        setBatchImportModal({
          isOpen: true,
          clientName: parsedData.clientName || 'Cliente Importado',
          supplierName: parsedData.supplierName || 'Orçamento Importado',
          fileUrl: objectUrl,
          isPdf: isPdf,
          sourceType: 'file',
          items: extractedItems,
          addToMaterialList: true
        });

        toast({ 
          title: `📄 ${extractedItems.length} Produtos lidos no documento!`, 
          description: 'Visualize o PDF ao lado e confirme para criar a Lista de Compras!' 
        });
      } else {
        toast({ title: '⚠️ Não foi possível extrair a lista de produtos do documento', variant: 'destructive' });
      }

    } catch (err: any) {
      console.error("Erro no processamento do documento:", err);
      const msg = err?.message || 'Erro desconhecido';
      toast({ 
        title: '❌ Erro ao processar documento', 
        description: msg.includes('PDF') 
          ? 'Não foi possível renderizar o PDF. Tente tirar uma foto da folha impressa com a câmera do celular.' 
          : `Falha na leitura com IA: ${msg.slice(0, 120)}`,
        variant: 'destructive' 
      });
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ─── Free-Text AI Registration (describe the purchase, AI fills everything) ──
  const handleImportFromTextDescription = async () => {
    const text = textImportInput.trim();
    if (!text || text.length < 8) {
      toast({ title: '⚠️ Descreva o que deseja cadastrar', description: 'Ex: Cliente Sandra comprou 9 chapas de MDF branco a 259,64 cada...', variant: 'destructive' });
      return;
    }

    setAnalyzingText(true);
    toast({ title: '🤖 Lendo sua descrição com IA...', description: 'Montando o cadastro de cliente, produtos e valores...' });

    try {
      const prompt = `Analise esta descrição em texto livre, escrita por um marceneiro, sobre uma compra ou orçamento de materiais.
Localize o Nome do Cliente (se houver) e o Nome do Fornecedor (se houver).
Extraia a lista de produtos/materiais citados, com quantidade e valor unitário de cada um.

Retorne EXATAMENTE um JSON válido com esta estrutura:
{
  "clientName": "Nome do cliente citado ou 'Cliente Importado'",
  "supplierName": "Nome do fornecedor citado ou 'Cadastro por Texto (IA)'",
  "items": [
    {
      "productName": "Nome do produto ex: Chapa MDF Branco",
      "category": "MDF/MDP ou Ferragens ou Vidros ou Pedras ou Tintas ou Acessórios ou Outros",
      "brand": "Marca se citada ou Geral",
      "unitPrice": 259.64,
      "quantity": 9
    }
  ]
}`;

      const aiResponse = await analyzeTextWithGroq(text, prompt);

      let parsedData: any = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.warn("Parse error na descrição de texto:", aiResponse);
      }

      const extractedItems: BatchImportItem[] = [];
      if (parsedData && Array.isArray(parsedData.items)) {
        parsedData.items.forEach((it: any) => {
          if (!it.productName) return;
          const uVal = typeof it.unitPrice === 'number'
            ? it.unitPrice
            : parseFloat(String(it.unitPrice).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;

          extractedItems.push({
            productName: String(it.productName).trim(),
            category: it.category || 'MDF/MDP',
            brand: it.brand || 'Geral',
            unitPrice: uVal,
            quantity: Math.max(1, parseInt(String(it.quantity)) || 1)
          });
        });
      }

      if (extractedItems.length > 0) {
        setBatchImportModal({
          isOpen: true,
          clientName: parsedData.clientName || 'Cliente Importado',
          supplierName: parsedData.supplierName || 'Cadastro por Texto (IA)',
          fileUrl: '',
          isPdf: false,
          sourceType: 'text',
          sourceText: text,
          items: extractedItems,
          addToMaterialList: true
        });
        setShowTextImportModal(false);
        setTextImportInput('');

        toast({
          title: `✨ ${extractedItems.length} Produtos identificados na sua descrição!`,
          description: 'Confira e confirme para criar a Lista de Compras!'
        });
      } else {
        toast({ title: '⚠️ Não consegui identificar produtos na sua descrição', description: 'Tente detalhar nome, quantidade e valor de cada item.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error("Erro ao processar descrição por texto:", err);
      toast({ title: '❌ Erro ao processar sua descrição', description: (err?.message || 'Erro desconhecido').slice(0, 120), variant: 'destructive' });
    } finally {
      setAnalyzingText(false);
    }
  };

  // Save Modal Batch Confirmation (Creates Material List AND Comparativo Quotes!)
  const handleConfirmBatchImport = () => {
    if (!batchImportModal || batchImportModal.items.length === 0) return;

    const suppName = batchImportModal.supplierName.trim() || 'Orçamento Importado';
    let newComparisons = [...comparisons];
    let newMaterialItems: MaterialListItem[] = [];

    batchImportModal.items.forEach(it => {
      // Find existing product in comparisons by name
      const existingIndex = newComparisons.findIndex(c => 
        c.productName.toLowerCase().trim() === it.productName.toLowerCase().trim()
      );

      const quote: PriceQuote = {
        supplierId: Date.now().toString() + Math.random().toString().slice(2, 6),
        supplierName: suppName,
        brand: it.brand || 'Geral',
        pricePerM2: null,
        unitPrice: it.unitPrice,
        price: it.unitPrice,
        updatedAt: new Date().toISOString().split('T')[0],
        specifications: `Importado via PDF/Orçamento de ${batchImportModal.clientName}. Qtd: ${it.quantity}`
      };

      let prodId = '';

      if (existingIndex >= 0) {
        prodId = newComparisons[existingIndex].id;
        const existingQuotes = newComparisons[existingIndex].quotes.filter(q => q.supplierName.toLowerCase() !== suppName.toLowerCase());
        newComparisons[existingIndex] = {
          ...newComparisons[existingIndex],
          quotes: [...existingQuotes, quote]
        };
      } else {
        prodId = Date.now().toString() + Math.random().toString().slice(2, 6);
        newComparisons.unshift({
          id: prodId,
          productName: it.productName,
          category: it.category || 'MDF/MDP',
          unit: 'Un',
          quotes: [quote]
        });
      }

      // Add to Material Purchase List with Cheapest Quote Selection
      if (batchImportModal.addToMaterialList) {
        // Check if there is an even cheaper quote among all suppliers for this product
        const allQuotes = existingIndex >= 0 ? newComparisons[existingIndex].quotes : [quote];
        const cheapestQuote = allQuotes.reduce((prev, curr) => 
          (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev
        );

        newMaterialItems.push({
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          productId: prodId,
          productName: it.productName,
          category: it.category || 'MDF/MDP',
          selectedSupplierName: cheapestQuote.supplierName,
          selectedBrand: cheapestQuote.brand || 'Geral',
          selectedUnitPrice: cheapestQuote.unitPrice || cheapestQuote.price,
          quantity: it.quantity,
          total: it.quantity * (cheapestQuote.unitPrice || cheapestQuote.price),
          isCheapestSelected: true
        });
      }
    });

    setComparisons(newComparisons);
    if (newMaterialItems.length > 0) {
      setMaterialList([...newMaterialItems, ...materialList]);
    }

    setBatchImportModal(null);
    setActiveTab('material_list'); // Auto navigate to client's Material Purchase List!

    toast({ 
      title: `🎉 Lista de Compras do Cliente (${batchImportModal.clientName}) criada!`, 
      description: `Os ${batchImportModal.items.length} produtos foram comparados com os melhores preços do mercado!` 
    });
  };

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
      updatedAt: new Date().toISOString().split('T')[0],
      photoUrl: prodForm.photoUrl || null,
      specifications: prodForm.specifications || null
    };

    const newProd: ProductComparison = {
      id: Date.now().toString(),
      productName: prodForm.productName.trim(),
      category: prodForm.category,
      unit: 'Un',
      description: prodForm.description || undefined,
      quotes: [firstQuote]
    };

    setComparisons([newProd, ...comparisons]);
    setProdForm({ supplierName: '', supplierId: '', productName: '', brand: '', pricePerM2: '', unitPrice: '', category: 'MDF/MDP', description: '', specifications: '', photoUrl: '' });
    setShowProdForm(false);
    toast({ title: '✅ Produto e Cotação cadastrados com foto e detalhes!' });
  };

  const handleDeleteProduct = (id: string) => {
    setComparisons(comparisons.filter(c => c.id !== id));
    toast({ title: '🗑️ Produto removido do comparativo' });
  };

  // Quote Only Handler
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
        updatedAt: new Date().toISOString().split('T')[0],
        photoUrl: quoteForm.photoUrl || null,
        specifications: quoteForm.specifications || null
      };
      return { ...p, quotes: [...filteredQuotes, newQuote] };
    }));

    setQuoteModalProdId(null);
    setQuoteForm({ supplierId: '', supplierName: '', brand: '', pricePerM2: '', unitPrice: '', specifications: '', photoUrl: '' });
    toast({ title: '💰 Cotação com detalhamento cadastrada!' });
  };

  const handleDeleteQuote = (prodId: string, supplierName: string) => {
    setComparisons(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      return { ...p, quotes: p.quotes.filter(q => q.supplierName !== supplierName) };
    }));
    toast({ title: '🗑️ Cotação removida' });
  };

  // Material List Handlers
  const handleSelectProductForMatList = (prodId: string) => {
    const prod = comparisons.find(c => c.id === prodId);
    if (!prod || prod.quotes.length === 0) {
      setMatForm({ productId: prodId, supplierName: '', brand: '', unitPrice: 0, quantity: 1, isCheapest: true });
      return;
    }

    const cheapestQuote = prod.quotes.reduce((prev, curr) => 
      (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev
    );

    setMatForm({
      productId: prodId,
      supplierName: cheapestQuote.supplierName,
      brand: cheapestQuote.brand || 'Geral',
      unitPrice: cheapestQuote.unitPrice || cheapestQuote.price,
      quantity: 1,
      isCheapest: true
    });
  };

  const handleSelectQuoteForMatList = (supplierName: string) => {
    const prod = comparisons.find(c => c.id === matForm.productId);
    if (!prod) return;
    const q = prod.quotes.find(item => item.supplierName === supplierName);
    if (!q) return;

    const cheapestQuote = prod.quotes.reduce((prev, curr) => 
      (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev
    );
    const isCheapest = (q.supplierName === cheapestQuote.supplierName && (q.unitPrice || q.price) === (cheapestQuote.unitPrice || cheapestQuote.price));

    setMatForm({
      ...matForm,
      supplierName: q.supplierName,
      brand: q.brand || 'Geral',
      unitPrice: q.unitPrice || q.price,
      isCheapest: isCheapest
    });
  };

  const handleAddMaterialToList = () => {
    if (!matForm.productId) {
      toast({ title: '⚠️ Selecione um produto', variant: 'destructive' });
      return;
    }
    const prod = comparisons.find(c => c.id === matForm.productId);
    if (!prod) return;

    if (!matForm.supplierName) {
      toast({ title: '⚠️ Nenhuma cotação cadastrada para este produto ainda', variant: 'destructive' });
      return;
    }

    const qty = Math.max(1, Number(matForm.quantity) || 1);
    const total = qty * matForm.unitPrice;

    const newItem: MaterialListItem = {
      id: Date.now().toString(),
      productId: prod.id,
      productName: prod.productName,
      category: prod.category,
      selectedSupplierName: matForm.supplierName,
      selectedBrand: matForm.brand,
      selectedUnitPrice: matForm.unitPrice,
      quantity: qty,
      total: total,
      isCheapestSelected: matForm.isCheapest
    };

    setMaterialList([newItem, ...materialList]);
    setShowAddMatForm(false);
    setMatForm({ productId: '', supplierName: '', brand: '', unitPrice: 0, quantity: 1, isCheapest: true });
    toast({ title: '📦 Produto adicionado à Lista de Materiais com sucesso!' });
  };

  const handleAddNewProductDirectlyToMaterialList = () => {
    if (!newMatForm.productName.trim()) {
      toast({ title: '⚠️ Informe o nome do produto', variant: 'destructive' });
      return;
    }

    const unitPriceNum = parseFloat(newMatForm.unitPrice.replace(',', '.'));
    if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
      toast({ title: '⚠️ Informe um valor unitário válido', variant: 'destructive' });
      return;
    }

    let sName = newMatForm.supplierName.trim();
    if (newMatForm.supplierId) {
      const found = suppliers.find(s => s.id === newMatForm.supplierId);
      if (found) sName = found.name;
    }
    if (!sName) {
      toast({ title: '⚠️ Informe o nome do fornecedor', variant: 'destructive' });
      return;
    }

    const m2Num = newMatForm.pricePerM2 ? parseFloat(newMatForm.pricePerM2.replace(',', '.')) : null;
    const qty = Math.max(1, Number(newMatForm.quantity) || 1);
    const total = qty * unitPriceNum;

    const firstQuote: PriceQuote = {
      supplierId: newMatForm.supplierId || Date.now().toString(),
      supplierName: sName,
      brand: newMatForm.brand.trim() || 'Geral',
      pricePerM2: isNaN(m2Num as number) ? null : m2Num,
      unitPrice: unitPriceNum,
      price: unitPriceNum,
      updatedAt: new Date().toISOString().split('T')[0],
      photoUrl: newMatForm.photoUrl || null,
      specifications: newMatForm.specifications || null
    };

    const newProdId = Date.now().toString();
    const newProd: ProductComparison = {
      id: newProdId,
      productName: newMatForm.productName.trim(),
      category: newMatForm.category,
      unit: 'Un',
      quotes: [firstQuote]
    };

    setComparisons([newProd, ...comparisons]);

    const newItem: MaterialListItem = {
      id: (Date.now() + 1).toString(),
      productId: newProdId,
      productName: newProd.productName,
      category: newProd.category,
      selectedSupplierName: sName,
      selectedBrand: firstQuote.brand,
      selectedUnitPrice: unitPriceNum,
      quantity: qty,
      total: total,
      isCheapestSelected: true
    };

    setMaterialList([newItem, ...materialList]);
    setShowAddMatForm(false);
    setNewMatForm({ supplierName: '', supplierId: '', productName: '', brand: '', pricePerM2: '', unitPrice: '', quantity: 1, category: 'MDF/MDP', photoUrl: '', specifications: '' });
    toast({ title: '🚀 Produto criado com foto e adicionado à Lista de Compras!' });
  };

  const handleQuickAddFromComparison = (prod: ProductComparison) => {
    if (prod.quotes.length === 0) {
      toast({ title: '⚠️ Cadastre ao menos uma cotação para este produto antes de incluir na lista', variant: 'destructive' });
      return;
    }
    const cheapestQuote = prod.quotes.reduce((prev, curr) => 
      (curr.unitPrice || curr.price) < (prev.unitPrice || prev.price) ? curr : prev
    );

    const newItem: MaterialListItem = {
      id: Date.now().toString(),
      productId: prod.id,
      productName: prod.productName,
      category: prod.category,
      selectedSupplierName: cheapestQuote.supplierName,
      selectedBrand: cheapestQuote.brand || 'Geral',
      selectedUnitPrice: cheapestQuote.unitPrice || cheapestQuote.price,
      quantity: 1,
      total: cheapestQuote.unitPrice || cheapestQuote.price,
      isCheapestSelected: true
    };

    setMaterialList([newItem, ...materialList]);
    toast({ 
      title: '🏆 Adicionado com o MENOR PREÇO!', 
      description: `${prod.productName} — ${cheapestQuote.supplierName} (R$ ${(cheapestQuote.unitPrice || cheapestQuote.price).toFixed(2)})` 
    });
  };

  const handleDeleteMaterialItem = (id: string) => {
    setMaterialList(materialList.filter(m => m.id !== id));
    toast({ title: '🗑️ Item removido da lista' });
  };

  const handlePrintMaterialList = () => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;

    const grouped: Record<string, MaterialListItem[]> = {};
    materialList.forEach(item => {
      if (!grouped[item.selectedSupplierName]) grouped[item.selectedSupplierName] = [];
      grouped[item.selectedSupplierName].push(item);
    });

    let totalGeral = materialList.reduce((acc, curr) => acc + curr.total, 0);

    win.document.write(`
      <html><head><title>Lista de Materiais de Compra — SD Móveis</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:20px;color:#111}
        h2{margin:0 0 4px;color:#000}
        .header{border-b:2px solid #333;padding-bottom:12px;margin-bottom:16px}
        .supplier-box{border:1px solid #ccc;border-radius:6px;padding:12px;margin-bottom:16px;background:#fdfdfd}
        .supplier-title{font-size:14px;font-weight:bold;color:#0066cc;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;margin-top:4px}
        th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
        th{background:#f0f0f0;font-size:11px}
        .total-row{text-align:right;font-weight:bold;font-size:14px;margin-top:16px;padding:10px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px}
      </style>
      </head><body>
      <div class="header">
        <h2>SD MÓVEIS PROJETADOS — LISTA DE MATERIAIS PARA COMPRA</h2>
        <p>Data do Pedido: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      
      ${Object.entries(grouped).map(([suppName, items]) => {
        const suppTotal = items.reduce((acc, curr) => acc + curr.total, 0);
        return `
          <div class="supplier-box">
            <div class="supplier-title">🛒 Fornecedor: ${suppName} (Total: R$ ${suppTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</div>
            <table>
              <thead>
                <tr>
                  <th>Produto / Material</th>
                  <th>Marca</th>
                  <th>Qtd</th>
                  <th>Valor Unit.</th>
                  <th>Total Item</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(it => `
                  <tr>
                    <td><b>${it.productName}</b></td>
                    <td>${it.selectedBrand}</td>
                    <td>${it.quantity}</td>
                    <td>R$ ${it.selectedUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td><b>R$ ${it.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}

      <div class="total-row">
        VALOR TOTAL ESTIMADO DA COMPRA: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
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

  // Material list summary calculations
  const totalMaterialListValue = materialList.reduce((acc, item) => acc + item.total, 0);
  const materialListSuppliersCount = new Set(materialList.map(m => m.selectedSupplierName)).size;

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] relative w-full pt-16">
      
      {/* Hidden File Input for Batch Orçamento Photo & PDF Scan */}
      <input 
        type="file" 
        ref={batchFileInputRef} 
        accept="image/*,application/pdf,.pdf" 
        capture="environment" 
        onChange={handleImportBatchFromBudgetPhoto}
        className="hidden" 
      />

      {/* AI Processing Overlay */}
      {analyzingImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 p-6">
          <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-purple-300">🤖 Leitura Inteligente do Orçamento (IA)...</h2>
          <p className="text-sm text-gray-400 text-center max-w-md">
            Extraindo produtos, quantidades e valores unitários do documento. Gerando lista e comparativo automático!
          </p>
        </div>
      )}

      {/* AI Text-Description Processing Overlay */}
      {analyzingText && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 p-6">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 border-2 border-indigo-500 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-indigo-300">🤖 Interpretando sua descrição com IA...</h2>
          <p className="text-sm text-gray-400 text-center max-w-md">
            Identificando cliente, produtos, quantidades e valores a partir do texto. Gerando o cadastro automático!
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-amber-500" />
            Gestão de Fornecedores & Compras
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Leitura de Orçamentos (PDF/Foto/Texto), Comparativo do Menor Preço e Lista do Cliente</p>
        </div>

        {/* Action Buttons */}
        {activeTab === 'suppliers' && (
          <button 
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' }); }} 
            className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> Novo Fornecedor
          </button>
        )}

        {activeTab === 'comparison' && (
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <button 
              onClick={() => batchFileInputRef.current?.click()}
              className="bg-purple-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg flex-1 sm:flex-none justify-center text-sm"
              title="Abra um PDF ou tire foto de uma folha de orçamento/nota para ler produtos e criar a lista do cliente"
            >
              <FileText className="w-5 h-5" /> 📄 Abrir PDF / Tirar Foto do Orçamento (IA)
            </button>

            <button 
              onClick={() => { setShowTextImportModal(true); setTextImportInput(''); }}
              className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg flex-1 sm:flex-none justify-center text-sm"
              title="Descreva em texto o que deseja cadastrar e deixe a IA montar tudo"
            >
              <PenLine className="w-5 h-5" /> ✍️ Descrever por Texto (IA)
            </button>

            <button 
              onClick={() => setShowProdForm(true)} 
              className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg flex-1 sm:flex-none justify-center text-sm"
            >
              <Plus className="w-5 h-5" /> Adicionar Produto ao Comparativo
            </button>
          </div>
        )}

        {activeTab === 'material_list' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => {
                setShowAddMatForm(true);
                setAddMatMode('select');
                if (comparisons.length > 0) handleSelectProductForMatList(comparisons[0].id);
              }} 
              className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg flex-1 sm:flex-none justify-center text-sm"
            >
              <Plus className="w-5 h-5" /> Adicionar Material à Lista
            </button>
            {materialList.length > 0 && (
              <button 
                onClick={handlePrintMaterialList}
                className="bg-gray-800 border border-white/20 text-white px-4 py-3 rounded-2xl font-bold hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                title="Imprimir Pedido de Compra"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Imprimir Lista
              </button>
            )}
          </div>
        )}
      </header>

      {/* Navigation Tabs - Flat Structure */}
      <div className="flex border-b border-white/10 gap-2 flex-wrap pb-2 mb-6">
        <button
          onClick={() => setActiveTab('suppliers_overview')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-b-2 ${
            activeTab === 'suppliers_overview'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500'
              : 'text-gray-400 hover:text-white border-transparent'
          }`}
        >
          <Building className="w-4 h-4" />
          Visão Geral ({suppliers.length})
        </button>

        {suppliers.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(`supplier_${s.id}`)}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-b-2 ${
              activeTab === `supplier_${s.id}`
                ? 'bg-amber-500/10 text-amber-400 border-amber-500'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            🏢 {s.name}
          </button>
        ))}

        <button
          onClick={() => { setActiveTab('suppliers_overview'); setShowForm(true); setEditingId(null); setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' }); }}
          className="flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl text-emerald-400 hover:bg-emerald-500/10 transition-all border-b-2 border-transparent"
        >
          + Novo Fornecedor
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

        <button
          onClick={() => setActiveTab('material_list')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm rounded-t-2xl transition-all border-b-2 ${
            activeTab === 'material_list'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500'
              : 'text-gray-400 hover:text-white border-transparent'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-blue-400" />
          📦 Lista de Materiais da Compra ({materialList.length})
        </button>
      </div>

      {/* ─── TAB: VISÃO GERAL ────────────────────────────────────────────── */}
      {activeTab === 'suppliers_overview' && (
        <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Buscar fornecedor por nome ou CNPJ..." 
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-gray-500 text-sm" 
                />
              </div>

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

      {/* ─── TAB: PRODUTOS DO FORNECEDOR ESPECÍFICO ─────────────────────── */}
      {activeTab.startsWith('supplier_') && activeTab !== 'suppliers_overview' && (
        (() => {
          const supplierId = activeTab.replace('supplier_', '');
          const currentSupplier = suppliers.find(s => s.id === supplierId);
          if (!currentSupplier) return null;
          
          // Extrair todos os produtos que possuem cotação para ESTE fornecedor
          const supplierProducts = comparisons.filter(c => 
            c.quotes.some(q => q.supplierId === currentSupplier.id || q.supplierName.toLowerCase() === currentSupplier.name.toLowerCase())
          );

          return (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  {/* Fornecedor Header */}
                  <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        🏢 {currentSupplier.name}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {currentSupplier.category} {currentSupplier.cnpj && `• CNPJ: ${currentSupplier.cnpj}`} {currentSupplier.phone && `• 📞 ${currentSupplier.phone}`}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <button 
                        onClick={() => {
                          setProdForm({ ...prodForm, supplierId: currentSupplier.id, supplierName: currentSupplier.name });
                          setShowProdForm(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Produto / Preço
                      </button>
                      <button 
                        onClick={() => {
                          setBatchImportModal({
                            isOpen: true,
                            clientName: '',
                            supplierName: currentSupplier.name,
                            fileUrl: '',
                            isPdf: false,
                            sourceType: 'text',
                            sourceText: '',
                            items: [],
                            addToMaterialList: false
                          });
                          setShowTextImportModal(true);
                          setTextImportInput('');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all"
                      >
                        <Sparkles className="w-4 h-4" /> Importar Orçamento Rápido
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Produtos deste fornecedor */}
                  <div className="bg-[#111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-[#1a1a1a] border-b border-white/10">
                        <tr>
                          <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Produto</th>
                          <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Preço Cadastrado (Unit.)</th>
                          <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Comparativo no Mercado</th>
                          <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierProducts.map(prod => {
                          const thisQuote = prod.quotes.find(q => q.supplierId === currentSupplier.id || q.supplierName.toLowerCase() === currentSupplier.name.toLowerCase());
                          if (!thisQuote) return null;

                          // Lógica para saber se ele é o mais barato
                          let minPrice = Infinity;
                          let cheapestSupplier = '';
                          prod.quotes.forEach(q => {
                            const p = q.unitPrice || q.price;
                            if (p < minPrice) {
                              minPrice = p;
                              cheapestSupplier = q.supplierName;
                            }
                          });

                          const thisPrice = thisQuote.unitPrice || thisQuote.price;
                          const isCheapest = thisPrice <= minPrice;
                          const diff = thisPrice - minPrice;

                          return (
                            <tr key={prod.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-white text-sm">{prod.productName}</p>
                                <p className="text-xs text-gray-500">{prod.category} {thisQuote.brand && thisQuote.brand !== 'Geral' ? `• ${thisQuote.brand}` : ''}</p>
                              </td>
                              <td className="p-4 font-black text-emerald-400">
                                R$ {thisPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4">
                                {prod.quotes.length === 1 ? (
                                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">Única Cotação</span>
                                ) : isCheapest ? (
                                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">🥇 Mais Barato</span>
                                ) : (
                                  <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md">
                                    + R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vencedor: {cheapestSupplier})
                                  </span>
                                )}
                              </td>
                              <td className="p-4 flex gap-2">
                                <button onClick={() => {
                                  setQuoteForm({
                                    supplierId: currentSupplier.id,
                                    supplierName: currentSupplier.name,
                                    brand: thisQuote.brand || '',
                                    pricePerM2: thisQuote.pricePerM2?.toString() || '',
                                    unitPrice: thisPrice.toString(),
                                    specifications: thisQuote.specifications || '',
                                    photoUrl: thisQuote.photoUrl || ''
                                  });
                                  setQuoteModalProdId(prod.id);
                                }} className="w-8 h-8 bg-white/5 border border-white/10 text-white rounded-lg flex items-center justify-center hover:bg-blue-500/10 hover:text-blue-400 transition-all" title="Editar Preço"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteQuote(prod.id, currentSupplier.name)} className="w-8 h-8 bg-white/5 border border-white/10 text-white rounded-lg flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-all" title="Excluir Cotação"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {supplierProducts.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum produto cadastrado para este fornecedor ainda. Adicione o primeiro!</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
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

          {/* Banner Promocional IA Import Batch */}
          <div className="bg-gradient-to-r from-purple-900/40 via-purple-950/60 to-indigo-900/40 border border-purple-500/30 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Leitura Automática de Orçamento (PDF / Foto / Texto)</h3>
                <p className="text-xs text-purple-200/80">
                  Importe um PDF, foto, ou apenas <b>descreva por texto</b> a compra. A IA lê os produtos, quantidades e preços, cria a <b>Lista de Compras do Cliente</b> e já faz a <b>comparação de preços</b>!
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap shrink-0">
              <button 
                onClick={() => batchFileInputRef.current?.click()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <FileText className="w-4 h-4" /> 📄 Abrir PDF / Tirar Foto
              </button>
              <button 
                onClick={() => { setShowTextImportModal(true); setTextImportInput(''); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <PenLine className="w-4 h-4" /> ✍️ Descrever por Texto
              </button>
            </div>
          </div>

          {/* Search Bar */}
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
          {/* Os modais showProdForm e quoteModalProdId foram movidos para overlays globais no final do componente */}

          {/* Product Comparison Cards */}
          <div className="space-y-4">
            {filteredComparisons.map(item => {
              const hasQuotes = item.quotes && item.quotes.length > 0;
              // Ordenar cotações da mais barata para a mais cara
              const sortedQuotes = [...(item.quotes || [])].sort((a, b) => {
                const valA = a.unitPrice || a.price || 0;
                const valB = b.unitPrice || b.price || 0;
                return valA - valB;
              });

              const cheapest = sortedQuotes[0] || null;
              const expensive = sortedQuotes[sortedQuotes.length - 1] || null;
              const cheapestVal = cheapest ? (cheapest.unitPrice || cheapest.price || 0) : 0;
              const expensiveVal = expensive ? (expensive.unitPrice || expensive.price || 0) : 0;
              const diff = (sortedQuotes.length > 1 && cheapestVal > 0) ? expensiveVal - cheapestVal : 0;
              const percEconomy = (expensiveVal > 0 && diff > 0) ? Math.round((diff / expensiveVal) * 100) : 0;

              return (
                <div key={item.id} className="bg-[#121418] border border-white/10 hover:border-amber-500/30 transition-all rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  
                  {/* 1. Top Bar: Nome do Produto e Ações Rápidas */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                          {item.category || 'Geral'}
                        </span>
                        <h3 className="text-xl font-black text-white">{item.productName}</h3>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-400">{item.description}</p>
                      )}
                    </div>

                    {/* Ações do Card */}
                    <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                      <button
                        onClick={() => handleQuickAddFromComparison(item)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
                        title="Adicionar este produto à Lista de Compras com o melhor preço"
                      >
                        <ShoppingCart className="w-4 h-4" /> Comprar no Melhor Preço
                      </button>

                      <button
                        onClick={() => {
                          setQuoteModalProdId(item.id);
                          setQuoteForm({ supplierId: '', supplierName: '', brand: '', pricePerM2: '', unitPrice: '', specifications: '', photoUrl: '' });
                        }}
                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                        title="Adicionar cotação de outro fornecedor para comparar"
                      >
                        <Plus className="w-4 h-4" /> + Cotação
                      </button>

                      <button
                        onClick={() => setSelectedProdDetail(item)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                        title="Ver fotos e detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalhes
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="w-8 h-8 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all"
                        title="Excluir este produto do comparativo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Destaque de Economia (quando há 2 ou mais fornecedores concorrentes) */}
                  {sortedQuotes.length > 1 && diff > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          Economia de <b>R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> ({percEconomy}%) comprando na <b>{cheapest?.supplierName}</b>
                        </span>
                      </div>
                      <span className="text-[11px] bg-emerald-500 text-black font-black px-2.5 py-0.5 rounded-full uppercase">
                        {percEconomy}% mais barato
                      </span>
                    </div>
                  )}

                  {/* 3. Grade Clara e Direta de Preços por Fornecedor (Sem repetições) */}
                  {hasQuotes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sortedQuotes.map((q, idx) => {
                        const val = q.unitPrice || q.price || 0;
                        const isWinner = idx === 0;
                        const priceDifference = isWinner ? 0 : val - cheapestVal;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                              isWinner
                                ? 'bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                                : 'bg-[#181b20] border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-black text-sm ${isWinner ? 'text-emerald-300' : 'text-white'}`}>
                                  {isWinner && '🥇 '}{q.supplierName}
                                </span>
                                {isWinner && (
                                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                    Mais Barato
                                  </span>
                                )}
                              </div>

                              {q.brand && (
                                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-gray-500" /> Marca: <span className="text-gray-300 font-semibold">{q.brand}</span>
                                </p>
                              )}

                              {!isWinner && priceDifference > 0 && (
                                <p className="text-[10px] text-amber-400/80 font-bold">
                                  + R$ {priceDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mais caro
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Preço</span>
                                <span className={`font-black text-base ${isWinner ? 'text-emerald-400 text-lg' : 'text-gray-200'}`}>
                                  R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteQuote(item.id, q.supplierName)}
                                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Remover esta cotação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400 bg-[#16181d] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                      <p className="text-xs">Nenhuma cotação cadastrada para este produto.</p>
                      <button
                        onClick={() => {
                          setQuoteModalProdId(item.id);
                          setQuoteForm({ supplierId: '', supplierName: '', brand: '', pricePerM2: '', unitPrice: '', specifications: '', photoUrl: '' });
                        }}
                        className="text-xs text-amber-400 hover:underline font-bold"
                      >
                        + Adicionar primeira cotação de preço
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

            {filteredComparisons.length === 0 && (
              <div className="p-12 text-center text-gray-500 bg-[#111111] rounded-3xl border border-white/10">
                Nenhum produto cadastrado no comparativo ainda.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── TAB 3: LISTA DE MATERIAIS DA COMPRA ────────────────────────────── */}
      {activeTab === 'material_list' && (
        <div className="space-y-6">

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Itens na Lista de Compras</p>
                <p className="text-2xl font-black text-white mt-0.5">{materialList.length}</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Valor Total Estimado</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  R$ {totalMaterialListValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/10 p-5 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-semibold">Fornecedores a Comprar</p>
                <p className="text-2xl font-black text-purple-300 mt-0.5">{materialListSuppliersCount}</p>
              </div>
            </div>
          </div>

          {/* Form Modal: Add Item to Material List */}
          {showAddMatForm && (
            <div className="bg-[#111111] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white max-w-2xl mx-auto">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
                <h3 className="font-bold text-lg text-blue-400 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Adicionar Produto à Lista de Compras
                </h3>

                <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setAddMatMode('select')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      addMatMode === 'select' 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Selecionar Existente
                  </button>
                  <button 
                    onClick={() => setAddMatMode('new')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                      addMatMode === 'new' 
                        ? 'bg-emerald-600 text-white shadow' 
                        : 'text-gray-400 hover:text-emerald-400'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> + Cadastrar Novo Produto
                  </button>
                </div>
              </div>

              {/* MODE 1: SELECT EXISTING PRODUCT */}
              {addMatMode === 'select' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-blue-300 font-bold block mb-1">1. Selecionar Produto do Comparativo *</label>
                    <select 
                      value={matForm.productId}
                      onChange={e => handleSelectProductForMatList(e.target.value)}
                      className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                    >
                      <option value="">-- Escolha o produto cotado --</option>
                      {comparisons.map(p => (
                        <option key={p.id} value={p.id}>{p.productName} ({p.quotes.length} cotações)</option>
                      ))}
                    </select>
                  </div>

                  {matForm.productId && (
                    <>
                      <div>
                        <label className="text-xs text-emerald-400 font-bold block mb-1">
                          2. Fornecedor & Preço {matForm.isCheapest && '🏆 (Menor Preço Padrão)'}
                        </label>
                        {(() => {
                          const selectedProd = comparisons.find(c => c.id === matForm.productId);
                          if (!selectedProd || selectedProd.quotes.length === 0) {
                            return <p className="text-xs text-red-400 p-2">Nenhuma cotação cadastrada neste produto ainda.</p>;
                          }
                          return (
                            <select
                              value={matForm.supplierName}
                              onChange={e => handleSelectQuoteForMatList(e.target.value)}
                              className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-bold"
                            >
                              {selectedProd.quotes.map((q, idx) => (
                                <option key={idx} value={q.supplierName}>
                                  {q.supplierName} — R$ {(q.unitPrice || q.price).toFixed(2)} {q.brand ? `[${q.brand}]` : ''}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 font-bold block mb-1">3. Quantidade</label>
                        <input 
                          type="number" 
                          min="1"
                          value={matForm.quantity}
                          onChange={e => setMatForm({ ...matForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* MODE 2: CREATE & ADD NEW PRODUCT DIRECTLY */}
              {addMatMode === 'new' && (
                <div className="space-y-4 bg-[#181818] p-4 rounded-2xl border border-emerald-500/30">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> Preencha para Cadastrar o Produto:
                    </p>

                    <label className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0">
                      {analyzingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>Foto / PDF</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf,.pdf" 
                        capture="environment" 
                        onChange={e => handleCapturePhoto(e, 'newMat')} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-amber-400 font-bold block mb-1">1. Nome do Fornecedor *</label>
                      <select 
                        value={newMatForm.supplierId} 
                        onChange={e => {
                          const sel = suppliers.find(s => s.id === e.target.value);
                          setNewMatForm({ ...newMatForm, supplierId: e.target.value, supplierName: sel ? sel.name : newMatForm.supplierName });
                        }} 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs mb-1"
                      >
                        <option value="">-- Selecione ou digite abaixo --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <input 
                        value={newMatForm.supplierName} 
                        onChange={e => setNewMatForm({ ...newMatForm, supplierName: e.target.value, supplierId: '' })} 
                        placeholder="Ou digite o Fornecedor..." 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs" 
                      />
                    </div>

                    <div>
                      <label className="text-xs text-emerald-400 font-bold block mb-1">2. Nome do Produto *</label>
                      <input 
                        value={newMatForm.productName} 
                        onChange={e => setNewMatForm({ ...newMatForm, productName: e.target.value })} 
                        placeholder="Ex: MDF 15mm Louro Freijó..." 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs" 
                      />
                    </div>

                    <div>
                      <label className="text-xs text-blue-400 font-bold block mb-1">3. Marca / Fabricante</label>
                      <input 
                        value={newMatForm.brand} 
                        onChange={e => setNewMatForm({ ...newMatForm, brand: e.target.value })} 
                        placeholder="Ex: Duratex, FGV..." 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs" 
                      />
                    </div>

                    <div>
                      <label className="text-xs text-emerald-400 font-bold block mb-1">4. Valor Unitário (R$) *</label>
                      <input 
                        type="text" 
                        value={newMatForm.unitPrice} 
                        onChange={e => setNewMatForm({ ...newMatForm, unitPrice: e.target.value })} 
                        placeholder="Ex: 198,50" 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs font-bold text-emerald-400" 
                      />
                    </div>

                    <div>
                      <label className="text-xs text-amber-400 font-bold block mb-1">5. Quantidade Desejada *</label>
                      <input 
                        type="number" 
                        min="1"
                        value={newMatForm.quantity} 
                        onChange={e => setNewMatForm({ ...newMatForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })} 
                        className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs font-bold" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {addMatMode === 'select' ? (
                  <button onClick={handleAddMaterialToList} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm w-full">
                    Adicionar à Lista de Compras
                  </button>
                ) : (
                  <button onClick={handleAddNewProductDirectlyToMaterialList} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm w-full">
                    Salvar e Adicionar à Lista
                  </button>
                )}
                <button onClick={() => setShowAddMatForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {/* Table / List of Materials */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
            <table className="w-full min-w-[750px]">
              <thead className="bg-[#1a1a1a] border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-xs font-black text-blue-400 uppercase">Produto / Material</th>
                  <th className="text-left p-4 text-xs font-black text-emerald-400 uppercase">Fornecedor Selecionado</th>
                  <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Marca</th>
                  <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Qtd</th>
                  <th className="text-right p-4 text-xs font-black text-gray-400 uppercase">Valor Unit.</th>
                  <th className="text-right p-4 text-xs font-black text-emerald-400 uppercase">Subtotal</th>
                  <th className="text-center p-4 text-xs font-black text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {materialList.map(item => (
                  <tr key={item.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {item.productName}
                      <span className="block text-[10px] text-amber-500/80 font-normal">{item.category}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        {item.selectedSupplierName}
                        {item.isCheapestSelected && (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            🏆 MENOR PREÇO
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 text-sm">{item.selectedBrand || 'Geral'}</td>
                    <td className="p-4 text-center font-bold text-amber-400">{item.quantity}</td>
                    <td className="p-4 text-right text-gray-300">R$ {item.selectedUnitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-black text-emerald-400">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteMaterialItem(item.id)} 
                        className="w-8 h-8 bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl flex items-center justify-center transition-all mx-auto"
                        title="Remover item da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {materialList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-500">
                      Sua Lista de Materiais da Compra está vazia no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ─── OVERLAY GLOBAL: CADASTRAR PRODUTO & PREÇO ──────────────────────── */}
      {showProdForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Cadastrar Produto & Primeiros Preços no Comparativo
              </h3>

              <div className="flex items-center gap-2">
                <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all shrink-0">
                  {analyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span>{analyzingImage ? 'Lendo com IA...' : '📸 Tirar Foto / PDF com IA'}</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf,.pdf" 
                    capture="environment" 
                    onChange={e => handleCapturePhoto(e, 'prod')} 
                    className="hidden" 
                  />
                </label>
                <button onClick={() => setShowProdForm(false)} className="w-9 h-9 bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

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

              <div>
                <label className="text-xs text-blue-400 font-bold block mb-1">3. Marca / Fabricante</label>
                <input 
                  value={prodForm.brand} 
                  onChange={e => setProdForm({ ...prodForm, brand: e.target.value })} 
                  placeholder="Ex: Duratex, Arauco, FGV, Häfele..." 
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm" 
                />
              </div>

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

              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#181818] p-3 rounded-2xl border border-white/5">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-300 font-bold block mb-1">Detalhamento & Especificações Técnicas (ou Extraído da Foto/PDF)</label>
                  <textarea 
                    rows={2} 
                    value={prodForm.specifications} 
                    onChange={e => setProdForm({ ...prodForm, specifications: e.target.value })} 
                    placeholder="Ex: Revestimento melamínico, espessura 15mm, calço 4 furos..." 
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs placeholder-gray-500 focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-bold block mb-1">Foto / Anexo do Produto</label>
                  {prodForm.photoUrl ? (
                    <div className="relative rounded-xl overflow-hidden h-16 border border-emerald-500/50">
                      <img src={prodForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => setProdForm({ ...prodForm, photoUrl: '' })} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="text-center p-2 text-xs text-gray-500 border border-dashed border-white/10 rounded-xl h-16 flex items-center justify-center">
                      Nenhum arquivo capturado
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleAddProductWithQuote} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm">Salvar Produto e Preço</button>
              <button onClick={() => setShowProdForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERLAY GLOBAL: COTAÇÃO DE OUTRO FORNECEDOR ──────────────────── */}
      {quoteModalProdId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white max-w-xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Adicionar Cotação de Outro Fornecedor
              </h3>

              <div className="flex items-center gap-2">
                <label className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all shrink-0">
                  {analyzingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>Foto / PDF</span>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf,.pdf" 
                    capture="environment" 
                    onChange={e => handleCapturePhoto(e, 'quote')} 
                    className="hidden" 
                  />
                </label>
                <button onClick={() => setQuoteModalProdId(null)} className="w-9 h-9 bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="text-xs text-gray-400 block mb-1">Marca / Fabricante</label>
                <input 
                  value={quoteForm.brand} 
                  onChange={e => setQuoteForm({ ...quoteForm, brand: e.target.value })} 
                  placeholder="Ex: Duratex, Arauco..." 
                  className="w-full p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm" 
                />
              </div>

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

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-300 font-bold block mb-1">Detalhamento / Observações desta Cotação</label>
                <input 
                  value={quoteForm.specifications} 
                  onChange={e => setQuoteForm({ ...quoteForm, specifications: e.target.value })} 
                  placeholder="Ex: Prazo de entrega 3 dias, inclui frete..." 
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 text-xs" 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleAddQuote} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors text-sm w-full">Salvar Cotação</button>
              <button onClick={() => setQuoteModalProdId(null)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALHAMENTO DO PRODUTO & FOTOS ──────────────────────────── */}
      {selectedProdDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold">
                  {selectedProdDetail.category}
                </span>
                <h2 className="text-2xl font-black text-white mt-2">{selectedProdDetail.productName}</h2>
                {selectedProdDetail.description && (
                  <p className="text-xs text-gray-400 mt-1">{selectedProdDetail.description}</p>
                )}
              </div>

              <button 
                onClick={() => setSelectedProdDetail(null)}
                className="w-9 h-9 bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                Detalhamento Completo das Cotações ({selectedProdDetail.quotes.length} Fornecedores)
              </h3>

              {selectedProdDetail.quotes.map((q, idx) => (
                <div key={idx} className="bg-[#181818] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{q.supplierName}</h4>
                      {q.brand && <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-md border border-blue-500/30">Marca: {q.brand}</span>}
                    </div>
                    <span className="font-black text-emerald-400 text-lg">
                      R$ {(q.unitPrice || q.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {q.photoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-white/10 h-36 bg-black">
                        <img src={q.photoUrl} alt={q.supplierName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 h-36 flex flex-col items-center justify-center text-gray-500 text-xs p-2">
                        <Camera className="w-6 h-6 mb-1 opacity-50" /> Sem foto cadastrada
                      </div>
                    )}

                    <div className="md:col-span-2 space-y-2 text-xs">
                      <p className="text-gray-400">
                        <b className="text-gray-200">Especificações / Observações:</b><br />
                        {q.specifications || 'Nenhum detalhe adicional informado.'}
                      </p>
                      {q.pricePerM2 && (
                        <p className="text-purple-300 font-bold">
                          📐 Valor por m²: R$ {q.pricePerM2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²
                        </p>
                      )}
                      <p className="text-gray-500 text-[10px]">Data da cotação: {q.updatedAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setSelectedProdDetail(null)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm"
              >
                Fechar Detalhes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL: DESCREVER POR TEXTO (IA) ───────────────────────────────── */}
      {showTextImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white w-full max-w-xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-lg text-indigo-300 flex items-center gap-2">
                  <PenLine className="w-5 h-5" /> Cadastrar por Descrição (IA)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Descreva a compra com suas palavras. A IA identifica cliente, produtos, quantidades e valores automaticamente.
                </p>
              </div>
              <button 
                onClick={() => setShowTextImportModal(false)}
                className="w-9 h-9 bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={6}
              value={textImportInput}
              onChange={e => setTextImportInput(e.target.value)}
              placeholder={'Ex: Cliente Sandra comprou 9 chapas de MDF branco a 259,64 cada, mais 20 dobradiças Häfele a 8,50 cada, fornecedor Leo Madeiras...'}
              className="w-full p-4 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />

            <div className="flex gap-3">
              <button 
                onClick={handleImportFromTextDescription}
                disabled={analyzingText}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {analyzingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analyzingText ? 'Lendo com IA...' : 'Gerar Cadastro com IA'}
              </button>
              <button 
                onClick={() => setShowTextImportModal(false)} 
                className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL VISUALIZADOR DE PDF / FOTO / TEXTO & GERADOR DA LISTA DO CLIENTE ───────── */}
      {batchImportModal && batchImportModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#111111] border border-purple-500/40 rounded-3xl p-5 shadow-2xl text-white w-full max-w-6xl h-[90vh] flex flex-col space-y-4">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  {batchImportModal.sourceType === 'text' ? <PenLine className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-lg text-white flex items-center gap-2">
                    {batchImportModal.sourceType === 'text' ? 'Descrição & Produtos Extraídos pela IA' : 'Visualizador de Orçamento & Produtos Extraídos pela IA'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {batchImportModal.sourceType === 'text' 
                      ? 'Confira sua descrição original do lado esquerdo e a lista de produtos identificados do lado direito.'
                      : 'Confira o documento original do lado esquerdo e a lista de produtos identificados do lado direito.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setBatchImportModal(null)}
                className="w-9 h-9 bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Grid Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
              
              {/* LEFT COLUMN: PDF / PHOTO VIEWER OR ORIGINAL TEXT */}
              <div className="bg-[#181818] border border-white/10 rounded-2xl p-3 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    {batchImportModal.sourceType === 'text' ? (
                      <><PenLine className="w-4 h-4 text-indigo-400" /> ✍️ Sua Descrição Original</>
                    ) : batchImportModal.isPdf ? (
                      <><FileText className="w-4 h-4 text-purple-400" /> 📄 Documento PDF Original</>
                    ) : (
                      <><Camera className="w-4 h-4 text-purple-400" /> 📸 Foto do Orçamento</>
                    )}
                  </span>
                  {batchImportModal.sourceType === 'file' && (
                    <a 
                      href={batchImportModal.fileUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      Abrir em Nova Aba <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 rounded-xl overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center relative">
                  {batchImportModal.sourceType === 'text' ? (
                    <div className="w-full h-full p-4 overflow-y-auto">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{batchImportModal.sourceText}</p>
                    </div>
                  ) : batchImportModal.isPdf ? (
                    <iframe 
                      src={batchImportModal.fileUrl} 
                      title="PDF Visualizer" 
                      className="w-full h-full border-none rounded-xl"
                    />
                  ) : (
                    <img 
                      src={batchImportModal.fileUrl} 
                      alt="Orçamento" 
                      className="w-full h-full object-contain max-h-[60vh]" 
                    />
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: PARSED ITEMS TABLE & EDITING */}
              <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 flex flex-col overflow-hidden space-y-3">
                
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <div>
                    <label className="text-xs text-amber-400 font-bold block mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Nome do Cliente *
                    </label>
                    <input 
                      value={batchImportModal.clientName} 
                      onChange={e => setBatchImportModal({ ...batchImportModal, clientName: e.target.value })}
                      placeholder="Ex: SANDRA..." 
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-blue-400 font-bold block mb-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" /> Fornecedor / Origem
                    </label>
                    <input 
                      value={batchImportModal.supplierName} 
                      onChange={e => setBatchImportModal({ ...batchImportModal, supplierName: e.target.value })}
                      placeholder="Ex: Madeireira X..." 
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#111] text-white text-xs font-bold focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center shrink-0 border-b border-white/10 pb-2 pt-1">
                  <span className="text-xs font-bold text-emerald-400">
                    Produtos Extraídos ({batchImportModal.items.length} itens)
                  </span>
                  <button 
                    onClick={() => {
                      const newIt: BatchImportItem = { productName: 'Novo Produto', category: 'MDF/MDP', brand: 'Geral', unitPrice: 0, quantity: 1 };
                      setBatchImportModal({ ...batchImportModal, items: [...batchImportModal.items, newIt] });
                    }}
                    className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item
                  </button>
                </div>

                {/* Items Editable Table */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {batchImportModal.items.map((it, i) => (
                    <div key={i} className="bg-[#111] p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="flex gap-2">
                        <input 
                          value={it.productName} 
                          onChange={e => {
                            const updated = [...batchImportModal.items];
                            updated[i].productName = e.target.value;
                            setBatchImportModal({ ...batchImportModal, items: updated });
                          }}
                          placeholder="Nome do produto" 
                          className="flex-1 p-2 rounded-lg border border-white/10 bg-[#181818] text-white text-xs font-bold"
                        />
                        <button 
                          onClick={() => {
                            const updated = batchImportModal.items.filter((_, idx) => idx !== i);
                            setBatchImportModal({ ...batchImportModal, items: updated });
                          }}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block mb-0.5">Qtd</span>
                          <input 
                            type="number"
                            min="1"
                            value={it.quantity} 
                            onChange={e => {
                              const updated = [...batchImportModal.items];
                              updated[i].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setBatchImportModal({ ...batchImportModal, items: updated });
                            }}
                            className="w-full p-2 rounded-lg border border-white/10 bg-[#181818] text-amber-400 text-xs font-bold text-center"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block mb-0.5">Valor Unit. (R$)</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={it.unitPrice} 
                            onChange={e => {
                              const updated = [...batchImportModal.items];
                              updated[i].unitPrice = parseFloat(e.target.value) || 0;
                              setBatchImportModal({ ...batchImportModal, items: updated });
                            }}
                            className="w-full p-2 rounded-lg border border-white/10 bg-[#181818] text-emerald-400 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block mb-0.5">Subtotal</span>
                          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-black text-xs text-right truncate">
                            R$ {(it.quantity * it.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info Alert */}
                <div className="shrink-0 pt-2 border-t border-white/10 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <b>Ação Automática:</b> A Lista do Cliente será criada e todos os preços serão comparados entre os fornecedores!
                  </span>
                </div>

              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="flex gap-3 justify-end shrink-0 border-t border-white/10 pt-3">
              <button 
                onClick={() => setBatchImportModal(null)}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
              >
                Cancelar
              </button>

              <button 
                onClick={handleConfirmBatchImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" /> Criar Lista de Compras do Cliente & Comparar Preços
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SuppliersPage;
