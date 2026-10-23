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
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(212,175,55,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-4xl w-full text-center z-10 animate-in fade-in zoom-in duration-700">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-2xl shadow-amber-500/20">
            <div className="w-full h-full rounded-[30px] bg-black flex items-center justify-center">
              <Camera className="w-12 h-12 text-amber-500" />
            </div>
          </div>
        </div>

        <h2 className="text-5xl font-black text-white mb-4 tracking-tighter">
          Studio <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">AR Profissional</span>
        </h2>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          O módulo de projetagem 3D agora é integrado diretamente com o nosso aplicativo nativo de Realidade Aumentada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-left hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
              <Ruler className="w-5 h-5 text-amber-500" />
            </div>
            <h4 className="text-white font-bold text-lg mb-2">Medição Real</h4>
            <p className="text-gray-500 text-sm">Capture dimensões milimétricas usando a trena infravermelha do seu celular.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-left hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
              <Box className="w-5 h-5 text-amber-500" />
            </div>
            <h4 className="text-white font-bold text-lg mb-2">Móveis 3D</h4>
            <p className="text-gray-500 text-sm">Posicione módulos da SD Móveis em tempo real no ambiente do cliente.</p>
          </div>
        </div>

        <button
          onClick={() => {
            window.location.href = "sdmoveisar://open";
            toast({
              title: "🚀 Conectando ao Studio AR",
              description: "Certifique-se de que o app SD Móveis AR está instalado."
            });
          }}
          className="group relative px-12 py-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xl uppercase tracking-widest shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:shadow-[0_0_70px_rgba(212,175,55,0.6)] hover:scale-105 transition-all duration-500"
        >
          <span className="relative z-10 flex items-center gap-4">
            ABRIR CÂMERA AR AGORA
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </span>
        </button>

        <p className="mt-8 text-gray-600 text-xs uppercase tracking-widest font-bold">
          Sincronização Automática via Supabase Cloud
        </p>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}
