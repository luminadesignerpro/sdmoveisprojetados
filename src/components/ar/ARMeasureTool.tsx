import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Ruler, Check, Camera, AlertTriangle, Target, Hand, Maximize } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   ARMeasureTool v4 — Triangulação Monocular Avançada (Giroscópio + Altura Fixa)
   Medição exata de Largura, Profundidade e Altura baseada na inclinação do aparelho.
───────────────────────────────────────────────────────────────────────────── */

interface ARMeasureToolProps {
  onClose: () => void;
  onConfirmMeasurement: (meters: number, dims?: { width: number; depth: number; height: number }) => void;
}

type Phase = 'INTRO' | 'MEASURE' | 'RESULT' | 'MANUAL';
type Step = 'W1' | 'W2' | 'D1' | 'D2' | 'H1' | 'H2' | 'DONE';

interface Vec3 { x: number; y: number; z: number }
interface Vec2 { x: number; y: number }

const deg2rad = (deg: number) => deg * Math.PI / 180;

// Calcula o ponto 2D no chão (Z=0) onde a câmera está mirando.
// Origem (0,0) é o pé do usuário.
function getFloorIntersection(h: number, alpha: number, beta: number, gamma: number): Vec2 | null {
  const a = deg2rad(alpha), b = deg2rad(beta), c = deg2rad(gamma);
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);
  const cc = Math.cos(c), sc = Math.sin(c);

  // Vetor (0,0,-1) da câmera transformado para o referencial da Terra
  const vx = -(ca * sc + sa * sb * cc);
  const vy = -(sa * sc - ca * sb * cc);
  const vz = -(cb * cc);

  if (vz >= -0.01) return null; // Mirando para cima ou horizonte
  const t = -h / vz;
  return { x: vx * t, y: vy * t };
}

function getDistanceBetween(p1: Vec2, p2: Vec2) {
  return Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
}

function getWallHeight(h: number, d_wall: number, alpha: number, beta: number, gamma: number): number {
  const a = deg2rad(alpha), b = deg2rad(beta), c = deg2rad(gamma);
  const ca = Math.cos(a), sa = Math.sin(a);
  const cb = Math.cos(b), sb = Math.sin(b);
  const cc = Math.cos(c), sc = Math.sin(c);

  const vx = -(ca * sc + sa * sb * cc);
  const vy = -(sa * sc - ca * sb * cc);
  const vz = -(cb * cc);

  const v_horiz = Math.sqrt(vx * vx + vy * vy);
  if (v_horiz < 0.001) return h;
  return h + (d_wall / v_horiz) * vz;
}

