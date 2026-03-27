import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard, Project } from "@/components/projects/ProjectCard";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { Card3D } from "@/components/animations/Card3D";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  FolderKanban,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  ClipboardList,
  Calculator,
  UserPlus,
  ArrowUpRight,
  Activity,
  Zap,
  Shield,
  Star,
  Sparkles,
  RefreshCcw,
  LayoutDashboard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const db = supabase as any;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [projectsRes, clientsRes, ordersRes] = await Promise.all([
        db.from('client_projects').select('id', { count: 'exact' }),
        db.from('clients').select('id', { count: 'exact' }).eq('status', 'active'),
        db.from('service_orders').select('total_value, created_at'),
      ]);

      const totalValue = (ordersRes.data || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_value) || 0), 0);
      
      setStats({
        totalProjects: projectsRes.count || 0,
        activeClients: clientsRes.count || 0,
        monthlyRevenue: totalValue,
        conversionRate: 88,
      });

      const { data: projData } = await db
        .from('client_projects')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (projData) {
        setRecentProjects(projData.map((p: any) => ({
          id: p.id,
          name: p.title,
          client: p.clients?.name || 'Cliente oculto',
          status: p.status || 'pending',
          value: Number(p.value) || 0,
          createdAt: new Date(p.created_at),
          thumbnail: undefined
        })));
      }

      const { data: activityData } = await db
        .from('service_orders')
        .select('*, clients(name), employees(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentActivities(activityData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8 sm:p-12 space-y-12 luxury-scroll relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#D4AF37]/3 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-1000">
          <div>
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter flex items-center gap-6 uppercase leading-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
                <LayoutDashboard className="w-9 h-9" />
              </div>
              Studio <span className="text-[#D4AF37]">Command</span>
            </h1>
            <p className="text-gray-500 mt-5 font-medium italic flex items-center gap-3 text-lg">
              <Shield className="w-5 h-5 text-[#D4AF37]" /> Bem-vindo à Inteligência Operacional SD Móveis
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={fetchDashboardData}
              className="h-16 px-8 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all italic active:scale-95 shadow-xl"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <Link to="/projects">
              <button className="h-16 px-10 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-[0_15px_40px_rgba(212,175,55,0.2)] italic">
                <Plus className="w-6 h-6" /> NOVO PROJETO
              </button>
            </Link>
          </div>
        </header>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {[
            { label: 'Clientes', icon: UserPlus, route: '/clients', color: 'bg-blue-500/10 text-blue-400', desc: 'GESTÃO VIP' },
            { label: 'Ordens', icon: ClipboardList, route: '/os', color: 'bg-amber-500/10 text-amber-500', desc: 'LINHA TÉCNICA' },
            { label: 'Orçamentos', icon: Calculator, route: '/orcamento', color: 'bg-[#D4AF37]/10 text-[#D4AF37]', desc: 'VISION IA' },
            { label: 'CRM', icon: TrendingUp, route: '/crm', color: 'bg-emerald-500/10 text-emerald-400', desc: 'PERFORMANCE' },
          ].map((action, i) => (
            <button 
              key={action.label}
              onClick={() => navigate(action.route)}
              className="group p-8 bg-[#111111] rounded-[3rem] border border-white/5 shadow-2xl hover:border-[#D4AF37]/30 hover:-translate-y-2 transition-all flex flex-col items-start gap-6 relative overflow-hidden"
            >
              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center border border-white/5 group-hover:bg-[#D4AF37] group-hover:text-black transition-all ${action.color}`}>
                <action.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.4em] mb-1 italic">{action.desc}</p>
                <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">{action.label}</p>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-0 group-hover:opacity-[0.03] transition-opacity">
                <action.icon className="w-24 h-24" />
              </div>
            </button>
          ))}
        </section>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {[
            { title: "Projetos Ativos", value: stats.totalProjects, icon: FolderKanban, trend: "Monitorados", color: "text-white" },
            { title: "Atendimento", value: stats.activeClients, icon: Users, trend: "Base Ativa", color: "text-white" },
            { title: "Volume de OS", value: `R$ ${(stats.monthlyRevenue / 1000).toFixed(1)}K`, icon: DollarSign, trend: "Circular Bruto", color: "text-[#D4AF37]" },
            { title: "Taxa IA", value: `${stats.conversionRate}%`, icon: Zap, trend: "Sucesso Vision", color: "text-emerald-500" },
          ].map((stat, i) => (
            <div key={stat.title} className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
               <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-4 italic leading-none">{stat.title}</p>
               <div className="flex items-center justify-between mb-4">
                  <p className={`text-4xl font-black italic tracking-tighter tabular-nums ${stat.color}`}>{stat.value}</p>
                  <stat.icon className="w-8 h-8 text-white opacity-10 group-hover:text-[#D4AF37] group-hover:opacity-100 transition-all duration-700" />
               </div>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic flex items-center gap-2">
                  <Zap className="w-3 h-3 text-[#D4AF37]" /> {stat.trend}
               </p>
            </div>
          ))}
        </div>

        {/* Split Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
          {/* Recent Projects */}
          <div className="lg:col-span-2 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-[22px] bg-white/5 border border-white/5 flex items-center justify-center text-[#D4AF37]">
                  <FolderKanban className="w-7 h-7" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Projetos Recentes</h2>
                   <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest italic leading-none">Últimas Atividades no Studio</p>
                </div>
              </div>
              <Link to="/projects">
                <button className="h-12 px-6 bg-white/5 border border-white/5 text-gray-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all italic flex items-center gap-3">
                  AUDITAR TODOS <ArrowUpRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recentProjects.length === 0 ? (
                <div className="col-span-2 p-20 bg-black/40 rounded-[3.5rem] border-2 border-dashed border-white/5 text-center group">
                  <FolderKanban className="w-20 h-20 text-gray-800 mx-auto mb-6 group-hover:scale-110 transition-transform duration-700" />
                  <p className="text-gray-500 font-black uppercase tracking-widest italic mb-6">Nenhum projeto registrado no sistema</p>
                  <Button variant="link" onClick={() => navigate('/projects')} className="text-[#D4AF37] font-black italic uppercase tracking-widest underline underline-offset-8">INICIAR AGORA</Button>
                </div>
              ) : (
                recentProjects.map((project, i) => (
                  <div key={project.id} className="relative group">
                    <ProjectCard project={project} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1 space-y-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-[22px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Atividade OS</h2>
                 <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest italic leading-none">Fluxo de Ordens de Serviço</p>
              </div>
            </div>
            
            <div className="bg-[#111111] rounded-[3.5rem] border border-white/5 p-10 shadow-2xl space-y-6 relative overflow-hidden group/feed">
               <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#D4AF37]/5 blur-[80px] rounded-full group-hover/feed:scale-110 transition-transform duration-1000" />
                {recentActivities.map((act, i) => (
                  <div key={act.id} className="flex items-start gap-6 p-6 hover:bg-white/[0.02] border border-transparent hover:border-white/5 rounded-[2.5rem] transition-all cursor-pointer group/item relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover/item:scale-110 ${
                      act.status === 'aberta' ? 'bg-blue-500/10 text-blue-400' : 
                      act.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-md font-black text-white italic tracking-tighter uppercase truncate leading-none">OS #{act.order_number}</p>
                        <span className="text-[9px] text-gray-700 font-black italic tabular-nums">{new Date(act.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium italic line-clamp-1 mb-4">{act.clients?.name.toUpperCase()}</p>
                      <div className="flex items-center gap-3">
                         <span className={`text-[8px] font-black uppercase tracking-widest px-3 h-6 flex items-center rounded-full italic border ${
                            act.status === 'aberta' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 
                            act.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                         }`}>
                           {act.status}
                         </span>
                         {act.employees?.name && <span className="text-[8px] text-gray-700 font-bold italic border-l border-white/10 pl-3">DESIGNADO: {act.employees.name.split(' ')[0].toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {recentActivities.length === 0 && (
                  <div className="text-center py-20 group">
                    <ClipboardList className="w-16 h-16 text-gray-900 mx-auto mb-6 group-hover:text-gray-800 transition-colors" />
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em] italic leading-none">Log Dinâmico Vazio</p>
                  </div>
                )}
                
                <button 
                  onClick={() => navigate('/os')}
                  className="w-full h-16 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 hover:bg-[#D4AF37] hover:text-black transition-all shadow-xl"
                >
                  VER TODAS AS ORDENS <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <AIAssistant />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
