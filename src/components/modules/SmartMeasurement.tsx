import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, Ruler, CheckCircle2, Upload, Maximize, Info, Send, Wand2, Sparkles, Undo2, ScanLine, Calculator, ChevronRight, MousePointer2, Image as ImageIcon, Search
} from 'lucide-react';
import { analyzeImageWithGemini } from '@/services/geminiService';
import { cleanupObject, inpaintObject, styleTransfer } from '@/services/stabilityService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const db = supabase as any;

interface Point { x: number; y: number; }

const SmartMeasurement: React.FC = () => {
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null); // Foto do móvel novo
  const [points, setPoints] = useState<Point[]>([]);
  const [refPoints, setRefPoints] = useState<Point[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [iaCommand, setIaCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isRef = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isRef) setRefImage(e.target?.result as string);
        else setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeIA = async () => {
    if (!image || !iaCommand) {
      toast({ title: '⚠️ Descreva o que deseja fazer.' });
      return;
    }

    setAnalyzing(true);
    try {
      // 1. O prompt agora é muito mais inteligente
      const prompt = `[SISTEMA PROJETISTA SD V10] 
      Usuário quer: "${iaCommand}". 
      ${refImage ? "Existe uma imagem de REFERÊNCIA de um móvel para ser usado como base." : ""}
      
      TAREFAS POSSÍVEIS:
      - measure: Se o usuário perguntou sobre medida (sofá, parede, ambiente).
      - replace_with_photo: Se o usuário quer trocar um móvel baseado na foto de referência.
      - replace_with_text: Se for apenas comando de texto.
      - cleanup: Se for para remover.
      
      REGRAS DE MEDIÇÃO:
      - Use a folha A4 no chão como escala 297mm.
      - Se perguntado sobre a medida do sofá, encontre-o e calcule a largura.
      
      RETORNE APENAS JSON:
      {
        "action": "measure" | "cleanup" | "inpaint" | "style",
        "measureResult": "string com a medida encontrada",
        "descriptionEn": "English detailed descriptive prompt for Stability AI",
        "targetPolygon": [{"x":float, "y":float}, ...] // Coordenadas do móvel ou área
      }`;

      // No caso de replace_with_photo, enviamos as DUAS imagens para o Gemini entender o móvel novo
      const imagesToAnalyze = [image];
      if (refImage) imagesToAnalyze.push(refImage);

      const res = await analyzeImageWithGemini(imagesToAnalyze.join('|'), prompt); 
      const data = JSON.parse(res.replace(/```json|```/g, '').trim());

      if (data.action === 'measure') {
        setResult({ measureMm: data.measureResult, reasoning: "Cálculo baseado na escala 3D do ambiente detectada." });
        toast({ title: '📐 Medição detectada!' });
      } else if (data.action === 'cleanup' || data.action === 'inpaint') {
        toast({ title: '✨ Gerando imagem em Alta Definição...' });
        
        const mCanvas = document.createElement('canvas');
        const tmpImg = new Image(); tmpImg.src = image; await new Promise(r => tmpImg.onload = r);
        mCanvas.width = tmpImg.width; mCanvas.height = tmpImg.height;
        const mctx = mCanvas.getContext('2d')!;
        mctx.fillStyle = 'black'; mctx.fillRect(0, 0, mCanvas.width, mCanvas.height);
        mctx.fillStyle = 'white'; mctx.beginPath();
        data.targetPolygon.forEach((p: any, i: number) => { 
          if (i === 0) mctx.moveTo(p.x * mCanvas.width, p.y * mCanvas.height); 
          else mctx.lineTo(p.x * mCanvas.width, p.y * mCanvas.height); 
        });
        mctx.closePath(); mctx.fill();
        
        const mBase64 = mCanvas.toDataURL('image/png');
        const finalImg = data.action === 'cleanup' ? await cleanupObject({ image, mask: mBase64 }) : await inpaintObject(image, mBase64, data.descriptionEn);
        
        if (finalImg) {
          setHistory([finalImg, ...history]);
          setImage(finalImg);
        }
      }
    } catch (e) {
      toast({ title: '❌ Erro de processamento IA' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-[#0a0a0c] min-h-screen text-white w-full selection:bg-amber-500/30">
      <header className="flex justify-between items-center bg-[#111114] p-8 rounded-[40px] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/20 rotate-3">
             <ScanLine className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">SD VISION <span className="text-amber-500 font-normal">ENGINEERING V11</span></h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">Advanced Creative Surveyor Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button onClick={() => fileInputRef.current?.click()} className="bg-white/5 border border-white/10 h-16 px-8 rounded-3xl font-black hover:bg-white/10 transition-all">
             <Camera className="w-5 h-5 mr-3 text-amber-500" /> NOVO AMBIENTE
           </Button>
           <Button onClick={executeIA} disabled={analyzing} className="bg-amber-500 hover:bg-amber-300 text-black font-black h-16 px-12 rounded-3xl shadow-2xl shadow-amber-500/30 transition-all active:scale-95 text-lg">
             {analyzing ? <Sparkles className="animate-spin w-6 h-6" /> : "PROJETAR AGORA"}
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-250px)]">
        <Card className="col-span-9 bg-[#0b0b0d] border-white/5 rounded-[50px] overflow-hidden relative shadow-inner flex items-center justify-center border-t border-l border-white/10">
          {image ? (
             <div className="relative w-full h-full flex items-center justify-center p-8">
               <canvas ref={canvasRef} className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl" />
             </div>
          ) : (
             <div className="text-center space-y-8 animate-pulse">
                <Upload className="w-20 h-20 text-white/5 mx-auto" />
                <h3 className="text-2xl font-black text-white/20 uppercase tracking-widest">Carregue a foto do cômodo</h3>
             </div>
          )}

          {/* Prompt Bar Inteligente */}
          {image && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl space-y-4">
               {refImage && (
                 <div className="flex justify-center">
                   <div className="relative group">
                     <img src={refImage} className="w-24 h-24 object-cover rounded-2xl border-4 border-amber-500 shadow-2xl transition-all group-hover:scale-110" />
                     <button onClick={() => setRefImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border-4 border-black text-white font-bold">×</button>
                     <p className="absolute -bottom-6 left-0 right-0 text-[8px] text-center font-black uppercase text-amber-500">Móvel de Ref.</p>
                   </div>
                 </div>
               )}

               <div className="flex gap-4 p-4 bg-black/80 backdrop-blur-3xl rounded-[35px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                  <div className="flex-1 relative">
                    <Wand2 className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                    <Input 
                      placeholder="Ex: 'Qual a largura do sofá?', 'Troque o sofá por esse da foto', 'Tire esse ar'..."
                      value={iaCommand}
                      onChange={e => setIaCommand(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && executeIA()}
                      className="bg-transparent border-none text-lg h-16 pl-16 focus-visible:ring-0 placeholder:text-white/20 font-medium"
                    />
                  </div>
                  <Button onClick={() => refFileInputRef.current?.click()} className={`h-16 px-6 rounded-3xl transition-all ${refImage ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
                    <ImageIcon className="w-6 h-6 mr-1" /> {refImage ? 'MUDAR REF.' : 'USAR FOTO REF.'}
                  </Button>
                  <Button onClick={executeIA} disabled={analyzing} className="bg-white text-black h-16 px-10 rounded-3xl font-black text-lg hover:bg-amber-500 transition-colors">
                    PERGUNTAR
                  </Button>
               </div>
            </div>
          )}
        </Card>

        <div className="col-span-3 space-y-6 overflow-y-auto pr-2">
           {result && (
             <Card className="bg-amber-500 rounded-[40px] p-8 space-y-4 shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-black" />
                  <p className="text-[10px] font-black text-black/60 uppercase tracking-widest">Resultado do Projetista</p>
                </div>
                <h2 className="text-4xl font-black text-black leading-tight border-b border-black/10 pb-4">{result.measureMm}</h2>
                <p className="text-xs text-black/80 font-medium leading-relaxed italic">"{result.reasoning}"</p>
             </Card>
           )}

           <div className="bg-[#111114] rounded-[40px] p-8 border border-white/5 space-y-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                 <Info className="w-5 h-5 text-amber-500" /> Guia de Comandos
              </h4>
              <div className="grid gap-4">
                 {[
                   { t: "MEDIR", d: "Qual a medida da cama?", i: <Ruler className="w-4 h-4 text-amber-500" /> },
                   { t: "TROCAR", d: "Troque o tapete", i: <ImageIcon className="w-4 h-4 text-amber-500" /> },
                   { t: "REMOVER", d: "Tire o lustre", i: <Calculator className="w-4 h-4 text-amber-500" /> }
                 ].map((g, i) => (
                   <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-help">
                     <div className="flex items-center gap-2 mb-1">
                        {g.i}
                        <p className="text-[10px] font-black uppercase text-amber-500">{g.t}</p>
                     </div>
                     <p className="text-[11px] text-gray-300 font-medium">{g.d}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={e => handleFileUpload(e, false)} accept="image/*" className="hidden" />
      <input type="file" ref={refFileInputRef} onChange={e => handleFileUpload(e, true)} accept="image/*" className="hidden" />
    </div>
  );
};

export default SmartMeasurement;