export default function ARMeasureTool({ onClose, onConfirmMeasurement }: ARMeasureToolProps) {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [step, setStep] = useState<Step>('W1');
  const [cameraHeight, setCameraHeight] = useState('1.50');
  const [errorMsg, setErrorMsg] = useState('');
  const [finalDims, setFinalDims] = useState<{ width: number; depth: number; height: number } | null>(null);

  const orientRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const dataRef = useRef<{ W1?: Vec2; D1?: Vec2; H1_d?: number, width?: number, depth?: number, height?: number }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  // Fallback manual dimensions
  const [manualDim, setManualDim] = useState({ width: 0, depth: 0.5, height: 2.7 });

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      orientRef.current = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 };
    };
    if (phase === 'MEASURE') window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const loopHUD = useCallback(() => {
    if (phase !== 'MEASURE') return;
    const s = step;
    const h = parseFloat(cameraHeight) || 1.5;
    const { alpha, beta, gamma } = orientRef.current;
    const elDist = document.getElementById('live-hud-dist');
    const elMain = document.getElementById('live-hud-main');

    let distText = 'Calculando...';
    let mainText = '🎯 Mirando...';

    if (s === 'W1' || s === 'D1' || s === 'H1') {
      const pt = getFloorIntersection(h, alpha, beta, gamma);
      if (!pt) { mainText = '⚠️ Mire no chão'; distText = '-'; }
      else {
        const d = Math.sqrt(pt.x*pt.x + pt.y*pt.y);
        mainText = `${d.toFixed(2)}m`; distText = `Distância ao alvo`;
      }
    } else if (s === 'W2') {
      const pt2 = getFloorIntersection(h, alpha, beta, gamma);
      if (!pt2) { mainText = '⚠️ Mire no chão'; }
      else if (dataRef.current.W1) {
        const w = getDistanceBetween(dataRef.current.W1, pt2);
        mainText = `${w.toFixed(2)}m`; distText = `Largura Atual`;
      }
    } else if (s === 'D2') {
      const pt2 = getFloorIntersection(h, alpha, beta, gamma);
      if (!pt2) { mainText = '⚠️ Mire no chão'; }
      else if (dataRef.current.D1) {
        const depth = getDistanceBetween(dataRef.current.D1, pt2);
        mainText = `${depth.toFixed(2)}m`; distText = `Profundidade Atual`;
      }
    } else if (s === 'H2') {
      if (dataRef.current.H1_d) {
        const height = getWallHeight(h, dataRef.current.H1_d, alpha, beta, gamma);
        mainText = `${height.toFixed(2)}m`; distText = `Altura Atual`;
      }
    }

    if (elDist) elDist.innerText = distText;
    if (elMain) elMain.innerText = mainText;

    rafRef.current = requestAnimationFrame(loopHUD);
  }, [phase, step, cameraHeight]);

  useEffect(() => {
    if (phase === 'MEASURE') rafRef.current = requestAnimationFrame(loopHUD);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, step, loopHUD]);

  const requestSensorsAndStart = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') {
          setErrorMsg('Precisamos da permissão do Giroscópio para calcular as medidas.');
          setPhase('MANUAL'); return;
        }
      } catch (e) { setPhase('MANUAL'); return; }
    }
    
    // Check if gyro exists
    let hasGyro = false;
    const test = (e: DeviceOrientationEvent) => { if (e.alpha !== null) hasGyro = true; };
    window.addEventListener('deviceorientation', test);
    setTimeout(async () => {
      window.removeEventListener('deviceorientation', test);
      if (!hasGyro && window.location.protocol.includes('https')) {
        setPhase('MANUAL'); return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        dataRef.current = {};
        setStep('W1');
        setPhase('MEASURE');
      } catch {
        setPhase('MANUAL');
      }
    }, 400);
  };

  const handleCapture = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    const h = parseFloat(cameraHeight) || 1.5;
    const { alpha, beta, gamma } = orientRef.current;

    switch (step) {
      case 'W1':
        const w1 = getFloorIntersection(h, alpha, beta, gamma);
        if (w1) { dataRef.current.W1 = w1; setStep('W2'); }
        break;
      case 'W2':
        const w2 = getFloorIntersection(h, alpha, beta, gamma);
        if (w2 && dataRef.current.W1) {
          dataRef.current.width = getDistanceBetween(dataRef.current.W1, w2);
          setStep('D1');
        }
        break;
      case 'D1':
        const d1 = getFloorIntersection(h, alpha, beta, gamma);
        if (d1) { dataRef.current.D1 = d1; setStep('D2'); }
        break;
      case 'D2':
        const d2 = getFloorIntersection(h, alpha, beta, gamma);
        if (d2 && dataRef.current.D1) {
          dataRef.current.depth = getDistanceBetween(dataRef.current.D1, d2);
          setStep('H1');
        }
        break;
      case 'H1':
        const h1 = getFloorIntersection(h, alpha, beta, gamma);
        if (h1) {
          dataRef.current.H1_d = Math.sqrt(h1.x*h1.x + h1.y*h1.y);
          setStep('H2');
        }
        break;
      case 'H2':
        if (dataRef.current.H1_d) {
          const height = getWallHeight(h, dataRef.current.H1_d, alpha, beta, gamma);
          dataRef.current.height = height;
          setFinalDims({ width: dataRef.current.width!, depth: dataRef.current.depth!, height: dataRef.current.height! });
          
          if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          }
          setPhase('RESULT');
        }
        break;
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 'W1': return { t: 'LARGURA', d: 'Mire no CANTO ESQUERDO do chão plano, do começo da parede que quer medir.' };
      case 'W2': return { t: 'LARGURA', d: 'Mire no CANTO DIREITO do chão, do final da mesma parede.' };
      case 'D1': return { t: 'PROFUNDIDADE', d: 'Agora, mire no começo da PAREDE LATERAL (chão).' };
      case 'D2': return { t: 'PROFUNDIDADE', d: 'Mire até o fundo da PAREDE LATERAL (chão).' };
      case 'H1': return { t: 'ALTURA', d: 'Mire para a BASE de qualquer parede (no chão).' };
      case 'H2': return { t: 'ALTURA', d: 'Mire RETO ATÉ O TETO, exatamente na mesma linha e dispare.' };
      default: return { t: '', d: '' };
    }
  };

  // ── INTRO ──
  if (phase === 'INTRO') return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-[32px] bg-amber-500/15 flex items-center justify-center mb-6 ring-2 ring-amber-500/30">
        <Maximize className="w-12 h-12 text-amber-400" />
      </div>
      <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Scanner Gyro 3D</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
        Sistema profissional de captura exata usando giroscópio. Funciona em qualquer aparelho. 
      </p>

      <div className="w-full max-w-xs space-y-2 mb-8 text-left">
        <label className="text-[10px] font-black uppercase text-amber-500 tracking-widest ml-2">Altura que você segura o celular (Metros)</label>
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center px-4 py-2">
          <Hand className="w-5 h-5 text-gray-500" />
          <input type="number" inputMode="decimal" value={cameraHeight} onChange={e => setCameraHeight(e.target.value)}
            className="flex-1 bg-transparent text-white text-2xl font-black text-center outline-none py-2" placeholder="1.50" />
          <span className="text-gray-500 font-bold">m</span>
        </div>
        <p className="text-[11px] text-gray-500 ml-2 mt-2 leading-tight">Mantenha SEMPRE nessa altura durante toda a medição, apenas inclinando ou girando no próprio eixo.</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button onClick={requestSensorsAndStart} className="w-full py-5 rounded-2xl font-black text-black text-base shadow-xl flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
          <Camera className="w-5 h-5" /> INICIAR CAPTURA
        </button>
        <button onClick={() => setPhase('MANUAL')} className="w-full py-3 rounded-2xl text-gray-500 font-bold text-sm bg-white/5 border border-white/10">Medição Convencional (Manual)</button>
      </div>
      <button onClick={onClose} className="absolute top-5 right-5 p-3 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
    </div>
  );

  // ── MEASURE ──
  if (phase === 'MEASURE') {
    const { t, d } = getStepTitle();
    const isError = parseFloat(cameraHeight) <= 0;

    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '15% 15%' }} />
        
        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent pt-10 pb-12 px-5 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-black/50 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
              <span className="text-amber-400 font-black text-xs uppercase tracking-widest">{t} ({step})</span>
            </div>
            <button onClick={() => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(tr => tr.stop()); setPhase('INTRO'); }} className="p-3 bg-red-500/80 rounded-2xl text-white"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-white text-sm font-bold leading-snug drop-shadow-md bg-black/40 p-2 rounded-lg">{d}</p>
        </div>

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <Target className="w-16 h-16 text-amber-400 drop-shadow-lg opacity-80" strokeWidth={1} />
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute drop-shadow-lg" />
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-5 pb-10 pt-16 flex flex-col items-center">
          <div className="mb-6 text-center">
            <p id="live-hud-dist" className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1">Iniciando Sensores...</p>
            <p id="live-hud-main" className="text-white text-4xl font-black drop-shadow-xl" style={{ fontVariantNumeric: 'tabular-nums' }}>0.00m</p>
          </div>
          <button disabled={isError} onClick={handleCapture} className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 ${isError ? 'bg-gray-700' : 'bg-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]'}`}>
            <div className="w-16 h-16 rounded-full bg-white border-4 border-amber-500" />
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'RESULT' && finalDims) return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-emerald-500/15 rounded-[32px] flex items-center justify-center mb-6 ring-2 ring-emerald-500/30">
        <Check className="w-12 h-12 text-emerald-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Escaneamento Concluído</h2>
      <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-6">Medidas Absolutas (Giroscópio)</p>
      
      <div className="w-full max-w-sm space-y-3 mb-8">
        {[ { l: 'Largura', v: finalDims.width, c: 'text-amber-400' }, { l: 'Profundidade', v: finalDims.depth, c: 'text-blue-400' }, { l: 'Altura', v: finalDims.height, c: 'text-green-400' } ].map(i => (
          <div key={i.l} className="flex justify-between items-center bg-[#111] border border-white/10 rounded-2xl px-6 py-4">
            <span className="text-gray-400 font-bold text-sm">{i.l}</span>
            <span className={`${i.c} font-black text-2xl`}>{i.v.toFixed(2)} m</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button onClick={() => onConfirmMeasurement(finalDims.width, finalDims)} className="w-full py-5 rounded-2xl font-black text-black text-base shadow-xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>APLICAR AO PROJETO 3D</button>
        <button onClick={() => { setPhase('INTRO'); setFinalDims(null); }} className="w-full bg-white/5 text-gray-400 py-3 rounded-2xl text-sm border border-white/10 hover:bg-white/10 transition-all">Descartar e Refazer</button>
      </div>
    </div>
  );

  // ── MANUAL (FALLBACK DEFAULT) ──
  if (phase === 'MANUAL') return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center overflow-auto">
      <div className="w-16 h-16 bg-amber-500/15 rounded-2xl flex items-center justify-center mb-4 ring-2 ring-amber-500/30">
        <Ruler className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Medidas (Convencional)</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Insira as medidas do ambiente (Metros).</p>
      
      {errorMsg && <p className="text-red-400 text-xs mb-4 bg-red-400/10 p-3 rounded-lg border border-red-500/30 w-full max-w-xs">{errorMsg}</p>}

      <div className="w-full max-w-xs space-y-3 mb-8">
        {[ { k: 'width', n: 'Largura', p: '0.00' }, { k: 'depth', n: 'Profundidade', p: '0.50' }, { k: 'height', n: 'Altura', p: '2.70' } ].map(f => (
          <div key={f.k} className="text-left w-full">
            <label className="text-[10px] font-black uppercase text-amber-500 tracking-widest ml-4 mb-1 block">{f.n} (m)</label>
            <input type="number" inputMode="decimal" value={manualDim[f.k as keyof typeof manualDim] || ''} onChange={e => {
              const val = parseFloat(e.target.value.replace(',', '.'));
              if (!isNaN(val)) setManualDim(p => ({ ...p, [f.k]: val }));
            }} className="w-full bg-[#111] border border-white/10 text-white text-2xl font-black text-center py-4 rounded-2xl outline-none focus:border-amber-500" placeholder={f.p} />
          </div>
        ))}
      </div>
      <div className="w-full max-w-xs space-y-3">
        <button onClick={() => { if (manualDim.width > 0) onConfirmMeasurement(manualDim.width, manualDim); }} className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black shadow-xl" style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>CONFIRMAR</button>
        <button onClick={() => setPhase('INTRO')} className="w-full text-gray-500 font-bold text-sm py-4">Voltar</button>
      </div>
      <button onClick={onClose} className="absolute top-5 right-5 p-3 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
    </div>
  );

  return null;
}
