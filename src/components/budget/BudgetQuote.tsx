import { supabase } from '@/integrations/supabase/client';
import { analyzeImageWithGemini } from "../../services/geminiService";
import ARMeasureTool from '@/components/ar/ARMeasureTool';
import ARStudio2D from '@/components/ar/ARStudio2D';
import { 
  Share2, Download, Info, Check, Eye, Trash2, Edit2, Send, CreditCard, Sparkles, Layout, Ruler, Box,
  Camera, Upload, Loader2, DollarSign, RotateCcw, ChevronDown, ChevronUp, Package, X, CheckCircle2,
  ArrowRight, LayoutDashboard, Maximize2, ChevronRight, Activity, Zap, Shield, Target
} from 'lucide-react';
import { generatePromobXML, downloadFile } from '@/services/promobService';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

interface AnalysisResult {
  ambiente: string;
  dimensoes: {
    largura: number;
    altura: number;
    profundidade: number;
    metrosLineares: number;
    metrosQuadrados: number;
  };
  descricao: string;
  simulacao: string;
  complexidade: 'simples' | 'media' | 'complexa';
  itens: any[];
  decoracaoSugestoes: string[];
  estiloRecomendado: string;
}

interface OrcamentoTier {
  nome: string;
  valor: number;
  descricao: string;
  caracteristicas: string[];
}

interface OrcamentoResult {
  opcoes: OrcamentoTier[];
  breakdown: { item: string; valor: number; fromStock: boolean }[];
  prazo: string;
  observacoes: string;
}

interface StockProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
}

const AR_POSITIONS = [
  { xRatio: 0.1, yRatio: 0.4, wRatio: 0.25, hRatio: 0.45 },
  { xRatio: 0.4, yRatio: 0.35, wRatio: 0.2, hRatio: 0.5 },
  { xRatio: 0.65, yRatio: 0.4, wRatio: 0.28, hRatio: 0.45 },
  { xRatio: 0.15, yRatio: 0.7, wRatio: 0.3, hRatio: 0.25 },
  { xRatio: 0.5, yRatio: 0.75, wRatio: 0.35, hRatio: 0.2 },
  { xRatio: 0.05, yRatio: 0.2, wRatio: 0.15, hRatio: 0.55 },
];

const AR_COLORS = [
  { fill: 'rgba(212, 175, 55, 0.12)', stroke: 'rgba(212, 175, 55, 0.85)', label: '#D4AF37' },
  { fill: 'rgba(59, 130, 246, 0.10)', stroke: 'rgba(59, 130, 246, 0.80)', label: '#3b82f6' },
  { fill: 'rgba(34, 197, 94, 0.10)', stroke: 'rgba(34, 197, 94, 0.80)', label: '#22c55e' },
  { fill: 'rgba(239, 68, 68, 0.10)', stroke: 'rgba(239, 68, 68, 0.80)', label: '#ef4444' },
  { fill: 'rgba(168, 85, 247, 0.10)', stroke: 'rgba(168, 85, 247, 0.80)', label: '#a855f7' },
];

const PRECOS = {
  cozinha: { min: 1500, medio: 2500, max: 3500 },
  dormitorio: { min: 1200, medio: 1800, max: 2500 },
  sala: { min: 800, medio: 1200, max: 1800 },
  banheiro: { min: 1500, medio: 2000, max: 3000 },
};

const MULTIPLICADORES = { simples: 1.0, media: 1.3, complexa: 1.6 };

