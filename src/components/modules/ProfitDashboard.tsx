import React from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Wallet, 
  ArrowUpRight, ArrowDownRight, PieChart, Calendar, Filter, Download 
} from 'lucide-react';
import { Card3D } from '@/components/animations/Card3D';

interface ProfitDashboardProps {
  contracts: any[];
  setView: (view: any) => void;
}

const ProfitDashboard: React.FC<ProfitDashboardProps> = ({ contracts }) => {
  const totalRevenue = contracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const totalCosts = totalRevenue * 0.65; // Simulated cost (should come from DB)
  const netProfit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[22px] flex items-center justify-center text-white shadow-2xl">
              <BarChart3 className="w-8 h-8" />
            </div>
            Profit <span className="text-emerald-500">BI</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <TrendingUp className="w-4 h-4 text-emerald-500" /> Inteligência de Margem e Saúde Financeira Elite
          </p>
        </div>
        
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all">
            <Calendar className="w-4 h-4" /> Março 2024
          </button>
          <button className="px-6 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
            <Download className="w-4 h-4" /> Exportar BI
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
        <Card3D className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-black">+12.5% <ArrowUpRight className="w-3 h-3" /></span>
          </div>
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Faturamento Bruto</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
        </Card3D>

        <Card3D className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group hover:border-red-500/20 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-red-500 flex items-center gap-1 text-[10px] font-black">-3.2% <ArrowDownRight className="w-3 h-3" /></span>
          </div>
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Custos Totais</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">R$ {totalCosts.toLocaleString('pt-BR')}</p>
        </Card3D>

        <Card3D className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <PieChart className="w-6 h-6" />
            </div>
            <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-black">+8.4% <ArrowUpRight className="w-3 h-3" /></span>
          </div>
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Lucro Líquido</p>
          <p className="text-3xl font-black text-emerald-500 italic tracking-tighter tabular-nums">R$ {netProfit.toLocaleString('pt-BR')}</p>
        </Card3D>

        <Card3D className="bg-[#111111] border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-2xl group transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Margem SD</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{margin.toFixed(1)}%</p>
        </Card3D>
      </div>

      <div className="flex-1 bg-[#111111] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative z-10 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-32 h-32 bg-emerald-500/5 rounded-full flex items-center justify-center text-emerald-500/20 mb-8 animate-pulse">
           <BarChart3 className="w-16 h-16" />
        </div>
        <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-xs">Gráficos de Performance em Processamento...</p>
      </div>
    </div>
  );
};

export default ProfitDashboard;
