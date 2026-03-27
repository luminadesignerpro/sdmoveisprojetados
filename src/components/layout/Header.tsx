import { Bell, Search, Shield, Zap, User, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="h-20 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-10 relative z-10 shadow-2xl">
      <div className="flex items-center gap-6 flex-1 max-w-xl group">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-700 group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/20 transition-all duration-500">
           <Search className="w-5 h-5" />
        </div>
        <input
          placeholder="PESQUISAR NO ECOSSISTEMA SD..."
          className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 w-full placeholder:text-gray-800 focus:text-white transition-colors italic"
        />
      </div>
      
      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/5 px-6 py-2.5 rounded-2xl shadow-inner group cursor-pointer hover:border-[#D4AF37]/20 transition-all">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
           <p className="text-[9px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              SISTEMA <span className="text-[#D4AF37]">OPERACIONAL</span>
           </p>
        </div>

        <div className="flex items-center gap-4">
           <button className="w-12 h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-700 hover:text-white relative transition-all hover:scale-105 active:scale-95 group">
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#D4AF37] rounded-full border-2 border-[#0a0a0a] shadow-sm animate-bounce" />
           </button>
           
           <div className="h-10 w-[1px] bg-white/5 mx-2" />
           
           <button className="flex items-center gap-4 bg-gradient-to-br from-[#111111] to-black border border-white/5 pl-5 pr-2 py-2 rounded-2xl group hover:border-[#D4AF37]/30 transition-all shadow-xl">
              <div className="text-right flex flex-col items-end">
                 <p className="text-[10px] font-black text-white uppercase italic tracking-tighter leading-none mb-1 group-hover:text-[#D4AF37] transition-colors">DIRETORIA SD</p>
                 <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest leading-none italic">Nível de Acesso 01</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] flex items-center justify-center text-black shadow-lg group-hover:scale-110 transition-transform">
                 <User className="w-5 h-5" />
              </div>
           </button>
        </div>
      </div>
    </header>
  );
}
