import React, { useMemo } from 'react';
import {
    BarChart3, TrendingUp, DollarSign, Package, Activity, ArrowLeft, TrendingDown, PieChart, Target, Zap, ShieldCheck, Shield
} from 'lucide-react';
import { ViewMode } from '@/types';

interface ProfitDashboardProps {
    contracts: any[];
    setView: (view: ViewMode) => void;
}

export const ProfitDashboard: React.FC<ProfitDashboardProps> = ({ contracts, setView }) => {
    // Cálculos Básicos
    const stats = useMemo(() => {
        const validContracts = contracts.filter(c => c.status !== 'cancelado');
        const grossRevenue = validContracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

        const materialCost = grossRevenue * 0.45;
        const laborCost = grossRevenue * 0.20;
        const extraCost = grossRevenue * 0.05;
        const totalCosts = materialCost + laborCost + extraCost;

        const netProfit = grossRevenue - totalCosts;
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        return {
            totalContracts: validContracts.length,
            grossRevenue,
            materialCost,
            laborCost,
            extraCost,
            totalCosts,
            netProfit,
            profitMargin
        };
    }, [contracts]);

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="p-6 sm:p-8 space-y-8 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
            </div>

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                <div>
                   <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[18px] flex items-center justify-center text-black shadow-2xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        Executive <span className="text-[#D4AF37]">BI</span>
                    </h1>
                    <p className="text-gray-500 mt-2 text-xs font-medium italic flex items-center gap-2">
                         <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Análise Preditiva de Margem e Lucratividade SD
                    </p>
                </div>
                <button
                    onClick={() => setView(ViewMode.DASHBOARD)}
                    className="flex items-center gap-3 px-8 h-14 rounded-2xl bg-white/5 border border-white/5 font-black text-[9px] uppercase tracking-[0.2em] text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all shadow-2xl italic active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" /> CONSOLE COMANDO
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20 transition-all">
                            <DollarSign className="w-7 h-7 text-[#D4AF37]" />
                        </div>
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Receita Bruta</p>
                    </div>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter mb-4 tabular-nums">{formatBRL(stats.grossRevenue)}</h3>
                    <div className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-3 italic">
                        <TrendingUp className="w-4 h-4" /> {stats.totalContracts} Ativos no Fluxo
                    </div>
                </div>

                <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group hover:border-red-500/20 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 transition-all">
                            <TrendingDown className="w-7 h-7 text-red-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Burn Rate / Custos</p>
                    </div>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter mb-6 tabular-nums">{formatBRL(stats.totalCosts)}</h3>
                    <div className="flex w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className="bg-[#D4AF37] w-[45%]" />
                        <div className="bg-white/20 w-[20%]" />
                        <div className="bg-gray-800 w-[5%]" />
                    </div>
                    <div className="text-[9px] text-gray-700 mt-3 font-black uppercase tracking-[0.2em] flex justify-between italic">
                        <span>INSUMOS / M.O / OPER</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#111111] to-black border border-[#D4AF37]/20 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-3xl rounded-full" />
                    <div className="flex items-center gap-5 mb-8 relative z-10">
                        <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center border border-[#D4AF37]/30">
                            <Activity className="w-7 h-7 text-[#D4AF37]" />
                        </div>
                        <p className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-widest italic leading-none">EBITDA Líquido SD</p>
                    </div>
                    <h3 className="text-4xl font-black text-[#D4AF37] italic tracking-tighter mb-4 relative z-10 tabular-nums leading-none">{formatBRL(stats.netProfit)}</h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] italic relative z-10">Potencial Bruto de Reinvestimento</p>
                </div>

                <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group hover:border-green-500/20 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 transition-all">
                            <TrendingUp className="w-7 h-7 text-green-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Eficiência Global</p>
                    </div>
                    <h3 className="text-4xl font-black text-white italic tracking-tighter mb-6 tabular-nums leading-none">{stats.profitMargin.toFixed(1)}%</h3>
                    <div className="w-full bg-black rounded-full h-1.5 border border-white/5 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(52,211,153,0.3)]" style={{ width: `${Math.min(stats.profitMargin, 100)}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
                <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-12 flex items-center gap-4 italic shadow-sm">
                        <PieChart className="w-6 h-6 text-[#D4AF37]" /> Breakdown de Insumos & Performance SD
                    </h3>

                    <div className="space-y-12">
                        <div className="group">
                            <div className="flex justify-between items-end mb-5">
                                <div className="space-y-1">
                                    <p className="font-black text-white text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 italic group-hover:text-[#D4AF37] transition-colors"><Package className="w-5 h-5 text-[#D4AF37]" /> Matéria-Prima & MDF (45%)</p>
                                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest ml-8 italic">Chapas de Alta Densidade e Ferragens Técnicas</p>
                                </div>
                                <p className="font-black text-white italic tracking-tighter text-2xl tabular-nums">{formatBRL(stats.materialCost)}</p>
                            </div>
                            <div className="w-full bg-black rounded-full h-2 border border-white/5 overflow-hidden">
                                <div className="bg-[#D4AF37] h-full rounded-full w-[45%] transition-all duration-1000 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                            </div>
                        </div>

                        <div className="group">
                            <div className="flex justify-between items-end mb-5">
                                <div className="space-y-1">
                                    <p className="font-black text-white text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 italic group-hover:text-amber-300 transition-colors"><ShieldCheck className="w-5 h-5 text-amber-300" /> Capital Humano & Engenharia (20%)</p>
                                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest ml-8 italic">Mão de Obra Especializada e Montagem Premium</p>
                                </div>
                                <p className="font-black text-white italic tracking-tighter text-2xl tabular-nums">{formatBRL(stats.laborCost)}</p>
                            </div>
                            <div className="w-full bg-black rounded-full h-2 border border-white/5 overflow-hidden">
                                <div className="bg-amber-400 h-full rounded-full w-[20%] transition-all duration-1000 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] shadow-[0_0_10px_rgba(251,191,36,0.1)]" />
                            </div>
                        </div>

                        <div className="group">
                            <div className="flex justify-between items-end mb-5">
                                <div className="space-y-1">
                                    <p className="font-black text-white text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 italic group-hover:text-gray-400 transition-colors"><Zap className="w-5 h-5 text-gray-500" /> Operações & Logística SD (5%)</p>
                                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest ml-8 italic">Manutenção de Frota, Energia e Despesas Gerais</p>
                                </div>
                                <p className="font-black text-white italic tracking-tighter text-2xl tabular-nums">{formatBRL(stats.extraCost)}</p>
                            </div>
                            <div className="w-full bg-black rounded-full h-2 border border-white/5 overflow-hidden">
                                <div className="bg-gray-800 h-full rounded-full w-[5%] transition-all duration-1000 group-hover:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-black rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group border border-[#D4AF37]/10">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 space-y-10">
                       <h3 className="text-white font-black text-2xl italic uppercase tracking-tighter flex items-center gap-5">
                          <Target className="w-7 h-7 text-[#D4AF37] group-hover:rotate-45 transition-transform duration-700" /> Score de Performance
                       </h3>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed italic border-l-4 border-[#D4AF37]/30 pl-8 uppercase tracking-tight">
                            Com uma margem operacional consolidada de <strong className="text-[#D4AF37] text-lg tabular-nums">{stats.profitMargin.toFixed(1)}%</strong>, o ecossistema SD apresenta resiliência estratégica acima da média do setor. 
                            <span className="block mt-4 opacity-60">Recomenda-se alocação de 15% do EBITDA para expansão tecnológica do Studio AR.</span>
                        </p>
                        <div className="bg-black/60 rounded-[2.5rem] p-10 border border-white/5 shadow-inner transform group-hover:scale-[1.02] transition-all duration-700">
                            <p className="text-[10px] text-[#D4AF37]/70 uppercase font-black tracking-[0.3em] mb-3 italic">Ponto de Equilíbrio Projetado</p>
                            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none mb-3">{formatBRL(stats.totalCosts / 0.55 / (stats.totalContracts || 1))}</p>
                            <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.2em] italic">Custo de Oportunidade por Unidade de Lote</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitDashboard;
