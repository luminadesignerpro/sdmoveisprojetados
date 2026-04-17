import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Box, FileText, MessageSquare, MessageCircle, Home, Image, Plus, Clock,
  Navigation, BookOpen, Shield, Fuel, Wrench, Building, Package, ClipboardList,
  Banknote, TrendingDown, TrendingUp, FileSignature, Laptop, Settings, Bot, Camera, Calendar, FileDown,
} from "lucide-react";

interface NavIconProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  isFab?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "cube": Box,
  "box": Box,
  "file-text": FileText,
  "message-square": MessageSquare,
  "message-circle": MessageCircle,
  "home": Home,
  "image": Image,
  "plus": Plus,
  "clock": Clock,
  "navigation": Navigation,
  "book-open": BookOpen,
  "shield": Shield,
  "fuel": Fuel,
  "wrench": Wrench,
  "building": Building,
  "package": Package,
  "clipboard-list": ClipboardList,
  "banknote": Banknote,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "file-signature": FileSignature,
  "monitor": Laptop,
  "settings": Settings,
  "bot": Bot,
  "camera": Camera,
  "calendar": Calendar,
  "file-down": FileDown,
};

export const NavIcon: React.FC<NavIconProps> = ({ icon, label, active, onClick, isFab }) => {
  const IconComponent = iconMap[icon] || Box;

  if (isFab) {
    return (
      <button
        onClick={onClick}
        className="group w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-primary-foreground shadow-glow hover:scale-110 transition-all duration-300"
        style={{ perspective: "600px" }}
      >
        <Plus className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-0.5 sm:gap-1 py-2 sm:py-3 px-1.5 sm:px-2 rounded-xl transition-all duration-300 flex-shrink-0",
        active
          ? "text-primary"
          : "text-sidebar-foreground/75 hover:text-sidebar-foreground"
      )}
      style={{ perspective: "600px" }}
    >
      <div
        className={cn(
          "w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ease-out",
          active
            ? "bg-primary text-primary-foreground shadow-glow"
            : "bg-sidebar-accent/40 backdrop-blur-sm border border-sidebar-border/30 group-hover:bg-sidebar-accent/70 group-hover:border-primary/30 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
        )}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <IconComponent
          className={cn(
            "w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ease-out",
            "group-hover:scale-110",
            active && "drop-shadow-[0_0_6px_hsl(var(--primary-foreground)/0.5)]"
          )}
          style={{
            transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>
      <span className={cn(
        "text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
        active ? "text-primary" : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
      )}>
        {label}
      </span>

      {/* Active indicator line */}
      {active && (
        <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-primary shadow-glow" />
      )}
    </button>
  );
};
