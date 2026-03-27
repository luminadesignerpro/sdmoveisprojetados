import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, Contract } from '@/types';
import { generateRealisticRender } from '@/services/geminiService';
import AfterSalesPanel from '@/components/client/AfterSalesPanel';
import WarrantyCertificate from '@/components/client/WarrantyCertificate';
import ProjectCostPanel from '@/components/admin/ProjectCostPanel';
import QualityCheckPanel from '@/components/admin/QualityCheckPanel';
import TimeTrackingPanel from '@/components/timetracking/TimeTrackingPanel';
import EmployeePortal from '@/components/EmployeePortal';
import FuelLogForm from '@/components/fleet/FuelLogForm';
import ToolInventory from '@/components/employee/ToolInventory';
import { SelectionCard } from '@/components/ui/selection-card';
import { NavIcon } from '@/components/ui/nav-icon';
import { DashboardStat } from '@/components/ui/dashboard-stat';
import { WhatsAppCRMReal } from '@/components/crm/WhatsAppCRMReal';
import { ChatFlowPanel } from '@/components/crm/ChatFlowPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PromobEditor from '@/components/promob/PromobEditor';
import SuppliersPage from '@/components/modules/SuppliersPage';
import ProductsPage from '@/components/modules/ProductsPage';
import ServiceOrdersPage from '@/components/modules/ServiceOrdersPage';
import CashRegisterPage from '@/components/modules/CashRegisterPage';
import AccountsPage from '@/components/modules/AccountsPage';
import ContractsPage from '@/components/modules/ContractsPage';
import SalesPage from '@/components/modules/SalesPage';
import ProfitDashboard from '@/components/admin/ProfitDashboard';
import BudgetQuote from '@/components/budget/BudgetQuote';
import { Dashboard3DScene } from '@/components/dashboard3d/Dashboard3DScene';
import { AnimatedBackground } from '@/components/animations/AnimatedBackground';
import { ViewTransition } from '@/components/animations/ViewTransition';
import { Card3D } from '@/components/animations/Card3D';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import logoSD from '@/assets/logo-sd.jpeg';
import FleetManagement from '@/components/FleetManagement';
import FleetAdminPanel from '@/components/fleet/FleetAdminPanel';
import DriverTripPanel from '@/components/fleet/DriverTripPanel';
import { WorshipPlayer } from '@/components/WorshipPlayer';
import InternalChat from '@/components/chat/InternalChat';
import AppointmentsPanel from '@/components/client/AppointmentsPanel';
import { supabase } from '@/integrations/supabase/client';
const db = supabase as any;
import {
  LogOut,
  Download,
  Share2,
  X,
  Eye,
  Edit,
  Loader2,
  Heart,
  Star,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Camera,
  Play,
  Pause,
  SkipForward,
  ChevronRight,
  Settings,
  Bell,
  User,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Package,
  Truck,
  Wrench,
  Home,
  Building,
  ArrowRight,
  MessageCircle,
  Sparkles,
  Award,
  Gift,
  Zap,
  Shield,
  Target,
  Layers,
  RefreshCw,
  ExternalLink,
  BookOpen,
  ThumbsUp,
  Timer,
  Instagram,
  Fuel,
  GitBranch,
} from 'lucide-react';

// Dashboard data is now fetched from DB

// Louvor principal - Kemily Santos
const LOUVORES = [
  {
    title: "Deus de Obras Completas",
    artist: "Kemilly Santos",
    audioUrl: "/audio/deus-de-obras-completas.mp3",
    verse: "Colossenses 3:23 - E tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor."
  },
  {
    title: "Bom Samaritano (Ao Vivo)",
    artist: "Anderson Freire",
    audioUrl: "/audio/bom-samaritano.mp3",
    verse: "Lucas 10:33 - Mas um samaritano, que ia de viagem, chegou ao pé dele e, vendo-o, moveu-se de íntima compaixão."
  },
  {
    title: "Deus Está Te Ensinando",
    artist: "Nathália Braga",
    audioUrl: "/audio/deus-esta-te-ensinando.mp3",
    verse: "Provérbios 3:5 - Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento."
  },
  {
    title: "Meu Sonho Ganha Forma",
    artist: "SD Móveis Projetados",
    audioUrl: "/audio/meu-sonho-ganha-forma.mp3",
    verse: "Jeremias 29:11 - Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal."
  },
];

