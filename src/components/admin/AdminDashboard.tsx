import React, { useState, useEffect } from 'react';
import {
    Sparkles, Heart, Zap, TrendingUp, ChevronRight, Layers, FileText,
    MessageCircle, Star, Sparkles as SparklesIcon, MapPin, Clock,
    Package, AlertTriangle, ArrowUpRight, Plus, ClipboardList, Wallet,
    TrendingDown, BarChart3, Users, PlusCircle, Ruler, Box, Download, Monitor, ExternalLink, FileCode, Shield
} from 'lucide-react';
import { generatePromobXML, downloadFile, generateDXF } from '@/services/promobService';
import { Card3D } from '@/components/animations/Card3D';
import { DashboardStat } from '@/components/ui/dashboard-stat';
import { ViewMode } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
    const [studioMeasurements, setStudioMeasurements] = useState<any[]>([]);
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
                payableRes,
                studioRes
            ] = await Promise.all([
                db.from('contracts').select('*, clients(name)').order('created_at', { ascending: false }),
                db.from('service_orders').select('id').eq('status', 'aberta'),
                db.from('products').select('id').lt('stock_quantity', db.raw('min_stock')),
                db.from('accounts_receivable').select('amount').eq('received', false),
                db.from('accounts_payable').select('amount').eq('paid', false),
                db.from('studio_measurements').select('*').order('created_at', { ascending: false }).limit(5),
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
            setStudioMeasurements(studioRes.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-[#D4AF37]/5 blur-[200px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-[#D4AF37]/3 blur-[180px] rounded-full -translate-x-1/2 translate-y-1/2" />
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10 animate-in fade-in slide-in-from-top-6 duration-1000">
                <div>
                  <h1 className="text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter flex items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[28px] flex items-center justify-center text-black shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        Gestão <span className="text-[#D4AF37]">Estratégica</span>
                    </h1>
                    <p className="text-gray-500 mt-5 font-medium italic flex items-center gap-3 text-lg">
                        <Shield className="w-5 h-5 text-[#D4AF37]" /> Bem-vindo à Central de Comando SD Móveis Premium
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-5">
                    <div className="bg-[#111111] border border-white/5 rounded-[2rem] px-8 py-4 flex flex-col items-center justify-center min-w-[160px] shadow-2xl">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1 italic">Status Rede</p>
                        <p className="text-[#D4AF37] font-black flex items-center gap-3 text-sm">
                            <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
                            SINEWAVE ACTIVE
                        </p>
                    </div>
                    <button
                        onClick={() => setView(ViewMode.BUDGET_QUOTE)}
                        className="px-10 h-20 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
                    >
                        <Plus className="w-5 h-5" /> NOVO ORÇAMENTO
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                {[
                    { title: "Volume Orçamentado", value: `R$ ${(stats.revenue / 1000).toFixed(1)}K`, icon: "💰", trend: "Fluxo Global Bruto", color: "text-[#D4AF37]" },
                    { title: "Portfolio Ativo", value: contracts.length.toString(), icon: "📁", trend: `${stats.signedCount} Assinados`, color: "text-white" },
                    { title: "Linha de Produção", value: stats.inProduction.toString(), icon: "🏭", trend: "Alta Performance", color: "text-white" },
                    { title: "Ordens de Serviço", value: stats.openOS.toString(), icon: "📋", trend: "Pendências Técnicas", color: "text-red-500" },
                ].map((stat, i) => (
                    <Card3D key={i} intensity={10} className="rounded-[3rem]">
                        <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl group hover:border-[#D4AF37]/20 transition-all flex flex-col relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
                             <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-4 italic">{stat.title}</p>
                             <div className="flex items-center justify-between mb-4">
                                <p className={`text-4xl font-black italic tracking-tighter tabular-nums ${stat.color}`}>{stat.value}</p>
                                <span className="text-3xl opacity-20 filter grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
                             </div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic flex items-center gap-2">
                                <Zap className="w-3 h-3 text-[#D4AF37]" /> {stat.trend}
                             </p>
                        </div>
                    </Card3D>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
                <div className="lg:col-span-2 space-y-10">
                    <div className="rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl border border-white/5 bg-gradient-to-br from-[#111111] to-black">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="p-4 rounded-[20px] bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                                    <Star className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37]" />
                                </div>
                                <span className="text-[#D4AF37] text-sm font-black uppercase tracking-[0.4em] italic leading-none">Diretriz Dominante</span>
                            </div>
                            <blockquote className="text-3xl md:text-4xl font-black text-white mb-12 leading-tight italic tracking-tighter">
                                "Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."
                                <span className="block text-[#D4AF37] text-xl mt-6 not-italic font-bold tracking-widest opacity-60">PROVÉRBIOS 16:3</span>
                            </blockquote>
                            
                            <div className="flex flex-wrap gap-6">
                                <button
                                    onClick={() => setView(ViewMode.PROMOB)}
                                    className="px-10 h-20 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-4 shadow-2xl text-black bg-gradient-to-r from-[#D4AF37] to-[#b8952a] italic"
                                >
                                    <Layers className="w-6 h-6" /> NOVO PROJETO 3D
                                </button>
                                <button
                                    onClick={() => setView(ViewMode.CONTRACTS_MGMT)}
                                    className="px-10 h-20 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-95 italic"
                                >
                                    <FileText className="w-6 h-6 mr-3" /> GESTÃO CONTRATUAL
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'CRM WhatsApp', icon: MessageCircle, view: ViewMode.CRM },
                            { label: 'Estoque Real', icon: Package, view: ViewMode.PRODUCTS },
                            { label: 'Fluxo Caixa', icon: Wallet, view: ViewMode.CASH_REGISTER },
                            { label: 'Frota SD', icon: MapPin, view: ViewMode.FLEET },
                        ].map(({ label, icon: Icon, view }) => (
                            <button key={label} onClick={() => setView(view)}
                                className="p-8 rounded-[3rem] border border-white/5 bg-[#111111] transition-all flex flex-col items-center gap-4 group hover:border-[#D4AF37]/30 hover:-translate-y-2 shadow-2xl"
                            >
                                <div className="w-16 h-16 rounded-[22px] bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                                    <Icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="font-black text-gray-500 text-[10px] tracking-[0.2em] group-hover:text-white transition-colors uppercase italic">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="rounded-[3.5rem] p-10 border border-white/5 shadow-2xl bg-[#111111] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-[18px] flex items-center justify-center text-black bg-gradient-to-br from-[#D4AF37] to-[#b8952a]">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">Saúde de Fluxo</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="p-8 rounded-[2.5rem] border border-[#D4AF37]/20 bg-[#D4AF37]/5 group cursor-pointer transition-all hover:border-[#D4AF37]/50" onClick={() => setView(ViewMode.ACCOUNTS)}>
                                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-2 italic">Receita Projetada</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {stats.toReceive.toLocaleString('pt-BR')}</p>
                                    <TrendingUp className="w-8 h-8 text-[#D4AF37] opacity-40 group-hover:scale-125 transition-transform" />
                                </div>
                            </div>
                            
                            <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] group cursor-pointer transition-all hover:border-red-500/30" onClick={() => setView(ViewMode.ACCOUNTS)}>
                                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2 italic">Contas a Pagar</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {stats.toPay.toLocaleString('pt-BR')}</p>
                                    <TrendingDown className="w-8 h-8 text-gray-800 opacity-40 group-hover:scale-125 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {(stats.lowStock > 0 || stats.openOS > 0) && (
                        <div className="rounded-[3.5rem] p-10 border border-red-500/10 shadow-2xl bg-[#111111] animate-pulse">
                            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 uppercase italic tracking-tighter">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                Critical Insights
                            </h3>
                            <div className="space-y-5">
                                {stats.lowStock > 0 && (
                                    <div className="flex items-center gap-5 p-5 rounded-3xl border border-red-500/10 bg-red-500/[0.02]">
                                        <Package className="w-5 h-5 text-red-600" />
                                        <p className="text-[10px] font-black text-gray-400 leading-tight uppercase tracking-widest italic">
                                            {stats.lowStock} Ativos em Ruptura de Estoque
                                        </p>
                                    </div>
                                )}
                                {stats.openOS > 0 && (
                                    <div className="flex items-center gap-5 p-5 rounded-3xl border border-amber-500/10 bg-amber-500/[0.02]">
                                        <ClipboardList className="w-5 h-5 text-amber-500" />
                                        <p className="text-[10px] font-black text-gray-400 leading-tight uppercase tracking-widest italic">
                                            {stats.openOS} Ordens Pendentes de Iniciação
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <Card3D intensity={15} className="rounded-[3.5rem]">
                        <button 
                            onClick={handleRender}
                            className="w-full h-32 rounded-[3.5rem] overflow-hidden group relative flex items-center justify-between px-10 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] shadow-[0_20px_60px_rgba(212,175,55,0.25)]"
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity" />
                            <div className="relative z-10 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-black/70 italic">SD Vision AI</p>
                                <h4 className="text-2xl font-black text-black italic tracking-tighter uppercase">GERAR RENDER</h4>
                            </div>
                            <SparklesIcon className="w-12 h-12 text-black/80 group-hover:rotate-45 transition-transform duration-700" />
                        </button>
                    </Card3D>
                </div>
            </div>

            <section className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="rounded-[4.5rem] p-12 border border-white/5 bg-[#111111] shadow-2xl">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center text-black bg-gradient-to-br from-[#D4AF37] to-[#b8952a]">
                                <TrendingUp className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Painel de Contratos</h3>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-2 italic shadow-sm">Últimos Fechamentos SD</p>
                            </div>
                        </div>
                        <button onClick={() => setView(ViewMode.CONTRACTS_MGMT)}
                            className="h-14 px-8 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all font-black text-[10px] uppercase tracking-widest italic flex items-center gap-3 active:scale-95">
                            Ver todos <ArrowUpRight className="w-5 h-5 font-black" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {contracts.slice(0, 3).map((c) => (
                            <div key={c.id} className="group p-10 rounded-[3.5rem] transition-all cursor-pointer border border-white/5 bg-white/[0.01] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 flex flex-col" onClick={() => setView(ViewMode.CONTRACTS_MGMT)}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 bg-white/5 group-hover:border-[#D4AF37]/30 transition-all">
                                        <Users className="w-7 h-7 text-gray-700 group-hover:text-[#D4AF37] transition-all" />
                                    </div>
                                    <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border italic transition-all ${
                                        c.status === 'concluido' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                        c.status === 'producao' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                        'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}`}>
                                        {c.status}
                                    </span>
                                </div>
                                <h4 className="text-2xl font-black text-white group-hover:text-[#D4AF37] transition-colors italic tracking-tighter uppercase mb-2 leading-none">{c.clients?.name || 'Venda Direta'}</h4>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic flex items-center gap-2">
                                  <Box className="w-3.5 h-3.5 opacity-40" /> {c.title || c.name}
                                </p>
                                <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="w-5 h-5 text-[#D4AF37]/50" />
                                        <span className="text-2xl font-black text-white italic tabular-nums leading-none">R$ {(c.value || 0).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-700 font-black italic tabular-nums uppercase">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <div className="rounded-[4.5rem] p-12 border border-blue-500/10 bg-[#0f172a]/20 shadow-2xl">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
                                <Monitor className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Studio AR Feed</h3>
                                <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-[0.3em] mt-2 italic shadow-sm">Exportação para Promob Plus Desktop</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {studioMeasurements.map((m) => (
                            <div key={m.id} className="group p-10 rounded-[3.5rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col">
                                <div className="aspect-video rounded-[2.5rem] overflow-hidden mb-8 relative">
                                    <img src={m.simulation_url || m.image_url} alt="Ambiente" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                    <div className="absolute bottom-6 left-6">
                                      <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase italic tracking-widest">{m.ambiente || 'COZINHA'}</span>
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 leading-none">{m.client_name}</h4>
                                <div className="grid grid-cols-3 gap-6 mb-8 pt-6 border-t border-white/5">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Largura</span>
                                    <span className="text-sm font-black text-blue-500 italic tabular-nums">{m.dimensions?.width?.toFixed(2)}m</span>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Altura</span>
                                    <span className="text-sm font-black text-blue-500 italic tabular-nums">{m.dimensions?.height?.toFixed(2)}m</span>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest italic">Profundidade</span>
                                    <span className="text-sm font-black text-blue-500 italic tabular-nums">{m.dimensions?.depth?.toFixed(2)}m</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-auto">
                                  <button
                                      onClick={() => {
                                        const xml = generatePromobXML({ projectName: `SD_${m.client_name}`, customerName: m.client_name, dimensions: m.dimensions, items: m.items || [], imageUrl: m.image_url });
                                        downloadFile(xml, `promob-${m.client_name}.xml`, 'text/xml');
                                      }}
                                      className="h-14 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-[1.2rem] font-black text-[10px] flex items-center justify-center gap-2 transition-all italic uppercase tracking-widest"
                                  >
                                      <Download className="w-4 h-4" /> XML
                                  </button>
                                  <button
                                      onClick={() => {
                                        const dxf = generateDXF(m.dimensions?.width, m.dimensions?.depth);
                                        downloadFile(dxf, `cad-${m.client_name}.dxf`, 'image/vnd.dxf');
                                      }}
                                      className="h-14 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-[1.2rem] font-black text-[10px] flex items-center justify-center gap-2 transition-all italic uppercase tracking-widest"
                                  >
                                      <FileCode className="w-4 h-4" /> DXF
                                  </button>
                                  <button
                                      onClick={() => {
                                        const text = `L: ${m.dimensions?.width?.toFixed(2)}m | A: ${m.dimensions?.height?.toFixed(2)}m | P: ${m.dimensions?.depth?.toFixed(2)}m`;
                                        navigator.clipboard.writeText(text);
                                        toast({ title: '✅ Medidas Copiadas' });
                                      }}
                                      className="h-14 bg-white/5 border border-white/5 text-gray-500 hover:text-white rounded-[1.2rem] font-black text-[10px] flex items-center justify-center gap-2 transition-all italic uppercase tracking-widest"
                                  >
                                      <Monitor className="w-4 h-4" /> COPY
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
