import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderOpen, MessageSquare, Sparkles,
  Image, Settings, Clock, Truck, Wrench, Shield, Zap, Box, Star
} from "lucide-react";
import logoSd from "@/assets/logo-sd.jpeg";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "PANEL PRINCIPAL" },
  { to: "/clients", icon: Users, label: "BASE DE CLIENTES" },
  { to: "/projects", icon: FolderOpen, label: "PROJETOS ATIVOS" },
  { to: "/crm", icon: MessageSquare, label: "GESTÃO CRM" },
  { to: "/ai-assistant", icon: Sparkles, label: "ASSISTENTE VISION" },
  { to: "/render", icon: Image, label: "ESTÚDIO RENDER" },
  { to: "/editor", icon: Wrench, label: "PROMOB EDITOR" },
  { to: "/settings", icon: Settings, label: "CONFIGURAÇÕES" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-72 bg-[#111111] border-r border-white/5 flex flex-col h-full relative z-20 shadow-2xl overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#D4AF37]/5 to-transparent pointer-events-none" />
      
      <div className="p-8 border-b border-white/5 flex items-center gap-4 relative z-10">
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
           <img src={logoSd} alt="SD Logo" className="w-12 h-12 rounded-xl object-cover relative border border-white/10" />
        </div>
        <div className="flex flex-col">
           <span className="font-black text-white text-lg italic tracking-tighter uppercase leading-none">SD MÓVEIS</span>
           <span className="text-[9px] text-[#D4AF37] font-black tracking-[0.3em] uppercase italic opacity-60">PROJETADOS</span>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto luxury-scroll relative z-10">
        <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em] mb-6 ml-2 italic">Navegação Estratégica</p>
        
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 italic group ${
                isActive
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black shadow-xl scale-105"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'group-hover:text-[#D4AF37] group-hover:scale-110'} transition-all`} />
              {item.label}
              {isActive && (
                 <div className="ml-auto w-1.5 h-1.5 bg-black rounded-full animate-pulse shadow-sm" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-8 border-t border-white/5 bg-black/20 relative z-10">
         <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 flex items-center gap-4 group cursor-pointer hover:border-[#D4AF37]/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
               <Shield className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black text-white uppercase italic tracking-tighter">SD Security</p>
               <p className="text-[8px] text-gray-700 font-bold uppercase tracking-widest italic leading-none mt-1">Sessão Criptografada</p>
            </div>
         </div>
      </div>
    </aside>
  );
}
