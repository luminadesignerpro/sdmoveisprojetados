import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, UserPlus, Play, Square, Calendar, DollarSign, Users, Trash2, Edit2, Save, X, Plus, Minus, MessageCircle, Mail, Key, Eye, EyeOff, CheckCircle
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  hourly_rate: number;
  active: boolean;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
}

interface Adjustment {
  id: string;
  employee_id: string;
  type: 'overtime' | 'advance' | 'fuel_allowance' | 'meal_allowance';
  description: string | null;
  amount: number;
  hours: number;
  reference_date: string;
  created_at: string;
}

interface AdvanceRequest {
  id: string;
  employee_id: string;
  amount: number;
  reason: string | null;
  status: 'pending' | 'Aprovado' | 'Recusado';
  created_at: string;
}

type Period = 'week' | 'biweekly' | 'month';
type TabType = 'ponto' | 'funcionarios' | 'relatorio' | 'vales';

export default function TimeTrackingPanel() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
  const [tab, setTab] = useState<TabType>('ponto');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [hourlyRate, setHourlyRate] = useState('15.00');
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  // Change password modal
  const [passwordEmp, setPasswordEmp] = useState<Employee | null>(null);
  const [changePassword, setChangePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Adjustment form
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjType, setAdjType] = useState<'overtime' | 'advance' | 'fuel_allowance' | 'meal_allowance'>('overtime');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjHours, setAdjHours] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, teRes, adjRes, advRes] = await Promise.all([
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('time_entries').select('*').order('clock_in', { ascending: false }).limit(500),
      supabase.from('employee_adjustments').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('advance_requests').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (teRes.data) setTimeEntries(teRes.data);
    if (adjRes.data) setAdjustments(adjRes.data as Adjustment[]);
    if (advRes.data) setAdvanceRequests(advRes.data as AdvanceRequest[]);
    setLoading(false);
  };

  const addEmployee = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('employees').insert({
      name: newName.trim(),
      role: newRole.trim() || null,
      phone: newPhone.trim() || null,
      hourly_rate: parseFloat(hourlyRate) || 15,
      // Removendo email e password pois não existem na tabela do banco de dados atual
    });
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Funcionário adicionado' });
      setNewName(''); setNewRole(''); setNewPhone(''); setNewEmail(''); setNewPassword('');
      fetchData();
    }
  };

  const removeEmployee = async (id: string) => {
    await supabase.from('employees').update({ active: false }).eq('id', id);
    toast({ title: '🗑️ Funcionário desativado' });
    fetchData();
  };

  const handleChangePassword = async () => {
    toast({ title: '⚠️ Funcionalidade indisponível', description: 'Coluna de senha não encontrada no banco de dados.', variant: 'outline' });
    setPasswordEmp(null);
  };

  const clockIn = async (employeeId: string) => {
    const { error } = await supabase.from('time_entries').insert({
      employee_id: employeeId,
    });
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Entrada registrada!' });
      fetchData();
    }
  };

  const clockOut = async (entryId: string) => {
    const { error } = await supabase.from('time_entries').update({
      clock_out: new Date().toISOString(),
    }).eq('id', entryId);
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Saída registrada!' });
      fetchData();
    }
  };

  const getOpenEntry = (employeeId: string) =>
    timeEntries.find(e => e.employee_id === employeeId && !e.clock_out);

  const getPeriodDates = (): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'biweekly') start.setDate(now.getDate() - 15);
    else start.setDate(now.getDate() - 30);
    return { start, end };
  };

  const calcHours = (employeeId: string): number => {
    const { start, end } = getPeriodDates();
    return timeEntries
      .filter(e => e.employee_id === employeeId && e.clock_out)
      .filter(e => new Date(e.clock_in) >= start && new Date(e.clock_in) <= end)
      .reduce((sum, e) => {
        const diff = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
        return sum + diff;
      }, 0);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const tabClass = (t: TabType) =>
    `px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-500 italic ${
      tab === t 
        ? 'bg-[#D4AF37] text-black shadow-lg scale-105 active:scale-95' 
        : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
    }`;

  const getEmployeeAdjustments = (employeeId: string) => {
    const { start, end } = getPeriodDates();
    return adjustments.filter(a =>
      a.employee_id === employeeId &&
      new Date(a.reference_date) >= start &&
      new Date(a.reference_date) <= end
    );
  };

  const calcOvertime = (employeeId: string) => {
    return getEmployeeAdjustments(employeeId).filter(a => a.type === 'overtime').reduce((sum, a) => sum + Number(a.amount), 0);
  };

  const calcDeductions = (employeeId: string) => {
    return getEmployeeAdjustments(employeeId).filter(a => a.type === 'advance').reduce((sum, a) => sum + Number(a.amount), 0);
  };

  const calcFuelAllowance = (employeeId: string) => {
    return getEmployeeAdjustments(employeeId).filter(a => a.type === 'fuel_allowance').reduce((sum, a) => sum + Number(a.amount), 0);
  };

  const calcMealAllowance = (employeeId: string) => {
    return getEmployeeAdjustments(employeeId).filter(a => a.type === 'meal_allowance').reduce((sum, a) => sum + Number(a.amount), 0);
  };

  const addAdjustment = async () => {
    if (!adjEmployeeId || !adjAmount) {
      toast({ title: '⚠️ Preencha os campos', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('employee_adjustments').insert({
      employee_id: adjEmployeeId,
      type: adjType,
      description: adjDescription.trim() || null,
      amount: parseFloat(adjAmount) || 0,
      hours: parseFloat(adjHours) || 0,
      reference_date: new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Lançamento adicionado!' });
      setShowAdjForm(false);
      setAdjDescription('');
      setAdjAmount('');
      setAdjHours('');
      fetchData();
    }
  };

  const handleUpdateAdvanceStatus = async (request: AdvanceRequest, newStatus: 'Aprovado' | 'Recusado') => {
    // 1. Update the request status
    const { error: updateError } = await supabase
      .from('advance_requests')
      .update({ status: newStatus })
      .eq('id', request.id);

    if (updateError) {
      toast({ title: '❌ Erro ao atualizar status', description: updateError.message, variant: 'destructive' });
      return;
    }

    // 2. If approved, create an adjustment entry
    if (newStatus === 'Aprovado') {
      const { error: adjError } = await supabase.from('employee_adjustments').insert({
        employee_id: request.employee_id,
        type: 'advance',
        description: request.reason ? `Vale: ${request.reason}` : 'Vale solicitado pelo portal',
        amount: request.amount,
        reference_date: new Date().toISOString().split('T')[0],
      });

      if (adjError) {
        toast({ title: '⚠️ Pedido aprovado, mas erro ao criar desconto', description: adjError.message, variant: 'destructive' });
      } else {
        toast({ title: '✅ Vale aprovado e desconto gerado!' });
      }
    } else {
      toast({ title: '❌ Vale recusado' });
    }

    fetchData();
  };

  const deleteAdjustment = async (id: string) => {
    await supabase.from('employee_adjustments').delete().eq('id', id);
    toast({ title: '🗑️ Lançamento removido' });
    fetchData();
  };

  const buildPayslipText = (emp: Employee) => {
    const hours = calcHours(emp.id);
    const base = hours * emp.hourly_rate;
    const overtime = calcOvertime(emp.id);
    const fuelAllowance = calcFuelAllowance(emp.id);
    const deductions = calcDeductions(emp.id);
    const total = base + overtime + fuelAllowance - deductions;
    const periodLabel = period === 'week' ? 'Semana' : period === 'biweekly' ? 'Quinzena' : 'Mês';
    return `*SD Móveis Projetados - Contracheque*\n\n` +
      `👤 *${emp.name}*\n` +
      `📋 Cargo: ${emp.role || '-'}\n` +
      `📅 Período: ${periodLabel}\n\n` +
      `⏱ Horas trabalhadas: ${hours.toFixed(1)}h\n` +
      `💰 Valor/hora: R$ ${emp.hourly_rate.toFixed(2)}\n` +
      `💵 Base: R$ ${base.toFixed(2)}\n` +
      (overtime > 0 ? `✅ Horas Extra: +R$ ${overtime.toFixed(2)}\n` : '') +
      (fuelAllowance > 0 ? `⛽ Vale Combustível: +R$ ${fuelAllowance.toFixed(2)}\n` : '') +
      (deductions > 0 ? `❌ Adiantamentos: -R$ ${deductions.toFixed(2)}\n` : '') +
      `\n*💰 Total Líquido: R$ ${total.toFixed(2)}*`;
  };

  const sendViaWhatsApp = (emp: Employee) => {
    if (!emp.phone) {
      toast({ title: '⚠️ Sem telefone', description: `${emp.name} não tem telefone cadastrado.`, variant: 'destructive' });
      return;
    }
    const phone = emp.phone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const text = encodeURIComponent(buildPayslipText(emp));
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const sendViaEmail = (emp: Employee) => {
    const periodLabel = period === 'week' ? 'Semana' : period === 'biweekly' ? 'Quinzena' : 'Mês';
    const subject = encodeURIComponent(`Contracheque - ${periodLabel} - SD Móveis Projetados`);
    const body = encodeURIComponent(buildPayslipText(emp).replace(/\*/g, ''));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    toast({ title: '📧 Email', description: 'Cliente de e-mail aberto. Adicione o destinatário.' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] gap-6">
        <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
        <p className="text-[#D4AF37] font-black uppercase tracking-[0.4em] text-[10px] italic">Sincronizando Registros SD Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col rounded-3xl border border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter flex items-center gap-4 uppercase leading-none">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-xl flex items-center justify-center text-black shadow-lg">
              <Clock className="w-5 h-5" />
            </div>
            Gestão de <span className="text-[#D4AF37]">Ponto</span>
          </h1>
          <p className="text-gray-500 mt-2 text-[10px] font-medium italic flex items-center gap-2">
             <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Controle de Jornada SD Core
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2 p-1 bg-[#111111] border border-white/5 rounded-2xl w-fit relative z-10 shadow-xl overflow-hidden">
        <button className={tabClass('ponto')} onClick={() => setTab('ponto')}>
          <Play className="w-3.5 h-3.5 mr-2" />Registrar
        </button>
        <button className={tabClass('funcionarios')} onClick={() => setTab('funcionarios')}>
          <Users className="w-3.5 h-3.5 mr-2" />Funcionários
        </button>
        <button className={tabClass('relatorio')} onClick={() => setTab('relatorio')}>
          <DollarSign className="w-3.5 h-3.5 mr-2" />Relatório
        </button>
        <button className={tabClass('vales')} onClick={() => setTab('vales')}>
          <div className="relative inline-block mr-2">
            <DollarSign className="w-3.5 h-3.5" />
            {advanceRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
            )}
          </div>
          Vales
        </button>
      </nav>

      {/* ===== PONTO ===== */}
      {tab === 'ponto' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 animate-in slide-in-from-bottom-6 duration-700">
          {employees.map(emp => {
            const openEntry = getOpenEntry(emp.id);
            return (
              <div key={emp.id} className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-500">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:text-[#D4AF37] transition-colors">
                      <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-1 group-hover:text-[#D4AF37] transition-colors">{emp.name}</h3>
                      {emp.role && <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest italic">{emp.role}</p>}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${openEntry ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`} />
                </div>
                
                {openEntry ? (
                  <div className="space-y-6">
                    <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 flex items-center justify-between">
                       <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest italic">Início Turno</span>
                       <span className="text-xs font-black text-green-500 italic tabular-nums">{formatTime(openEntry.clock_in)}</span>
                    </div>
                    <button 
                      onClick={() => clockOut(openEntry.id)} 
                      className="w-full h-16 bg-white/5 border border-white/10 hover:bg-red-500 hover:text-white text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl italic flex items-center justify-center gap-3 group/btn"
                    >
                      <Square className="w-4 h-4 transition-transform group-hover/btn:scale-110" /> Finalizar Missão
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => clockIn(emp.id)} 
                    className="w-full h-16 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center justify-center gap-3 group/btn"
                  >
                    <Play className="w-4 h-4 fill-black" /> Iniciar Expediente
                  </button>
                )}
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="col-span-full text-center py-24 opacity-20">
              <Users className="w-20 h-20 mx-auto mb-8 text-gray-700" />
              <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Base Estática — Nenhum Agente Alistado</p>
            </div>
          )}
        </div>
      )}

      {/* ===== FUNCIONÁRIOS ===== */}
      {tab === 'funcionarios' && (
        <div className="space-y-10 relative z-10 animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12 flex items-center gap-5">
              <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                <UserPlus className="w-7 h-7" />
              </div>
              Recrutamento de Agentes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Nome Competente</label>
                <input
                  placeholder="EX: RICARDO OLIVEIRA"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full h-16 bg-[#0f0f0f] border border-white/10 rounded-2xl px-6 text-[#D4AF37] text-base font-black italic tracking-widest outline-none focus:border-[#D4AF37]/60 transition-all shadow-inner uppercase placeholder:text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Cargo / Função</label>
                <input
                  placeholder="EX: MARCENEIRO MASTER"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full h-16 bg-[#0f0f0f] border border-white/10 rounded-2xl px-6 text-[#D4AF37] text-base font-black italic tracking-widest outline-none focus:border-[#D4AF37]/60 transition-all shadow-inner uppercase placeholder:text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Contato Seguro</label>
                <input
                  placeholder="(00) 00000-0000"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addEmployee}
                  disabled={!newName.trim()}
                  className="w-full h-16 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5" /> EFETIVAR ALISTAMENTO
                </button>
              </div>
            </div>
          </div>

          {/* Valor/hora global */}
          <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group max-w-2xl">
            <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-8 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              Padrão de Remuneração (Global)
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 w-full bg-black border border-white/5 rounded-2xl px-6 py-4 flex items-center gap-4 group-focus-within:border-[#D4AF37]/40 transition-all">
                <span className="text-[#D4AF37] font-black italic text-sm">R$</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                  className="bg-transparent text-white text-lg font-black italic tracking-widest outline-none w-full tabular-nums"
                  step="0.50"
                />
              </div>
              <button
                onClick={async () => {
                  const rate = parseFloat(hourlyRate) || 15;
                  await supabase.from('employees').update({ hourly_rate: rate }).eq('active', true);
                  toast({ title: '✅ Tabela de Preços Atualizada — Base Global' });
                  fetchData();
                }}
                className="whitespace-nowrap h-16 bg-white/5 border border-white/10 hover:bg-white/10 text-[#D4AF37] px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all italic"
              >
                Atualizar Toda a Base
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12">Agentes Ativos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-[2rem] group/item hover:border-[#D4AF37]/20 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 group-hover/item:text-[#D4AF37] transition-colors">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-white italic uppercase tracking-tighter leading-none mb-1">{emp.name}</p>
                      <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest italic">{emp.role || 'Operacional'} • {emp.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-black text-[#D4AF37] italic tabular-nums">R$ {emp.hourly_rate}/h</span>
                    <button onClick={() => removeEmployee(emp.id)} className="w-10 h-10 rounded-xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <p className="col-span-full text-center text-gray-700 py-12 font-black uppercase tracking-[0.4em] text-[10px] italic">Base Estática — Sem Agentes</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== VALES ===== */}
      {tab === 'vales' && (
        <div className="space-y-10 relative z-10 animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12 flex items-center gap-5">
              <div className="w-12 h-12 rounded-[18px] bg-[#D4AF37] text-black flex items-center justify-center">
                <DollarSign className="w-7 h-7" />
              </div>
              Requisições de Aporte (Vales)
            </h3>
            
            <div className="space-y-6">
              {advanceRequests.filter(r => r.status === 'pending').map(req => {
                const emp = employees.find(e => e.id === req.employee_id);
                return (
                  <div key={req.id} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between p-8 bg-black/40 border border-[#D4AF37]/10 rounded-[2.5rem] gap-8 group hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] font-black italic border border-[#D4AF37]/20 text-xl overflow-hidden">
                        {emp?.name.substring(0, 2).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-xl font-black text-white italic uppercase tracking-tighter mb-1 leading-none">{emp?.name || 'Agente Infiltrado'}</p>
                        <div className="flex items-center gap-4">
                           <p className="text-lg font-black text-[#D4AF37] italic tabular-nums leading-none">R$ {Number(req.amount).toFixed(2)}</p>
                           <span className="w-1 h-1 bg-white/10 rounded-full" />
                           <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">{new Date(req.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                        {req.reason && <p className="text-xs text-gray-600 mt-4 italic font-medium leading-relaxed max-w-md">"{req.reason}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleUpdateAdvanceStatus(req, 'Aprovado')}
                        className="flex-1 h-16 bg-[#D4AF37] hover:scale-105 active:scale-95 text-black px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all italic flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/10"
                      >
                        <CheckCircle className="w-5 h-5 fill-black" /> APROVAR APORTE
                      </button>
                      <button
                        onClick={() => handleUpdateAdvanceStatus(req, 'Recusado')}
                        className="h-16 bg-white/5 border border-white/5 hover:bg-white/10 text-red-500 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all italic flex items-center justify-center"
                      >
                        <X className="w-5 h-5" /> REJEITAR
                      </button>
                    </div>
                  </div>
                );
              })}
              {advanceRequests.filter(r => r.status === 'pending').length === 0 && (
                <div className="text-center py-24 opacity-20">
                  <CheckCircle className="w-20 h-20 mx-auto mb-8 text-gray-700" />
                  <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Sem Requisições Críticas no Momento</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
             <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-10 flex items-center gap-4">
                <Calendar className="w-5 h-5 text-gray-600" /> Histórico de Transações
             </h3>
             <div className="space-y-3 max-h-[500px] overflow-auto luxury-scroll pr-4">
               {advanceRequests.filter(r => r.status !== 'pending').slice(0, 50).map(req => {
                 const emp = employees.find(e => e.id === req.employee_id);
                 const isApproved = req.status === 'Aprovado';
                 return (
                   <div key={req.id} className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
                     <div className="flex items-center gap-6">
                       <div className={`w-2.5 h-2.5 rounded-full ${isApproved ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`} />
                       <div className="flex flex-col">
                          <span className="font-black text-white italic uppercase tracking-tighter leading-none mb-1 text-sm">{emp?.name || '...'}</span>
                          <span className="text-[9px] text-gray-600 font-black tracking-widest uppercase italic">{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-8">
                       <span className="text-sm font-black text-white italic tabular-nums">R$ {Number(req.amount).toFixed(2)}</span>
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${isApproved ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} border border-current opacity-60`}>
                         {req.status}
                       </span>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}
      {/* ===== RELATÓRIO ===== */}
      {tab === 'relatorio' && (
        <div className="space-y-10 relative z-10 animate-in slide-in-from-bottom-6 duration-700 pb-20">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
            <div className="flex p-1 bg-[#111111] border border-white/5 rounded-2xl w-fit shadow-xl">
              {(['week', 'biweekly', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all italic ${
                    period === p ? 'bg-[#D4AF37] text-black shadow-lg scale-105' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {p === 'week' ? 'Semana' : p === 'biweekly' ? 'Quinzena' : 'Mês'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowAdjForm(!showAdjForm); if (!adjEmployeeId && employees.length) setAdjEmployeeId(employees[0].id); }}
              className="h-16 bg-white/5 border border-white/10 hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl italic flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" /> LANÇAMENTO EXTRAORDINÁRIO
            </button>
          </div>

          {/* Adjustment Form */}
          {showAdjForm && (
            <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3rem] p-10 shadow-3xl relative overflow-hidden animate-in zoom-in-95 duration-500">
               <div className="absolute top-0 left-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
               <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-10 flex items-center gap-4">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" /> Dados da Operação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end relative z-10">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic ml-1">Agente Destino</label>
                  <select value={adjEmployeeId} onChange={e => setAdjEmployeeId(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic ml-1">Tipo de Remessa</label>
                  <select value={adjType} onChange={e => setAdjType(e.target.value as any)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40">
                    <option value="overtime">⏰ HORA EXTRA</option>
                    <option value="fuel_allowance">⛽ VALE COMBUSTÍVEL</option>
                    <option value="meal_allowance">🍽️ VALE REFEIÇÃO</option>
                    <option value="advance">💵 ADIANTAMENTO</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic ml-1">
                    {adjType === 'overtime' ? 'QUANTIDADE HORAS' : 'MEMORANDO'}
                  </label>
                  {adjType === 'overtime' ? (
                    <input type="number" placeholder="0.0" value={adjHours} onChange={e => setAdjHours(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 tabular-nums" step="0.5" />
                  ) : (
                    <input placeholder="MOTIVO DA OPERAÇÃO" value={adjDescription} onChange={e => setAdjDescription(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 uppercase" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic ml-1">MONTANTE (R$)</label>
                  <input type="number" placeholder="0,00" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-[#D4AF37] text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 tabular-nums" step="0.01" />
                </div>
                <div className="flex gap-3">
                  <button onClick={addAdjustment} className="flex-1 h-14 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all italic flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> EFETIVAR
                  </button>
                  <button onClick={() => setShowAdjForm(false)} className="w-14 h-14 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 rounded-xl flex items-center justify-center transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Table */}
          <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <div className="overflow-x-auto luxury-scroll">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-8 py-8 text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Operacional</th>
                    <th className="text-right px-6 py-8 text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Jornada</th>
                    <th className="text-right px-6 py-8 text-[10px] font-black text-green-500/60 uppercase tracking-widest italic">+ H. Extra</th>
                    <th className="text-right px-6 py-8 text-[10px] font-black text-orange-500/60 uppercase tracking-widest italic">⛽ V. Comb.</th>
                    <th className="text-right px-6 py-8 text-[10px] font-black text-purple-500/60 uppercase tracking-widest italic">🍽️ V. Ref.</th>
                    <th className="text-right px-6 py-8 text-[10px] font-black text-red-500/60 uppercase tracking-widest italic">- Vales</th>
                    <th className="text-right px-8 py-8 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest italic">Crédito Final</th>
                    <th className="text-center px-6 py-8 text-[10px] font-black text-gray-600 uppercase tracking-widest italic">Canal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {employees.map(emp => {
                    const hours = calcHours(emp.id);
                    const base = hours * emp.hourly_rate;
                    const overtime = calcOvertime(emp.id);
                    const fuelAllowance = calcFuelAllowance(emp.id);
                    const mealAllowance = calcMealAllowance(emp.id);
                    const deductions = calcDeductions(emp.id);
                    const total = base + overtime + fuelAllowance - deductions;
                    return (
                      <tr key={emp.id} className="group/row hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-6 font-black text-white italic uppercase tracking-tighter text-sm">
                           {emp.name}
                           <p className="text-[9px] text-gray-700 font-medium not-italic mt-1 uppercase tracking-widest">{emp.role || 'Agente'}</p>
                        </td>
                        <td className="px-6 py-6 text-right font-black text-gray-400 italic tabular-nums text-xs">{hours.toFixed(1)}h</td>
                        <td className="px-6 py-6 text-right font-black text-green-500 italic tabular-nums text-xs">{overtime > 0 ? `+R$ ${overtime.toFixed(2)}` : '-'}</td>
                        <td className="px-6 py-6 text-right font-black text-orange-400 italic tabular-nums text-xs">{fuelAllowance > 0 ? `+R$ ${fuelAllowance.toFixed(2)}` : '-'}</td>
                        <td className="px-6 py-6 text-right font-black text-purple-400 italic tabular-nums text-xs">{mealAllowance > 0 ? `+R$ ${mealAllowance.toFixed(2)}` : '-'}</td>
                        <td className="px-6 py-6 text-right font-black text-red-400 italic tabular-nums text-xs">{deductions > 0 ? `-R$ ${deductions.toFixed(2)}` : '-'}</td>
                        <td className="px-8 py-6 text-right">
                           <span className="font-black text-lg italic tabular-nums leading-none tracking-tighter" style={{ color: total >= 0 ? '#D4AF37' : '#ef4444' }}>
                              R$ {total.toFixed(2)}
                           </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="flex items-center justify-center gap-3 opacity-20 group-hover/row:opacity-100 transition-opacity">
                            <button onClick={() => sendViaWhatsApp(emp)} className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-black transition-all">
                              <MessageCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => sendViaEmail(emp)} className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-black transition-all">
                              <Mail className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#ffffff10] backdrop-blur-xl">
                  <tr className="border-t border-white/10">
                    <td colSpan={2} className="px-8 py-8 items-center">
                       <span className="font-black text-white italic uppercase tracking-[0.2em] text-[10px]">Consolidado Geral</span>
                    </td>
                    <td className="px-6 py-8 text-right font-black text-green-400 italic text-sm tabular-nums">+ R$ {employees.reduce((s, e) => s + calcOvertime(e.id), 0).toFixed(2)}</td>
                    <td className="px-6 py-8 text-right font-black text-orange-400 italic text-sm tabular-nums">+ R$ {employees.reduce((s, e) => s + calcFuelAllowance(e.id), 0).toFixed(2)}</td>
                    <td className="px-6 py-8 text-right font-black text-purple-400 italic text-sm tabular-nums">+ R$ {employees.reduce((s, e) => s + calcMealAllowance(e.id), 0).toFixed(2)}</td>
                    <td className="px-6 py-8 text-right font-black text-red-400 italic text-sm tabular-nums">- R$ {employees.reduce((s, e) => s + calcDeductions(e.id), 0).toFixed(2)}</td>
                    <td className="px-8 py-8 text-right">
                       <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest italic mb-1">Total a Liquidar</p>
                       <span className="font-black text-2xl italic tabular-nums tracking-tighter text-[#D4AF37]">
                          R$ {employees.reduce((s, e) => {
                            const h = calcHours(e.id);
                            return s + (h * e.hourly_rate) + calcOvertime(e.id) + calcFuelAllowance(e.id) - calcDeductions(e.id);
                          }, 0).toFixed(2)}
                       </span>
                    </td>
                    <td className="px-6 py-8"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Lançamentos Recentes */}
            <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  Registros Extraordinários
               </h3>
               <div className="space-y-3 max-h-[400px] overflow-auto luxury-scroll pr-4">
                 {adjustments.slice(0, 20).map(adj => {
                   const emp = employees.find(e => e.id === adj.employee_id);
                   const isCredit = ['overtime', 'fuel_allowance', 'meal_allowance'].includes(adj.type);
                   return (
                     <div key={adj.id} className="flex justify-between items-center p-5 bg-black/40 border border-white/5 rounded-2xl group/item hover:bg-white/[0.05] transition-all">
                       <div className="flex gap-4 items-center">
                          <span className={`w-2 h-2 rounded-full ${isCredit ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                          <div>
                            <p className="text-xs font-black text-white italic uppercase tracking-tighter leading-none mb-1">{emp?.name || '...'}</p>
                            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest italic">{adj.description || adj.type.replace('_', ' ')}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                         <span className={`text-sm font-black italic tabular-nums ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                            {isCredit ? '+' : '-'} R$ {Number(adj.amount).toFixed(2)}
                         </span>
                         <button onClick={() => deleteAdjustment(adj.id)} className="w-8 h-8 rounded-lg bg-red-500/5 text-red-500/30 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                            <Trash2 className="w-3 h-3" />
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>

            {/* Registros Recentes */}
            <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                  Fluxo de Jornada (Logs)
               </h3>
               <div className="space-y-3 max-h-[400px] overflow-auto luxury-scroll pr-4">
                 {timeEntries.slice(0, 20).map(entry => {
                   const emp = employees.find(e => e.id === entry.employee_id);
                   return (
                     <div key={entry.id} className="flex flex-col p-5 bg-black/40 border border-white/5 rounded-2xl gap-3">
                        <div className="flex justify-between items-start">
                           <p className="text-xs font-black text-white italic uppercase tracking-tighter leading-none">{emp?.name || '...'}</p>
                           <span className="text-[9px] text-gray-600 font-black uppercase italic tracking-widest">{new Date(entry.clock_in).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-10 bg-black border border-white/5 rounded-xl px-4 flex items-center gap-3">
                              <Play className="w-3 h-3 text-green-500" />
                              <span className="text-[11px] font-black text-gray-400 tabular-nums italic">{new Date(entry.clock_in).toLocaleTimeString()}</span>
                           </div>
                           <div className="flex-1 h-10 bg-black border border-white/5 rounded-xl px-4 flex items-center gap-3">
                              <Square className="w-3 h-3 text-red-500" />
                              <span className="text-[11px] font-black text-gray-400 tabular-nums italic">{entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'EM CURSO'}</span>
                           </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