const App: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const isCompactLayout = isMobile || isTouchDevice;
  const [authState, setAuthState] = useState<'SELECT' | 'LOGIN' | 'ADMIN' | 'CLIENT' | 'EMPLOYEE'>(() => {
    return (localStorage.getItem('sd_authState') as any) || 'SELECT';
  });
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'CLIENT' | 'EMPLOYEE'>(() => {
    return (localStorage.getItem('sd_selectedRole') as any) || 'ADMIN';
  });
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('sd_employeeName') || '');
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem('sd_employeeId') || '');
  const [password, setPassword] = useState("");
  const [view, setView] = useState(() => localStorage.getItem('sd_view') as ViewMode || ViewMode.DASHBOARD);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState("");
  const [renderResult, setRenderResult] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [currentLouvor, setCurrentLouvor] = useState(LOUVORES[Math.floor(Math.random() * LOUVORES.length)]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showClientContract, setShowClientContract] = useState(false);
  const [showClientFinanceiro, setShowClientFinanceiro] = useState(false);
  const [galleryFullscreen, setGalleryFullscreen] = useState<{ title: string; url: string } | null>(null);
  const [galleryItems, setGalleryItems] = useState<{ title: string; desc: string; url: string }[]>([]);
  const [projectApproved, setProjectApproved] = useState(false);
  const [clientProject, setClientProject] = useState<any>(null);
  const [clientInstallments, setClientInstallments] = useState<any[]>([]);
  const [clientProductionSteps, setClientProductionSteps] = useState<any[]>([]);
  const [clientTimeline, setClientTimeline] = useState<any[]>([]);
  const [clientName, setClientName] = useState('');
  const [showArModal, setShowArModal] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsTouchDevice(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    localStorage.setItem('sd_authState', authState);
    localStorage.setItem('sd_selectedRole', selectedRole);
    localStorage.setItem('sd_employeeName', employeeName);
    localStorage.setItem('sd_employeeId', employeeId);
    localStorage.setItem('sd_view', view);
  }, [authState, selectedRole, employeeName, employeeId, view]);

  // ===== MODO TESTE TEMPORÁRIO =====
  // Acesse com ?teste=admin, ?teste=client ou ?teste=employee
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teste = params.get('teste');
    if (teste === 'admin') {
      setAuthState('ADMIN');
      setView(ViewMode.DASHBOARD);
    } else if (teste === 'client') {
      setAuthState('CLIENT');
      setView(ViewMode.CLIENT_PORTAL);
    } else if (teste === 'employee') {
      setAuthState('EMPLOYEE');
      setView(ViewMode.TIME_TRACKING);
    }
  }, []);

  // Fetch dashboard data from DB when admin logs in
  useEffect(() => {
    if (authState === 'ADMIN') {
      const fetchDashboardData = async () => {
        const { data } = await db.from('client_projects').select('*, clients(name, phone, email)').order('created_at', { ascending: false });
        if (data) setContracts(data);
      };
      fetchDashboardData();
    }
  }, [authState]);

  // Fetch all client data from database when client logs in
  useEffect(() => {
    if (authState === 'CLIENT') {
      const fetchClientData = async () => {
        const { data: clients } = await db
          .from('clients')
          .select('id, name')
          .eq('access_code', password.trim() || 'SD2024')
          .limit(1);

        const client = clients && clients.length > 0 ? clients[0] : null;
        if (client) setClientName(client.name);
        const clientId = client?.id;

        if (clientId) {
          const { data: projects } = await db
            .from('client_projects')
            .select('*')
            .eq('client_id', clientId)
            .limit(1);

          const project = projects && projects.length > 0 ? projects[0] : null;
          if (project) {
            setClientProject(project);

            const [installRes, stepsRes, timelineRes, galleryRes] = await Promise.all([
              db.from('project_installments').select('*').eq('project_id', project.id).order('installment_number'),
              db.from('project_production_steps').select('*').eq('project_id', project.id).order('sort_order'),
              db.from('project_timeline').select('*').eq('project_id', project.id).order('sort_order'),
              db.from('project_gallery').select('*').eq('project_id', project.id).order('created_at'),
            ]);

            if (installRes.data) setClientInstallments(installRes.data);
            if (stepsRes.data) setClientProductionSteps(stepsRes.data);
            if (timelineRes.data) setClientTimeline(timelineRes.data);
            if (galleryRes.data && galleryRes.data.length > 0) {
              setGalleryItems(galleryRes.data.map(g => ({ title: g.title, desc: g.description || '', url: g.image_url })));
              return;
            }
          }
        }

        // Fallback gallery
        const { data: allGallery } = await db.from('project_gallery').select('*').order('created_at');
        if (allGallery && allGallery.length > 0) {
          setGalleryItems(allGallery.map(g => ({ title: g.title, desc: g.description || '', url: g.image_url })));
        }
      };
      fetchClientData();
    }
  }, [authState, password]);

  // Função para tocar o louvor
  const playAudio = (louvor: typeof LOUVORES[0]) => {
    // Parar áudio anterior
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(louvor.audioUrl);
    audio.preload = "auto";
    audio.volume = 0.3;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        setIsPlaying(true);
        toast({
          title: "🎵 Tocando Louvor",
          description: `${louvor.title} - ${louvor.artist}`
        });
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error("Erro ao tocar:", err);
          toast({
            title: "⚠️ Clique para tocar",
            description: "Clique no botão ▶ para iniciar o louvor",
            variant: "destructive"
          });
        }
      });
    }

    audio.onended = () => {
      const nextIndex = (LOUVORES.findIndex(l => l.title === louvor.title) + 1) % LOUVORES.length;
      const next = LOUVORES[nextIndex];
      setCurrentLouvor(next);
      playAudio(next);
    };
  };

  const playLouvor = () => {
    playAudio(currentLouvor);
  };

  const stopLouvor = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const nextLouvor = () => {
    const nextIndex = (LOUVORES.findIndex(l => l.title === currentLouvor.title) + 1) % LOUVORES.length;
    const next = LOUVORES[nextIndex];
    setCurrentLouvor(next);
    playAudio(next);
  };

  const handleLogin = async () => {
    if (selectedRole === 'ADMIN') {
      if (password.trim() !== 'sdmoveis') {
        toast({ title: "⚠️ Senha incorreta", description: "Verifique a senha de administrador e tente novamente", variant: "destructive" });
        return;
      }
      setAuthState('ADMIN');
      setView(ViewMode.DASHBOARD_3D);
      toast({ title: "✅ Bem-vindo!", description: "Acesso administrativo liberado" });
    } else if (selectedRole === 'EMPLOYEE') {
      if (!employeeName.trim()) {
        toast({ title: "⚠️ Informe seu nome", description: "Digite seu nome cadastrado pelo administrador", variant: "destructive" });
        return;
      }
      if (!password.trim()) {
        toast({ title: "⚠️ Informe sua senha", description: "Digite a senha fornecida pelo administrador", variant: "destructive" });
        return;
      }
      // Resolve employee ID from name or email before entering
      const searchInput = employeeName.trim().toLowerCase();

      const { data: empData, error: empErr } = await db
        .from('employees')
        .select('id, name, email, password')
        .eq('active', true)
        .or(`name.ilike.%${searchInput}%,email.eq.${searchInput}`);

      if (empErr) {
        toast({ title: "❌ Erro ao buscar", description: empErr.message, variant: "destructive" });
        return;
      }

      // Try to find the best match
      const matchedEmp = empData?.find((e: any) =>
        e.email?.toLowerCase() === searchInput ||
        e.name.toLowerCase() === searchInput
      ) || empData?.[0];

      if (!matchedEmp) {
        toast({ title: "⚠️ Funcionário não encontrado", description: "Verifique se o nome ou e-mail está cadastrado corretamente", variant: "destructive" });
        return;
      }

      // Verify password
      if (!matchedEmp.password) {
        toast({ title: "⚠️ Senha não configurada", description: "Peça ao administrador para criar sua senha de acesso", variant: "destructive" });
        return;
      }
      if (matchedEmp.password !== password.trim()) {
        toast({ title: "⚠️ Senha incorreta", description: "Verifique sua senha e tente novamente", variant: "destructive" });
        return;
      }

      setEmployeeId(matchedEmp.id);
      setEmployeeName(matchedEmp.name);
      setAuthState('EMPLOYEE');
      setView(ViewMode.TIME_TRACKING);
      toast({ title: "✅ Bem-vindo!", description: `Área do funcionário - ${matchedEmp.name}` });
    } else {
      setAuthState('CLIENT');
      setView(ViewMode.CLIENT_PORTAL);
      toast({ title: "✅ Bem-vindo!", description: "Área do cliente" });
    }
  };

  const handleRender = async () => {
    setAiLoadingMessage("Gerando renderização fotorrealista com IA...");
    setIsAiLoading(true);

    const result = await generateRealisticRender({ room: "Ambiente Projetado", finish: "Premium", modules: [] });

    if (result) {
      setRenderResult(result);
      toast({
        title: "🎨 Renderização concluída!",
        description: "Sua imagem fotorrealista foi gerada com sucesso."
      });
    } else {
      toast({
        title: "❌ Erro na renderização",
        description: "Não foi possível gerar a imagem. Tente novamente.",
        variant: "destructive"
      });
    }
    setIsAiLoading(false);
  };


  const totalRevenue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
  const signedContracts = contracts.filter(c => ['assinado', 'producao', 'instalacao', 'concluido'].includes(c.status)).length;
  const inProduction = contracts.filter(c => c.status === 'producao').length;

  return (
    <div className={`h-screen w-screen flex ${isCompactLayout ? 'flex-col' : 'flex-col sm:flex-row'} bg-background overflow-hidden relative`}>
      {/* SIDEBAR */}
      {(authState === 'ADMIN' || authState === 'CLIENT' || authState === 'EMPLOYEE') && (
        <aside
          className={isCompactLayout
            ? 'order-2 w-full h-auto min-h-[4rem] flex items-center gap-0 overflow-x-auto overflow-y-hidden relative z-10 backdrop-blur-xl border-t border-sidebar-border/30 flex-nowrap'
            : 'order-none w-24 h-auto flex flex-col items-center py-4 gap-2 min-h-0 overflow-hidden relative z-10 backdrop-blur-xl border-r border-sidebar-border/30'
          }
          style={{
            background: 'linear-gradient(180deg, hsl(var(--sidebar-background) / 0.92) 0%, hsl(var(--sidebar-background) / 0.98) 100%)',
            boxShadow: '4px 0 30px hsl(var(--primary) / 0.08), inset -1px 0 0 hsl(var(--primary) / 0.06)',
            ...(isCompactLayout
              ? {
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
              }
              : {}),
          }}
        >
          <button
            onClick={() => setView(authState === 'ADMIN' ? ViewMode.DASHBOARD : authState === 'EMPLOYEE' ? ViewMode.TIME_TRACKING : ViewMode.CLIENT_PORTAL)}
            className={`${isCompactLayout ? 'hidden' : 'block'} w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary shadow-glow hover:scale-110 transition-all duration-300 flex-shrink-0`}
          >
            <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
          </button>

          <nav
            className={isCompactLayout
              ? 'flex-1 flex items-center justify-start gap-0 px-1 w-full min-w-0 overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-hide touch-pan-x'
              : 'flex-1 flex flex-col items-center justify-start gap-2 mt-6 px-0 w-full min-w-0 overflow-x-hidden overflow-y-auto'
            }
            style={isCompactLayout
              ? {
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                touchAction: 'pan-x',
                overscrollBehaviorX: 'contain',
              }
              : undefined
            }
          >
            {authState === 'ADMIN' ? (
              <>
                <NavIcon icon="layout-dashboard" label="Início" active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} />
                <NavIcon icon="calculator" label="Projetagem SD" active={view === ViewMode.BUDGET_QUOTE} onClick={() => setView(ViewMode.BUDGET_QUOTE)} />
                <NavIcon icon="cube" label="3D" active={view === ViewMode.DASHBOARD_3D} onClick={() => setView(ViewMode.DASHBOARD_3D)} />
                <NavIcon icon="file-text" label="Vendas" active={view === ViewMode.CONTRACTS} onClick={() => setView(ViewMode.CONTRACTS)} />
                <NavIcon icon="building" label="Fornecedores" active={view === ViewMode.SUPPLIERS} onClick={() => setView(ViewMode.SUPPLIERS)} />
                <NavIcon icon="package" label="Estoque" active={view === ViewMode.PRODUCTS} onClick={() => setView(ViewMode.PRODUCTS)} />
                <NavIcon icon="clipboard-list" label="OS" active={view === ViewMode.SERVICE_ORDERS} onClick={() => setView(ViewMode.SERVICE_ORDERS)} />
                <NavIcon icon="banknote" label="Caixa" active={view === ViewMode.CASH_REGISTER} onClick={() => setView(ViewMode.CASH_REGISTER)} />
                <NavIcon icon="trending-down" label="A Pagar" active={view === ViewMode.ACCOUNTS_PAYABLE} onClick={() => setView(ViewMode.ACCOUNTS_PAYABLE)} />
                <NavIcon icon="trending-up" label="A Receber" active={view === ViewMode.ACCOUNTS_RECEIVABLE} onClick={() => setView(ViewMode.ACCOUNTS_RECEIVABLE)} />
                <NavIcon icon="file-signature" label="Contratos" active={view === ViewMode.CONTRACTS_MGMT} onClick={() => setView(ViewMode.CONTRACTS_MGMT)} />
                <NavIcon icon="clock" label="Ponto" active={view === ViewMode.TIME_TRACKING} onClick={() => setView(ViewMode.TIME_TRACKING)} />
                <NavIcon icon="navigation" label="Frota" active={view === ViewMode.FLEET} onClick={() => setView(ViewMode.FLEET)} />
                <NavIcon icon="message-square" label="CRM" active={view === ViewMode.CRM} onClick={() => setView(ViewMode.CRM)} isFab />
                <NavIcon icon="message-circle" label="Chat" active={view === ViewMode.INTERNAL_CHAT} onClick={() => setView(ViewMode.INTERNAL_CHAT)} />
                <NavIcon icon="calendar" label="Agenda" active={view === ViewMode.APPOINTMENTS} onClick={() => setView(ViewMode.APPOINTMENTS)} />
              </>
            ) : authState === 'EMPLOYEE' ? (
              <>
                <NavIcon icon="clock" label="Meu Ponto" active={view === ViewMode.TIME_TRACKING} onClick={() => setView(ViewMode.TIME_TRACKING)} />
                <NavIcon icon="navigation" label="Viagens" active={view === ViewMode.FLEET} onClick={() => setView(ViewMode.FLEET)} />
                <NavIcon icon="message-circle" label="Chat" active={view === ViewMode.INTERNAL_CHAT} onClick={() => setView(ViewMode.INTERNAL_CHAT)} />
              </>
            ) : (
              <>
                <NavIcon icon="home" label="Painel" active={view === ViewMode.CLIENT_PORTAL} onClick={() => setView(ViewMode.CLIENT_PORTAL)} />
                <NavIcon icon="image" label="Galeria" active={view === ViewMode.PORTFOLIO} onClick={() => setView(ViewMode.PORTFOLIO)} />
                <NavIcon icon="shield" label="Garantia" active={view === ViewMode.WARRANTY} onClick={() => setView(ViewMode.WARRANTY)} />
                <NavIcon icon="message-circle" label="Chat" active={view === ViewMode.INTERNAL_CHAT} onClick={() => setView(ViewMode.INTERNAL_CHAT)} />
                <NavIcon icon="book-open" label="Pós-Venda" active={view === ViewMode.AFTER_SALES} onClick={() => setView(ViewMode.AFTER_SALES)} />

                <button
                  type="button"
                  onClick={() => {
                    const username = "sdmoveisprojetados";
                    const appUrl = `instagram://user?username=${username}`;
                    const webUrl = `https://www.instagram.com/${username}/`;
                    const start = Date.now();
                    window.location.href = appUrl;
                    setTimeout(() => {
                      if (Date.now() - start < 1000) {
                        window.open(webUrl, "_blank");
                      }
                    }, 500);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-400 hover:text-pink-500 hover:bg-white/10 transition-all"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Instagram</span>
                </button>
              </>
            )}
          </nav>

          <div className={`${isCompactLayout ? 'hidden' : 'mt-auto space-y-2 flex flex-col items-center'}`}>
            <button className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 hover:scale-110">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 hover:scale-110">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                setAuthState('SELECT');
              }}
              className="p-3 text-sidebar-foreground/50 hover:text-primary transition-all duration-300 flex flex-col items-center gap-1 hover:scale-110"
              title="Voltar à seleção"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              <span className="text-[10px] font-bold">Voltar</span>
            </button>
            <button onClick={() => {
              localStorage.clear();
              setAuthState('SELECT');
            }} className="p-3 text-sidebar-foreground/50 hover:text-destructive transition-all duration-300 flex flex-col items-center gap-1 hover:scale-110" title="Sair">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-bold">Sair</span>
            </button>
          </div>

          {/* Mobile: logout button */}
          <button onClick={() => {
            localStorage.clear();
            setAuthState('SELECT');
          }} className={`${isCompactLayout ? 'p-2 text-sidebar-foreground/50 hover:text-destructive flex-shrink-0' : 'hidden'}`} title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </aside>
      )}

      {/* WORSHIP PLAYER GLOBAL - Aparece em todas as áreas logadas */}
      {(authState === 'ADMIN' || authState === 'CLIENT' || authState === 'EMPLOYEE') && (
        <WorshipPlayer
          currentLouvor={currentLouvor}
          isPlaying={isPlaying}
          onPlay={playLouvor}
          onStop={stopLouvor}
          onNext={nextLouvor}
        />
      )}

      <main
        className={`flex-1 overflow-x-hidden relative min-w-0 w-full ${isCompactLayout ? 'order-1 h-[calc(100vh-4rem)]' : 'order-none h-screen'}`}
      >
        {/* Animated particle background */}
        {(authState === 'ADMIN' || authState === 'CLIENT' || authState === 'EMPLOYEE') && (
          <AnimatedBackground />
        )}
        <ViewTransition viewKey={view}>
          {/* DASHBOARD ADMIN */}
          {view === ViewMode.DASHBOARD && authState === 'ADMIN' && (
            <div
              className="p-4 sm:p-8 space-y-6 overflow-x-hidden overflow-y-auto w-full h-full relative"
              style={{ background: '#0f0f0f' }}
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
                  <h1 className="text-4xl font-black text-white flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                    Gestão Estratégica
                  </h1>
                  <p className="text-gray-400 mt-1 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Bem-vindo ao centro de comando SD Móveis
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl px-6 py-3 shadow-sm border" style={{ background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: '#D4AF37' }}>
                      <Zap className="w-3 h-3" /> Status IA
                    </p>
                    <p className="font-bold flex items-center gap-2" style={{ color: '#F5E583' }}>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
                      Sistema 100% Online
                    </p>
                  </div>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.15s forwards' }}>
                  <Card3D intensity={8} className="rounded-2xl p-0.5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,255,255,0.05))' }}>
                    <div className="rounded-[calc(1rem-2px)] overflow-hidden" style={{ background: '#111111' }}>
                      <DashboardStat
                        title="Projetos Ativos"
                        value={contracts.length.toString()}
                        icon="📁"
                        trend="+2 este mês"
                        dark
                      />
                    </div>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.25s forwards' }}>
                  <Card3D intensity={8} className="rounded-2xl p-0.5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,255,255,0.05))' }}>
                    <div className="rounded-[calc(1rem-2px)] overflow-hidden" style={{ background: '#111111' }}>
                      <DashboardStat
                        title="Faturamento Total"
                        value={`R$ ${(totalRevenue / 1000).toFixed(0)}K`}
                        icon="💰"
                        trend="+15% vs mês anterior"
                        dark
                      />
                    </div>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.35s forwards' }}>
                  <Card3D intensity={8} className="rounded-2xl p-0.5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,255,255,0.05))' }}>
                    <div className="rounded-[calc(1rem-2px)] overflow-hidden" style={{ background: '#111111' }}>
                      <DashboardStat
                        title="Em Produção"
                        value={inProduction.toString()}
                        icon="🏭"
                        trend="Meta: 10"
                        dark
                      />
                    </div>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.45s forwards' }}>
                  <Card3D intensity={8} className="rounded-2xl p-0.5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(255,255,255,0.05))' }}>
                    <div className="rounded-[calc(1rem-2px)] overflow-hidden" style={{ background: '#111111' }}>
                      <DashboardStat
                        title="Conversão"
                        value={`${contracts.length > 0 ? Math.round((signedContracts / contracts.length) * 100) : 0}%`}
                        icon="📈"
                        trend="Excelente!"
                        dark
                      />
                    </div>
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
                    <div className="rounded-[32px] p-6 h-full border" style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-amber-400" />
                          Últimos Contratos
                        </h3>
                        <button onClick={() => setView(ViewMode.CONTRACTS)} className="text-xs font-bold hover:underline flex items-center gap-1 hover:gap-2 transition-all duration-300 active:scale-95" style={{ color: '#D4AF37' }}>
                          Ver todos <ChevronRight className="w-3 h-3 hover:translate-x-0.5 transition-transform duration-300" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {contracts.slice(0, 3).map(c => (
                          <div
                            key={c.id}
                            onClick={() => setView(ViewMode.CONTRACTS)}
                            className="flex justify-between items-center p-4 rounded-2xl transition-all duration-200 cursor-pointer hover:translate-x-1 active:scale-[0.98] border"
                            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                          >
                            <div>
                              <p className="font-bold text-white">{c.clients?.name || 'Cliente'}</p>
                              <p className="text-xs text-gray-500">{c.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black" style={{ color: '#D4AF37' }}>R$ {(c.value || 0).toLocaleString('pt-BR')}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                                {c.status === 'producao' ? 'Produção' : c.status === 'assinado' ? 'Assinado' : c.status === 'instalacao' ? 'Instalação' : c.status === 'concluido' ? 'Concluído' : c.status === 'em_negociacao' ? 'Em Negociação' : c.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {contracts.length === 0 && <p className="text-sm text-gray-600 text-center py-4">Nenhum projeto ainda</p>}
                      </div>
                    </div>
                  </Card3D>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-5 gap-4" style={{ background: 'transparent' }}>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.75s forwards' }}>
                  <Card3D intensity={10} className="rounded-2xl">
                    <button
                      onClick={() => setView(ViewMode.PROMOB)}
                      className="p-6 rounded-2xl transition-all duration-300 w-full active:scale-[0.96] border h-full flex flex-col items-center justify-center text-center group"
                      style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Layers className="w-6 h-6 text-amber-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm">Editor 3D</h4>
                    </button>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.85s forwards' }}>
                  <Card3D intensity={10} className="rounded-2xl">
                    <button
                      onClick={() => setView(ViewMode.CRM)}
                      className="p-6 rounded-2xl transition-all duration-300 w-full active:scale-[0.96] border h-full flex flex-col items-center justify-center text-center group"
                      style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <MessageCircle className="w-6 h-6 text-amber-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm">CRM Zap</h4>
                    </button>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 0.95s forwards' }}>
                  <Card3D intensity={10} className="rounded-2xl">
                    <button
                      onClick={() => setView(ViewMode.CONTRACTS)}
                      className="p-6 rounded-2xl transition-all duration-300 w-full active:scale-[0.96] border h-full flex flex-col items-center justify-center text-center group"
                      style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <FileText className="w-6 h-6 text-amber-400" />
                      </div>
                      <h4 className="font-bold text-white text-sm">Contratos</h4>
                    </button>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 1.05s forwards' }}>
                  <Card3D intensity={10} className="rounded-2xl h-full">
                    <button
                      onClick={handleRender}
                      className="p-6 rounded-2xl text-black w-full active:scale-[0.96] h-full flex flex-col items-center justify-center text-center group transition-all"
                      style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583, #b8952a)', boxShadow: '0 8px 32px rgba(212,175,55,0.35)' }}
                    >
                      <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
                        <Sparkles className="w-6 h-6 text-black/80" />
                      </div>
                      <h4 className="font-bold text-black/80 text-sm">Render IA</h4>
                    </button>
                  </Card3D>
                </div>
                <div style={{ opacity: 0, animation: 'fadeIn 0.5s ease-out 1.15s forwards' }}>
                  <Card3D intensity={10} className="rounded-2xl">
                    <button
                      onClick={() => setView(ViewMode.PROFIT_BI)}
                      className="p-6 rounded-2xl transition-all duration-300 w-full active:scale-[0.96] border h-full flex flex-col items-center justify-center text-center group"
                      style={{ background: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#111111'; }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                      </div>
                      <h4 className="font-bold text-white text-sm">Lucro Real</h4>
                    </button>
                  </Card3D>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD 3D */}
          {view === ViewMode.DASHBOARD_3D && authState === 'ADMIN' && (
            <div className="h-full p-4">
              <Dashboard3DScene />
            </div>
          )}

          {/* PROMOB 3D EDITOR */}
          {view === ViewMode.PROMOB && authState === 'ADMIN' && (
            <PromobEditor />
          )}

          {/* BUDGET AI */}
          {view === ViewMode.BUDGET_QUOTE && authState === 'ADMIN' && (
            <div className="h-full w-full overflow-hidden bg-background">
              <BudgetQuote />
            </div>
          )}

          {/* NEW MODULES */}
          {view === ViewMode.PROFIT_BI && authState === 'ADMIN' && <ProfitDashboard contracts={contracts} setView={setView} />}
          {view === ViewMode.SUPPLIERS && authState === 'ADMIN' && <SuppliersPage />}
          {view === ViewMode.PRODUCTS && authState === 'ADMIN' && <ProductsPage />}
          {view === ViewMode.SERVICE_ORDERS && authState === 'ADMIN' && <ServiceOrdersPage />}
          {view === ViewMode.CASH_REGISTER && authState === 'ADMIN' && <CashRegisterPage />}
          {view === ViewMode.ACCOUNTS_PAYABLE && authState === 'ADMIN' && <AccountsPage type="payable" />}
          {view === ViewMode.ACCOUNTS_RECEIVABLE && authState === 'ADMIN' && <AccountsPage type="receivable" />}
          {view === ViewMode.CONTRACTS_MGMT && authState === 'ADMIN' && <ContractsPage />}

          {/* TIME TRACKING */}
          {view === ViewMode.TIME_TRACKING && (
            authState === 'ADMIN' ? (
              <TimeTrackingPanel />
            ) : authState === 'EMPLOYEE' ? (
              <EmployeePortal employeeName={employeeName} />
            ) : null
          )}

          {/* FLEET */}
          {view === ViewMode.FLEET && authState === 'ADMIN' && (
            <FleetAdminPanel />
          )}

          {view === ViewMode.FLEET && authState === 'EMPLOYEE' && (
            <DriverTripPanel employeeId={employeeId || ''} employeeName={employeeName} />
          )}

          {view === ViewMode.CRM && (
            <div className="h-full p-6 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
              <header className="mb-6">
                <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                  <MessageCircle className="w-8 h-8 text-green-500" />
                  CRM WhatsApp
                </h1>
                <p className="text-gray-500 mt-1">Gerencie suas conversas e leads</p>
              </header>
              <Tabs defaultValue="crm" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="crm" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Conversas
                  </TabsTrigger>
                  <TabsTrigger value="flow" className="gap-2">
                    <GitBranch className="w-4 h-4" />
                    Fluxo de Atendimento
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="crm">
                  <WhatsAppCRMReal />
                </TabsContent>
                <TabsContent value="flow">
                  <ChatFlowPanel />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* INTERNAL CHAT */}
          {view === ViewMode.INTERNAL_CHAT && (
            <InternalChat
              currentUserName={authState === 'ADMIN' ? 'Administrador' : authState === 'EMPLOYEE' ? employeeName : clientName || 'Cliente'}
              currentUserRole={authState === 'ADMIN' ? 'admin' : authState === 'EMPLOYEE' ? 'employee' : 'client'}
            />
          )}

          {/* CONTRACTS */}
          {view === ViewMode.CONTRACTS && authState === 'ADMIN' && <SalesPage />}

          {/* CLIENT PORTAL */}
          {view === ViewMode.CLIENT_PORTAL && (
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
          )}

          {/* PORTFOLIO */}
          {view === ViewMode.PORTFOLIO && (
            <div className="p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <header className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                    <Camera className="w-8 h-8 text-amber-500" />
                    Minha Galeria SD
                  </h1>
                  <p className="text-gray-500 mt-1">Arquivos em Ultra-Alta Definição</p>
                </div>
                <button
                  onClick={() => setView(ViewMode.CLIENT_PORTAL)}
                  className="text-amber-600 font-black uppercase text-xs tracking-widest border-2 border-amber-200 px-8 py-4 rounded-full hover:bg-amber-50 transition-all flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Voltar ao Painel
                </button>
              </header>

              <div className="grid grid-cols-2 gap-8">
                {galleryItems.map((item, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-xl overflow-hidden group">
                    <div className="aspect-video overflow-hidden relative">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button
                          onClick={() => setGalleryFullscreen({ title: item.title, url: item.url })}
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 hover:scale-110 transition-transform"
                          title="Visualizar Imagem"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowArModal({ title: item.title, url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb' })}
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-amber-600 hover:scale-110 transition-transform border-2 border-amber-200"
                          title="Visualizar em AR"
                        >
                          <Package className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = item.url;
                            a.download = `${item.title.replace(/\s/g, '-')}.jpg`;
                            a.target = '_blank';
                            a.click();
                            toast({ title: "📥 Download iniciado", description: item.title });
                          }}
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 hover:scale-110 transition-transform"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="font-black text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = item.url;
                            a.download = `${item.title.replace(/\s/g, '-')}-4K.jpg`;
                            a.target = '_blank';
                            a.click();
                            toast({ title: "📥 Download 4K iniciado", description: item.title });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download 4K
                        </button>
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({ title: item.title, text: `Veja o render: ${item.title}`, url: item.url });
                            } else {
                              navigator.clipboard.writeText(item.url);
                              toast({ title: "🔗 Link copiado!", description: "Cole onde quiser compartilhar" });
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Compartilhar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approve Project Button */}
              {!projectApproved ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-lg text-center">
                  <ThumbsUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-gray-900 mb-2">Aprovar Projeto</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    Revise todos os renders e, se estiver satisfeito, aprove o projeto para iniciarmos a produção.
                  </p>
                  <button
                    onClick={() => {
                      setProjectApproved(true);
                      toast({ title: "✅ Projeto Aprovado!", description: "Obrigado! A produção será iniciada em breve." });
                    }}
                    className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-green-500 transition-colors shadow-lg inline-flex items-center gap-2"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Aprovar Projeto
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-black text-green-700">Projeto Aprovado ✓</p>
                  <p className="text-sm text-green-600 mt-1">Sua produção está em andamento!</p>
                </div>
              )}
            </div>
          )}
          {/* AFTER SALES */}
          {view === ViewMode.AFTER_SALES && authState === 'CLIENT' && (
            <AfterSalesPanel />
          )}

          {/* APPOINTMENTS */}
          {view === ViewMode.APPOINTMENTS && authState === 'ADMIN' && (
            <AppointmentsPanel />
          )}

          {/* WARRANTY CERTIFICATE */}
          {view === ViewMode.WARRANTY && authState === 'CLIENT' && (
            <div className="p-8 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <WarrantyCertificate
                projectName={clientProject?.name || 'Projeto SD'}
                clientName={clientName || 'Cliente'}
                signedAt={clientProject?.signed_at}
                warranty={clientProject?.warranty}
                material={clientProject?.material}
                projectType={clientProject?.project_type}
              />
            </div>
          )}

          {/* QUALITY CHECK - Admin */}
          {view === ViewMode.QUALITY_CHECK && authState === 'ADMIN' && selectedContract && (
            <div className="p-8 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <QualityCheckPanel projectId={selectedContract.id} projectName={selectedContract.name || selectedContract.projectName} />
            </div>
          )}

          {/* PROJECT COSTS - Admin */}
          {view === ViewMode.PROJECT_COSTS && authState === 'ADMIN' && selectedContract && (
            <div className="p-8 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <ProjectCostPanel projectId={selectedContract.id} projectName={selectedContract.name || selectedContract.projectName} totalValue={selectedContract.value} />
            </div>
          )}
        </ViewTransition>
      </main>

      {/* LOGIN SCREENS */}
      {authState === 'SELECT' && (
        <div className="fixed inset-0 z-50 isolate bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col items-center justify-start md:justify-center overflow-y-auto overflow-x-hidden">
          {/* Animated particle background */}
          <AnimatedBackground />
          {/* Efeitos de fundo - Dark Premium */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-500/8 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[100px]" />
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl" />
          </div>

          {/* Linhas decorativas douradas */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent" />
            <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent" />
          </div>

          {/* Versículo no topo */}
          <div className="absolute top-4 md:top-8 text-center px-4 z-10">
            <div className="inline-flex items-center gap-2 md:gap-3 bg-black/50 backdrop-blur-xl px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-amber-500/20 shadow-xl max-w-[90vw]">
              <Star className="w-4 h-4 text-amber-400" />
              <p className="text-gray-300 text-xs md:text-sm italic font-light">
                "Tudo o que fizerem, façam de todo o coração, como para o Senhor"
              </p>
              <span className="text-amber-400 text-xs font-medium">— Colossenses 3:23</span>
            </div>
          </div>

          {/* Conteúdo Central */}
          <div className="relative z-10 flex flex-col items-center mt-20 md:mt-16 landscape:mt-8 px-4 pb-8 w-full">

            {/* Título */}
            <h1 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight text-center">
              SD Móveis <span className="text-amber-400">Projetados</span>
            </h1>
            <p className="text-gray-400 text-sm mb-6 md:mb-12 landscape:mb-4">Selecione seu tipo de acesso</p>

            {/* Cards de seleção */}
            <div className="flex flex-col landscape:flex-row sm:flex-row justify-center gap-3 md:gap-6 lg:gap-8 relative w-full items-stretch max-w-sm landscape:max-w-2xl sm:max-w-none mx-auto px-2">
              <Card3D intensity={10}>
                {/* Card Administrador - Preto com borda dourada */}
                <button
                  type="button"
                  onClick={() => { setSelectedRole('ADMIN'); setAuthState('LOGIN'); }}
                  className="group relative w-full landscape:flex-1 sm:w-64 lg:w-72 h-40 landscape:h-36 md:h-72 rounded-[24px] md:rounded-[32px] p-4 md:p-6 landscape:p-3 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden touch-manipulation select-none"
                >
                  {/* Fundo preto elegante */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-[32px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-[32px]" />

                  {/* Brilho dourado no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-transparent group-hover:from-amber-400/15 rounded-[32px] transition-all duration-500" />

                  {/* Borda dourada */}
                  <div className="absolute inset-0 rounded-[32px] border-2 border-amber-500/40 group-hover:border-amber-400 transition-colors shadow-2xl shadow-amber-500/10" />

                  {/* Efeito de luz dourado */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl group-hover:bg-amber-300/40 transition-all" />

                  {/* Conteúdo */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 landscape:w-9 landscape:h-9 md:w-20 md:h-20 rounded-2xl border-2 border-amber-400/60 flex items-center justify-center mb-2 landscape:mb-0.5 md:mb-5 group-hover:scale-110 transition-transform bg-amber-500/10 backdrop-blur-sm shadow-xl overflow-hidden">
                      <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 mb-1 landscape:mb-0">
                      <Shield className="w-5 h-5 landscape:w-3.5 landscape:h-3.5 text-amber-400" />
                      <h3 className="text-white text-base landscape:text-[12px] md:text-xl font-black tracking-wide uppercase text-center">Administrador</h3>
                    </div>
                    <p className="text-gray-400 text-sm landscape:text-[9px] landscape:leading-none text-center">Acesso completo</p>
                    <div className="mt-2 md:mt-4 flex items-center gap-2 text-amber-400/70 text-xs hidden md:flex">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Dashboard • Projetos • CRM</span>
                    </div>
                  </div>
                </button>
              </Card3D>

              <Card3D intensity={10}>
                {/* Card Cliente - Dourado/Branco Elegante */}
                <button
                  type="button"
                  onClick={() => { setSelectedRole('CLIENT'); setAuthState('LOGIN'); }}
                  className="group relative w-full landscape:flex-1 sm:w-64 lg:w-72 h-40 landscape:h-36 md:h-72 rounded-[24px] md:rounded-[32px] p-4 md:p-6 landscape:p-3 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden touch-manipulation select-none"
                >
                  {/* Fundo com gradiente dourado sutil */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 rounded-[32px]" />

                  {/* Overlay dourado sutil */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 rounded-[32px]" />

                  {/* Brilho dourado no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-transparent group-hover:from-amber-400/10 rounded-[32px] transition-all duration-500" />

                  {/* Borda branca/dourada elegante */}
                  <div className="absolute inset-0 rounded-[32px] border-2 border-white/20 group-hover:border-amber-400/60 transition-colors shadow-2xl" />

                  {/* Efeito de luz */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-amber-400/20 transition-all" />

                  {/* Conteúdo */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 landscape:w-9 landscape:h-9 md:w-20 md:h-20 rounded-2xl border-2 border-white/30 flex items-center justify-center mb-2 landscape:mb-0.5 md:mb-5 group-hover:scale-110 transition-transform bg-white/10 backdrop-blur-sm shadow-xl overflow-hidden group-hover:border-amber-400/60">
                      <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 mb-1 landscape:mb-0">
                      <User className="w-5 h-5 landscape:w-3.5 landscape:h-3.5 text-white/80 group-hover:text-amber-400 transition-colors" />
                      <h3 className="text-white text-base landscape:text-[12px] md:text-xl font-black tracking-wide uppercase text-center">Cliente</h3>
                    </div>
                    <p className="text-gray-400 text-sm landscape:text-[9px] landscape:leading-none text-center">Seu projeto</p>
                    <div className="mt-2 md:mt-4 flex items-center gap-2 text-white/50 text-xs group-hover:text-amber-400/70 transition-colors hidden md:flex">
                      <Home className="w-3.5 h-3.5" />
                      <span>Galeria • Status • Chat</span>
                    </div>
                  </div>
                </button>
              </Card3D>

              <Card3D intensity={10}>
                {/* Card Funcionário */}
                <button
                  type="button"
                  onClick={() => { setSelectedRole('EMPLOYEE'); setAuthState('LOGIN'); }}
                  className="group relative w-full landscape:flex-1 sm:w-64 lg:w-72 h-40 landscape:h-36 md:h-72 rounded-[24px] md:rounded-[32px] p-4 md:p-6 landscape:p-3 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden touch-manipulation select-none"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 rounded-[32px]" />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/5 rounded-[32px]" />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/0 to-transparent group-hover:from-amber-400/10 rounded-[32px] transition-all duration-500" />
                  <div className="absolute inset-0 rounded-[32px] border-2 border-white/20 group-hover:border-amber-400/60 transition-colors shadow-2xl" />
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-400/20 transition-all" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 landscape:w-9 landscape:h-9 md:w-20 md:h-20 rounded-2xl border-2 border-white/30 flex items-center justify-center mb-2 landscape:mb-0.5 md:mb-5 group-hover:scale-110 transition-transform bg-white/10 backdrop-blur-sm shadow-xl overflow-hidden group-hover:border-amber-400/60">
                      <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center gap-2 mb-1 landscape:mb-0">
                      <Clock className="w-5 h-5 landscape:w-3.5 landscape:h-3.5 text-green-400/80 group-hover:text-green-400 transition-colors" />
                      <h3 className="text-white text-base landscape:text-[12px] md:text-xl font-black tracking-wide uppercase text-center">Funcionário</h3>
                    </div>
                    <p className="text-gray-400 text-sm landscape:text-[9px] landscape:leading-none text-center">Registre ponto</p>
                    <div className="mt-2 md:mt-4 flex items-center gap-2 text-green-400/50 text-xs group-hover:text-green-400/70 transition-colors hidden md:flex">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ponto • Horas • Pagamento</span>
                    </div>
                  </div>
                </button>
              </Card3D>
            </div>
          </div>

          {/* Player de Louvor na tela de seleção - inline */}
          <div className="w-full max-w-sm lg:max-w-md mx-auto px-4 mt-6 pb-4">
            <div
              onClick={isPlaying ? stopLouvor : playLouvor}
              className="flex items-center gap-3 w-full bg-black/80 border border-amber-500/20 rounded-2xl px-3 py-2 cursor-pointer touch-manipulation select-none"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shrink-0 shadow-lg shadow-amber-500/30">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Tocando</p>
                <p className="text-white text-sm font-medium truncate">{currentLouvor.title}</p>
                <p className="text-gray-500 text-xs truncate">{currentLouvor.artist}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextLouvor(); }}
                className="text-gray-500 active:text-amber-400 p-2 rounded-lg touch-manipulation select-none shrink-0"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer - Canto inferior esquerdo */}
          <div className="absolute bottom-8 left-8 z-10 hidden md:block">
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/50 shadow">
                <img src={logoSD} alt="SD" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">SD Móveis Projetados</p>
                <p className="text-gray-500 text-xs">Sistema PRO AI v2.0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {authState === 'LOGIN' && (
        <div className="fixed inset-0 z-50 isolate bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden">
          {/* Efeitos de fundo premium escuro */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl" />
          </div>

          {/* Linhas decorativas douradas */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <div className="absolute bottom-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
          </div>

          {/* Card de Login - Design Premium Dark */}
          <div className="relative z-10 w-[90vw] sm:w-[420px] max-w-[420px] my-auto py-8">
            {/* Glow atrás do card */}
            <div className="absolute -inset-4 bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent rounded-[50px] blur-xl" />

            <div className="relative bg-gradient-to-b from-gray-900/95 to-gray-950/98 backdrop-blur-xl rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 text-center border border-amber-500/20 shadow-2xl">
              {/* Linha dourada no topo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full" />

              {/* Badge do tipo de acesso */}
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 ${selectedRole === 'ADMIN'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : selectedRole === 'EMPLOYEE'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/10 text-white border border-white/20'
                }`}>
                {selectedRole === 'ADMIN' ? <Shield className="w-3.5 h-3.5" /> : selectedRole === 'EMPLOYEE' ? <Clock className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {selectedRole === 'ADMIN' ? 'Administrador' : selectedRole === 'EMPLOYEE' ? 'Funcionário' : 'Cliente'}
              </div>

              {/* Logo estável - sem tremor */}
              <div className="relative mx-auto mb-6 w-24 h-24">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 to-amber-600/20 rounded-2xl blur-xl" />
                <div className={`relative w-24 h-24 rounded-2xl overflow-hidden ring-2 ${selectedRole === 'ADMIN' ? 'ring-amber-500' : selectedRole === 'EMPLOYEE' ? 'ring-green-500' : 'ring-white/50'
                  } shadow-xl`} style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
                  <img
                    src={logoSD}
                    alt="SD Móveis"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'auto', transform: 'translateZ(0)' }}
                  />
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-2">
                SD Móveis <span className="text-amber-400">Projetados</span>
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                {selectedRole === 'EMPLOYEE' ? 'Digite seu nome e senha' : 'Digite sua senha para continuar'}
              </p>

              <div className="space-y-4">
                {selectedRole === 'EMPLOYEE' && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      className="w-full h-14 bg-white/5 hover:bg-white/8 rounded-xl px-6 border border-white/10 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 text-center text-lg text-white placeholder:text-gray-600 transition-all outline-none"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                )}
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full h-14 bg-white/5 hover:bg-white/8 rounded-xl px-6 border border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-center text-lg tracking-[0.3em] text-white placeholder:text-gray-600 transition-all outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>

                <button
                  onClick={handleLogin}
                  className={`w-full h-14 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${selectedRole === 'ADMIN'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black'
                    : 'bg-gradient-to-r from-white to-gray-100 hover:from-gray-100 hover:to-white text-gray-900'
                    }`}
                >
                  <ArrowRight className="w-5 h-5" />
                  Entrar no Sistema
                </button>
              </div>

              <button
                onClick={() => setAuthState('SELECT')}
                className="mt-8 text-gray-500 text-sm font-medium hover:text-amber-400 transition-colors flex items-center justify-center gap-2 mx-auto group"
              >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Voltar à seleção
              </button>

              {/* Versículo */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-gray-500 text-xs italic">
                  "Tudo o que fizerem, façam de todo coração"
                </p>
                <p className="text-amber-500/60 text-[10px] mt-1">Colossenses 3:23</p>
              </div>
            </div>
          </div>

          {/* Player de Louvor inline na tela de Login */}
          <div className="w-[90vw] sm:w-[420px] max-w-[420px] mt-4 pb-4">
            <div
              onClick={isPlaying ? stopLouvor : playLouvor}
              className="flex items-center gap-3 w-full bg-black/80 border border-amber-500/20 rounded-2xl px-3 py-2 cursor-pointer touch-manipulation select-none"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shrink-0 shadow-lg shadow-amber-500/30">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">Tocando</p>
                <p className="text-white text-sm font-medium truncate">{currentLouvor.title}</p>
                <p className="text-gray-500 text-xs truncate">{currentLouvor.artist}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextLouvor(); }}
                className="text-gray-500 active:text-amber-400 p-2 rounded-lg touch-manipulation select-none shrink-0"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <p className="text-gray-600 text-xs">SD Móveis © 2024</p>
          </div>
        </div>
      )}

      {/* MODALS */}
      {renderResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-10">
          <button onClick={() => setRenderResult(null)} className="absolute top-6 right-6 text-white hover:text-amber-500 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-5xl w-full">
            <img src={renderResult} alt="Render 4K" className="w-full rounded-3xl shadow-2xl" />
            <div className="flex gap-4 justify-center mt-6">
              <button className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download 4K
              </button>
              <button className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CLIENT CONTRACT MODAL */}
      {showClientContract && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl w-[550px] max-h-[85vh] overflow-auto shadow-2xl">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400" /> Meu Contrato</h3>
                <p className="text-gray-400 text-sm">Cozinha Gourmet Lux</p>
              </div>
              <button onClick={() => setShowClientContract(false)} className="text-white/60 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold">Valor Total</p>
                  <p className="text-2xl font-black text-amber-600">R$ 45.000</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                  <p className="text-xl font-bold text-blue-600">Em Produção</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <p className="text-xs text-gray-500 uppercase font-bold">Detalhes do Contrato</p>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Data de Assinatura:</span><span className="font-bold">01/02/2024</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Previsão de Entrega:</span><span className="font-bold">15/03/2024</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tipo de Projeto:</span><span className="font-bold">Cozinha Planejada</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Material:</span><span className="font-bold">MDF Premium + Granito</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Garantia:</span><span className="font-bold">5 Anos</span></div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <p className="text-xs text-green-600 uppercase font-bold mb-1">✅ Contrato Assinado Digitalmente</p>
                <p className="text-sm text-green-700">Assinado em 01/02/2024 às 14:32</p>
              </div>
              <button
                onClick={() => {
                  toast({ title: "📄 PDF Gerado", description: "Seu contrato está sendo baixado" });
                }}
                className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar Contrato PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT FINANCEIRO MODAL */}
      {showClientFinanceiro && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl w-[550px] max-h-[85vh] overflow-auto shadow-2xl">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-t-3xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Financeiro</h3>
                <p className="text-gray-400 text-sm">Acompanhamento de pagamentos</p>
              </div>
              <button onClick={() => setShowClientFinanceiro(false)} className="text-white/60 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <p className="text-xs text-green-600 uppercase font-bold">Pago</p>
                  <p className="text-2xl font-black text-green-600">R$ 27.000</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-600 uppercase font-bold">Restante</p>
                  <p className="text-2xl font-black text-amber-600">R$ 18.000</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-bold mb-3">Parcelas</p>
                {[
                  { num: 1, valor: 9000, data: '01/02/2024', status: 'Pago' },
                  { num: 2, valor: 9000, data: '01/03/2024', status: 'Pago' },
                  { num: 3, valor: 9000, data: '01/04/2024', status: 'Pago' },
                  { num: 4, valor: 9000, data: '01/05/2024', status: 'Pendente' },
                  { num: 5, valor: 9000, data: '01/06/2024', status: 'Pendente' },
                ].map(p => (
                  <div key={p.num} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <p className="font-bold text-gray-900">Parcela {p.num}/5</p>
                      <p className="text-xs text-gray-500">{p.data}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">R$ {p.valor.toLocaleString()}</p>
                      <span className={`text-xs font-bold ${p.status === 'Pago' ? 'text-green-600' : 'text-amber-600'}`}>
                        {p.status === 'Pago' ? '✅ Pago' : '⏳ Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Próximo vencimento: <span className="font-bold">01/05/2024</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GALLERY FULLSCREEN */}
      {galleryFullscreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-6">
          <button onClick={() => setGalleryFullscreen(null)} className="absolute top-6 right-6 text-white hover:text-amber-500 transition-colors">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-5xl w-full text-center">
            <img src={galleryFullscreen.url} alt={galleryFullscreen.title} className="w-full rounded-3xl shadow-2xl" />
            <p className="text-white text-xl font-black mt-6">{galleryFullscreen.title}</p>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = galleryFullscreen.url;
                  a.download = `${galleryFullscreen.title.replace(/\s/g, '-')}-4K.jpg`;
                  a.target = '_blank';
                  a.click();
                  toast({ title: "📥 Download iniciado" });
                }}
                className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download 4K
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: galleryFullscreen.title, url: galleryFullscreen.url });
                  } else {
                    navigator.clipboard.writeText(galleryFullscreen.url);
                    toast({ title: "🔗 Link copiado!" });
                  }
                }}
                className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}

      {isAiLoading && (
        <div className="fixed inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-50">
          <div className="relative">
            <Loader2 className="w-20 h-20 text-amber-500 animate-spin" />
            <Sparkles className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-white text-2xl font-bold mt-8">{aiLoadingMessage}</p>
          <p className="text-gray-500 text-sm mt-2">SD PRO IA SYSTEM</p>
          <div className="mt-8 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-amber-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* AR Modal */}
      {showArModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center pt-8 pb-4 px-4 overflow-hidden">
          <button
            onClick={() => setShowArModal(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-[101]"
          >
            <X className="w-6 h-6" />
          </button>

          <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Visualização AR 3D
          </h3>
          <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
            Movimente o modelo 3D abaixo. No celular, clique no botão para projetar na sua sala real!
          </p>

          <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-3xl overflow-hidden aspect-[3/4] md:aspect-video relative flex-col flex items-center justify-center">
            {React.createElement('model-viewer', {
              src: showArModal.url,
              alt: "Móvel 3D em AR",
              "shadow-intensity": "1",
              "camera-controls": true,
              "auto-rotate": true,
              ar: true,
              style: { width: '100%', height: '100%', backgroundColor: '#f1f5f9' }
            },
              <button slot="ar-button" className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 whitespace-nowrap">
                <Camera className="w-5 h-5" /> Ver no seu ambiente
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