export default function BudgetQuote() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [orcamento, setOrcamento] = useState<OrcamentoResult | null>(null);
  const [showAR, setShowAR] = useState(false);
  const [arRendered, setArRendered] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [arImageUrl, setArImageUrl] = useState<string | null>(null);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationImage, setSimulationImage] = useState<string | null>(null);
  const [showARTool, setShowARTool] = useState(false);
  const [arMeasuredDim, setArMeasuredDim] = useState<number | null>(null);
  const [showARStudio, setShowARStudio] = useState(false);
  const [studioExportedImage, setStudioExportedImage] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, { analysis: AnalysisResult; orcamento: OrcamentoResult }>>({});

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isSimulating) {
      timeout = setTimeout(() => setIsSimulating(false), 8000);
    }
    return () => clearTimeout(timeout);
  }, [isSimulating]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => { fetchStockProducts(); }, []);

  const fetchStockProducts = async () => {
    try {
      const { data } = await db.from('products').select('id, name, price, unit').order('name').limit(200);
      if (data) setStockProducts(data as StockProduct[]);
    } catch { /* products table may not exist yet */ }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setImageBase64((ev.target?.result as string).split(',')[1]);
      setAnalysis(null);
      setOrcamento(null);
      setShowAR(false);
      setArRendered(false);
      setArImageUrl(null);
      setCurrentStep(2);
    };
    reader.readAsDataURL(file);
  };

  const analisarAmbiente = async () => {
    if (!imageBase64) return;
    
    if (analysisCache[imageBase64]) {
      const cached = analysisCache[imageBase64];
      setAnalysis(cached.analysis);
      setOrcamento(cached.orcamento);
      setCurrentStep(3);
      toast({ title: '✅ Memória IA recuperada' });
      return;
    }

    setAnalyzing(true);
    try {
      const stockContext = stockProducts.length > 0 ? `\nMateriais em estoque: ${stockProducts.slice(0, 15).map(p => p.name).join(', ')}.` : '';
      const knownDimContext = arMeasuredDim ? `\nDIMENSÃO REAL MEDIDA PELA TRENA AR: ${arMeasuredDim.toFixed(2)} metros.` : '';
      const prompt = `Você é um especialista em marcenaria premium. Analise esta foto e responda com um JSON válido contendo a análise técnica.
${stockContext}${knownDimContext}

Estrutura do JSON:
{
  "ambiente": "cozinha|dormitorio|sala|banheiro",
  "dimensoes": {"largura": n, "altura": n, "profundidade": n, "metrosLineares": n, "metrosQuadrados": n},
  "descricao": "breve descrição técnica",
  "simulacao": "descrição da proposta",
  "complexidade": "simples|media|complexa",
  "itens": [{"nome": "Nome", "box": {"ymin": n, "xmin": n, "ymax": n, "xmax": n}}],
  "decoracaoSugestoes": ["dica 1", "dica 2"],
  "estiloRecomendado": "Moderno|Industrial|Clássico"
}`;

      let text = await analyzeImageWithGemini(imageBase64, prompt);
      if (!text) throw new Error('A IA retornou uma resposta vazia.');

      text = text.trim();
      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
      }

      const result: AnalysisResult = JSON.parse(text);
      setAnalysis(result);
      const orcamentoResult = calcularOrcamento(result);
      setAnalysisCache(prev => ({ ...prev, [imageBase64]: { analysis: result, orcamento: orcamentoResult } }));
      setCurrentStep(3);
      toast({ title: '✨ Visão Computacional Concluída' });

    } catch (err) {
      console.error('[ANALYSIS ERROR]', err);
      toast({ title: '❌ Falha na análise', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const calcularOrcamento = (result: AnalysisResult) => {
    const tipo = result.ambiente as keyof typeof PRECOS;
    const precos = PRECOS[tipo] || PRECOS.sala;
    const mult = MULTIPLICADORES[result.complexidade];
    
    let medida = tipo === 'dormitorio' ? result.dimensoes.metrosQuadrados : result.dimensoes.metrosLineares;
    if (arMeasuredDim && arMeasuredDim > 0) medida = arMeasuredDim;

    const valorEconomico = precos.min * medida;
    const valorPremium = precos.medio * medida * mult;
    const valorLuxo = precos.max * medida * mult * 1.5;

    const orcResult = {
      opcoes: [
        { nome: "Econômica", valor: valorEconomico, descricao: "Solução funcional focada em custo-benefício.", caracteristicas: ["MDF Standard", "Puxadores Alumínio", "Garantia 3 anos"] },
        { nome: "Premium", valor: valorPremium, descricao: "Equilíbrio entre design e durabilidade.", caracteristicas: ["MDF Texturizado", "Amortecimento", "Garantia 5 anos"] },
        { nome: "Luxury Elite", valor: valorLuxo, descricao: "Máxima sofisticação e tecnologia.", caracteristicas: ["Vidro/Laca", "Ferragens Importadas", "LED Integrado", "Garantia 10 anos"] }
      ],
      breakdown: result.itens.map(itemObj => {
        const item = typeof itemObj === 'string' ? itemObj : itemObj.nome;
        const match = stockProducts.find(p => item.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
        return { item, valor: match ? match.price : (valorPremium / result.itens.length) * (0.8 + Math.random() * 0.4), fromStock: !!match };
      }),
      prazo: result.complexidade === 'simples' ? '20 dias' : '45 dias',
      observacoes: 'Estimativas técnicas sujeitas a conferência local.'
    };
    setOrcamento(orcResult);
    return orcResult;
  };

  const renderAR = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !analysis) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const count = Math.min(analysis.itens.length, AR_POSITIONS.length);
    for (let i = 0; i < count; i++) {
      const pos = AR_POSITIONS[i];
      const color = AR_COLORS[i % AR_COLORS.length];
      const x = pos.xRatio * canvas.width;
      const y = pos.yRatio * canvas.height;
      const w = pos.wRatio * canvas.width;
      const h = pos.hRatio * canvas.height;
      ctx.fillStyle = color.fill;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 20);
      ctx.fill();
      ctx.stroke();
      ctx.font = `bold ${Math.max(16, canvas.width / 40)}px italic sans-serif`;
      const label = typeof analysis.itens[i] === 'string' ? analysis.itens[i] : analysis.itens[i].nome;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2 + 6);
    }
    setArImageUrl(canvas.toDataURL('image/jpeg', 0.9));
    setArRendered(true);
  }, [analysis]);

  useEffect(() => {
    if (showAR && !arRendered && imageRef.current?.complete) {
      setTimeout(renderAR, 150);
    }
  }, [showAR, arRendered, renderAR]);

  const resetar = () => {
    setImageBase64(null); setImagePreview(null); setAnalysis(null); setOrcamento(null);
    setShowAR(false); setArRendered(false); setArImageUrl(null); setCurrentStep(1);
    setHiddenItems([]); setSimulationImage(null); setIsSimulating(false);
    setArMeasuredDim(null); setShowARTool(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden luxury-scroll">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 blur-[150px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex-shrink-0 px-8 py-8 relative z-10 backdrop-blur-3xl bg-black/60 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6 group">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#D4AF37] to-[#b8952a] flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-all duration-500">
            <Zap className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                Studio <span className="text-[#D4AF37]">Vision</span>
            </h1>
            <p className="text-[10px] uppercase font-black tracking-[0.4em] mt-3 flex items-center gap-2 text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Intelligence Engine v4.0
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5 shadow-inner">
          <button 
            onClick={() => setCurrentStep(1)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-3 ${currentStep === 1 ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}
          >
            <Maximize2 className="w-4 h-4" /> 1. Escanear
          </button>
          <button 
            className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-3 ${currentStep >= 2 ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}
          >
            <Sparkles className="w-4 h-4" /> 2. Analisar
          </button>
          <button 
            className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-3 ${currentStep >= 4 ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}
          >
            <Package className="w-4 h-4" /> 3. Resultado
          </button>
        </div>

        <button onClick={resetar} className="w-14 h-14 bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all rounded-2xl border border-white/5 flex items-center justify-center text-gray-600">
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        <div className="flex-1 overflow-auto p-6 lg:p-12 flex flex-col items-center justify-center min-h-[400px]">
          {!imagePreview ? (
            <div className="max-w-3xl w-full text-center space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className="space-y-6">
                <h2 className="text-5xl sm:text-7xl font-black text-white leading-tight tracking-tighter uppercase italic">Engenharia Visual<br/><span className="text-[#D4AF37]">Arquitetônica</span></h2>
                <p className="text-gray-500 text-lg sm:text-xl font-medium max-w-xl mx-auto italic">
                   "A precisão é a alma do design. Use nossa rede neural Vision para mapear seu ambiente com fidelidade absoluta."
                </p>
              </div>

              <div className="grid grid-cols-1 gap-8 max-w-lg mx-auto">
                <button
                  onClick={() => setShowARTool(true)}
                  className="group relative px-12 py-10 rounded-[3rem] overflow-hidden transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] shadow-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] border-b-4 border-black/20"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-6 text-black">
                      <div className="w-16 h-16 rounded-2xl bg-black/10 flex items-center justify-center">
                        <Maximize2 className="w-10 h-10" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-3xl leading-none italic uppercase tracking-tighter">Ativar ARTrena</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-60">Realidade Aumentada v4.0</p>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-black/30 group-hover:translate-x-3 transition-transform duration-500" />
                  </div>
                </button>
                
                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.5em] text-gray-800"><span className="bg-[#0a0a0a] px-6">Ou Upload do Projeto</span></div>
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-[2rem] border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-4 group"
                >
                  <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> Processar Galeria / Câmera
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </div>
          ) : (
            <div className="relative w-full max-w-6xl h-full flex items-center justify-center animate-in zoom-in-95 duration-1000">
               <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-[#111111] bg-[#111111]">
                <img
                  ref={imageRef}
                  src={simulationImage ? simulationImage : imagePreview}
                  alt="Vision Stage"
                  className={`max-h-[65vh] w-auto transition-all duration-1000 ${analyzing ? 'blur-md scale-105' : ''}`}
                />

                {showAR && !simulationImage && analysis && (
                  <div className="absolute inset-0 z-20 pointer-events-auto p-4">
                    {analysis.itens.map((itemObj: any, i) => {
                       const item = typeof itemObj === 'string' ? itemObj : (itemObj.nome || `Item ${i}`);
                       if (hiddenItems.includes(item)) return null;
                       
                       let left = (itemObj?.box?.xmin / 1000) * 100 || 10;
                       let top = (itemObj?.box?.ymin / 1000) * 100 || 10;
                       let width = Math.max(10, ((itemObj?.box?.xmax - itemObj?.box?.xmin) / 1000) * 100) || 20;
                       let height = Math.max(10, ((itemObj?.box?.ymax - itemObj?.box?.ymin) / 1000) * 100) || 30;

                       return (
                         <div 
                           key={i}
                           className="absolute group rounded-[2rem] flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-all duration-500"
                           style={{
                             left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
                             backgroundColor: AR_COLORS[i % AR_COLORS.length].fill,
                             border: `2px solid ${AR_COLORS[i % AR_COLORS.length].stroke}`,
                             boxShadow: `0 0 40px ${AR_COLORS[i % AR_COLORS.length].fill}`,
                           }}
                         >
                            <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic">{item}</p>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                )}

                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl z-30">
                    <div className="relative mb-8">
                       <Loader2 className="w-20 h-20 text-[#D4AF37] animate-spin" />
                       <Sparkles className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="font-black text-white italic tracking-tighter text-2xl uppercase">Digitalizing Environment</p>
                    <div className="mt-4 flex gap-1.5">
                       {[...Array(3)].map((_, i) => <div key={i} className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}} />)}
                    </div>
                  </div>
                )}
               </div>
            </div>
          )}
        </div>

        {imagePreview && (
          <aside className="w-full lg:w-[480px] border-l border-white/5 bg-[#111111] overflow-y-auto relative z-20 flex flex-col luxury-scroll animate-in slide-in-from-right duration-700">
            <div className="p-8 sm:p-12 space-y-12">
               {currentStep === 2 && (
                 <div className="space-y-10">
                   <div className="bg-[#0a0a0a] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
                      <h4 className="font-black text-[#D4AF37] text-xs flex items-center gap-3 uppercase tracking-widest italic mb-4">
                        <Activity className="w-4 h-4" /> Qualidade de Escaneamento
                      </h4>
                      <p className="text-sm text-gray-500 italic leading-relaxed font-medium">Capture o ambiente em 360° para que nossa rede neural possa mapear a volumetria com precisão de CNC.</p>
                   </div>

                   <button
                    onClick={() => setShowARTool(true)}
                    className="w-full h-24 rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.02] flex items-center gap-6 px-8 hover:bg-white/5 hover:border-[#D4AF37]/40 transition-all group"
                   >
                     <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform shadow-xl">
                       <Ruler className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Aferição AR Core</p>
                       <p className="text-lg font-black text-white italic uppercase tracking-tighter">{arMeasuredDim ? `Dimensão: ${arMeasuredDim.toFixed(2)}m ✓` : 'Medir Espaço Agora'}</p>
                     </div>
                   </button>

                   <button
                    onClick={analisarAmbiente}
                    disabled={analyzing}
                    className="w-full h-20 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                   >
                     PROCESSAR COM IA <ArrowRight className="w-5 h-5" />
                   </button>
                 </div>
               )}

               {analysis && (
                 <div className="space-y-12 animate-in fade-in duration-500">
                    <header className="space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                             <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                             <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Digital Twin Verified</span>
                          </div>
                       </div>
                       <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">{analysis.ambiente}</h3>
                       <p className="text-base text-gray-500 leading-relaxed italic font-medium">{analysis.descricao}</p>
                    </header>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 group">
                          <Target className="w-5 h-5 text-[#D4AF37] mb-4 group-hover:rotate-45 transition-transform" />
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Largura Nominal</p>
                          <p className="text-2xl font-black text-white italic tracking-tighter">{analysis.dimensoes.largura}m</p>
                       </div>
                       <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 group">
                          <Zap className="w-5 h-5 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Estilo Técnico</p>
                          <p className="text-xl font-black text-white italic tracking-tighter uppercase">{analysis.estiloRecomendado}</p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] ml-2">Configurações de Orçamento</h4>
                       <div className="space-y-4">
                          {orcamento?.opcoes.map((tier, i) => (
                            <button key={i} className="w-full bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 text-left group hover:border-[#D4AF37]/40 transition-all relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full" />
                               <div className="flex justify-between items-start mb-4">
                                  <h5 className="text-lg font-black text-white italic uppercase tracking-tighter">{tier.nome}</h5>
                                  <p className="text-2xl font-black text-[#D4AF37] tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tier.valor)}</p>
                               </div>
                               <p className="text-xs text-gray-500 leading-relaxed mb-6 italic">{tier.descricao}</p>
                               <div className="flex flex-wrap gap-2">
                                  {tier.caracteristicas.map((c, j) => (
                                    <span key={j} className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 text-gray-400 rounded-full border border-white/5">
                                      {c}
                                    </span>
                                  ))}
                               </div>
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                       <button 
                         onClick={() => {
                           const xml = generatePromobXML({ name: clientName || 'Projeto SD', value: orcamento?.opcoes[1].valor });
                           downloadFile(`${clientName || 'projeto'}-promob.xml`, xml);
                           toast({ title: '📦 XML Promob Gerado' });
                         }}
                         className="w-full h-18 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-white/10 transition-all italic"
                       >
                          <Download className="w-5 h-5" /> Exportar para Desktop (Promob)
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </aside>
        )}
      </main>

      {/* AR Trena Overlay Component */}
      {showARTool && (
        <ARMeasureTool 
          onClose={() => setShowARTool(false)} 
          onMeasured={(dim) => { setArMeasuredDim(dim); setShowARTool(false); if (!imagePreview) fileInputRef.current?.click(); }} 
        />
      )}

      {/* AR Studio 2D Overlay Component */}
      {showARStudio && imagePreview && (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-500">
           <ARStudio2D 
             imageUrl={imagePreview} 
             onClose={() => setShowARStudio(false)} 
             onExport={(url) => { setStudioExportedImage(url); setSimulationImage(url); setShowARStudio(false); }}
           />
        </div>
      )}
    </div>
  );
}
