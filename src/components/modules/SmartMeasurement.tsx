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
  Undo2
} from 'lucide-react';
import { analyzeImageWithGemini } from '@/services/geminiService';
import { cleanupObject, inpaintObject, generativeFill, styleTransfer } from '@/services/stabilityService';
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
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
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
    const zoomCanvas = zoomCanvasRef.current;
    if (!canvas || !zoomCanvas) return;

    const ctx = zoomCanvas.getContext('2d');
    if (!ctx) return;

    const zoomFactor = 3;
    const size = 150;
    zoomCanvas.width = size;
    zoomCanvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(
      canvas,
      x * canvas.width - (size / (2 * zoomFactor)),
      y * canvas.height - (size / (2 * zoomFactor)),
      size / zoomFactor,
      size / zoomFactor,
      0, 0, size, size
    );

    // Crosshair
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
    ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
    ctx.stroke();
    
    // Border
    ctx.strokeStyle = '#ffffffaa';
    ctx.strokeRect(0, 0, size, size);
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

      // Draw Reference Line (Yellow)
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

      // Draw Measurement Line (Green)
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
      // Draw Mask (Red Overlay)
      if (mode === 'MAGIC' && maskPoints.length > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        maskPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
          else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        });
        if (maskPoints.length > 2) ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw points for clarity
        maskPoints.forEach(p => {
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };
    img.src = image;
  };

  const handleMagicAction = async () => {
    if (!image || !iaCommand) {
      toast({ title: '⚠️ Digite um comando', variant: 'destructive' });
      return;
    }

    setIsMagicLoading(true);
    try {
      // 1. Analisar cena com Gemini para detectar objetos se não houver máscara manual
      let actions = [];
      
      if (maskPoints.length < 3) {
        toast({ title: '🔍 Analisando cena...', description: 'Aguarde enquanto a IA localiza os elementos...' });
        const analysisPrompt = `[SISTEMA NANO BANNA]
        Analise o comando: "${iaCommand}".
        Você deve identificar quais objetos na imagem precisam ser alterados/removidos.
        Retorne um JSON com o seguinte formato:
        {
          "globalAction": "style" | "none", 
          "stylePrompt": "english prompt if style",
          "localActions": [
            {
              "type": "cleanup" | "inpaint",
              "label": "objeto a ser removido",
              "points": [{"x": 0.12, "y": 0.5}, ...], // MÍNIMO 4 PONTOS para fechar o polígono
              "prompt": "english description for replacement"
            }
          ]
        }
        Coordenadas são normais (0.0 a 1.0). Se for apenas remover, use 'cleanup'.`;

        const analysisRes = await analyzeImageWithGemini(image, analysisPrompt);
        const analysis = JSON.parse(analysisRes.replace(/```json|```/g, '').trim());
        
        if (analysis.globalAction === 'style') {
          toast({ title: '🎨 Aplicando novo estilo global...' });
          const styleImg = await styleTransfer(image, analysis.stylePrompt);
          if (styleImg) {
            setMagicHistory([styleImg, ...magicHistory]);
            setImage(styleImg);
            toast({ title: '✅ Estilo renovado!' });
          }
          setIsMagicLoading(false);
          return;
        }
        
        actions = analysis.localActions || [];
      } else {
        // Máscara manual existente
        actions = [{
          type: iaCommand.toLowerCase().match(/tire|remover|exclua/) ? 'cleanup' : 'inpaint',
          points: maskPoints,
          prompt: iaCommand
        }];
      }

      if (actions.length === 0) {
        toast({ title: '❓ Não consegui localizar os objetos. Tente marcar manualmente.' });
        setIsMagicLoading(false);
        return;
      }

      let currentImage = image;

      // Executar ações em série
      for (const action of actions) {
        toast({ title: `🪄 Processando: ${action.label || 'seleção'}...` });
        
        const maskCanvas = document.createElement('canvas');
        const imgObj = new Image();
        imgObj.src = currentImage;
        await new Promise(r => imgObj.onload = r);
        
        maskCanvas.width = imgObj.width;
        maskCanvas.height = imgObj.height;
        const mctx = maskCanvas.getContext('2d')!;
        mctx.fillStyle = 'black';
        mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        mctx.fillStyle = 'white';
        mctx.beginPath();
        action.points.forEach((p, i) => {
          if (i === 0) mctx.moveTo(p.x * maskCanvas.width, p.y * maskCanvas.height);
          else mctx.lineTo(p.x * maskCanvas.width, p.y * maskCanvas.height);
        });
        mctx.closePath();
        mctx.fill();
        
        const maskBase64 = maskCanvas.toDataURL('image/png');
        
        let resultImg: string | null = null;
        if (action.type === 'cleanup') {
          resultImg = await cleanupObject({ image: currentImage, mask: maskBase64 });
        } else {
          resultImg = await inpaintObject(currentImage, maskBase64, action.prompt);
        }

        if (resultImg) currentImage = resultImg;
      }

      setMagicHistory([currentImage, ...magicHistory]);
      setImage(currentImage);
      setMaskPoints([]);
      setIaCommand('');
      toast({ title: '✅ Todas as alterações foram concluídas!' });

    } catch (e: any) {
      console.error(e);
      toast({ title: '❌ Falha no Processamento IA', description: "Tente um comando mais simples ou marque o objeto manualmente.", variant: 'destructive' });
    } finally {
      setIsMagicLoading(false);
    }
  };

  const saveMeasurement = async () => {
    if (!result || !selectedClientId) return;
    try {
      const canvas = canvasRef.current;
      const finalImage = canvas?.toDataURL('image/jpeg', 0.9);
      const fileName = `smart_measure_${Date.now()}.jpg`;
      const blob = await (await fetch(finalImage!)).blob();
      
      await supabase.storage.from('ar-screenshots').upload(fileName, blob);
      const { data: { publicUrl } } = supabase.storage.from('ar-screenshots').getPublicUrl(fileName);

      await db.from('ar_measurements').insert({
        client_id: selectedClientId,
        title: `📐 Medição Exata - ${result.roomType}`,
        data: {
          measurements: `${result.measureMm} mm`,
          confidence: result.confidence,
          ai_logic: result.reasoning
        },
        screenshot_url: publicUrl,
        total_value: 0
      });

      toast({ title: '🚀 Sincronizado com Sucesso' });
      setResult(null);
      setImage(null);
    } catch (e: any) {
      toast({ title: '❌ Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-[#0a0a0c] min-h-screen text-white w-full overflow-auto selection:bg-amber-500/30">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">SD VISION <span className="text-amber-500 font-normal">ENGINEERING</span></h1>
          </div>
          <p className="text-gray-500 uppercase text-[9px] tracking-[0.4em] font-black">Sistema de Medição de Alta Precisão v4.0</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
           
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
             <Button 
               onClick={() => setMode('MEASURE')} 
               className={`h-12 px-6 rounded-xl font-bold transition-all ${mode === 'MEASURE' ? 'bg-amber-500 text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
             >
               <Ruler className="w-4 h-4 mr-2" /> MEDIÇÃO
             </Button>
             <Button 
               onClick={() => setMode('MAGIC')} 
               className={`h-12 px-6 rounded-xl font-bold transition-all ${mode === 'MAGIC' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-400 hover:text-white'}`}
             >
               <Wand2 className="w-4 h-4 mr-2" /> MAGIC EDIT (KREATIV)
             </Button>
           </div>

           <Button onClick={() => fileInputRef.current?.click()} className="bg-white/5 border border-white/10 hover:bg-white/10 h-14 px-8 rounded-2xl font-bold transition-all">
             <Camera className="w-5 h-5 mr-3 text-amber-500" /> SUBSTITUIR
           </Button>
           
           {image && mode === 'MEASURE' && (
             <Button onClick={handleAnalyze} disabled={analyzing} className="bg-amber-500 hover:bg-amber-400 text-black font-black h-14 px-10 rounded-2xl shadow-2xl shadow-amber-500/20 active:scale-95 transition-all">
               {analyzing ? (
                 <span className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                   CALIBRANDO...
                 </span>
               ) : (
                 <span className="flex items-center gap-2">PROCESSAR PRECISÃO <ChevronRight className="w-5 h-5" /></span>
               )}
             </Button>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Canvas Interativo */}
        <div className="xl:col-span-9 space-y-4">
          <Card className="bg-[#0f0f12] border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative group">
            <CardContent className="p-0 flex items-center justify-center min-h-[600px] bg-black">
              {!image ? (
                <div className="text-center p-20 space-y-6">
                  <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                    <Upload className="w-10 h-10 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Primeiro, a Imagem do Cozinha/Quarto</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                      Coloque uma folha A4 no chão próximo à parede. A IA usará ela para calibrar a escala real.
                    </p>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-black font-black px-12 py-6 rounded-2xl text-lg hover:scale-105 transition-all">
                    ESCOLHER ARQUIVO
                  </Button>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none" ref={containerRef}>
                  <canvas 
                    ref={canvasRef} 
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    className="max-w-full max-h-[80vh] object-contain cursor-none"
                  />
                  
                  {/* Lupa de Precisão */}
                  {hoverPos && (
                    <div 
                      className="absolute pointer-events-none z-50 rounded-full border-4 border-amber-500 overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.5)]"
                      style={{ 
                        left: `${hoverPos.x * 100}%`, 
                        top: `${hoverPos.y * 100}%`,
                        transform: 'translate(-50%, -150%)',
                        width: '150px',
                        height: '150px'
                      }}
                    >
                      <canvas ref={zoomCanvasRef} />
                    </div>
                  )}

                  {/* Custom Cursor */}
                  {!hoverPos && image && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                       <p className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30 animate-pulse">
                         Toque na imagem para marcar pontos
                       </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {/* Floating Control Bar */}
            {image && mode === 'MEASURE' && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-3xl p-2 rounded-[24px] border border-white/10 shadow-2xl">
                <Button 
                  onClick={() => setSettingRef(true)}
                  className={`h-11 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all ${settingRef ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-transparent text-gray-500 hover:text-white'}`}
                >
                  SETAR ESCALA (A4)
                </Button>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <Button 
                  onClick={() => setSettingRef(false)}
                  className={`h-11 px-6 rounded-xl font-black text-[10px] tracking-widest transition-all ${!settingRef ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-transparent text-gray-500 hover:text-white'}`}
                >
                  MARCAR MEDIDA
                </Button>
              </div>
            )}

            {image && mode === 'MAGIC' && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-3xl p-3 rounded-[24px] border border-white/10 shadow-2xl">
                  <div className="flex-1 relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                    <Input 
                      placeholder="Ex: tire o sofá e coloque um vaso... (ou marque a área e digite)"
                      value={iaCommand}
                      onChange={e => setIaCommand(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleMagicAction()}
                      className="bg-white/5 border-white/10 pl-11 h-14 rounded-xl text-sm focus-visible:ring-indigo-500"
                    />
                  </div>
                  <Button 
                    onClick={handleMagicAction}
                    disabled={isMagicLoading}
                    className="h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-all shadow-lg shadow-indigo-500/20"
                  >
                    {isMagicLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Wand2 className="w-5 h-5 mr-2" /> APLICAR</>}
                  </Button>
                </div>
                
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMaskPoints([])} className="bg-black/60 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400 rounded-full h-8 px-4 text-[10px] uppercase font-bold">
                    <Eraser className="w-3 h-3 mr-2" /> Limpar Seleção
                  </Button>
                  {magicHistory.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => {
                      const prev = magicHistory[1] || magicHistory[0];
                      setImage(prev);
                      setMagicHistory(magicHistory.slice(1));
                    }} className="bg-black/60 border-white/10 text-white hover:bg-white/20 rounded-full h-8 px-4 text-[10px] uppercase font-bold">
                      <Undo2 className="w-3 h-3 mr-2" /> Desfazer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Lado Direito: Intelligence Sidebar */}
        <div className="xl:col-span-3 space-y-6">
          {mode === 'MAGIC' && (
            <Card className="bg-[#111114] border-indigo-500/30 rounded-[32px] p-6 space-y-6 animate-in slide-in-from-right duration-500">
               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Magic Kreativ</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    Você pode selecionar manualmente uma área clicando na imagem, ou simplesmente digitar o que deseja fazer no ambiente todo.
                  </p>
               </div>
               
               <div className="space-y-3">
                 <div className="p-3 bg-white/5 border border-white/5 rounded-2xl group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => setIaCommand("Tire o sofá e coloque um tapete moderno")}>
                   <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Comando Combo:</p>
                   <p className="text-[11px] text-gray-300">"Tire o sofá e as plantas"</p>
                 </div>
                 <div className="p-3 bg-white/5 border border-white/5 rounded-2xl group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => setIaCommand("Mude o estilo para um loft industrial moderno")}>
                   <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Transformação Total:</p>
                   <p className="text-[11px] text-gray-300">"Estilo loft industrial"</p>
                 </div>
            </Card>
          )}

          {/* Analysis Result Card */}
          {result && mode === 'MEASURE' ? (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
               <Card className="bg-[#111114] border-amber-500/30 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Medida Estimada</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black text-white">{result.measureMm}</span>
                        <span className="text-2xl font-bold text-gray-600">mm</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                         <span>Confiança Visual</span>
                         <span className="text-green-500">{result.confidence}%</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${result.confidence}%` }} />
                       </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 italic">
                       <p className="text-xs text-gray-400 leading-relaxed font-medium">"{result.reasoning}"</p>
                    </div>

                    <div className="space-y-3 pt-4">
                      <select 
                        value={selectedClientId} 
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full h-14 bg-black border border-white/10 rounded-2xl px-5 text-sm font-bold text-gray-300 focus:border-amber-500 transition-colors appearance-none"
                      >
                        <option value=""> Vincular Cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Button onClick={saveMeasurement} className="w-full bg-white text-black font-black h-16 rounded-2xl text-lg hover:bg-amber-500 transition-colors group">
                        SALVAR NO CRM <Send className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
               </Card>
            </div>
          ) : (
            <Card className="bg-[#111114] border-white/5 rounded-[32px] p-8 space-y-8">
               <div className="space-y-2">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">Protocolo de Precisão</h4>
                 <div className="w-12 h-1 bg-amber-500 rounded-full" />
               </div>

               <div className="space-y-6">
                 {[
                   { icon: <Maximize className="w-4 h-4" />, t: 'FOV 110º', d: 'Mantenha o celular reto para evitar distorção de barril.' },
                   { icon: <Ruler className="w-4 h-4" />, t: 'REFERÊNCIA A4', d: 'O objeto de guia deve estar no mesmo plano (piso) da medida.' },
                   { icon: <Info className="w-4 h-4" />, t: 'LUPA ATIVA', d: 'Segure e arraste o ponto para posicionar no pixel exato.' }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-amber-500">
                       {item.icon}
                     </div>
                     <div>
                       <p className="text-[11px] font-black text-gray-200 uppercase">{item.t}</p>
                       <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.d}</p>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="pt-6 border-t border-white/5">
                 <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center italic">
                   "A precisão é a alma do móvel planejado."
                 </p>
               </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};


export default SmartMeasurement;
