import { supabase } from '@/integrations/supabase/client';
import { analyzeImageWithGemini } from "../../services/geminiService";
import ARMeasureTool from '@/components/ar/ARMeasureTool';
import ARStudio2D from '@/components/ar/ARStudio2D';
import { 
  Share2, Download, Info, Check, Eye, Trash2, Edit2, Send, CreditCard, Sparkles, Layout, Ruler, Box,
  Camera, Upload, Loader2, DollarSign, RotateCcw, ChevronDown, ChevronUp, Package, X, CheckCircle2,
  ArrowRight, LayoutDashboard, Maximize2, ChevronRight
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
  estoqueCalculado?: string;
  blenderScript?: string;
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
  { fill: 'rgba(245, 200, 100, 0.12)', stroke: 'rgba(212, 160, 50, 0.85)', label: '#7a5c00' },
  { fill: 'rgba(100, 180, 255, 0.10)', stroke: 'rgba(60, 140, 230, 0.80)', label: '#1a4f8c' },
  { fill: 'rgba(130, 220, 140, 0.10)', stroke: 'rgba(60, 170, 80, 0.80)', label: '#1a6b30' },
  { fill: 'rgba(255, 150, 100, 0.10)', stroke: 'rgba(220, 100, 50, 0.80)', label: '#8b3500' },
  { fill: 'rgba(200, 130, 255, 0.10)', stroke: 'rgba(160, 80, 220, 0.80)', label: '#5a1a8c' },
  { fill: 'rgba(255, 220, 100, 0.10)', stroke: 'rgba(200, 170, 40, 0.80)', label: '#6b5a00' },
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
    
    // Check cache first to ensure consistency for same image
    if (analysisCache[imageBase64]) {
      const cached = analysisCache[imageBase64];
      setAnalysis(cached.analysis);
      setOrcamento(cached.orcamento);
      setCurrentStep(3);
      toast({ title: '✅ Análise recuperada do cache local' });
      return;
    }

    setAnalyzing(true);
    try {
      const stockContext = stockProducts.length > 0 ? `\nMateriais em estoque: ${stockProducts.slice(0, 15).map(p => p.name).join(', ')}.` : '';
      const knownDimContext = arMeasuredDim ? `\nDIMENSÃO REAL MEDIDA PELA TRENA AR: ${arMeasuredDim.toFixed(2)} metros (use exatamente este valor como largura ou metros lineares — não estime).` : '';
      const prompt = `Você é o Agente Antigravity, especialista em marcenaria e design brasileiro. Analise esta foto de um ambiente e responda com um JSON válido contendo a análise técnica para um projeto de móveis projetados.
${stockContext}${knownDimContext}

REGRAS CRÍTICAS DE PRECISÃO E VALIDAÇÃO:
1. Identifique o tipo de ambiente (cozinha, dormitorio, sala ou banheiro).
2. Dimensões: Sempre que receber medidas da Trena AR, execute uma validação de integridade. Verifique se as paredes formam ângulos de 90°. Se a medida for 595mm a 605mm, assuma 600mm para fins de modulação padrão, mas mantenha o desconto de 5mm para folga de montagem no orçamento.
3. Se houver uma DIMENSÃO REAL fornecida acima, use-a como prioridade absoluta (NÃO ESTIME SE JÁ EXISTIR).
4. Do Ponto ao Orçamento: Calcule o consumo de material baseando-se no aproveitamento de chapa (Nesting). Seja específico. Exemplo: "Isso requer 1 chapa de MDF 15mm cortada, 4m de fita de borda e 8 parafusos". Consulte os valores unitários e disponibilidade.
5. O Script de Projeção (Blender): Gere um script Python conciso usando \`bpy.ops.mesh.primitive_cube_add\` passando as dimensões exatas que vieram da trena. Configure o "Pivô" do móvel no ponto inicial do clique da câmera.
6. Itens: Liste em ordem horária a partir da esquerda. Forneça bounding box (ymin,xmin,ymax,xmax entre 0-1000).
7. RESPONDA APENAS O JSON, sem textos explicativos.

Estrutura do JSON:
{
  "ambiente": "cozinha|dormitorio|sala|banheiro",
  "dimensoes": {"largura": n, "altura": n, "profundidade": n, "metrosLineares": n, "metrosQuadrados": n},
  "estoqueCalculado": "Ex: 2 chapas MDF 15mm, 10m fita de borda, 15 parafusos...",
  "blenderScript": "import bpy\\n# Script de projecao...",
  "descricao": "breve descrição técnica",
  "simulacao": "descrição da proposta",
  "complexidade": "simples|media|complexa",
  "itens": [{"nome": "Nome", "box": {"ymin": n, "xmin": n, "ymax": n, "xmax": n}}],
  "decoracaoSugestoes": ["dica 1", "dica 2"],
  "estiloRecomendado": "Moderno|Industrial|Clássico"
}`;

      // FIX 1: let em vez de const para permitir reatribuição
      let text = await analyzeImageWithGemini(imageBase64, prompt);
      console.log('[BUDGET] Gemini Response received:', text);

      if (!text) throw new Error('A IA retornou uma resposta vazia.');

      text = text.trim();
      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
      }

      try {
        const result: AnalysisResult = JSON.parse(text);
        console.log('[BUDGET] Parsed result:', result);
        setAnalysis(result);
        const orcamentoResult = calcularOrcamento(result);
        
        // Save to cache
        setAnalysisCache(prev => ({ ...prev, [imageBase64]: { analysis: result, orcamento: orcamentoResult } }));
        
        setCurrentStep(3);
        toast({ title: '✅ Análise de IA concluída' });
      } catch (parseErr) {
        console.error('[BUDGET] JSON Parse Error:', parseErr, 'Text:', text);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const result: AnalysisResult = JSON.parse(jsonMatch[0]);
            setAnalysis(result);
            calcularOrcamento(result);
            setCurrentStep(3);
            toast({ title: '✅ Análise de IA concluída (recuperada)' });
            return;
          } catch (e) { }
        }
        throw new Error('Falha ao processar resposta da IA. O formato retornado é inválido.');
      }

    } catch (err) {
      console.error('[ANALYSIS ERROR]', err);
      toast({ title: '❌ Falha na análise', description: err instanceof Error ? err.message : 'Verifique sua conexão ou chave de API.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const calcularOrcamento = (result: AnalysisResult) => {
    const tipo = result.ambiente as keyof typeof PRECOS;
    const precos = PRECOS[tipo] || PRECOS.sala;
    const mult = MULTIPLICADORES[result.complexidade];
    
    // Priority: 1. AR Measured Dimension, 2. AI Estimated Dimension
    let medida = tipo === 'dormitorio' ? result.dimensoes.metrosQuadrados : result.dimensoes.metrosLineares;
    if (arMeasuredDim && arMeasuredDim > 0) {
      medida = arMeasuredDim;
    }

    const valorEconomico = precos.min * medida;
    const valorPremium = precos.medio * medida * mult;
    const valorLuxo = precos.max * medida * mult * 1.5;

    const orcResult = {
      opcoes: [
        {
          nome: "Econômica",
          valor: valorEconomico,
          descricao: "Solução funcional com excelente custo-benefício.",
          caracteristicas: ["MDF Branco Standard", "Puxadores perfil alumínio", "Corrediças metálicas", "Garantia 3 anos"]
        },
        {
          nome: "Premium",
          valor: valorPremium,
          descricao: "O equilíbrio perfeito entre design e durabilidade.",
          caracteristicas: ["MDF Cores/Texturizado", "Amortecimento em todas as portas", "Puxadores design", "Garantia 5 anos"]
        },
        {
          nome: "Luxo / High-End",
          valor: valorLuxo,
          descricao: "O máximo em sofisticação e tecnologia para seu lar.",
          caracteristicas: ["Frentes em vidro/laca", "Ferragens importadas (Blum/Hettich)", "Iluminação LED integrada", "Garantia 10 anos"]
        }
      ],
      breakdown: result.itens.map(itemObj => {
        const item = typeof itemObj === 'string' ? itemObj : itemObj.nome;
        const match = stockProducts.find(p => item.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
        return { item, valor: match ? match.price : (valorPremium / result.itens.length) * (0.8 + Math.random() * 0.4), fromStock: !!match };
      }),
      prazo: result.complexidade === 'simples' ? '15-20 dias' : result.complexidade === 'media' ? '25-35 dias' : '40-55 dias',
      observacoes: 'Estimativas baseadas em padrões de mercado. Sujeito a conferência técnica local.'
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
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
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
      ctx.roundRect(x, y, w, h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.font = `bold ${Math.max(14, canvas.width / 45)}px sans-serif`;
      const label = typeof analysis.itens[i] === 'string' ? analysis.itens[i] : analysis.itens[i].nome;
      const tw = ctx.measureText(label).width + 20;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(x + w / 2 - tw / 2, y + h / 2 - 15, tw, 30, 6);
      ctx.fill();
      ctx.fillStyle = color.label;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h / 2 + 6);
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

  const handleSimulateFinish = async (finish: string) => {
    if (!analysis) return;
    setIsSimulating(true);
    setSimulationImage(null);
    toast({ title: "🎨 Iniciando Simulação...", description: `Gerando imagem renderizada com acabamento ${finish}...` });
    try {
      // Import the dynamic service
      const { generateRealisticRender } = await import('@/services/geminiService');
      const renderedUrl = await generateRealisticRender({
        room: analysis.ambiente,
        finish: finish,
      });
      if (renderedUrl) {
         setSimulationImage(renderedUrl);
         toast({ title: "✅ Simulação Concluída!" });
      } else {
         toast({ title: "⚠️ Aviso", description: "O renderizador não retornou uma imagem, tente novamente." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "❌ Erro na Simulação", description: "Não foi possível gerar a simulação agora.", variant: "destructive" });
    } finally {
      setIsSimulating(false);
    }
  };

  const Step = ({ num, label, current }: { num: number, label: string, current: boolean }) => (
    <div className={`flex items-center gap-2 ${current ? 'text-amber-600' : 'text-gray-400'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${current ? 'bg-amber-100 border-2 border-amber-500' : 'bg-gray-100 border border-gray-200'}`}>{num}</div>
      <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block`}>{label}</span>
      {num < 5 && <div className="w-4 h-[2px] bg-gray-200 ml-2 hidden lg:block"></div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      <header className="flex-shrink-0 px-8 py-6 relative z-10 backdrop-blur-xl bg-black/40 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-full mx-auto">
        <div className="flex items-center gap-5 group">
          <div className="w-14 h-14 rounded-[22px] flex items-center justify-center transform group-hover:rotate-6 transition-all duration-500 shadow-[0_0_30px_rgba(212,175,55,0.2)]" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
            <Maximize2 className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none group-hover:translate-x-1 transition-transform">Projetagem SD Elite</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] mt-2 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.8)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }}></span>
              Workflow de Alta Fidelidade
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/10 shadow-inner">
          <button 
            onClick={() => setCurrentStep(1)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${currentStep === 1 ? 'bg-amber-500/10 text-amber-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Maximize2 className="w-3.5 h-3.5" /> 1. Medir
          </button>
          <button 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${currentStep >= 2 ? 'bg-amber-500/10 text-amber-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> 2. Projetar
          </button>
          <button 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${currentStep >= 4 ? 'bg-amber-500/10 text-amber-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Download className="w-3.5 h-3.5" /> 3. Promob
          </button>
        </div>

        <button onClick={resetar} className="text-gray-500 hover:text-red-500 transition-colors bg-white/5 p-3 rounded-2xl border border-white/10">
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sticky mobile CTA — shows when image is loaded but not yet analyzed */}
        {imagePreview && currentStep === 2 && !analyzing && !analysis && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'linear-gradient(to top, #0a0a0a 60%, transparent)', pointerEvents: 'auto' }}>
            <button
              onClick={analisarAmbiente}
              className="w-full py-5 rounded-3xl font-black text-base flex items-center justify-center gap-3 transition-all"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)', color: '#000', boxShadow: '0 8px 32px rgba(212,175,55,0.5)' }}
            >
              <Sparkles className="w-5 h-5" /> ANALISAR COM IA
            </button>
          </div>
        )}
        {imagePreview && analyzing && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'linear-gradient(to top, #0a0a0a 60%, transparent)' }}>
            <div className="w-full py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
              <Loader2 className="w-5 h-5 animate-spin" /> Analisando ambiente...
            </div>
          </div>
        )}
        {/* Left: Main Stage */}
        <div className="flex-1 overflow-auto p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]" style={{ background: '#0a0a0a' }}>
          {!imagePreview ? (
            <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="space-y-6">
                <h2 className="text-6xl font-black text-white leading-tight tracking-tighter">Precisão é <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Profissionalismo</span></h2>
                <p className="text-gray-400 text-xl leading-relaxed max-w-lg mx-auto italic font-medium">
                  "Todo grande projeto de marcenaria começa com uma medida perfeita. Use a ARTrena para capturar o ambiente agora."
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                <button
                  onClick={() => setShowARTool(true)}
                  className="group relative px-10 py-8 rounded-[32px] overflow-hidden transition-all duration-500 hover:scale-[1.05] active:scale-[0.95] shadow-[0_20px_50px_rgba(212,175,55,0.3)] bg-gradient-to-br from-[#D4AF37] to-[#F5E583]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-5 text-black">
                      <div className="w-14 h-14 rounded-2xl bg-black/10 flex items-center justify-center">
                        <Maximize2 className="w-8 h-8" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-2xl leading-none">ABRIR ARTRENA</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-60">Medir em Realidade Aumentada</p>
                      </div>
                    </div>
                    <ChevronRight className="w-7 h-7 text-black/40 group-hover:translate-x-2 transition-transform" />
                  </div>
                </button>
                
                {arMeasuredDim > 0 && (
                  <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between animate-in zoom-in duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Medida: {arMeasuredDim.toFixed(2)}m</p>
                        <button onClick={() => setArMeasuredDim(0)} className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest mt-0.5">Refazer Medição</button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 rounded-2xl bg-white text-black font-black text-xs hover:bg-amber-100 transition-all shadow-xl"
                    >
                      USAR FOTO
                    </button>
                  </div>
                )}

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em] text-gray-600"><span className="bg-[#0a0a0a] px-4">Ou Prossiga Sem Medida</span></div>
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 rounded-3xl border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:bg-white/5 transition-all flex items-center justify-center gap-3"
                >
                  <Upload className="w-4 h-4" /> Upload de Imagem
                </button>
              </div>
              
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </div>
          ) : (
            <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
              <div className="relative rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white p-2 border-8 border-white">
                <img
                  ref={imageRef}
                  src={simulationImage ? simulationImage : imagePreview}
                  alt="Stage"
                  className={`max-h-[70vh] w-auto transition-all duration-700 ${analyzing ? 'blur-sm scale-[1.02]' : ''}`}
                />

                {/* OVERLAY AR 2D ITERATIVO — sem escurecer a imagem de fundo */}
                {showAR && !simulationImage && analysis && (
                  <div className="absolute inset-2 z-20 pointer-events-auto">
                    {analysis.itens.map((itemObj: any, i) => {
                       const item = typeof itemObj === 'string' ? itemObj : (itemObj.nome || `Item ${i}`);
                       const isHidden = hiddenItems.includes(item);
                       
                       let left = 10, top = 10, width = 20, height = 30;
                       if (typeof itemObj === 'object' && itemObj.box) {
                         left = (itemObj.box.xmin / 1000) * 100;
                         top = (itemObj.box.ymin / 1000) * 100;
                         width = Math.max(8, ((itemObj.box.xmax - itemObj.box.xmin) / 1000) * 100);
                         height = Math.max(8, ((itemObj.box.ymax - itemObj.box.ymin) / 1000) * 100);
                       } else {
                         const pos = AR_POSITIONS[i % AR_POSITIONS.length];
                         left = pos.xRatio * 100;
                         top = pos.yRatio * 100;
                         width = pos.wRatio * 100;
                         height = pos.hRatio * 100;
                       }

                       const color = AR_COLORS[i % AR_COLORS.length];

                       if (isHidden) {
                          return (
                            <div 
                              key={i}
                              className="absolute rounded-2xl transition-all duration-700 pointer-events-none"
                              style={{
                                left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
                                backdropFilter: 'blur(8px) brightness(1.02) saturate(0.6)',
                                WebkitbackdropFilter: 'blur(8px) brightness(1.02) saturate(0.6)',
                                backgroundColor: 'rgba(240,245,250,0.15)',
                                border: '2px dashed rgba(150,160,180,0.45)',
                                zIndex: 10
                              }}
                            />
                          );
                       }

                       return (
                         <div 
                           key={i}
                           className="absolute group rounded-2xl flex items-end justify-center cursor-pointer hover:z-30 transition-all duration-300"
                           style={{
                             left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
                             backgroundColor: color.fill,
                             border: `2.5px solid ${color.stroke}`,
                             boxShadow: `0 4px 24px ${color.fill.replace('0.4', '0.3')}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                           }}
                         >
                           <span className="bg-white/90 backdrop-blur-sm text-[10px] font-black px-2 py-1 rounded-lg shadow-md pointer-events-none group-hover:scale-105 transition-transform text-center mx-1 mb-1.5 line-clamp-2 max-w-full" style={{color: color.label}}>
                             {item}
                           </span>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setHiddenItems(prev => [...prev, item]); }}
                             className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 border-2 border-white text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg"
                             title="Remover objeto (Smart Erase)"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       );
                    })}
                  </div>
                )}

                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md z-30 rounded-3xl">
                    <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
                    <p className="font-black text-amber-900 animate-pulse text-lg">PROCESSANDO AMBIENTE</p>
                    <p className="text-[10px] text-amber-700 uppercase tracking-widest mt-2">via Google Gemini Flash</p>
                  </div>
                )}

                {isSimulating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 rounded-3xl">
                    <Sparkles className="w-12 h-12 text-amber-400 animate-pulse mb-4" />
                    <p className="font-black text-white animate-pulse text-lg uppercase">Gerando Simulação</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-2">{analysis?.ambiente} · acabamento premium</p>
                  </div>
                )}

                {analysis && !analyzing && !showAR && !simulationImage && (
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                    <div className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 animate-in slide-in-from-left-4 text-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">{analysis.estiloRecomendado} · {analysis.ambiente}</span>
                    </div>
                  </div>
                )}

                {/* MOBILE FLOATING AR TAPE BUTTON (Problem 1 Fix) */}
                {currentStep === 2 && !analyzing && (
                  <div className="absolute inset-x-0 bottom-8 flex justify-center z-40 lg:hidden px-6 animate-in slide-in-from-bottom-8 duration-500">
                    <button
                      onClick={() => setShowARTool(true)}
                      className={`w-full max-w-sm rounded-[24px] border-4 p-5 flex items-center justify-center gap-4 transition-all shadow-2xl ${
                        arMeasuredDim
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-emerald-500/40'
                          : 'border-amber-400 bg-amber-500 text-white shadow-amber-500/40 animate-bounce'
                      }`}
                    >
                      <Ruler className="w-6 h-6" />
                      <div className="text-left">
                        <p className="font-black text-lg leading-none">{arMeasuredDim ? `Medida: ${arMeasuredDim.toFixed(2)}m ✓` : 'Medir com Trena AR'}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">{arMeasuredDim ? 'Clique para ajustar' : 'Abra a câmera e meça o ambiente'}</p>
                      </div>
                    </button>
                  </div>
                )}

                {(showAR || simulationImage) && (
                  <div className="absolute bottom-4 right-4 flex gap-2 z-30">
                    <button 
                      onClick={() => { setShowAR(false); setSimulationImage(null); }} 
                      className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg hover:bg-white transition-colors border border-gray-100"
                    >
                      <Eye className="w-3.5 h-3.5" /> FOTO REAL
                    </button>
                    {!simulationImage && hiddenItems.length > 0 && (
                      <button 
                        onClick={() => setHiddenItems([])}
                        className="bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-600 transition-colors"
                      >
                        RESTAURAR
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar Panel */}
        {imagePreview && (
          <aside className="w-full lg:w-[400px] border-l overflow-y-auto z-20 flex flex-col" style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="p-6 space-y-8 flex-1">
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 border-dashed">
                    <h4 className="font-black text-amber-800 text-sm flex items-center gap-2 uppercase">
                      <Info className="w-4 h-4" /> Confirmar Imagem
                    </h4>
                    <p className="text-xs text-amber-700 mt-2 leading-relaxed">A foto está nítida? A luz está boa? Isso ajuda nossa IA a medir com 98% de precisão.</p>
                  </div>

                  {/* Trena AR */}
                  <button
                    onClick={() => setShowARTool(true)}
                    className={`w-full rounded-3xl border-2 p-4 flex items-center gap-4 transition-all ${
                      arMeasuredDim
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-dashed border-gray-200 bg-gray-50/50 hover:border-amber-300 hover:bg-amber-50 text-gray-600'
                    }`}
                  >
                    <div className={`p-3 rounded-2xl ${ arMeasuredDim ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm">{arMeasuredDim ? `Medida: ${arMeasuredDim.toFixed(2)}m ✓` : 'Medir com Trena AR'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-tight opacity-60 mt-0.5">{arMeasuredDim ? 'Clique para remensurar' : 'Opcional — via câmera ARCore'}</p>
                    </div>
                  </button>

                  <button
                    onClick={analisarAmbiente}
                    disabled={analyzing}
                    className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black tracking-wide flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200"
                  >
                    PROSSEGUIR COM ANÁLISE <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {analysis && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <header>
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Digital Twin Scan</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">{analysis.ambiente.charAt(0).toUpperCase() + analysis.ambiente.slice(1)}</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">{analysis.descricao}</p>
                  </header>

                  <section className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                      <Ruler className="w-4 h-4 text-gray-400 mb-2" />
                      <p className="text-[10px] uppercase font-black text-gray-400">Dimensões Extraídas</p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-sm font-black text-gray-900">{analysis.dimensoes.largura}m</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter mr-1">L</span>
                        <span className="text-xs text-gray-400">×</span>
                        <span className="text-sm font-black text-gray-900 ml-1">{analysis.dimensoes.profundidade}m</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter mr-1">P</span>
                        <span className="text-xs text-gray-400">×</span>
                        <span className="text-sm font-black text-gray-900 ml-1">{analysis.dimensoes.altura}m</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">A</span>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-125 transition-transform duration-500 mr-[-5%] mb-[-10%]">
                        <Camera className="w-16 h-16 text-gray-900" />
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <Sparkles className="w-4 h-4 text-gray-400 mb-2" />
                      <p className="text-[10px] uppercase font-black text-gray-400">Complexidade</p>
                      <p className="text-lg font-black text-gray-900 capitalize">{analysis.complexidade}</p>
                    </div>
                  </section>

                  {/* AR Studio 2D — botão principal */}
                  <button
                    onClick={() => setShowARStudio(true)}
                    className="w-full p-4 rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:bg-amber-50 transition-all flex items-center gap-4 group"
                  >
                    <div className="p-3 rounded-2xl bg-amber-500 text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900">Abrir AR Studio 2D</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Pintar paredes · Adicionar móveis · Apagar itens</p>
                    </div>
                    {studioExportedImage && (
                      <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ Editado</span>
                    )}
                  </button>

                  {stockProducts.length > 0 && (
                    <div className="bg-emerald-50 p-4 rounded-2xl flex flex-col gap-2 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-emerald-600" />
                        <p className="text-[10px] font-bold text-emerald-700 uppercase leading-tight">Cálculo de Estoque Real</p>
                      </div>
                      {analysis.estoqueCalculado && (
                        <p className="text-xs text-emerald-800 bg-emerald-100/50 p-3 rounded-xl border border-emerald-200/50 italic">
                          "{analysis.estoqueCalculado}"
                        </p>
                      )}
                    </div>
                  )}

                  {analysis.blenderScript && (
                    <div className="bg-blue-50 p-4 rounded-2xl flex flex-col gap-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Box className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Script Blender</span>
                        </div>
                        <button 
                          onClick={() => downloadFile('projecao.py', analysis.blenderScript || '')}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                        >
                          BAIXAR SCRIPT
                        </button>
                      </div>
                      <p className="text-xs text-blue-800/80 leading-relaxed">
                        Execute este script no Blender para gerar a malha primitiva (primitive_cube_add) exatamente na dimensão medida pela Trena AR.
                      </p>
                    </div>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Componentes Projetados</h4>
                    <div className="space-y-2">
                      {orcamento?.breakdown.map((b, i) => (
                        <div key={i} className={`group relative hover:bg-amber-50 hover:border-amber-100 border p-3 rounded-2xl transition-all cursor-default ${hiddenItems.includes(b.item) ? 'bg-red-50/50 border-red-100 opacity-60' : 'bg-gray-50 border-transparent'}`}>
                          <div className="flex justify-between items-center text-sm">
                            <span className={`font-bold ${hiddenItems.includes(b.item) ? 'text-red-800 line-through' : 'text-gray-800'}`}>{b.item}</span>
                            {!hiddenItems.includes(b.item) ? (
                               <button onClick={() => setHiddenItems(prev => [...prev, b.item])} className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                 <X className="w-4 h-4" />
                               </button>
                            ) : (
                               <button onClick={() => setHiddenItems(prev => prev.filter(item => item !== b.item))} className="text-emerald-500 hover:text-emerald-600 text-xs font-bold transition-colors">
                                 ADICIONAR
                               </button>
                            )}
                          </div>
                          {b.fromStock && !hiddenItems.includes(b.item) && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-xl">BAIXO CUSTO</div>}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-black uppercase text-amber-600 tracking-widest pl-1 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Sugestões de Design & Decor
                    </h4>
                    <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50">
                      <p className="text-[10px] font-black text-amber-800 uppercase mb-2">Estilo Recomendado: {analysis.estiloRecomendado}</p>
                      <ul className="space-y-2">
                        {analysis.decoracaoSugestoes.map((sug, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {orcamento && (
              <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-4">
                <div className="space-y-3 mb-6">
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Escolha seu nível de acabamento</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-[28px] space-y-3">
                  <div className="flex items-center gap-3 text-blue-600">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight">Exportar Medidas</h4>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Gerar Pacote para Promob Plus</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700/70 font-medium leading-relaxed">Baixe as dimensões exatas e a simulação para importar no seu Promob no PC.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={async () => {
                        if (!orcamento) return;
                        try {
                          await saveStudioMeasurement({
                            projectName: `Projeto_${new Date().getTime()}`,
                            customerName: clientName || "Cliente",
                            ambiente: analysis?.ambiente,
                            dimensions: {
                              width: orcamento.dimensoes.largura,
                              height: orcamento.dimensoes.altura,
                              depth: orcamento.dimensoes.profundidade
                            },
                            items: orcamento.breakdown.map(i => ({ name: i.item, type: 'Furniture' })),
                            imageUrl: imagePreview || '',
                            simulationUrl: studioExportedImage || undefined
                          });
                          toast({ title: "✅ Salvo no seu Workspace!", description: "As medidas já estão no Dashboard do seu PC." });
                        } catch (err) {
                          toast({ variant: "destructive", title: "Erro ao salvar", description: "Verifique sua conexão." });
                        }
                      }}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Layout className="w-5 h-5" /> SALVAR NO MEU WORKSPACE
                    </button>
                    
                    <button
                      onClick={() => {
                        if (!orcamento) return;
                        const xml = generatePromobXML({
                          projectName: `Projeto_${new Date().getTime()}`,
                          customerName: clientName || "Cliente Studio",
                          dimensions: {
                            width: orcamento.dimensoes.largura,
                            height: orcamento.dimensoes.altura,
                            depth: orcamento.dimensoes.profundidade
                          },
                          items: orcamento.breakdown.map(i => ({ name: i.item, type: 'Furniture' })),
                          imageUrl: imagePreview || ''
                        });
                        downloadFile(xml, `projeto-promob.xml`, 'text/xml');
                      }}
                      className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-2xl font-black text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> BAIXAR XML (MANUAL)
                    </button>
                  </div>
                </div>
                    {orcamento.opcoes.map((opcao, i) => {
                       // Discount calculation based on hidden items
                       const discountFactor = hiddenItems.length > 0 ? (1 - (hiddenItems.length / (orcamento.breakdown.length || 1)) * 0.4) : 1;
                       const finalValue = opcao.valor * discountFactor;
                       return (
                         <div key={i} className={`p-4 rounded-3xl border-2 transition-all group ${i === 1 ? 'border-amber-500 bg-amber-50 shadow-md scale-[1.02]' : 'border-gray-100 bg-gray-50/50 hover:border-amber-200'}`}>
                           <div className="flex justify-between items-start mb-3">
                             <div>
                               <h5 className="font-black text-gray-900 text-base">{opcao.nome}</h5>
                               <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed pr-2">{opcao.descricao}</p>
                             </div>
                             <div className="text-right flex-shrink-0">
                               {hiddenItems.length > 0 && <p className="text-[10px] text-red-500 line-through mb-0.5">R$ {opcao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>}
                               <p className="text-xl font-black text-amber-600">R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                             </div>
                           </div>
                           <div className="flex flex-wrap gap-1.5 mb-4">
                             {opcao.caracteristicas.map((c, j) => (
                               <span key={j} className="text-[8px] font-bold bg-white/80 border border-gray-100 px-2 py-1 rounded-md text-gray-500 uppercase">{c}</span>
                             ))}
                           </div>
                           <button 
                             onClick={() => handleSimulateFinish(opcao.nome)}
                             className={`w-full py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors ${i === 1 ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                           >
                             <Camera className="w-4 h-4" /> 
                             SIMULAR VISUAL DESTE ACABAMENTO
                           </button>
                         </div>
                       );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4 px-1">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Prazo Logístico</p>
                    <p className="text-sm font-black text-amber-600 italic">{orcamento.prazo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Garantia SD</p>
                    <p className="text-xs font-bold text-gray-700">Até 10 anos*</p>
                  </div>
                </div>

                {/* PROMINENT AR STUDIO ENTRY (Problem 5 Fix) */}
                {/* PROMINENT AR STUDIO ENTRY (Mobile-Sticky Fix) */}
                <div className="lg:static sticky bottom-4 z-40 bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-[28px] text-white shadow-2xl shadow-amber-500/40 space-y-3 animate-in fade-in zoom-in duration-700 mx-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight">Personalizar no Studio</h4>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Etapa 4: Studio 2D/3D</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowARStudio(true); setCurrentStep(4); }}
                    className="w-full bg-white text-amber-600 py-4 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Eye className="w-5 h-5" /> ABRIR STUDIO PROFISSIONAL
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* FIX 3: botão BAIXAR com toast quando AR não ativo */}
                  <button
                    onClick={() => {
                      if (!arImageUrl) {
                        toast({ title: '⚠️ Ative a Visualização AR primeiro para baixar' });
                        return;
                      }
                      const a = document.createElement('a');
                      a.href = arImageUrl;
                      a.download = 'SD-Projeto.jpg';
                      a.click();
                    }}
                    disabled={!arImageUrl}
                    title={!arImageUrl ? 'Ative o AR para habilitar' : 'Baixar imagem'}
                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" /> BAIXAR
                  </button>
                    <button
                      onClick={() => setCurrentStep(5)}
                      className="bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100"
                    >
                      <Share2 className="w-4 h-4" /> COMPARTILHAR
                    </button>
                  </div>

                {currentStep === 5 && (
                  <div className="pt-4 border-t border-gray-100 space-y-3 animate-in slide-in-from-bottom-4">
                    <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="NOME DO CLIENTE" className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-amber-500" />
                    <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="WHATSAPP (EX: 8599...)" className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-amber-500" />
                    <button
                      onClick={() => {
                        const phone = clientPhone.replace(/\D/g, '');
                        const msg = `🏠 *SD Móveis Projetados*\n📍 Ambiente: ${analysis?.ambiente}\n🛋️ Estilo: ${analysis?.estiloRecomendado}\n💰 Proposta Premium: R$ ${orcamento.opcoes[1].valor.toLocaleString('pt-BR')}\n⏱️ Prazo: ${orcamento.prazo}`;
                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Send className="w-4 h-4" /> ENVIAR PROPOSTA NO WHATSAPP
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </main>

      <div className="fixed -z-10 top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Trena AR Modal */}
      {showARTool && (
        <ARMeasureTool
          onClose={() => setShowARTool(false)}
          onConfirmMeasurement={(val, dims) => {
            setArMeasuredDim(val);
            if (analysis) {
              const largura = dims ? dims.width : val;
              const profundidade = dims ? dims.depth : analysis.dimensoes.profundidade;
              const altura = dims ? dims.height : analysis.dimensoes.altura;

              let scriptPython = analysis.blenderScript;
              let novoEstoque = analysis.estoqueCalculado;

              if (dims) {
                scriptPython = `import bpy\n# Script AR SD Moveis\nbpy.ops.mesh.primitive_cube_add(size=1)\nobj = bpy.context.active_object\nobj.scale = (${largura}, ${profundidade}, ${altura})\nobj.location = (${largura/2}, ${profundidade/2}, ${altura/2})`;
                const areaFrontal = largura * altura;
                const qtdChapas = Math.ceil(((areaFrontal * 2.5) * 1.15) / 5.04);
                const qtdCorredicas = Math.ceil(altura / 0.5);
                novoEstoque = `AR Detectado: ${qtdChapas} chapas (MDF + 15% sobra), ${qtdCorredicas} par(es) de corrediça, dobradiças incluídas.`;
              }

              setAnalysis({
                ...analysis,
                dimensoes: {
                  ...analysis.dimensoes,
                  largura: largura,
                  profundidade: profundidade,
                  altura: altura,
                  metrosLineares: largura
                },
                blenderScript: scriptPython,
                estoqueCalculado: novoEstoque
              });

              if (orcamento && dims) {
                const newOrc = { ...orcamento };
                const mdfPreco = stockProducts.find((p: any) => p.name.toUpperCase().includes('MDF'))?.price || 280;
                const areaFrontal = largura * altura;
                const qtdChapas = Math.ceil(((areaFrontal * 2.5) * 1.15) / 5.04);
                const custoBasico = (qtdChapas * mdfPreco) + (Math.ceil(altura / 0.5) * 45) + (4 * 15);
                const valorFinal = custoBasico * 1.4;

                newOrc.opcoes[0].valor = valorFinal;
                newOrc.opcoes[1].valor = valorFinal * 1.25;
                newOrc.opcoes[2].valor = valorFinal * 1.5;
                setOrcamento(newOrc);
              }
            }
            setShowARTool(false);
            if (dims) {
              toast({ title: `🎯 Projeto Confirmado!`, description: `L: ${(dims.width*1000).toFixed(0)}mm | A: ${(dims.height*1000).toFixed(0)}mm | P: ${(dims.depth*1000).toFixed(0)}mm. Orçamento recalculado.` });
            } else {
              toast({ title: `✅ Medida salva: ${val.toFixed(2)}m`, description: 'A dimensão real foi aplicada ao projeto.' });
            }
          }}
        />
      )}

      {/* AR Studio 2D Modal */}
      {showARStudio && imagePreview && (
        <ARStudio2D
          imagePreview={studioExportedImage || imagePreview}
          detectedItems={analysis?.itens || []}
          onClose={() => setShowARStudio(false)}
          onExport={(dataUrl) => {
            setStudioExportedImage(dataUrl);
            setShowARStudio(false);
            toast({ title: '✅ Imagem exportada!', description: 'A simulação foi salva.' });
          }}
          ambiente={analysis?.ambiente}
          projectName={clientName ? `Projeto_${clientName}` : undefined}
          initialDimensions={analysis?.dimensoes}
        />
      )}
    </div>
  );
}

