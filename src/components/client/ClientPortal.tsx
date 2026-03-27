import React from 'react';
import {
    Home, Heart, Calendar, Timer, Package, CheckCircle, Wrench, Truck,
    Camera, Sparkles, ArrowRight, Clock, Eye, Download, Share2, ThumbsUp, Shield, ChevronRight, Activity
} from 'lucide-react';
import { ViewMode } from '@/types';

interface ClientPortalProps {
    clientName: string;
    clientProject: any;
    clientInstallments: any[];
    clientProductionSteps: any[];
    clientTimeline: any[];
    galleryItems: any[];
    projectApproved: boolean;
    setProjectApproved: (approved: boolean) => void;
    setView: (view: ViewMode) => void;
    setShowClientContract: (show: boolean) => void;
    setShowClientFinanceiro: (show: boolean) => void;
    setGalleryFullscreen: (item: any) => void;
    toast: any;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
    clientName,
    clientProject,
    clientInstallments,
    clientProductionSteps,
    clientTimeline,
    galleryItems,
    projectApproved,
    setProjectApproved,
    setView,
    setShowClientContract,
    setShowClientFinanceiro,
    setGalleryFullscreen,
    toast
}) => {
    return (
        <div className="p-4 sm:p-8 space-y-10 overflow-auto h-full bg-[#0f0f0f] relative luxury-scroll">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full" />
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Minha Casa <span className="text-[#D4AF37]">SD</span>
                    </h1>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-full px-5 py-2 w-fit backdrop-blur-md">
                        <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">
                            {clientName ? `Seja bem-vindo, ${clientName.split(' ')[0]}` : 'Bem-vindo ao seu novo lar'}
                        </p>
                    </div>
                </div>

                {clientProject?.estimated_delivery && (
                    <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group min-w-[300px]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                           <Sparkles className="w-12 h-12 text-[#D4AF37]" />
                        </div>
                        <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" /> Entrega Programada
                        </p>
                        <p className="text-white font-black text-2xl italic tracking-tighter uppercase">
                            {new Date(clientProject.estimated_delivery + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <div className="mt-6 flex items-center gap-3 bg-amber-500/10 rounded-2xl px-4 py-3 border border-amber-500/20">
                            <Timer className="w-5 h-5 text-[#D4AF37] animate-spin-slow" />
                            <p className="text-[#D4AF37] font-black text-[11px] uppercase tracking-widest">
                                {(() => {
                                    const days = Math.max(0, Math.ceil((new Date(clientProject.estimated_delivery + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    return days > 0 ? `${days} dias para o grande dia` : 'O sonho se tornou realidade!';
                                })()}
                            </p>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                    <div className="flex items-center gap-4 mb-10">
                       <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">🏭</div>
                       <div>
                          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Acompanhamento Técnico</p>
                          <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mt-1">Status: <span className="text-blue-500">{clientProject?.status || 'Processando'}</span></h3>
                       </div>
                    </div>
                    
                    <div className="space-y-8">
                        {clientProductionSteps.length > 0 ? clientProductionSteps.map((step) => (
                            <div key={step.id} className="space-y-3 group/step">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover/step:text-white transition-colors flex items-center gap-2">
                                        {step.progress === 100 ? <CheckCircle className="w-4 h-4 text-green-500" /> : step.progress > 0 ? <Activity className="w-4 h-4 text-blue-500 animate-pulse" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
                                        {step.label}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${step.progress === 100 ? 'text-green-500' : step.progress > 0 ? 'text-blue-500' : 'text-gray-700'}`}>
                                        {step.progress === 100 ? 'CONCLUÍDO' : step.progress > 0 ? `${step.progress}%` : (step.status || 'PENDENTE')}
                                    </span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-1.5 border border-white/5 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${step.progress === 100 ? 'bg-green-500' : step.progress > 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-transparent'}`} style={{ width: `${step.progress}%` }} />
                                </div>
                            </div>
                        )) : (
                            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                               <Package className="w-8 h-8 mx-auto mb-3" />
                               <p className="text-[10px] font-black uppercase tracking-[0.2em]">Otimizando cronograma de produção...</p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setView(ViewMode.PORTFOLIO)}
                    className="bg-gradient-to-br from-[#111111] to-black border border-[#D4AF37]/10 rounded-[3rem] p-10 text-white text-left hover:border-[#D4AF37]/40 transition-all shadow-2xl group relative overflow-hidden h-full flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/[0.02] blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div>
                        <div className="w-20 h-20 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center text-4xl mb-10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                            <Camera className="w-10 h-10 text-[#D4AF37]" />
                        </div>
                        <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-tight mb-4">
                            Sessão <span className="text-[#D4AF37]">Visual</span> 4K
                        </h3>
                        <p className="text-gray-500 font-medium italic text-lg leading-relaxed max-w-sm">
                            Visualize cada detalhe do seu projeto com fidelidade cinematográfica.
                        </p>
                    </div>
                    <div className="mt-10 flex items-center gap-4 text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] group-hover:gap-6 transition-all duration-500">
                        EXPLORAR PORTFÓLIO <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {/* Control Panel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <button 
                  onClick={() => setShowClientFinanceiro(true)} 
                  className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl text-center group hover:bg-white/[0.02] transition-all relative overflow-hidden"
                >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">💳</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2 group-hover:text-white transition-colors">Tesouraria</p>
                    {(() => {
                        const paid = clientInstallments.filter(i => i.status === 'Pago').length;
                        const total = clientInstallments.length;
                        const next = clientInstallments.find(i => i.status === 'Pendente');
                        return (
                            <div className="space-y-4">
                                <p className="text-2xl font-black text-white italic tracking-tighter uppercase">{total > 0 ? `${paid}/${total} Parcelas` : 'Status OK'}</p>
                                <div className="flex items-center justify-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                                   <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Fluxo em Dia</p>
                                </div>
                                {next && (
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Próxima Parcela</p>
                                        <p className="text-sm font-black text-amber-500 italic tracking-tighter">
                                            {new Date(next.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — R$ {Number(next.amount).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </button>

                <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl text-center group hover:bg-white/[0.02] transition-all relative overflow-hidden">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">💬</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2 group-hover:text-white transition-colors">Conexão Direta</p>
                    <button onClick={() => setView(ViewMode.CRM)} className="text-2xl font-black text-white italic tracking-tighter uppercase hover:text-[#D4AF37] transition-colors">
                        Suporte VIP
                    </button>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                       <Shield className="w-3.5 h-3.5 text-green-500" />
                       <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">Tempo Médio: 45 min</p>
                    </div>
                </div>

                <button 
                  onClick={() => setShowClientContract(true)} 
                  className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl text-center group hover:bg-white/[0.02] transition-all relative overflow-hidden"
                >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">📝</div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2 group-hover:text-white transition-colors">Legal & Compliance</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter uppercase">Protocolo Ativo</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-[#D4AF37] font-black uppercase tracking-[0.2em] text-[10px]">
                        <Download className="w-4 h-4" /> REVISAR CONTRATO
                    </div>
                </button>
            </div>

            {/* Timeline Section */}
            <div className="bg-[#111111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
                <h3 className="font-black text-white text-xl flex items-center gap-4 italic uppercase tracking-tighter mb-12">
                    <Clock className="w-6 h-6 text-[#D4AF37]" /> Master Timeline
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative px-4">
                    {(() => {
                        const steps = clientTimeline.length > 0 ? clientTimeline : [
                            { label: 'Assinatura', step_date: 'Fev/26', done: true, icon: '✍️' },
                            { label: 'Briefing 3D', step_date: 'Mar/26', done: true, icon: '🖥️' },
                            { label: 'Processamento', step_date: 'Abr/26', done: true, icon: '🏭' },
                            { label: 'Expedição', step_date: 'Mai/26', done: false, icon: '📦' },
                            { label: 'Instalação', step_date: 'Mai/26', done: false, icon: '🔧' },
                        ];
                        const doneCount = steps.filter(s => s.done).length;
                        const progressPct = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;
                        return (
                            <>
                                <div className="absolute top-[2.45rem] left-8 right-8 h-[2px] bg-white/5 z-0 hidden md:block">
                                    <div className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-600 shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                                </div>
                                {steps.map((step: any, i: number) => (
                                    <div key={step.id || i} className="flex flex-col items-center text-center relative z-10 group/item">
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-4 transition-all duration-500 border ${
                                          step.done 
                                            ? 'bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black border-transparent shadow-xl scale-110' 
                                            : 'bg-black/40 text-gray-700 border-white/5 group-hover/item:border-white/20'
                                        }`}>
                                            {step.done ? <CheckCircle className="w-10 h-10" /> : (step.icon || '📋')}
                                        </div>
                                        <p className={`text-[11px] font-black uppercase tracking-widest ${step.done ? 'text-white italic' : 'text-gray-600'}`}>{step.label}</p>
                                        <p className="text-[10px] text-[#D4AF37]/50 font-bold mt-1 uppercase tracking-tighter">{step.step_date || ''}</p>
                                    </div>
                                ))}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
