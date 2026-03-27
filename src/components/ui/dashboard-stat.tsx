import React from "react";
import { cn } from "@/lib/utils";

export interface DashboardStatProps {
  title: string;
  value: string;
  icon: string;
  dark?: boolean;
  color?: string;
  trend?: string;
}

export const DashboardStat: React.FC<DashboardStatProps> = ({ 
  title, 
  value, 
  icon, 
  dark, 
  color,
  trend
}) => (
  <div className={cn(
    "p-6 rounded-[24px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group",
    dark 
      ? "bg-gray-900 text-white" 
      : "bg-white shadow-lg border border-gray-100 hover:shadow-xl hover:border-amber-400/30",
    color
  )}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-amber-50 shadow-sm group-hover:scale-110 group-hover:rotate-3 group-active:scale-95 transition-all duration-300 border border-amber-100">
        {icon}
      </div>
    </div>
    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-amber-600/80 transition-colors duration-300">{title}</p>
    <p className="text-2xl font-black text-gray-900 transition-colors duration-200">{value}</p>
    {trend && (
      <p className="text-xs text-amber-600 font-bold mt-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">{trend}</p>
    )}
  </div>
);
