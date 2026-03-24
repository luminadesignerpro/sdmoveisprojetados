import { supabase } from '@/integrations/supabase/client';
import { analyzeImageWithGemini } from "../../services/geminiService";
import {
  Camera, Upload, Loader2, DollarSign, Ruler, Sparkles, RotateCcw,
  ChevronDown, ChevronUp, Send, Eye, Package, X, CheckCircle2,
  ArrowRight, Download, Info, LayoutDashboard, Share2
} from 'lucide-react';
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
  itens: string[];
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
  { fill: 'rgba(139, 111, 70, 0.45)', stroke: 'rgba(139, 111, 70, 0.9)', label: '#5c3d1e' },
  { fill: 'rgba(80, 60, 40, 0.4)', stroke: 'rgba(80, 60, 40, 0.85)', label: '#3b2007' },
  { fill: 'rgba(160, 130, 90, 0.45)', stroke: 'rgba(160, 130, 90, 0.9)', label: '#7a5c2e' },
  { fill: 'rgba(100, 80, 55, 0.4)', stroke: 'rgba(100, 80, 55, 0.85)', label: '#4a3010' },
  { fill: 'rgba(180, 150, 100, 0.4)', stroke: 'rgba(180, 150, 100, 0.85)', label: '#8a6020' },
  { fill: 'rgba(120, 95, 65, 0.45)', stroke: 'rgba(120, 95, 65, 0.9)', label: '#5a3a15' },
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
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
    setAnalyzing(true);
    try {
      const stockContext = stockProducts.length > 0 ? `\nMateriais em estoque: ${stockProducts.slice(0, 15).map(p => p.name).join(', ')}.` : '';
      const prompt = `Você é um especialista em marcenaria e design brasileiro. Analise esta foto de um ambiente e responda com um JSON válido contendo a análise técnica para um projeto de móveis projetados.
${stockContext}

REGRAS CRÍTICAS:
1. Identifique o tipo de ambiente (cozinha, dormitorio, sala ou banheiro).
2. Estime as dimensões em metros (largura, altura, profundidade).
3. Calcule metros lineares e quadrados aproximados com base no que é visível.
4. Liste os itens/móveis que poderiam ser projetados para este espaço.
5. Defina a complexidade (simples, media ou complexa).
6. RESPONDA APENAS O JSON, sem textos explicativos ou blocos de código extras.

Estrutura do JSON:
{
  "ambiente": "cozinha|dormitorio|sala|banheiro",
  "dimensoes": {"largura": n, "altura": n, "profundidade": n, "metrosLineares": n, "metrosQuadrados": n},
  "descricao": "breve descrição técnica",
  "simulacao": "descrição da proposta de design fotorrealista",
  "complexidade": "simples|media|complexa",
  "itens": ["item 1", "item 2"],
  "decoracaoSugestoes": ["dica 1", "dica 2", "dica 3"],
  "estiloRecomendado": "Moderno|Industrial|Clássico|Minimalista"
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
        calcularOrcamento(result);
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
    const medida = tipo === 'dormitorio' ? result.dimensoes.metrosQuadrados : result.dimensoes.metrosLineares;

    const valorEconomico = precos.min * medida;
    const valorPremium = precos.medio * medida * mult;
    const valorLuxo = precos.max * medida * mult * 1.5;

    setOrcamento({
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
      breakdown: result.itens.map(item => {
        const match = stockProducts.find(p => item.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
        return { item, valor: match ? match.price : (valorPremium / result.itens.length) * (0.8 + Math.random() * 0.4), fromStock: !!match };
      }),
      prazo: result.complexidade === 'simples' ? '15-20 dias' : result.complexidade === 'media' ? '25-35 dias' : '40-55 dias',
      observacoes: 'Estimativas baseadas em padrões de mercado. Sujeito a conferência técnica local.'
    });
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
      const label = analysis.itens[i];
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const Step = ({ num, label, current }: { num: number, label: string, current: boolean }) => (
    <div className={`flex items-center gap-2 ${current ? 'text-amber-600' : 'text-gray-400'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${current ? 'bg-amber-100 border-2 border-amber-500' : 'bg-gray-100 border border-gray-200'}`}>{num}</div>
      <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block`}>{label}</span>
      {num < 4 && <div className="w-4 h-[2px] bg-gray-200 ml-2 hidden lg:block"></div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {/* Premium Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-200">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Studio SD Móveis</h1>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em]">Intelligent Design Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 overflow-x-auto max-w-full">
          <Step num={1} label="Captura" current={currentStep === 1} />
          <Step num={2} label="Análise" current={currentStep === 2} />
          <Step num={3} label="Simulação" current={currentStep === 3} />
          <Step num={4} label="Proposta" current={currentStep === 4} />
        </div>

        <button onClick={resetar} className="text-gray-400 hover:text-red-500 transition-colors bg-gray-100 p-2 rounded-xl">
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Main Stage */}
        <div className="flex-1 overflow-auto bg-[#f1f3f5] p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]">
          {!imagePreview ? (
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl mx-auto flex items-center justify-center group relative">
                <div className="absolute inset-4 bg-amber-500 rounded-[30px] opacity-10 group-hover:opacity-20 transition-all duration-500"></div>
                <Camera className="w-12 h-12 text-amber-500 relative z-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800">Pronto para transformar?</h2>
                <p className="text-gray-500 leading-relaxed px-4">Capture uma foto do seu ambiente e deixe nossa inteligência projetar o futuro.</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-amber-200 transition-all flex items-center justify-center gap-3 group"
              >
                <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                COMEÇAR PROJETO
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </div>
          ) : (
            <div className="relative w-full max-w-5xl h-full flex items-center justify-center">
              <div className="relative rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white p-2 border-8 border-white">
                <img
                  ref={imageRef}
                  src={showAR && arImageUrl ? arImageUrl : imagePreview}
                  alt="Stage"
                  className={`max-h-[70vh] w-auto transition-all duration-700 ${analyzing ? 'blur-sm scale-[1.02]' : ''}`}
                  onLoad={() => { if (showAR && !arRendered) setTimeout(renderAR, 100); }}
                />

                {analyzing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md z-20">
                    <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
                    <p className="font-black text-amber-900 animate-pulse text-lg">PROCESSANDO AMBIENTE</p>
                    {/* FIX 2: texto corrigido para Gemini */}
                    <p className="text-[10px] text-amber-700 uppercase tracking-widest mt-2">Processando via Google Gemini Flash</p>
                  </div>
                )}

                {analysis && !analyzing && !showAR && (
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-left-4">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">{analysis.ambiente}</span>
                    </div>
                  </div>
                )}

                {showAR && (
                  <div className="absolute bottom-6 right-6 flex gap-2">
                    <button onClick={() => setShowAR(false)} className="bg-white/90 backdrop-blur text-gray-800 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg">
                      <Eye className="w-4 h-4" /> REAIS
                    </button>
                    <button onClick={renderAR} className="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg">
                      MODERNIZAR
                    </button>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>

        {/* Right: Sidebar Panel */}
        {imagePreview && (
          <aside className="w-full lg:w-[400px] bg-white border-l border-gray-200 overflow-y-auto z-20 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
            <div className="p-6 space-y-8 flex-1">
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 border-dashed">
                    <h4 className="font-black text-amber-800 text-sm flex items-center gap-2 uppercase">
                      <Info className="w-4 h-4" /> Confirmar Imagem
                    </h4>
                    <p className="text-xs text-amber-700 mt-2 leading-relaxed">A foto está nítida? A luz está boa? Isso ajuda nossa IA a medir com 98% de precisão.</p>
                  </div>
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
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <Ruler className="w-4 h-4 text-gray-400 mb-2" />
                      <p className="text-[10px] uppercase font-black text-gray-400">Dimensão</p>
                      <p className="text-lg font-black text-gray-900">{analysis.dimensoes.metrosLineares}m <span className="text-[10px] text-gray-400 font-normal">lin</span></p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <Sparkles className="w-4 h-4 text-gray-400 mb-2" />
                      <p className="text-[10px] uppercase font-black text-gray-400">Complexidade</p>
                      <p className="text-lg font-black text-gray-900 capitalize">{analysis.complexidade}</p>
                    </div>
                  </section>

                  <div className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${showAR ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-white hover:border-amber-200'}`} onClick={() => setShowAR(!showAR)}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${showAR ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">Visualização AR 2D</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Overlay de móveis sobre foto</p>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${showAR ? 'bg-amber-500' : 'bg-gray-200'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full transition-transform ${showAR ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </div>

                  {stockProducts.length > 0 && (
                    <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100">
                      <Package className="w-5 h-5 text-emerald-600" />
                      <p className="text-[10px] font-bold text-emerald-700 uppercase leading-tight">Preços sincronizados com estoque real</p>
                    </div>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Componentes Projetados</h4>
                    <div className="space-y-2">
                      {orcamento?.breakdown.map((b, i) => (
                        <div key={i} className="group relative bg-gray-50 hover:bg-amber-50 hover:border-amber-100 border border-transparent p-3 rounded-2xl transition-all">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-800">{b.item}</span>
                          </div>
                          {b.fromStock && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white">📦</div>}
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
                  <div className="grid grid-cols-1 gap-3">
                    {orcamento.opcoes.map((opcao, i) => (
                      <div key={i} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${i === 1 ? 'border-amber-500 bg-amber-50 shadow-md scale-[1.02]' : 'border-gray-100 bg-gray-50/50 hover:border-amber-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-black text-gray-900 text-sm">{opcao.nome}</h5>
                            <p className="text-[10px] text-gray-500 mt-0.5">{opcao.descricao}</p>
                          </div>
                          <p className="text-lg font-black text-amber-600">R$ {opcao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {opcao.caracteristicas.map((c, j) => (
                            <span key={j} className="text-[8px] font-bold bg-white/80 border border-gray-100 px-2 py-1 rounded-md text-gray-500 uppercase">{c}</span>
                          ))}
                        </div>
                      </div>
                    ))}
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
                    onClick={() => setCurrentStep(4)}
                    className="bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100"
                  >
                    <Share2 className="w-4 h-4" /> COMPARTILHAR
                  </button>
                </div>

                {currentStep === 4 && (
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
    </div>
  );
}

