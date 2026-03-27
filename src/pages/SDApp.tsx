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
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ClientPortal } from '@/components/client/ClientPortal';
import PortfolioGallery from '@/components/PortfolioGallery';
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
            <AdminDashboard 
              contracts={contracts} 
              setView={setView} 
              handleRender={handleRender} 
              loading={loading}
            />
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
            <div className="h-full p-4 sm:p-8 overflow-auto bg-[#0f0f0f] relative">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 blur-[100px] rounded-full" />
              </div>
              <header className="mb-8 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    CRM WhatsApp
                  </h1>
                  <p className="text-gray-400 mt-1 font-medium italic">Gestão Avançada de Relacionamento e Leads</p>
                </div>
              </header>
              <div className="relative z-10">
                <Tabs defaultValue="crm" className="w-full">
                  <TabsList className="mb-6 bg-[#111111] border border-white/5 p-1 rounded-2xl">
                    <TabsTrigger value="crm" className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-widest">
                      <MessageCircle className="w-4 h-4" />
                      Conversas
                    </TabsTrigger>
                    <TabsTrigger value="flow" className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all font-black text-[10px] uppercase tracking-widest">
                      <GitBranch className="w-4 h-4" />
                      Atendimento
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="crm" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-1 overflow-hidden shadow-2xl">
                      <WhatsAppCRMReal />
                    </div>
                  </TabsContent>
                  <TabsContent value="flow" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                      <ChatFlowPanel />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* INTERNAL CHAT */}
          {view === ViewMode.INTERNAL_CHAT && (
            <InternalChat
              userName={authState === 'ADMIN' ? 'Administrador' : authState === 'EMPLOYEE' ? employeeName : clientName || 'Cliente'}
              userRole={authState === 'ADMIN' ? 'ADMIN' : authState === 'EMPLOYEE' ? 'EMPLOYEE' : 'CLIENT'}
            />
          )}

          {/* CLIENT PORTAL */}
          {view === ViewMode.CLIENT_PORTAL && (
            <ClientPortal 
              clientName={clientName}
              clientProject={clientProject}
              clientInstallments={clientInstallments}
              clientProductionSteps={clientProductionSteps}
              clientTimeline={clientTimeline}
              galleryItems={galleryItems}
              projectApproved={projectApproved}
              setProjectApproved={setProjectApproved}
              setView={setView}
              setShowClientContract={setShowClientContract}
              setShowClientFinanceiro={setShowClientFinanceiro}
              setGalleryFullscreen={setGalleryFullscreen}
              toast={toast}
            />
          )}

          {/* PORTFOLIO */}
          {view === ViewMode.PORTFOLIO && (
            <PortfolioGallery 
              galleryItems={galleryItems}
              projectApproved={projectApproved}
              setProjectApproved={setProjectApproved}
              setView={setView}
              setGalleryFullscreen={setGalleryFullscreen}
              setShowArModal={setShowArModal}
              toast={toast}
            />
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
             <div className="p-4 sm:p-8 overflow-auto h-full bg-[#0f0f0f] luxury-scroll relative">
               <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full" />
               </div>
               <div className="relative z-10 w-full max-w-4xl mx-auto">
                 <WarrantyCertificate
                    projectName={clientProject?.name || 'Projeto SD'}
                    clientName={clientName || 'Cliente'}
                    signedAt={clientProject?.signed_at}
                    warranty={clientProject?.warranty}
                    material={clientProject?.material}
                    projectType={clientProject?.project_type}
                  />
               </div>
            </div>
          )}

          {/* QUALITY CHECK - Admin */}
          {view === ViewMode.QUALITY_CHECK && authState === 'ADMIN' && selectedContract && (
            <div className="p-4 sm:p-8 overflow-auto h-full bg-[#0f0f0f] luxury-scroll relative">
              <QualityCheckPanel projectId={selectedContract.id} projectName={selectedContract.name || selectedContract.projectName} />
            </div>
          )}

          {/* PROJECT COSTS - Admin */}
          {view === ViewMode.PROJECT_COSTS && authState === 'ADMIN' && selectedContract && (
            <div className="p-4 sm:p-8 overflow-auto h-full bg-[#0f0f0f] luxury-scroll relative">
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
