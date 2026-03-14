import React from 'react';
import {
    Home, Heart, Calendar, Timer, Package, CheckCircle, Wrench, Truck,
    Camera, Sparkles, ArrowRight, Clock, Eye, Download, Share2, ThumbsUp, Shield
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
        <div className="p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                        <Home className="w-8 h-8 text-amber-500" />
                        Minha Casa SD
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        {clientName ? `Olá, ${clientName}! Acompanhando cada detalhe do seu sonho` : 'Acompanhando cada detalhe do seu sonho'}
                    </p>
                </div>
                {clientProject?.estimated_delivery && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-3 shadow-sm">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Previsão de Instalação
                        </p>
                        <p className="text-amber-700 font-bold text-lg">
                            {new Date(clientProject.estimated_delivery + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2 mt-2 bg-amber-100 rounded-xl px-3 py-1.5">
                            <Timer className="w-4 h-4 text-amber-600" />
                            <p className="text-amber-700 font-black text-sm">
                                {(() => {
                                    const days = Math.max(0, Math.ceil((new Date(clientProject.estimated_delivery + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    return days > 0 ? `Faltam ${days} dias para seu sonho! ✨` : 'O grande dia chegou! 🎉';
                                })()}
                            </p>
                        </div>
                    </div>
                )}
            </header>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 shadow-xl">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-4">🏭</div>
                    <p className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Status: {clientProject?.status || 'Produção'}
                    </p>
                    <div className="space-y-4">
                        {clientProductionSteps.length > 0 ? clientProductionSteps.map((step) => (
                            <div key={step.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 flex items-center gap-1">
                                        {step.progress === 100 ? <CheckCircle className="w-4 h-4 text-green-500" /> : step.progress > 0 ? <Wrench className="w-4 h-4 text-blue-500" /> : <Truck className="w-4 h-4 text-gray-400" />}
                                        {step.label}
                                    </span>
                                    <span className={`font-bold ${step.progress === 100 ? 'text-green-600' : step.progress > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {step.progress === 100 ? 'Concluído ✓' : step.progress > 0 ? `${step.progress}% Pronto` : (step.status || 'Aguardando')}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div className={`h-3 rounded-full ${step.progress === 100 ? 'bg-green-500' : step.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${step.progress}%` }} />
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-sm">Etapas de produção serão exibidas em breve.</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setView(ViewMode.PORTFOLIO)}
                    className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white text-left hover:scale-[1.02] transition-transform shadow-xl group"
                >
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-black flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                        Galeria de Renders 4K
                    </h3>
                    <p className="text-gray-400 mt-2 text-sm">Veja como ficará seu ambiente projetado com nossa tecnologia de fotorrealismo.</p>
                    <span className="inline-flex items-center gap-1 mt-4 text-amber-500 font-bold text-sm group-hover:gap-2 transition-all">
                        Abrir Portfolio <ArrowRight className="w-4 h-4" />
                    </span>
                </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-6">
                <button onClick={() => setShowClientFinanceiro(true)} className="bg-white rounded-3xl p-6 shadow-xl text-center hover:shadow-2xl transition-shadow cursor-pointer w-full">
                    <span className="text-4xl mb-4 block">💳</span>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-2">Financeiro</p>
                    {(() => {
                        const paid = clientInstallments.filter(i => i.status === 'Pago').length;
                        const total = clientInstallments.length;
                        const next = clientInstallments.find(i => i.status === 'Pendente');
                        return (
                            <>
                                <p className="text-xl font-black text-gray-900">{total > 0 ? `${paid}/${total} Parcelas` : clientProject?.payment_status || '—'}</p>
                                <p className={`text-sm font-bold mt-1 ${paid === total && total > 0 ? 'text-green-600' : 'text-green-600'}`}>
                                    {paid === total && total > 0 ? 'Quitado ✓' : 'Em dia ✓'}
                                </p>
                                {next && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-400">Próxima parcela</p>
                                        <p className="text-sm font-bold text-amber-600">
                                            {new Date(next.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — R$ {Number(next.amount).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </button>
                <div className="bg-white rounded-3xl p-6 shadow-xl text-center hover:shadow-2xl transition-shadow">
                    <span className="text-4xl mb-4 block">💬</span>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-2">Suporte</p>
                    <button onClick={() => setView(ViewMode.CRM)} className="text-xl font-bold text-gray-900 hover:text-amber-600 transition-colors">
                        Falar com Projetista
                    </button>
                    <p className="text-sm text-gray-500 mt-1">Resposta em 2h</p>
                </div>
                <button onClick={() => setShowClientContract(true)} className="bg-white rounded-3xl p-6 shadow-xl text-center hover:shadow-2xl transition-shadow cursor-pointer w-full">
                    <span className="text-4xl mb-4 block">📝</span>
                    <p className="text-xs text-gray-400 uppercase font-bold mb-2">Contrato</p>
                    <p className="text-xl font-black text-gray-900">{clientProject?.status || 'Assinado'}</p>
                    <p className="text-sm text-green-600 font-bold mt-1 flex items-center justify-center gap-1">
                        <Shield className="w-4 h-4" /> Ver Detalhes
                    </p>
                </button>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-3xl p-8 shadow-xl">
                <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Linha do Tempo do Projeto
                </h3>
                <div className="flex items-center justify-between relative">
                    {(() => {
                        const steps = clientTimeline.length > 0 ? clientTimeline : [
                            { label: 'Assinatura', step_date: '', done: true, icon: '✍️' },
                            { label: 'Projeto 3D', step_date: '', done: true, icon: '🖥️' },
                            { label: 'Produção', step_date: '', done: true, icon: '🏭' },
                            { label: 'Expedição', step_date: '', done: false, icon: '📦' },
                            { label: 'Instalação', step_date: '', done: false, icon: '🔧' },
                        ];
                        const doneCount = steps.filter(s => s.done).length;
                        const progressPct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
                        return (
                            <>
                                <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
                                    <div className="h-1 bg-green-500" style={{ width: `${progressPct}%` }} />
                                </div>
                                {steps.map((step: any, i: number) => (
                                    <div key={step.id || i} className="flex flex-col items-center relative z-10">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {step.done ? '✓' : (step.icon || '📋')}
                                        </div>
                                        <p className={`text-xs font-bold ${step.done ? 'text-green-600' : 'text-gray-500'}`}>{step.label}</p>
                                        <p className="text-xs text-gray-400">{step.step_date || ''}</p>
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
