import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Ruler, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  Maximize, 
  Info,
  ChevronRight,
  Calculator,
  ScanLine,
  ChevronDown,
  Send,
  Wand2,
  Brush,
  Eraser,
  Sparkles,
  Undo2,
  Plus
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
  const [settingRef, setSettingRef] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [hoverPos, setHoverPos] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Magic Mode States
  const [mode, setMode] = useState<'MEASURE' | 'MAGIC'>('MEASURE');
  const [maskPoints, setMaskPoints] = useState<Point[]>([]);
  const [iaCommand, setIaCommand] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicHistory, setMagicHistory] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await db.from('clients').select('id, name').order('name');
    setClients(data || []);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setPoints([]);
        setRefPoints([]);
        setSettingRef(true);
        setResult(null);
        setMaskPoints([]);
        setMagicHistory([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
      screenX: clientX,
      screenY: clientY
    };
  };

  const handlePointerDown = (e: any) => {
    const pos = getPos(e);
    if (!pos) return;
    setIsDragging(true);
    setHoverPos({ x: pos.x, y: pos.y });
    updateZoomCanvas(pos.x, pos.y);
  };

  const handlePointerMove = (e: any) => {
    const pos = getPos(e);
    if (!pos) return;
    setHoverPos({ x: pos.x, y: pos.y });
    if (isDragging) {
      updateZoomCanvas(pos.x, pos.y);
    }
  };

  const handlePointerUp = (e: any) => {
    const pos = getPos(e);
    if (!pos || !isDragging) return;

    if (mode === 'MAGIC') {
      setMaskPoints([...maskPoints, { x: pos.x, y: pos.y }]);
      setIsDragging(false);
      setHoverPos(null);
      return;
    }

    if (settingRef) {
      if (refPoints.length < 2) setRefPoints([...refPoints, { x: pos.x, y: pos.y }]);
      else setRefPoints([{ x: pos.x, y: pos.y }]);
    } else {
      if (points.length < 2) setPoints([...points, { x: pos.x, y: pos.y }]);
      else setPoints([{ x: pos.x, y: pos.y }]);
    }
    
    setIsDragging(false);
    setHoverPos(null);
  };

  const updateZoomCanvas = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const zoomCanvas = document.createElement('canvas'); // Temporary zoom canvas logic
    if (!canvas) return;

    // Use current logic but simplified for zoom
  };

  useEffect(() => {
    drawCanvas();
  }, [image, points, refPoints, settingRef, maskPoints, mode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const drawPoint = (p: Point, color: string, label: string) => {
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Inter';
        ctx.fillText(label, p.x * canvas.width + 20, p.y * canvas.height - 20);
      };

      if (refPoints.length > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 8;
        refPoints.forEach((p, i) => drawPoint(p, '#f59e0b', `R${i+1}`));
        if (refPoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(refPoints[0].x * canvas.width, refPoints[0].y * canvas.height);
          ctx.lineTo(refPoints[1].x * canvas.width, refPoints[1].y * canvas.height);
          ctx.stroke();
        }
      }

      if (points.length > 0) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 8;
        points.forEach((p, i) => drawPoint(p, '#10b981', `M${i+1}`));
        if (points.length === 2) {
          ctx.beginPath();
          ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
          ctx.lineTo(points[1].x * canvas.width, points[1].y * canvas.height);
          ctx.stroke();
        }
      }

      if (mode === 'MAGIC' && maskPoints.length > 0) {
        ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        maskPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
          else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        });
        if (maskPoints.length > 2) ctx.closePath();
        ctx.fill();
        ctx.stroke();
        maskPoints.forEach(p => {
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };
    img.src = image;
  };

  const handleAnalyze = async () => {
    if (!image || refPoints.length < 2 || points.length < 2) {
      toast({ title: '⚠️ Marque a referência e a medida', variant: 'destructive' });
      return;
    }
    setAnalyzing(true);
    try {
      const prompt = `[SISTEMA DE METROLOGIA SD V4] Analise a imagem e as marcações. R1-R2 é 297mm. M1-M2 é o alvo. Retorne JSON: {"measureMm": number, "confidence": number, "roomType": string, "reasoning": string}`;
      const response = await analyzeImageWithGemini(image, prompt);
      const data = JSON.parse(response.replace(/```json|```/g, '').trim());
      setResult(data);
      toast({ title: '✅ Metrologia V4 Ativa' });
    } catch (e) {
      toast({ title: '❌ Erro na Metrologia IA', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMagicAction = async () => {
    if (!image || !iaCommand) {
      toast({ title: '⚠️ Digite um comando', variant: 'destructive' });
      return;
    }
    setIsMagicLoading(true);
    try {
      if (maskPoints.length < 3) {
        toast({ title: '🔍 Analisando Cena Global...', description: 'IA localizando objetos...' });
        const analysisPrompt = `Analise o comando: "${iaCommand}". Identifique objetos e retorne JSON: {"globalAction": "style" | "none", "stylePrompt": "en", "localActions": [{"type": "cleanup"|"inpaint", "label": "obj", "points": [{"x":float,"y":float},...], "prompt": "en"}]}`;
        const res = await analyzeImageWithGemini(image, analysisPrompt);
        const analysis = JSON.parse(res.replace(/```json|```/g, '').trim());
        
        if (analysis.globalAction === 'style') {
          const styleImg = await styleTransfer(image, analysis.stylePrompt);
          if (styleImg) { setImage(styleImg); setMagicHistory([styleImg, ...magicHistory]); }
          setIsMagicLoading(false); return;
        }
        
        let currentImage = image;
        for (const action of (analysis.localActions || [])) {
          const mCanvas = document.createElement('canvas');
          const tmpImg = new Image(); tmpImg.src = currentImage; await new Promise(r => tmpImg.onload = r);
          mCanvas.width = tmpImg.width; mCanvas.height = tmpImg.height;
          const mctx = mCanvas.getContext('2d')!;
          mctx.fillStyle = 'black'; mctx.fillRect(0, 0, mCanvas.width, mCanvas.height);
          mctx.fillStyle = 'white'; mctx.beginPath();
          action.points.forEach((p: any, i: number) => { if (i === 0) mctx.moveTo(p.x * mCanvas.width, p.y * mCanvas.height); else mctx.lineTo(p.x * mCanvas.width, p.y * mCanvas.height); });
          mctx.closePath(); mctx.fill();
          const mBase64 = mCanvas.toDataURL('image/png');
          const resImg = action.type === 'cleanup' ? await cleanupObject({ image: currentImage, mask: mBase64 }) : await inpaintObject(currentImage, mBase64, action.prompt);
          if (resImg) currentImage = resImg;
        }
        setImage(currentImage); setMagicHistory([currentImage, ...magicHistory]);
      } else {
        const mCanvas = document.createElement('canvas');
        const main = canvasRef.current!;
        mCanvas.width = main.width; mCanvas.height = main.height;
        const mctx = mCanvas.getContext('2d')!;
        mctx.fillStyle = 'black'; mctx.fillRect(0, 0, mCanvas.width, mCanvas.height);
        mctx.fillStyle = 'white'; mctx.beginPath();
        maskPoints.forEach((p, i) => { if (i === 0) mctx.moveTo(p.x * mCanvas.width, p.y * mCanvas.height); else mctx.lineTo(p.x * mCanvas.width, p.y * mCanvas.height); });
        mctx.closePath(); mctx.fill();
        const mBase64 = mCanvas.toDataURL('image/png');
        const isClean = iaCommand.toLowerCase().match(/tire|remover|exclua/);
        const resImg = isClean ? await cleanupObject({ image, mask: mBase64 }) : await inpaintObject(image, mBase64, iaCommand);
        if (resImg) { setImage(resImg); setMagicHistory([resImg, ...magicHistory]); }
      }
      setMaskPoints([]); setIaCommand('');
      toast({ title: '✅ Alteração Nano Banna Concluída' });
    } catch (e) {
      toast({ title: '❌ Falha na IA Kreativ', variant: 'destructive' });
    } finally {
      setIsMagicLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-[#0a0a0c] min-h-screen text-white w-full overflow-auto">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ScanLine className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">SD VISION <span className="text-amber-500">ENGINEERING V4</span></h1>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Protocolo Nano Banna Ativado</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <Button onClick={() => setMode('MEASURE')} className={`h-11 px-6 rounded-xl font-bold transition-all ${mode === 'MEASURE' ? 'bg-amber-500 text-black shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            <Ruler className="w-4 h-4 mr-2" /> MEDIÇÃO
          </Button>
          <Button onClick={() => setMode('MAGIC')} className={`h-11 px-6 rounded-xl font-bold transition-all ${mode === 'MAGIC' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white'}`}>
            <Wand2 className="w-4 h-4 mr-2" /> MAGIC KREATIV
          </Button>
        </div>

        <Button onClick={() => fileInputRef.current?.click()} className="bg-white/5 border border-white/10 h-12 px-6 rounded-xl font-bold hover:bg-white/10 transition-all">
          <Camera className="w-4 h-4 mr-2 text-amber-500" /> SUBSTITUIR
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-4">
          <Card className="bg-[#111114] border-white/5 rounded-[32px] overflow-hidden shadow-2xl relative">
            <CardContent className="p-0 bg-black min-h-[600px] flex items-center justify-center">
              {!image ? (
                 <div className="p-20 text-center space-y-6">
                    <Upload className="w-16 h-16 text-amber-500 mx-auto opacity-20" />
                    <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-black font-black px-10 py-6 rounded-2xl text-lg">SUBIR FOTO DO AMBIENTE</Button>
                 </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center" ref={containerRef}>
                  <canvas ref={canvasRef} onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} className="max-w-full max-h-[75vh] object-contain cursor-crosshair" />
                  
                  {mode === 'MEASURE' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
                      <Button onClick={() => setSettingRef(true)} className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase ${settingRef ? 'bg-amber-500 text-black' : 'bg-transparent text-gray-400'}`}>Referência (A4)</Button>
                      <Button onClick={() => setSettingRef(false)} className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase ${!settingRef ? 'bg-green-500 text-white' : 'bg-transparent text-gray-400'}`}>Medida Alvo</Button>
                    </div>
                  )}

                  {mode === 'MAGIC' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl space-y-3">
                      <div className="flex gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-2xl border border-white/20 shadow-2xl">
                        <Input placeholder="Comando IA: 'tire o sofá', 'estilo luxuoso'..." value={iaCommand} onChange={e => setIaCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMagicAction()} className="bg-transparent border-none text-sm h-12 focus-visible:ring-0" />
                        <Button onClick={handleMagicAction} disabled={isMagicLoading} className="bg-indigo-600 h-12 px-6 rounded-xl font-black">{isMagicLoading ? <Sparkles className="animate-spin" /> : <Wand2 />}</Button>
                      </div>
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setMaskPoints([])} className="text-white/40 hover:text-red-400 text-[9px] uppercase font-bold"><Eraser className="w-3 h-3 mr-1" /> Limpar</Button>
                        {magicHistory.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setImage(magicHistory[1] || magicHistory[0]); setMagicHistory(magicHistory.slice(1)); }} className="text-white/40 hover:text-white text-[9px] uppercase font-bold"><Undo2 className="w-3 h-3 mr-1" /> Desfazer</Button>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {result && mode === 'MEASURE' && (
            <Card className="bg-[#111114] border-amber-500/20 rounded-[32px] p-6 space-y-6">
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Medida IA</p>
                <h2 className="text-5xl font-black text-white">{result.measureMm}<span className="text-xl text-gray-500 ml-1">mm</span></h2>
              </div>
              <div className="space-y-4">
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${result.confidence}%` }} /></div>
                 <p className="text-xs text-gray-500 italic">"{result.reasoning}"</p>
              </div>
              <Button onClick={() => toast({ title: 'Sincronizado!' })} className="w-full h-14 bg-white text-black font-black rounded-xl hover:bg-amber-500 transition-all">SALVAR NO PROJETO</Button>
            </Card>
          )}

          <Card className="bg-[#111114] border-white/5 rounded-[32px] p-6 space-y-6 opacity-60">
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-500">Dicas Nano Banna</h4>
            <div className="space-y-4 text-[11px] text-gray-400">
              <div className="flex gap-3"><Info className="w-4 h-4 text-amber-500 shrink-0" /> <p>Fale naturalmente: "Troque o ar condicionado por um quadro"</p></div>
              <div className="flex gap-3"><Maximize className="w-4 h-4 text-amber-500 shrink-0" /> <p>Mantenha o celular estável para medições milimétricas.</p></div>
            </div>
          </Card>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
    </div>
  );
};

export default SmartMeasurement;
