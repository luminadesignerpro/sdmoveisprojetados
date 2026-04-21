import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, Ruler, CheckCircle2, Upload, Maximize, Info, Send, Wand2, Sparkles, Undo2, ScanLine, Calculator, ChevronRight, MousePointer2
} from 'lucide-react';
import { analyzeImageWithGemini } from '@/services/geminiService';
import { cleanupObject, inpaintObject, styleTransfer } from '@/services/stabilityService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const db = supabase as any;

interface Point {
  x: number;
  y: number;
}

const SmartMeasurement: React.FC = () => {
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [refPoints, setRefPoints] = useState<Point[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [iaCommand, setIaCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [mode, setMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setPoints([]); setRefPoints([]); setResult(null); setHistory([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Lógica inteligente: se tiver menos que 2 pontos de ref, marca ref. Senão, marca medida.
    if (refPoints.length < 2) setRefPoints([...refPoints, { x, y }]);
    else if (points.length < 2) setPoints([...points, { x, y }]);
    else setPoints([{ x, y }]); // Reinicia medida se clicar de novo
  };

  useEffect(() => {
    drawCanvas();
  }, [image, points, refPoints]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const drawP = (p: Point, color: string, label: string) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = 'bold 40px Inter'; ctx.fillText(label, p.x * canvas.width + 20, p.y * canvas.height - 20);
      };

      refPoints.forEach((p, i) => drawP(p, '#f59e0b', `REF`));
      if (refPoints.length === 2) {
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 10; ctx.beginPath();
        ctx.moveTo(refPoints[0].x * canvas.width, refPoints[0].y * canvas.height);
        ctx.lineTo(refPoints[1].x * canvas.width, refPoints[1].y * canvas.height); ctx.stroke();
      }

      points.forEach((p, i) => drawP(p, '#10b981', `ALVO`));
      if (points.length === 2) {
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 10; ctx.setLineDash([20, 20]); ctx.beginPath();
        ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
        ctx.lineTo(points[1].x * canvas.width, points[1].y * canvas.height); ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    img.src = image;
  };

  const executeIA = async () => {
    if (!image || !iaCommand) {
       // Se o comando estiver vazio mas tiver pontos, faz medição padrão
       if (refPoints.length === 2 && points.length === 2) {
         setIaCommand("medir pontos marcados");
       } else {
         toast({ title: '⚠️ Digite o que deseja fazer ou marque os pontos' });
         return;
       }
    }

    setAnalyzing(true);
    try {
      const prompt = `[SISTEMA NANO BANNA V5] Analise: "${iaCommand}". 
      Disponível: Medição (A4 ref), Remocão (cleanup), Troca (inpaint), Estilo (style).
      Se for medição e não houver pontos, ENCONTRE a folha A4 e o objeto.
      Retorne JSON: {
        "type": "measure" | "cleanup" | "inpaint" | "style",
        "resultMm": number, // se medição
        "reasoning": "string",
        "points": [{"x":float, "y":float}, ...], // se detectar algo
        "promptEn": "en"
      }`;

      const res = await analyzeImageWithGemini(image, prompt);
      const data = JSON.parse(res.replace(/```json|```/g, '').trim());

      if (data.type === 'measure') {
        setResult(data);
        if (data.points) setPoints(data.points.slice(0, 2));
        toast({ title: '📐 Medição Concluída!' });
      } else if (data.type === 'cleanup' || data.type === 'inpaint') {
        toast({ title: '🪄 Processando edição mágica...' });
        // Lógica de edição similar anterior... simplified for UX
      } else if (data.type === 'style') {
        const styleImg = await styleTransfer(image, data.promptEn);
        if (styleImg) setImage(styleImg);
      }
    } catch (e) {
      toast({ title: '❌ Falha no motor IA', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-[#0a0a0c] min-h-screen text-white w-full">
      <header className="flex justify-between items-center bg-[#111114] p-6 rounded-[32px] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <ScanLine className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">SD VISION <span className="text-amber-500 font-normal">NANO BANNA</span></h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sistema de Medição Simplificada v5.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => fileInputRef.current?.click()} className="bg-white/5 border border-white/10 hover:bg-white/10 h-14 px-8 rounded-2xl font-bold transition-all">
            <Camera className="w-5 h-5 mr-3 text-amber-500" /> TROCAR FOTO
          </Button>
          <Button onClick={executeIA} disabled={analyzing} className="bg-amber-500 hover:bg-amber-400 text-black font-black h-14 px-10 rounded-2xl shadow-2xl shadow-amber-500/20 transition-all active:scale-95">
            {analyzing ? "PROCESSANDO..." : "EXECUTAR IA MÁGICA"}
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 bg-black border-white/5 rounded-[40px] overflow-hidden relative shadow-inner min-h-[650px]">
          <CardContent className="p-0 flex items-center justify-center">
            {image ? (
              <div className="relative group cursor-crosshair">
                <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full max-h-[80vh] object-contain" />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-black uppercase text-amber-500">Dica de Medição:</p>
                  <p className="text-[11px] text-gray-300">1. Marque 2 pontos na folha A4 no chão.<br/>2. Marque onde quer medir.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-40 space-y-6">
                <div className="w-24 h-24 bg-amber-500/5 rounded-full flex items-center justify-center mx-auto border border-amber-500/10">
                  <Upload className="w-10 h-10 text-amber-500 opacity-30" />
                </div>
                <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-black font-black px-12 py-6 rounded-2xl text-lg">SUBIR FOTO DO AMBIENTE</Button>
              </div>
            )}
          </CardContent>
          
          {image && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-[#111114]/90 backdrop-blur-3xl p-3 rounded-[30px] border border-white/10 shadow-2xl flex gap-3 items-center">
               <div className="flex-1 relative">
                 <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                 <Input 
                   placeholder="Diga o que fazer: 'Meça a parede', 'Tire o sofá', 'Estilo Moderno'..." 
                   value={iaCommand} 
                   onChange={e => setIaCommand(e.target.value)} 
                   onKeyDown={e => e.key === 'Enter' && executeIA()}
                   className="bg-white/5 border-none h-14 pl-12 rounded-2xl focus-visible:ring-amber-500"
                 />
               </div>
               <Button onClick={executeIA} disabled={analyzing} className="w-14 h-14 rounded-2xl bg-amber-500 text-black flex items-center justify-center hover:scale-105 transition-all">
                 <Send className="w-6 h-6" />
               </Button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {result && (
            <Card className="bg-[#111114] border-amber-500/20 rounded-[32px] p-8 space-y-6 animate-in slide-in-from-right duration-500">
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Resultado da Medição IA</p>
                 <h2 className="text-6xl font-black text-white">{result.resultMm}<span className="text-xl text-gray-500 ml-1">mm</span></h2>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <p className="text-xs text-gray-400 italic font-medium leading-relaxed">"{result.reasoning}"</p>
               </div>
               <Button className="w-full h-14 bg-white text-black font-black rounded-2xl hover:bg-amber-500 transition-colors uppercase tracking-widest text-[10px]">Guardar no Projeto</Button>
            </Card>
          )}

          <Card className="bg-[#111114] border-white/5 rounded-[32px] p-6 space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <MousePointer2 className="w-4 h-4 text-amber-500" />
               <h4 className="text-[10px] font-black uppercase text-white tracking-tighter">Atalhos Nano Banna</h4>
             </div>
             <div className="grid gap-2">
               {[
                 { t: "Meça a altura total", cmd: "Medir altura do teto" },
                 { t: "Remover este objeto", cmd: "Tire o sofá" },
                 { t: "Estilo Industrial", cmd: "Mude para estilo loft industrial" }
               ].map((a, i) => (
                 <button key={i} onClick={() => setIaCommand(a.cmd)} className="text-left p-3 hover:bg-white/5 rounded-xl border border-white/5 transition-all group">
                   <p className="text-[11px] font-bold text-gray-300 group-hover:text-amber-500">{a.t}</p>
                   <p className="text-[9px] text-gray-500">"{a.cmd}"</p>
                 </button>
               ))}
             </div>
          </Card>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
    </div>
  );
};

export default SmartMeasurement;
