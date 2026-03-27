import React from 'react';
import { Camera, Eye, Package, Download, Share2, ArrowRight } from 'lucide-react';

interface PortfolioGalleryProps {
  galleryItems: any[];
  projectApproved: boolean;
  setProjectApproved: (val: boolean) => void;
  setView: (val: string) => void;
  setGalleryFullscreen: (val: any) => void;
  setShowArModal: (val: any) => void;
  toast: (val: any) => void;
}

const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  galleryItems,
  projectApproved,
  setProjectApproved,
  setView,
  setGalleryFullscreen,
  setShowArModal,
  toast
}) => {
  return (
    <div className="p-4 sm:p-8 space-y-8 overflow-auto h-full bg-[#0f0f0f] relative luxury-scroll">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-xl">
              <Camera className="w-8 h-8 text-black" />
            </div>
            Galeria <span className="text-[#D4AF37]">Premium</span>
          </h1>
          <p className="text-gray-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Arquivos em Resolução de Cinema (8K)</p>
        </div>
        <button
          onClick={() => setView('CLIENT_PORTAL')}
          className="px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 uppercase shadow-xl active:scale-95"
        >
          <ArrowRight className="w-4 h-4 rotate-180 text-amber-500" />
          Voltar ao Painel
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10 animate-in zoom-in-95 duration-700">
        {galleryItems.map((item, i) => (
          <div key={i} className="bg-[#111111] rounded-[3rem] shadow-2xl overflow-hidden group border border-white/5 hover:border-amber-500/20 transition-all">
            <div className="aspect-[16/10] overflow-hidden relative">
              <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-6 backdrop-blur-sm">
                <button
                  onClick={() => setGalleryFullscreen({ title: item.title, url: item.url })}
                  className="w-14 h-14 bg-white/10 hover:bg-white text-white hover:text-black rounded-2xl flex items-center justify-center transition-all scale-90 group-hover:scale-100 border border-white/20 shadow-2xl"
                >
                  <Eye className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setShowArModal({ title: item.title, url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' })}
                  className="w-14 h-14 bg-amber-500/10 hover:bg-[#D4AF37] text-amber-500 hover:text-black rounded-2xl flex items-center justify-center transition-all scale-90 group-hover:scale-100 border border-amber-500/30 shadow-2xl"
                >
                  <Package className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-8">
               <div className="flex justify-between items-start mb-4">
                <p className="font-black text-white text-xl uppercase tracking-tighter italic">{item.title}</p>
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase">Render AI</span>
               </div>
               <p className="text-gray-500 text-sm font-medium leading-relaxed italic border-l-2 border-amber-500/20 pl-4 mb-8">{item.desc || "Visualização técnica de acabamentos e volumetria conforme projeto aprovado."}</p>
               <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = item.url;
                      a.download = `${item.title}.jpg`;
                      a.target = '_blank';
                      a.click();
                    }}
                    className="flex-1 px-4 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[9px] text-gray-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Original (8K)
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) navigator.share({ title: item.title, url: item.url });
                      else toast({ title: "🔗 Link copiado!" });
                    }}
                    className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Approve Project Button */}
      {!projectApproved ? (
        <div className="bg-gradient-to-r from-green-900/10 to-emerald-900/10 border-2 border-green-500/20 rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <Eye className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Aprovar Projeto</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto font-medium">
            Revise todos os renders e, se estiver satisfeito, aprove o projeto para iniciarmos a produção com tecnologia de ponta.
          </p>
          <button
            onClick={() => {
              setProjectApproved(true);
              toast({ title: "✅ Projeto Aprovado!", description: "Obrigado! A produção será iniciada em breve." });
            }}
            className="bg-green-600 hover:bg-green-500 text-white px-12 py-5 rounded-2xl font-black transition-all shadow-xl shadow-green-600/20 active:scale-95 flex items-center justify-center gap-3 mx-auto uppercase tracking-widest text-[10px]"
          >
            <Eye className="w-5 h-5" />
            Confirmar Aprovação Final
          </button>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-[2.5rem] p-8 text-center animate-in zoom-in-95 duration-500 shadow-2xl shadow-green-500/5">
          <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <Eye className="w-8 h-8 text-green-500" />
          </div>
          <p className="font-black text-white text-xl italic tracking-tighter uppercase">Projeto Aprovado ✓</p>
          <p className="text-sm text-green-500/70 mt-1 font-bold uppercase tracking-widest text-[10px]">Sua produção está em andamento com prioridade máxima!</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioGallery;
