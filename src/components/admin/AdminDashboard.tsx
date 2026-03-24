import React, { useState, useEffect } from 'react';
import {
    Sparkles, Heart, Zap, TrendingUp, ChevronRight, Layers, FileText,
    MessageCircle, Star, Sparkles as SparklesIcon, MapPin, Clock,
    Package, AlertTriangle, ArrowUpRight, Plus, ClipboardList, Wallet,
    TrendingDown, BarChart3, Users, PlusCircle
} from 'lucide-react';
import { Card3D } from '@/components/animations/Card3D';
import { DashboardStat } from '@/components/ui/dashboard-stat';
import { ViewMode } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const db = supabase as any;

interface AdminDashboardProps {
    contracts: any[];
    setView: (view: ViewMode) => void;
    handleRender: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    contracts: initialContracts,
    setView,
    handleRender
}) => {
    const [stats, setStats] = useState({
        revenue: 0,
        signedCount: 0,
        inProduction: 0,
        openOS: 0,
        lowStock: 0,
        toReceive: 0,
        toPay: 0,
    });
    const [contracts, setContracts] = useState(initialContracts);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [
                contractsRes,
                osRes,
                stockRes,
                receivableRes,
                payableRes
            ] = await Promise.all([
                db.from('contracts').select('*, clients(name)').order('created_at', { ascending: false }),
                db.from('service_orders').select('id').eq('status', 'aberta'),
                db.from('products').select('id').lt('stock_quantity', db.raw('min_stock')),
                db.from('accounts_receivable').select('amount').eq('received', false),
                db.from('accounts_payable').select('amount').eq('paid', false),
            ]);

            const currentContracts = contractsRes.data || [];
            setContracts(currentContracts);

            const revenue = currentContracts.reduce((sum: number, c: any) => sum + (Number(c.value) || 0), 0);
            const signed = currentContracts.filter((c: any) => ['assinado', 'assasinado', 'assassinado', 'producao', 'instalacao', 'concluido'].includes(c.status)).length;
            const production = currentContracts.filter((c: any) => c.status === 'producao').length;
            
            const toReceive = (receivableRes.data || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
            const toPay = (payableRes.data || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

            setStats({
                revenue,
                signedCount: signed,
                inProduction: production,
                openOS: osRes.data?.length || 0,
                lowStock: stockRes.data?.length || 0,
                toReceive,
                toPay
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="p-8 space-y-8 overflow-auto h-full relative"
            style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}
        >
            {/* Animated Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full"></div>
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="bg-amber-500 p-2 rounded-2xl shadow-lg shadow-amber-200">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        Gestão Estratégica
                    </h1>
                    <p className="text-slate-500 mt-2 flex items-center gap-2 font-medium">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        Bem-vindo ao centro de comando SD Móveis
                    </p>
                </div>
                
                <div className="grid grid-cols-2 md:flex gap-3">
                    <div className="bg-white border border-slate-100 rounded-3xl px-5 py-3 shadow-sm flex flex-col items-center min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Sistema</p>
                        <p className="text-emerald-600 font-bold flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            ONLINE
                        </p>
                    </div>
                    <Button 
                        variant="gradient" 
                        size="lg" 
                        className="rounded-3xl shadow-xl shadow-amber-200 h-full font-black text-xs tracking-widest"
                        onClick={() => setView(ViewMode.BUDGET_QUOTE)}
                    >
                        <Plus className="w-5 h-5 mr-2" /> NOVO ORÇAMENTO
                    </Button>
                </div>
            </header>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <Card3D intensity={10} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm p-1">
                    <DashboardStat title={"Total Or\u00E7amentos"} value={`R$ ${(stats.revenue / 1000).toFixed(1)}K`} icon="💰" trend="+15% este mês" color="bg-amber-50" />
                </Card3D>
                <Card3D intensity={10} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm p-1">
                    <DashboardStat title="Projetos Ativos" value={contracts.length.toString()} icon="📁" trend={`${stats.signedCount} assinados`} color="bg-blue-50" />
                </Card3D>
                <Card3D intensity={10} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm p-1">
                    <DashboardStat title="Produção" value={stats.inProduction.toString()} icon="🏭" trend="Crescimento de 8%" color="bg-indigo-50" />
                </Card3D>
                <Card3D intensity={10} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm p-1">
                    <DashboardStat title="OS Abertas" value={stats.openOS.toString()} icon="📋" trend="Atenção necessária" color="bg-rose-50" />
                </Card3D>
            </div>

            {/* Middle Section: Insights & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Wisdom & Core Actions */}
                <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-left-6 duration-1000">
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[80px]" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-500/20 rounded-xl">
                                    <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                                </div>
                                <span className="text-amber-400 text-sm font-black uppercase tracking-[0.2em]">Sabedoria do Negócio</span>
                            </div>
                            <blockquote className="text-2xl md:text-3xl font-black text-slate-100 mb-10 leading-tight italic">
                                "Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."
                                <span className="block text-amber-500 text-lg mt-4 not-italic font-bold">Provérbios 16:3</span>
                            </blockquote>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => setView(ViewMode.PROMOB)}
                                    className="bg-amber-500 px-8 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 shadow-2xl shadow-amber-500/20 group"
                                >
                                    <Layers className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    NOVO PROJETO 3D
                                </button>
                                <button
                                    onClick={() => setView(ViewMode.CONTRACTS_MGMT)}
                                    className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all duration-300 flex items-center gap-3 active:scale-95 border border-white/10"
                                >
                                    <FileText className="w-5 h-5" />
                                    GERENCIAR CONTRATOS
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Functional Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => setView(ViewMode.CRM)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <MessageCircle className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-900 text-xs tracking-tight">CRM WhatsApp</span>
                        </button>
                        <button onClick={() => setView(ViewMode.PRODUCTS)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Package className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-900 text-xs tracking-tight">Estoque Real</span>
                        </button>
                        <button onClick={() => setView(ViewMode.CASH_REGISTER)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                                <Wallet className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-900 text-xs tracking-tight">Fluxo de Caixa</span>
                        </button>
                        <button onClick={() => setView(ViewMode.FLEET)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <MapPin className="w-7 h-7" />
                            </div>
                            <span className="font-black text-slate-900 text-xs tracking-tight">Frota & Trips</span>
                        </button>
                    </div>
                </div>

                {/* Right Sidebar: Health & Alerts */}
                <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-1000">
                    {/* Financial Summary */}
                    <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Saúde Financeira</h3>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center group cursor-pointer hover:bg-emerald-100 transition-colors">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">A Receber</p>
                                    <p className="text-2xl font-black text-slate-900">R$ {stats.toReceive.toLocaleString('pt-BR')}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-emerald-500 opacity-40 group-hover:scale-125 transition-transform" />
                            </div>
                            
                            <div className="p-5 bg-rose-50 rounded-3xl border border-rose-100 flex justify-between items-center group cursor-pointer hover:bg-rose-100 transition-colors">
                                <div>
                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Contas a Pagar</p>
                                    <p className="text-2xl font-black text-slate-900">R$ {stats.toPay.toLocaleString('pt-BR')}</p>
                                </div>
                                <TrendingDown className="w-8 h-8 text-rose-500 opacity-40 group-hover:scale-125 transition-transform" />
                            </div>
                        </div>
                    </div>

                    {/* Alerts Section */}
                    {(stats.lowStock > 0 || stats.openOS > 5) && (
                        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Atenção do Gestor
                            </h3>
                            <div className="space-y-4">
                                {stats.lowStock > 0 && (
                                    <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <Package className="w-5 h-5 text-amber-600" />
                                        <p className="text-xs font-bold text-amber-900 leading-tight">
                                            {stats.lowStock} materiais abaixo do estoque mínimo.
                                        </p>
                                    </div>
                                )}
                                {stats.openOS > 0 && (
                                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <ClipboardList className="w-5 h-5 text-blue-600" />
                                        <p className="text-xs font-bold text-blue-900 leading-tight">
                                            {stats.openOS} ordens de serviço pendentes de início.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Render Shortcut */}
                    <Card3D intensity={15} className="rounded-[3rem]">
                        <button 
                            onClick={handleRender}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 p-8 rounded-[3rem] text-white overflow-hidden group relative"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Inteligência Artificial</p>
                                    <h4 className="text-2xl font-black">GERAR RENDER</h4>
                                </div>
                                <SparklesIcon className="w-10 h-10 group-hover:rotate-45 transition-transform duration-500" />
                            </div>
                        </button>
                    </Card3D>
                </div>
            </div>

            {/* Bottom: Recent Contracts Table */}
            <section className="relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Or\u00E7amentos Recentes</h3>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Últimos contratos firmados</p>
                            </div>
                        </div>
                        <button onClick={() => setView(ViewMode.CONTRACTS_MGMT)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border border-slate-100">
                            Ver todos <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contracts.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="group p-6 bg-slate-50 hover:bg-white hover:shadow-xl hover:border-slate-200 border border-transparent rounded-[2.5rem] transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                                        <Users className="w-6 h-6 text-slate-400 group-hover:text-amber-600" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                        c.status === 'concluido' ? 'bg-emerald-100 text-emerald-600' :
                                        c.status === 'producao' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 line-clamp-1">{c.clients?.name || 'Projeto Especial'}</h4>
                                <p className="text-xs text-slate-400 font-bold mt-1 line-clamp-1">{c.title || c.name}</p>
                                <div className="mt-8 pt-6 border-t border-slate-200/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-slate-300" />
                                        <span className="text-lg font-black text-slate-900">R$ {(c.value || 0).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-black">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                        {contracts.length === 0 && (
                            <div className="col-span-3 py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
                                <PlusCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum contrato ativo</p>
                                <Button variant="link" className="mt-2 font-bold" onClick={() => setView(ViewMode.CONTRACTS_MGMT)}>Criar Primeiro Contrato</Button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};
