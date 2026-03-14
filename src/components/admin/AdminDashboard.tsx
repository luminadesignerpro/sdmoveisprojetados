import React from 'react';
import {
    Sparkles, Heart, Zap, TrendingUp, ChevronRight, Layers, FileText,
    MessageCircle, Star, Sparkles as SparklesIcon
} from 'lucide-react';
import { Card3D } from '@/components/animations/Card3D';
import { DashboardStat } from '@/components/ui/dashboard-stat';
import { ViewMode } from '@/types';

interface AdminDashboardProps {
    contracts: any[];
    setView: (view: ViewMode) => void;
    handleRender: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    contracts,
    setView,
    handleRender
}) => {
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const signedContracts = contracts.filter(c => ['assinado', 'assasinado', 'assassinado', 'producao', 'instalacao', 'concluido'].includes(c.status)).length;
    const inProduction = contracts.filter(c => c.status === 'producao').length;

    return (
        <div
            className="p-8 space-y-6 overflow-auto h-full relative"
            style={{ background: 'linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted)))' }}
            onScroll={(e) => {
                const target = e.currentTarget;
                const bg = target.querySelector('[data-parallax-bg]') as HTMLElement;
                if (bg) bg.style.transform = `translateY(${target.scrollTop * 0.4}px)`;
                const orb1 = target.querySelector('[data-parallax-orb1]') as HTMLElement;
                if (orb1) orb1.style.transform = `translate(${-target.scrollTop * 0.15}px, ${target.scrollTop * 0.25}px) scale(1.1)`;
                const orb2 = target.querySelector('[data-parallax-orb2]') as HTMLElement;
                if (orb2) orb2.style.transform = `translate(${target.scrollTop * 0.1}px, ${target.scrollTop * 0.2}px)`;
            }}
        >
            {/* Parallax Background Layer */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" data-parallax-bg style={{ willChange: 'transform' }}>
                <div
                    data-parallax-orb1
                    className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat1 12s ease-in-out infinite', willChange: 'transform' }}
                />
                <div
                    data-parallax-orb2
                    className="absolute -bottom-48 -left-32 w-[400px] h-[400px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'orbFloat2 15s ease-in-out infinite', willChange: 'transform' }}
                />
                <div
                    className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, hsl(var(--gold) / 0.3) 0%, transparent 70%)', filter: 'blur(100px)', animation: 'orbFloat1 18s ease-in-out infinite reverse' }}
                />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>

            <header className="flex justify-between items-start" style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.05s forwards' }}>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-amber-500" />
                        Gestão SD Móveis Projetados
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        Gratidão e Performance Comercial
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-3 shadow-sm">
                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Status IA
                        </p>
                        <p className="text-green-700 font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Sistema 100% Online
                        </p>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.15s forwards' }}>
                    <Card3D intensity={8} className="rounded-2xl">
                        <DashboardStat
                            title="Projetos Ativos"
                            value={contracts.length.toString()}
                            icon="📁"
                            trend="+2 este mês"
                            color="bg-blue-50"
                        />
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.25s forwards' }}>
                    <Card3D intensity={8} className="rounded-2xl">
                        <DashboardStat
                            title="Faturamento Total"
                            value={`R$ ${(totalRevenue / 1000).toFixed(0)}K`}
                            icon="💰"
                            trend="+15% vs mês anterior"
                            color="bg-green-50"
                        />
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.35s forwards' }}>
                    <Card3D intensity={8} className="rounded-2xl">
                        <DashboardStat
                            title="Em Produção"
                            value={inProduction.toString()}
                            icon="🏭"
                            trend="Meta: 10"
                            color="bg-amber-50"
                        />
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.45s forwards' }}>
                    <Card3D intensity={8} className="rounded-2xl">
                        <DashboardStat
                            title="Conversão"
                            value={`${contracts.length > 0 ? Math.round((signedContracts / contracts.length) * 100) : 0}%`}
                            icon="📈"
                            trend="Excelente!"
                            color="bg-purple-50"
                        />
                    </Card3D>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
                {/* Sabedoria do Dia */}
                <div style={{ opacity: 0, animation: 'fadeIn 0.6s ease-out 0.55s forwards' }} className="col-span-2">
                    <Card3D intensity={5} className="rounded-[32px]">
                        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Star className="w-5 h-5 text-amber-400" />
                                    <span className="text-amber-400 text-sm font-bold uppercase tracking-wider">Sabedoria do Dia</span>
                                </div>
                                <p className="text-gray-300 text-lg mb-8 italic leading-relaxed">
                                    "Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."
                                    <span className="block text-amber-400 text-sm mt-2 not-italic">(Provérbios 16:3)</span>
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setView(ViewMode.PROMOB)}
                                        className="bg-amber-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-500 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg hover:shadow-amber-500/30 hover:shadow-xl group/btn"
                                    >
                                        <Layers className="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-300" />
                                        Novo Projeto 3D
                                    </button>
                                    <button
                                        onClick={() => setView(ViewMode.CONTRACTS)}
                                        className="bg-white/10 px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-white/20 transition-all duration-300 flex items-center gap-2 active:scale-95 hover:scale-105 backdrop-blur-sm group/btn"
                                    >
                                        <FileText className="w-4 h-4 group-hover/btn:rotate-6 transition-transform duration-300" />
                                        Ver Contratos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card3D>
                </div>

                {/* Contratos Recentes */}
                <div style={{ opacity: 0, animation: 'fadeIn 0.6s ease-out 0.65s forwards' }}>
                    <Card3D intensity={6} className="rounded-[32px]">
                        <div className="bg-white rounded-[32px] p-6 shadow-xl h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-500" />
                                    Últimos Contratos
                                </h3>
                                <button onClick={() => setView(ViewMode.CONTRACTS)} className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 hover:gap-2 transition-all duration-300 active:scale-95">
                                    Ver todos <ChevronRight className="w-3 h-3 hover:translate-x-0.5 transition-transform duration-300" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {contracts.slice(0, 3).map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setView(ViewMode.CONTRACTS)}
                                        className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all duration-200 cursor-pointer hover:translate-x-1 hover:shadow-md active:scale-[0.98]"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-900">{c.clients?.name || 'Cliente'}</p>
                                            <p className="text-xs text-gray-500">{c.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-amber-600">R$ {(c.value || 0).toLocaleString('pt-BR')}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'producao' ? 'bg-blue-100 text-blue-700' :
                                                c.status === 'assinado' ? 'bg-green-100 text-green-700' :
                                                    c.status === 'instalacao' ? 'bg-purple-100 text-purple-700' :
                                                        c.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-amber-100 text-amber-700'
                                                }`}>
                                                {c.status === 'producao' ? 'Produção' : (c.status === 'assinado' || c.status === 'assasinado' || c.status === 'assassinado') ? 'Assinado' : c.status === 'instalacao' ? 'Instalação' : c.status === 'concluido' ? 'Concluído' : c.status === 'em_negociacao' ? 'Em Negociação' : c.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {contracts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nenhum projeto ainda</p>}
                            </div>
                        </div>
                    </Card3D>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-5 gap-4">
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.75s forwards' }}>
                    <Card3D intensity={10} className="rounded-2xl">
                        <button
                            onClick={() => setView(ViewMode.PROMOB)}
                            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-left group w-full active:scale-[0.96] hover:border-blue-200 border border-transparent flex flex-col items-center text-center justify-center h-full"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 group-active:scale-90 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-200/50">
                                <Layers className="w-6 h-6 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-sm">Editor 3D</h4>
                        </button>
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.85s forwards' }}>
                    <Card3D intensity={10} className="rounded-2xl">
                        <button
                            onClick={() => setView(ViewMode.CRM)}
                            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-left group w-full active:scale-[0.96] hover:border-green-200 border border-transparent flex flex-col items-center text-center justify-center h-full"
                        >
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 group-active:scale-90 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-green-200/50">
                                <MessageCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-200 text-sm">CRM Zap</h4>
                        </button>
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.95s forwards' }}>
                    <Card3D intensity={10} className="rounded-2xl">
                        <button
                            onClick={() => setView(ViewMode.CONTRACTS)}
                            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-left group w-full active:scale-[0.96] hover:border-amber-200 border border-transparent flex flex-col items-center text-center justify-center h-full"
                        >
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 group-active:scale-90 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-amber-200/50">
                                <FileText className="w-6 h-6 text-amber-600" />
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors duration-200 text-sm">Contratos</h4>
                        </button>
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 1.05s forwards' }}>
                    <Card3D intensity={10} className="rounded-2xl h-full">
                        <button
                            onClick={handleRender}
                            className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 text-left group text-white w-full active:scale-[0.96] hover:from-amber-400 hover:to-orange-500 flex flex-col items-center text-center justify-center h-full"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-12 group-active:scale-90 transition-all duration-300 group-hover:bg-white/30">
                                <SparklesIcon className="w-6 h-6 text-white group-hover:animate-pulse" />
                            </div>
                            <h4 className="font-bold group-hover:tracking-wide transition-all duration-300 text-sm">Render IA</h4>
                        </button>
                    </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 1.15s forwards' }}>
                    <Card3D intensity={10} className="rounded-2xl">
                        <button
                            onClick={() => setView(ViewMode.PROFIT_BI)}
                            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-left group w-full active:scale-[0.96] hover:border-indigo-200 border border-transparent flex flex-col items-center text-center justify-center h-full"
                        >
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 group-active:scale-90 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-200/50">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            </div>
                            <h4 className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200 text-sm">Lucro Real (BI)</h4>
                        </button>
                    </Card3D>
                </div>
            </div>
        </div>
    );
};
