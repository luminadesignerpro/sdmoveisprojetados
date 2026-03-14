import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderOpen, MessageSquare, Sparkles,
  Image, Settings, Clock, Truck, Wrench
} from "lucide-react";
import logoSd from "@/assets/logo-sd.jpeg";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clientes" },
  { to: "/projects", icon: FolderOpen, label: "Projetos" },
  { to: "/crm", icon: MessageSquare, label: "CRM" },
  { to: "/ai-assistant", icon: Sparkles, label: "Assistente IA" },
  { to: "/render", icon: Image, label: "Renderização" },
  { to: "/editor", icon: Wrench, label: "Editor 3D" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <img src={logoSd} alt="SD Logo" className="w-10 h-10 rounded-lg object-cover" />
        <span className="font-display font-bold text-lg">SD Móveis</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
