import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Ruler, MousePointerClick, RefreshCcw, Check, Sparkles, Smartphone, Camera, ZapOff, Loader2 } from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   ARMeasureTool  —  Trena de câmera via WebXR Hit-Test (ARCore)
   Fallback inteligente: se WebXR não estiver disponível abre
   câmera 2D simples para marcação visual.
──────────────────────────────────────────────────────────────*/

interface ARMeasureToolProps {
  onClose: () => void;
  onConfirmMeasurement: (meters: number, dims?: {width: number, depth: number, height: number}) => void;
}

type Point3D = { x: number; y: number; z: number };
type Phase = 'INTRO' | 'SCANNING' | 'POINT_A' | 'POINT_B' | 'RESULT' | 'MANUAL' | 'UNSUPPORTED' | 'CAMERA_2D';

const dist3D = (a: Point3D, b: Point3D) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

const isWebXRAvailable = () =>
  typeof navigator !== 'undefined' && 'xr' in navigator;

export default function ARMeasureTool({ onClose, onConfirmMeasurement }: ARMeasureToolProps) {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [distance, setDistance] = useState<number>(0);
  const [dim3D, setDim3D] = useState<{width: number, depth: number, height: number} | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [reticlePos, setReticlePos] = useState<{ x: number; y: number } | null>(null);
  
  const [points3D, setPoints3D] = useState<Point3D[]>([]);
  const [points2D, setPoints2D] = useState<{x: number, y: number}[]>([]);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationValue, setCalibrationValue] = useState(0.297); // A4 length in meters (29.7cm)
  const [pixelPerMeter, setPixelPerMeter] = useState<number>(typeof window !== 'undefined' ? window.innerHeight / 2.5 : 800);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [surfaceDetected, setSurfaceDetected] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const xrSessionRef = useRef<XRSession | null>(null);
  const xrRefSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const rafIdRef = useRef<number>(0);
  const currentHitRef = useRef<Point3D | null>(null);
  const currentHitScreenRef = useRef<{ x: number; y: number } | null>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  /* ─── Session Management ─── */
  const startARSession = useCallback(async () => {
    if (!isWebXRAvailable()) {
      startCamera2DSession();
      return;
    }

    try {
      const supported = await (navigator as any).xr.isSessionSupported('immersive-ar');
      if (!supported) {
        startCamera2DSession();
        return;
      }

      setPhase('SCANNING');
      setSurfaceDetected(false);
      setPoints3D([]);
      setPoints2D([]);
      setDistance(0);

      const session: XRSession = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ar-overlay-root') || document.body },
      });

      xrSessionRef.current = session;
      const canvas = canvasRef.current!;
      const gl = canvas.getContext('webgl2', { xrCompatible: true }) as WebGL2RenderingContext;
      await (gl as any).makeXRCompatible?.();
      const layer = new (window as any).XRWebGLLayer(session, gl);
      await session.updateRenderState({ baseLayer: layer });

      const refSpace = await session.requestReferenceSpace('local-floor');
      xrRefSpaceRef.current = refSpace as XRReferenceSpace;
      const viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSourceRef.current = await (session as any).requestHitTestSource({ space: viewerSpace });

      session.addEventListener('end', () => {
        stopSession(false);
        setPhase('INTRO');
      });

      session.requestAnimationFrame(onXRFrame);
    } catch (err: any) {
      console.error('[AR] startARSession error:', err);
      startCamera2DSession();
    }
  }, []);

  const startCamera2DSession = async () => {
    try {
      setPhase('CAMERA_2D');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('[CAMERA_2D] error:', err);
      setPhase('UNSUPPORTED');
    }
  };

  const snapToModule = (rawDist: number) => {
    const standardModules = [300, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1200, 1500, 1800, 2000, 2500, 3000];
    let adjustedDist = rawDist;
    const distMM = rawDist * 1000;
    
    for (const mod of standardModules) {
      if (Math.abs(distMM - mod) / mod <= 0.02) {
        adjustedDist = mod / 1000;
        break;
      }
    }
    return adjustedDist;
  };

  const handleCamera2DTap = (e: React.MouseEvent | React.TouchEvent) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const pos = { x: clientX, y: clientY };
    setMagnifierPos(pos);
    setShowMagnifier(true);
    setTimeout(() => setShowMagnifier(false), 800);

    const newPoints = [...points2D, pos];
    setPoints2D(newPoints);
    
    if (calibrationMode) {
      if (newPoints.length === 2) {
         const dx = newPoints[1].x - newPoints[0].x;
         const dy = newPoints[1].y - newPoints[0].y;
         const pixels = Math.sqrt(dx*dx + dy*dy);
         const newRatio = pixels / calibrationValue;
         setPixelPerMeter(newRatio);
         setTimeout(() => {
           setPoints2D([]);
           setCalibrationMode(false);
           alert("Calibração A4 registrada! Agora vamos medir: clique no Canto Esquerdo(1), Canto Direito(2), Fundo(3) e Teto(4).");
         }, 500);
      }
    } else {
      if (newPoints.length === 4) {
         const distPx = (p1: any, p2: any) => Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2);
         const rawW = distPx(newPoints[0], newPoints[1]) / pixelPerMeter;
         const rawD = distPx(newPoints[1], newPoints[2]) / pixelPerMeter;
         const rawH = distPx(newPoints[0], newPoints[3]) / pixelPerMeter;
         
         const w = snapToModule(rawW);
         const d = snapToModule(rawD);
         const h = snapToModule(rawH);
         
         setDim3D({width: w, depth: d, height: h});
         setDistance(w); // Default for old compatibility
         
         setTimeout(() => {
            setPhase('RESULT');
         }, 800);
      }
    }
  };

  // Update Magnifier Canvas
  useEffect(() => {
    if (showMagnifier && zoomCanvasRef.current && videoRef.current) {
      const canvas = zoomCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      if (!ctx || video.videoWidth === 0) return;

      const size = 128;
      const zoom = 2.5;
      
      const rect = video.getBoundingClientRect();
      const xRatio = (magnifierPos.x - rect.left) / rect.width;
      const yRatio = (magnifierPos.y - rect.top) / rect.height;
      
      const sourceX = xRatio * video.videoWidth;
      const sourceY = yRatio * video.videoHeight;
      const sourceW = (size / zoom) * (video.videoWidth / rect.width);
      const sourceH = (size / zoom) * (video.videoHeight / rect.height);

      ctx.drawImage(
        video,
        sourceX - sourceW / 2, sourceY - sourceH / 2, sourceW, sourceH,
        0, 0, size, size
      );
    }
  }, [showMagnifier, magnifierPos]);

  const stopSession = useCallback((resetPhase = true) => {
    cancelAnimationFrame(rafIdRef.current);
    hitTestSourceRef.current?.cancel();
    hitTestSourceRef.current = null;
    if (xrSessionRef.current) {
      xrSessionRef.current.end().catch(() => {});
      xrSessionRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (resetPhase) setPhase('INTRO');
  }, []);

  const onXRFrame = useCallback((time: number, frame: XRFrame) => {
    const session = xrSessionRef.current;
    if (!session) return;
    rafIdRef.current = session.requestAnimationFrame(onXRFrame);

    const refSpace = xrRefSpaceRef.current;
    const hitSource = hitTestSourceRef.current;
    if (!refSpace || !hitSource) return;

    const hits = frame.getHitTestResults(hitSource as any);
    if (hits.length > 0) {
      setSurfaceDetected(true);
      const pose = hits[0].getPose(refSpace);
      if (pose) {
        const m = pose.transform.matrix;
        currentHitRef.current = { x: m[12], y: m[13], z: m[14] };
        setReticlePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
    } else {
      setSurfaceDetected(false);
    }
  }, []);

  const handleARTap = useCallback(() => {
    const hit = currentHitRef.current;
    if (!hit) return;
    const screen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    if (phase === 'INTRO' || phase === 'SCANNING' || phase === 'POINT_A' || phase === 'POINT_B') {
      const newPoints = [...points3D, hit];
      setPoints3D([...points3D, hit]);
      
      if (newPoints.length === 4) {
        const w = snapToModule(dist3D(newPoints[0], newPoints[1]));
        const d = snapToModule(dist3D(newPoints[1], newPoints[2]));
        const h = snapToModule(dist3D(newPoints[0], newPoints[3]));
        
        // Verifica esquadro na base (P1 e P2)
        const dy = Math.abs(newPoints[0].y - newPoints[1].y);
        if (dy > 0.005) {
          alert(`Aviso de Esquadro: A diferença de altura na base é de ${(dy * 1000).toFixed(1)}mm (tolerância: 5mm). Considere manter o dispositivo mais estável.`);
        }

        setDim3D({width: w, depth: d, height: h});
        setDistance(w);
        setPhase('RESULT');
        stopSession(false);
      } else {
        // Avance para os próximos passos visualmente
        if (newPoints.length === 1) setPhase('POINT_A'); // Temos P1
        if (newPoints.length === 2) setPhase('POINT_B'); // Temos P2
      }
    }
  }, [phase, points3D, stopSession]);

  const restart = () => {
    setPoints3D([]); setPoints2D([]); setDistance(0); setDim3D(null);
    startARSession();
  };

  const confirm = () => {
    const val = phase === 'MANUAL' ? parseFloat(manualInput.replace(',', '.')) : distance;
    if (!val || val <= 0) return;
    onConfirmMeasurement(val, dim3D || undefined);
  };

  /* ─── Render Logic ─── */

  if (phase === 'INTRO') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-24 h-24 rounded-[32px] bg-amber-500/15 flex items-center justify-center mb-6 ring-2 ring-amber-500/30">
          <Ruler className="w-12 h-12 text-amber-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Trena de Ambiente</h2>
        <p className="text-gray-400 max-w-xs text-sm mb-8 leading-relaxed">
          Meça seu ambiente em tempo real para um projeto perfeitamente ajustado.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={startARSession} className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3">
            <Camera className="w-5 h-5" /> INICIAR CÂMERA
          </button>
          <button onClick={() => setPhase('MANUAL')} className="w-full bg-white/5 text-gray-400 py-3 rounded-2xl font-bold text-sm border border-white/10">
            Digitar Manualmente
          </button>
        </div>
        <button onClick={onClose} className="absolute top-5 right-5 p-3 text-gray-500 hover:text-white"><X /></button>
      </div>
    );
  }

  if (phase === 'CAMERA_2D') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
        <div className="absolute inset-0 flex flex-col">
          <div className="p-8 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Modo de Segurança (2D)</p>
                <h2 className="text-white font-black text-2xl">Mova para Medir</h2>
             </div>
             <button onClick={onClose} className="p-3 bg-white/10 rounded-full text-white pointer-events-auto"><X /></button>
          </div>
          <div 
            className="flex-1 relative cursor-crosshair" 
            style={{ touchAction: 'none', pointerEvents: 'auto' }}
            onClick={handleCamera2DTap}
          >
            {points2D.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 border-2 border-amber-400/50 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-amber-400 rounded-full" />
                </div>
              </div>
            )}
            
            {showMagnifier && (
               <div 
                 className="absolute w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none z-[60] -translate-x-1/2 -ml-2 -mt-44 flex items-center justify-center bg-black"
                 style={{ left: magnifierPos.x, top: magnifierPos.y }}
               >
                  <canvas ref={zoomCanvasRef} width={128} height={128} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm" />
                     <div className="w-12 h-12 border border-red-500/30 rounded-full" />
                  </div>
               </div>
            )}

            {/* A4 CALIBRATION GHOST FRAME */}
            {calibrationMode && points2D.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-48 h-64 border-2 border-dashed border-amber-400/40 rounded-lg flex flex-col items-center justify-center gap-2">
                    <Smartphone className="w-8 h-8 text-amber-500/30" />
                    <p className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest">Alinhe com o Papel A4</p>
                 </div>
              </div>
            )}
            
            {/* Draw 2D Points */}
            {points2D.map((pt, i) => (
              <div key={i} className="absolute w-6 h-6 border-2 border-amber-500 rounded-full flex items-center justify-center pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: pt.x, top: pt.y }}>
                <span className="text-[8px] text-white font-black">{i + 1}</span>
              </div>
            ))}
            
            {/* Draw Lines */}
            {points2D.length >= 2 && (
               <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1={points2D[0].x} y1={points2D[0].y} x2={points2D[1].x} y2={points2D[1].y} stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 4" />
                  {points2D.length >= 3 && <line x1={points2D[1].x} y1={points2D[1].y} x2={points2D[2].x} y2={points2D[2].y} stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 4" />}
                  {points2D.length >= 4 && <line x1={points2D[0].x} y1={points2D[0].y} x2={points2D[3].x} y2={points2D[3].y} stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeDasharray="4 4" />}
               </svg>
            )}
          </div>
            <div className="flex flex-col items-center gap-4">
               {points2D.length === 0 && (
                  <button 
                    onClick={() => setCalibrationMode(!calibrationMode)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${calibrationMode ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 ring-2 ring-white/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <RefreshCcw className="w-3 h-3" /> {calibrationMode ? 'MODO CALIBRAÇÃO ATIVO' : 'ATIVAR CALIBRAÇÃO (PAPEL A4)'}
                  </button>
               )}
               <p className="text-gray-300 text-sm font-medium mb-2 px-4 shadow-black drop-shadow-lg text-center bg-black/50 p-2 rounded-xl">
                 {calibrationMode 
                   ? `Calibração: Marque as pontas do papel (${points2D.length}/2)`
                   : `Mapeamento 3D:\n${points2D.length === 0 ? '1. Canto Esquerdo' : points2D.length === 1 ? '2. Canto Direito (Largura)' : points2D.length === 2 ? '3. Fundo (Profundidade)' : '4. Teto (Altura)'}`}
               </p>
            </div>
            <div className="flex gap-3">
               <button onClick={() => setPoints2D([])} className="px-5 bg-white/5 text-white rounded-2xl"><RefreshCcw className="w-5 h-5" /></button>
               <button
                  className={`flex-1 py-5 rounded-2xl font-black text-white shadow-2xl flex items-center justify-center gap-3 ${points2D.length < 4 && (!calibrationMode || points2D.length < 2) ? 'bg-blue-600/50' : 'bg-emerald-600/50'}`}
                  disabled
               >
                  <Camera className="w-5 h-5" />
                  CAPTURAR PONTOS
               </button>
            </div>
        </div>
      </div>
    );
  }

  if (phase === 'RESULT') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-500/15 rounded-[32px] flex items-center justify-center mb-6 ring-2 ring-emerald-500/30">
          <Check className="w-12 h-12 text-emerald-400" />
        </div>
        <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">Medidas Extraídas (L x P x A)</p>
        {dim3D ? (
           <div className="flex flex-col items-center gap-2 mb-8 mt-4">
             <div className="bg-white/10 px-4 py-2 rounded-xl text-white font-black text-xl">L: {dim3D.width.toFixed(2)}m</div>
             <div className="bg-white/10 px-4 py-2 rounded-xl text-white font-black text-xl">P: {dim3D.depth.toFixed(2)}m</div>
             <div className="bg-white/10 px-4 py-2 rounded-xl text-white font-black text-xl">A: {dim3D.height.toFixed(2)}m</div>
           </div>
        ) : (
           <div className="flex items-baseline gap-2 mb-8">
             <span className="text-7xl font-black text-white">{distance.toFixed(2)}</span>
             <span className="text-3xl font-bold text-amber-400">m</span>
           </div>
        )}
        <div className="w-full max-w-xs space-y-3">
          <button onClick={confirm} className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black">USAR NO PROJETO</button>
          <button onClick={restart} className="w-full bg-white/5 text-gray-400 py-3 rounded-2xl font-bold text-sm">Medir novamente</button>
        </div>
      </div>
    );
  }

  if (phase === 'MANUAL') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black text-white mb-6">Medida Manual</h2>
        <div className="w-full max-w-xs space-y-4">
          <div className="relative">
            <input type="number" inputMode="decimal" value={manualInput} onChange={e => setManualInput(e.target.value)} className="w-full bg-white/10 border border-white/20 text-white text-3xl font-black text-center py-5 rounded-2xl outline-none" placeholder="0.00" autoFocus />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-400 font-black text-xl">m</span>
          </div>
          <button onClick={confirm} className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black">CONFIRMAR</button>
          <button onClick={() => setPhase('INTRO')} className="w-full text-gray-400 text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  if (phase === 'UNSUPPORTED') {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <ZapOff className="w-12 h-12 text-orange-400 mb-4" />
        <h2 className="text-xl font-black text-white mb-2">AR Não Suportado</h2>
        <p className="text-gray-400 text-sm mb-8">Seu dispositivo não suporta AR nativo, mas podemos usar a câmera comum para medir.</p>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={startCamera2DSession} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" /> USAR CÂMERA 2D
          </button>
          <button onClick={() => setPhase('MANUAL')} className="w-full bg-white/5 text-gray-400 py-3 rounded-2xl font-bold text-sm">Digitar Manualmente</button>
        </div>
      </div>
    );
  }

  /* Default AR Render (SCANNING, POINT_A, POINT_B) */
  return (
    <div className="fixed inset-0 z-[9999] bg-black" id="ar-overlay-root">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col pointer-events-none select-none">
        <div className="bg-gradient-to-b from-black/80 to-transparent pt-12 pb-8 px-6 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{phase === 'SCANNING' ? 'Aguardando superfície...' : 'Medição AR Ativa'}</p>
            <div className="flex items-baseline gap-1 text-white">
              <span className="text-5xl font-black">{distance.toFixed(2)}</span>
              <span className="text-2xl font-bold text-amber-400">m</span>
            </div>
          </div>
          <button onClick={onClose} className="pointer-events-auto p-4 bg-red-500/80 rounded-2xl text-white"><X /></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
           <div className={`w-20 h-20 rounded-full border-2 ${surfaceDetected ? 'border-amber-400' : 'border-gray-500'} flex items-center justify-center transition-all duration-300`}>
              <div className={`w-3 h-3 rounded-full ${surfaceDetected ? 'bg-amber-400' : 'bg-gray-500'}`} />
           </div>
        </div>
        <div className="mt-auto bg-gradient-to-t from-black/90 to-transparent px-6 pb-12 pt-16 flex flex-col items-center gap-4">
           {surfaceDetected ? (
             <button onClick={handleARTap} className="pointer-events-auto w-full max-w-xs bg-amber-500 text-white font-black py-5 rounded-2xl shadow-xl">
               {points3D.length === 0 ? 'MARCAR CANTO ESQUERDO' : points3D.length === 1 ? 'MARCAR CANTO DIREITO (L)' : points3D.length === 2 ? 'MARCAR FUNDO (P)' : 'MARCAR TETO (A)'}
             </button>
           ) : (
             <p className="text-white text-sm font-bold animate-pulse">Aponte para o chão...</p>
           )}
           <button onClick={() => setPhase('MANUAL')} className="pointer-events-auto text-gray-400 text-xs">Digitar manualmente</button>
        </div>
      </div>
    </div>
  );
}
