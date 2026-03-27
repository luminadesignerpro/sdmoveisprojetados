import React from 'react';
import { Instagram, Bell, Settings, ArrowRight, Clock, Navigation, MessageSquare } from 'lucide-react';
import { ViewMode } from '@/types';
import { NavIcon } from '@/components/ui/nav-icon';
import logoSD from '@/assets/logo-sd.jpeg';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppSidebarProps {
    authState: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
    view: ViewMode;
    setView: (view: ViewMode) => void;
    setAuthState: (state: 'SELECT' | 'LOGIN' | 'ADMIN' | 'CLIENT' | 'EMPLOYEE') => void;
}

// Menu do funcionário no mobile: cards empilhados verticalmente (estilo tela de seleção de perfil)
const EmployeeMobileMenu: React.FC<{ view: ViewMode; setView: (v: ViewMode) => void; setAuthState: (s: 'SELECT') => void }> = ({ view, setView, setAuthState }) => {
    const items = [
        { icon: Clock, label: 'MEU PONTO', sub: 'Registre sua presença', mode: ViewMode.TIME_TRACKING, color: '#1a56a0' },
        { icon: Navigation, label: 'VIAGENS', sub: 'Controle de rotas e frota', mode: ViewMode.FLEET, color: '#d4a017' },
        { icon: MessageSquare, label: 'CHAT', sub: 'Comunicação interna', mode: ViewMode.CHAT, color: '#2d6a4f' },
    ];

    return (
        <aside
            className="flex flex-col items-center min-h-screen w-full relative z-10"
            style={{ background: 'linear-gradient(180deg, hsl(var(--sidebar-background) / 0.97) 0%, hsl(var(--sidebar-background)) 100%)' }}
        >
            {/* Logo */}
            <div className="flex flex-col items-center pt-6 pb-4 w-full px-4">
                <img src={logoSD} alt="SD Móveis" className="w-16 h-16 rounded-2xl border-2 border-primary shadow-lg object-cover mb-2" />
                <p className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">SD Móveis Projetados</p>
            </div>

            {/* Cards de navegação empilhados */}
            <nav className="flex flex-col gap-3 w-full px-3 flex-1">
                {items.map(({ icon: Icon, label, sub, mode, color }) => {
                    const isActive = view === mode;
                    return (
                        <button
                            key={label}
                            onClick={() => setView(mode)}
                            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 border"
                            style={{
                                background: isActive
                                    ? `linear-gradient(135deg, ${color}ee, ${color}bb)`
                                    : 'hsl(var(--card) / 0.6)',
                                borderColor: isActive ? `${color}88` : 'hsl(var(--border) / 0.3)',
                                boxShadow: isActive ? `0 4px 20px ${color}44` : 'none',
                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: isActive ? 'rgba(255,255,255,0.2)' : `${color}22` }}
                            >
                                <Icon className="w-6 h-6" style={{ color: isActive ? '#fff' : color }} />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-sm tracking-wide" style={{ color: isActive ? '#fff' : 'hsl(var(--foreground))' }}>{label}</p>
                                <p className="text-[11px] font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.75)' : 'hsl(var(--muted-foreground))' }}>{sub}</p>
                            </div>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-8 rounded-full bg-white/60" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Rodapé: Configurações e Sair */}
            <div className="flex flex-col gap-2 w-full px-3 pb-6 mt-4">
                <button
                    onClick={() => setView(ViewMode.SETTINGS)}
                    className="w-full rounded-xl p-3 flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-xs font-bold">Configurações</span>
                </button>
                <button
                    onClick={() => setAuthState('SELECT')}
                    className="w-full rounded-xl p-3 flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                    <span className="text-xs font-bold">Sair</span>
                </button>
            </div>
        </aside>
    );
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ authState, view, setView, setAuthState }) => {
    const isMobile = useIsMobile();

    // No mobile, funcionários veem menu vertical estilo "seleção de perfil"
    if (isMobile && authState === 'EMPLOYEE') {
        return <EmployeeMobileMenu view={view} setView={setView} setAuthState={() => setAuthState('SELECT')} />;
    }

    return (
        <aside
            className={`${isMobile ? 'w-16' : 'w-24'} flex flex-col items-center py-4 gap-2 min-h-0 overflow-y-auto relative z-10 backdrop-blur-xl border-r border-sidebar-border/30`}
            style={{ background: 'linear-gradient(180deg, hsl(var(--sidebar-background) / 0.92) 0%, hsl(var(--sidebar-background) / 0.98) 100%)', boxShadow: '4px 0 30px hsl(var(--primary) / 0.08), inset -1px 0 0 hsl(var(--primary) / 0.06)' }}
        >
            <button onClick={() => setView(authState === 'ADMIN' ? ViewMode.DASHBOARD : authState === 'EMPLOYEE' ? ViewMode.TIME_TRACKING : ViewMode.CLIENT_PORTAL)} className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary shadow-glow hover:scale-110 transition-all duration-300">
                <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
            </button>
            <nav className="flex-1 flex flex-col items-center gap-2 mt-6 overflow-y-auto w-full">
                {authState === 'ADMIN' ? (
                    <>
                        <NavIcon icon="layout-dashboard" label={"In\u00EDcio"} active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} />
                        <NavIcon icon="cube" label="3D" active={view === ViewMode.DASHBOARD_3D} onClick={() => setView(ViewMode.DASHBOARD_3D)} />
                        <NavIcon icon="file-text" label="Projetagem SD" active={view === ViewMode.CONTRACTS} onClick={() => setView(ViewMode.CONTRACTS)} />
                        <NavIcon icon="building" label="Fornecedores" active={view === ViewMode.SUPPLIERS} onClick={() => setView(ViewMode.SUPPLIERS)} />
                        <NavIcon icon="package" label="Estoque" active={view === ViewMode.PRODUCTS} onClick={() => setView(ViewMode.PRODUCTS)} />
                        <NavIcon icon="clipboard-list" label="OS" active={view === ViewMode.SERVICE_ORDERS} onClick={() => setView(ViewMode.SERVICE_ORDERS)} />
                        <NavIcon icon="banknote" label="Caixa" active={view === ViewMode.CASH_REGISTER} onClick={() => setView(ViewMode.CASH_REGISTER)} />
                        <NavIcon icon="trending-down" label="A Pagar" active={view === ViewMode.ACCOUNTS_PAYABLE} onClick={() => setView(ViewMode.ACCOUNTS_PAYABLE)} />
                        <NavIcon icon="trending-up" label="A Receber" active={view === ViewMode.ACCOUNTS_RECEIVABLE} onClick={() => setView(ViewMode.ACCOUNTS_RECEIVABLE)} />
                        <NavIcon icon="file-signature" label="Contratos" active={view === ViewMode.CONTRACTS_MGMT} onClick={() => setView(ViewMode.CONTRACTS_MGMT)} />
                        <NavIcon icon="users" label={"Usu\u00E1rios"} active={view === ViewMode.USER_MANAGEMENT} onClick={() => setView(ViewMode.USER_MANAGEMENT)} />
                        <NavIcon icon="clock" label="Ponto" active={view === ViewMode.TIME_TRACKING} onClick={() => setView(ViewMode.TIME_TRACKING)} />
                        <NavIcon icon="navigation" label="Frota" active={view === ViewMode.FLEET} onClick={() => setView(ViewMode.FLEET)} />
                        <NavIcon icon="message-square" label="CRM" active={view === ViewMode.CRM} onClick={() => setView(ViewMode.CRM)} isFab />
                    </>
                ) : authState === 'EMPLOYEE' ? (
                    <>
                        <NavIcon icon="clock" label="Meu Ponto" active={view === ViewMode.TIME_TRACKING} onClick={() => setView(ViewMode.TIME_TRACKING)} />
                        <NavIcon icon="navigation" label="Viagens" active={view === ViewMode.FLEET} onClick={() => setView(ViewMode.FLEET)} />
                        <NavIcon icon="message-square" label="Chat" active={view === ViewMode.CHAT} onClick={() => setView(ViewMode.CHAT)} />
                    </>
                ) : (
                    <>
                        <NavIcon icon="home" label="Painel" active={view === ViewMode.CLIENT_PORTAL} onClick={() => setView(ViewMode.CLIENT_PORTAL)} />
                        <NavIcon icon="shield" label="Garantia" active={view === ViewMode.WARRANTY} onClick={() => setView(ViewMode.WARRANTY)} />
                        <NavIcon icon="message-square" label="Chat" active={view === ViewMode.CHAT} onClick={() => setView(ViewMode.CHAT)} />
                        <NavIcon icon="book-open" label="Pós-Venda" active={view === ViewMode.AFTER_SALES} onClick={() => setView(ViewMode.AFTER_SALES)} />
                        <button type="button" onClick={() => window.open('https://www.instagram.com/sdmoveisprojetados/', '_blank')} className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-400 hover:text-pink-500 hover:bg-white/10 transition-all">
                            <Instagram className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Instagram</span>
                        </button>
                    </>
                )}
            </nav>
            <div className="mt-auto space-y-2 flex flex-col items-center">
                <button className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 hover:scale-110"><Bell className="w-5 h-5" /></button>
                <button onClick={() => setView(ViewMode.SETTINGS)} className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 hover:scale-110" title="Configurações"><Settings className="w-5 h-5" /></button>
                <button onClick={() => setAuthState('SELECT')} className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 flex flex-col items-center gap-1 hover:scale-110" title="Sair">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                    <span className="text-[10px] font-bold">Log Out</span>
                </button>
            </div>
        </aside>
    );
};
