import React, { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, Shield, Zap } from "lucide-react";

interface SignaturePadProps {
  onSave: (data: string) => void;
  onClear?: () => void;
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
    if (onClear) onClear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (data) onSave(data);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] overflow-hidden touch-none h-64 sm:h-80 shadow-2xl relative border-4 border-[#111111]">
         <div className="absolute top-4 left-6 pointer-events-none">
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.4em] italic mb-1">Canvas de Autenticação</p>
            <p className="text-[9px] text-gray-200 font-bold uppercase italic">Assine dentro da área delimitada</p>
         </div>
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "w-full h-full cursor-crosshair",
          }}
          backgroundColor="rgba(255,255,255,1)"
          penColor="#000000"
        />
        <div className="absolute bottom-4 right-6 pointer-events-none opacity-10">
           <Shield className="w-12 h-12 text-black" />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={clear}
          className="flex-1 h-16 bg-[#111111] border border-red-500/20 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all italic shadow-xl"
        >
          <Trash2 className="w-5 h-5" /> REINICIAR TRAÇO
        </button>
        <button
          onClick={save}
          className="flex-[1.5] h-16 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl italic"
        >
          <CheckCircle className="w-5 h-5 shadow-sm" /> EFETIVAR ASSINATURA VIP
        </button>
      </div>
    </div>
  );
}
