import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, UserPlus, Play, Square, Calendar, DollarSign, Users, Trash2, Edit2, Save, X, Plus, Minus, MessageCircle, Mail, Key, Eye, EyeOff, Shield, Zap, TrendingUp, Activity, Search
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

type Period = 'week' | 'biweekly' | 'month';

export default function TimeTrackingPanel() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [tab, setTab] = useState<'ponto' | 'funcionarios' | 'relatorio'>('ponto');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [hourlyRate, setHourlyRate] = useState('15.00');
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  const [passwordEmp, setPasswordEmp] = useState<Employee | null>(null);
  const [changePassword, setChangePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjType, setAdjType] = useState<'overtime' | 'advance' | 'fuel_allowance' | 'meal_allowance'>('overtime');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjHours, setAdjHours] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, teRes, adjRes] = await Promise.all([
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('time_entries').select('*').order('clock_in', { ascending: false }).limit(500),
      supabase.from('employee_adjustments').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (teRes.data) setTimeEntries(teRes.data);
    if (adjRes.data) setAdjustments(adjRes.data as Adjustment[]);
    setLoading(false);
  };

  const addEmployee = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('employees').insert({
      name: newName.trim(), role: newRole.trim() || null, phone: newPhone.trim() || null,
      hourly_rate: parseFloat(hourlyRate) || 15, email: newEmail.trim() || null, password: newPassword.trim() || null,
    });
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Sucesso!' }); setNewName(''); setNewRole(''); setNewPhone(''); setNewEmail(''); setNewPassword(''); fetchData(); }
  };

  const handleChangePassword = async () => {
    if (!passwordEmp || changePassword.length < 4) return toast({ title: '⚠️ Mínimo 4 caracteres', variant: 'destructive' });
    setSavingPassword(true);
    const { error } = await supabase.from('employees').update({ password: changePassword }).eq('id', passwordEmp.id);
    setSavingPassword(false);
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Senha Atualizada!' }); setPasswordEmp(null); setChangePassword(''); }
  };

  const clockIn = async (employeeId: string) => {
    const { error } = await supabase.from('time_entries').insert({ employee_id: employeeId });
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Entrada Registrada!' }); fetchData(); }
  };

  const clockOut = async (entryId: string) => {
    const { error } = await supabase.from('time_entries').update({ clock_out: new Date().toISOString() }).eq('id', entryId);
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Saída Registrada!' }); fetchData(); }
  };

  const getOpenEntry = (employeeId: string) => timeEntries.find(e => e.employee_id === employeeId && !e.clock_out);
  const getPeriodDates = (): { start: Date; end: Date } => {
    const now = new Date(); const end = new Date(now); const start = new Date(now);
    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'biweekly') start.setDate(now.getDate() - 15);
    else start.setDate(now.getDate() - 30);
    return { start, end };
  };

  const calcHours = (employeeId: string): number => {
    const { start, end } = getPeriodDates();
    return timeEntries.filter(e => e.employee_id === employeeId && e.clock_out && new Date(e.clock_in) >= start && new Date(e.clock_in) <= end)
      .reduce((sum, e) => sum + (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000, 0);
  };

  const getEmployeeAdjustments = (employeeId: string) => {
    const { start, end } = getPeriodDates();
    return adjustments.filter(a => a.employee_id === employeeId && new Date(a.reference_date) >= start && new Date(a.reference_date) <= end);
  };

  const calcAdjValue = (employeeId: string, type: string) => getEmployeeAdjustments(employeeId).filter(a => a.type === type).reduce((sum, a) => sum + Number(a.amount), 0);

  const addAdjustment = async () => {
    if (!adjEmployeeId || !adjAmount) return toast({ title: '⚠️ Preencha os campos', variant: 'destructive' });
    const { error } = await supabase.from('employee_adjustments').insert({
      employee_id: adjEmployeeId, type: adjType, description: adjDescription.trim() || null,
      amount: parseFloat(adjAmount) || 0, hours: parseFloat(adjHours) || 0, reference_date: new Date().toISOString().split('T')[0],
    });
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Lançamento Efetivado!' }); setShowAdjForm(false); setAdjDescription(''); setAdjAmount(''); setAdjHours(''); fetchData(); }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
     <div className="flex flex-col items-center justify-center p-20 bg-[#0a0a0a] min-h-screen">
        <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6" />
        <p className="text-[#D4AF37] font-black uppercase text-[10px] tracking-widest italic">Iniciando Sincronização SD Temporal...</p>
     </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col rounded-[3.5rem] border border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter flex items-center gap-5 uppercase leading-none">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <Clock className="w-8 h-8" />
            </div>
            Gestão <span className="text-[#D4AF37]">Temporal</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Auditoria de Jornada e Performance de Colaboradores
          </p>
        </div>
        <div className="flex items-center gap-4 bg-[#111111] border border-white/5 p-6 rounded-[2rem] shadow-2xl overflow-hidden group">
           <div className="text-right">
              <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest italic leading-none mb-2">Engajamento Total</p>
              <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">{employees.length} <span className="text-xs text-[#D4AF37]">ATIVOS</span></p>
           </div>
           <Users className="w-8 h-8 text-[#D4AF37] opacity-20 group-hover:opacity-100 transition-all duration-700" />
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 p-1.5 bg-[#111111] border border-white/5 rounded-[2.2rem] w-fit shadow-2xl relative z-10">
        {[
          { id: 'ponto', icon: Play, label: 'REGISTRAR PONTO' },
          { id: 'funcionarios', icon: Users, label: 'COLABORADORES' },
          { id: 'relatorio', icon: DollarSign, label: 'FINANCEIRO / PERFORMANCE' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-500 italic ${tab === t.id ? 'bg-[#D4AF37] text-black shadow-xl scale-105' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {/* ===== PONTO ===== */}
      {tab === 'ponto' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 duration-700 relative z-10">
          {employees.map(emp => {
            const openEntry = getOpenEntry(emp.id);
            return (
              <div key={emp.id} className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group hover:border-[#D4AF37]/30 transition-all duration-500 relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-2 group-hover:text-[#D4AF37] transition-colors">{emp.name}</h3>
                      <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest italic">{emp.role || 'ESPECIALISTA'}</p>
                   </div>
                   <div className={`w-4 h-4 rounded-full border-4 border-black ${openEntry ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-white/10'}`} />
                </div>
                
                {openEntry ? (
                  <div className="space-y-6">
                    <div className="bg-black/60 p-5 rounded-2xl border border-white/5 text-center">
                       <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest italic mb-1">Início do Turno</p>
                       <p className="text-sm font-black text-white italic tracking-tighter tabular-nums">{formatTime(openEntry.clock_in)}</p>
                    </div>
                    <button onClick={() => clockOut(openEntry.id)} className="w-full h-16 bg-red-600 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 transition-all shadow-2xl italic">
                       <Square className="w-5 h-5 fill-white" /> FECHAR JORNADA
                    </button>
                  </div>
                ) : (
                  <button onClick={() => clockIn(emp.id)} className="w-full h-16 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#D4AF37] hover:text-black transition-all shadow-2xl italic group/btn">
                    <Play className="w-5 h-5 group-hover/btn:fill-black" /> ABRIR JORNADA
                  </button>
                )}
                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity"><Clock className="w-32 h-32" /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== FUNCIONÁRIOS ===== */}
      {tab === 'funcionarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-bottom-8 duration-700 relative z-10">
           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12 flex items-center gap-5">
                 <UserPlus className="w-8 h-8 text-[#D4AF37]" /> Alistamento Colaborador
              </h3>
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Nome Identificador *</label>
                       <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="NOME DO AGENTE" className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all uppercase" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Designação / Cargo</label>
                       <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="EX: MONTADOR ELITE" className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all uppercase" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Vetor de Contato (Tel)</label>
                       <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="99 99999-9999" className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ventrículo Neural (Taxa/h)</label>
                       <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-lg font-black italic outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Login / E-mail</label>
                       <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="login@sdmoveis.com" className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Senha de Acesso *</label>
                       <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all" />
                    </div>
                 </div>
                 <button onClick={addEmployee} disabled={!newName.trim()} className="w-full h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center justify-center gap-4">
                    <UserPlus className="w-6 h-6" /> EFETIVAR ALISTAMENTO
                 </button>
              </div>
           </div>

           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden flex flex-col">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-12 flex items-center gap-5">
                 <Users className="w-8 h-8 text-[#D4AF37]" /> Elenco Ativo
              </h3>
              <div className="space-y-4 luxury-scroll max-h-[600px] overflow-auto pr-4">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-[2.5rem] group hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center group-hover:text-[#D4AF37] transition-colors"><User className="w-8 h-8" /></div>
                       <div>
                          <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">{emp.name}</p>
                          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest italic">{emp.role || 'SEM DESIGNAÇÃO'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-[9px] text-gray-800 font-black uppercase mb-1 italic">Remuneração</p>
                          <p className="text-lg font-black text-[#D4AF37] italic tabular-nums">R$ {emp.hourly_rate.toFixed(0)}/h</p>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => { setPasswordEmp(emp); setChangePassword(''); setShowPassword(false); }} className="w-12 h-12 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"><Key className="w-5 h-5" /></button>
                          <button onClick={() => removeEmployee(emp.id)} className="w-12 h-12 bg-red-500/10 rounded-xl border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* ===== RELATÓRIO / PERFORMANCE ===== */}
      {tab === 'relatorio' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700 relative z-10 w-full">
           <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
              <div className="flex gap-3 p-1.5 bg-[#111111] border border-white/5 rounded-[2rem] shadow-2xl">
                {(['week', 'biweekly', 'month'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className={`px-8 py-4 rounded-[1.6rem] font-black text-[10px] uppercase tracking-widest transition-all italic ${period === p ? 'bg-[#D4AF37] text-black shadow-xl' : 'text-gray-500 hover:text-white'}`}>
                    {p === 'week' ? 'SEMANA' : p === 'biweekly' ? 'QUINZENA' : 'MÊS'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowAdjForm(!showAdjForm); if (!adjEmployeeId && employees.length) setAdjEmployeeId(employees[0].id); }} className="h-18 px-10 bg-white/5 border border-white/10 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-4 hover:bg-[#D4AF37] hover:text-black transition-all shadow-2xl italic">
                <Plus className="w-6 h-6" /> LANÇAR VARIAÇÃO FINANCEIRA
              </button>
           </div>

           {showAdjForm && (
             <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-10 flex items-center gap-4"><DollarSign className="w-6 h-6 text-[#D4AF37]" /> Registro de Ajuste Periódico</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Alvo</label>
                      <select value={adjEmployeeId} onChange={e => setAdjEmployeeId(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-[10px] font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all uppercase appearance-none"><option value="">SELECIONE...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}</select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Natureza</label>
                      <select value={adjType} onChange={e => setAdjType(e.target.value as any)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-[10px] font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all appearance-none">
                         <option value="overtime">HORA EXTRA</option>
                         <option value="fuel_allowance">VALE COMBUSTÍVEL</option>
                         <option value="meal_allowance">VALE REFEIÇÃO</option>
                         <option value="advance">ADIANTAMENTO / DESCONTO</option>
                      </select>
                   </div>
                   <div className="space-y-2 lg:col-span-1">
                      <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">{adjType === 'overtime' ? 'QUANTIDADE (H)' : 'DESCRIÇÃO'}</label>
                      {adjType === 'overtime' ? (
                        <input type="number" value={adjHours} onChange={e => setAdjHours(e.target.value)} className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-md font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" />
                      ) : (
                        <input value={adjDescription} onChange={e => setAdjDescription(e.target.value)} placeholder="MOTIVO DOCUM." className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-[10px] font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all uppercase" />
                      )}
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ajuste (R$)</label>
                      <input type="number" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder="0.00" className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-md font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" />
                   </div>
                   <div className="flex gap-2">
                      <button onClick={addAdjustment} className="flex-1 h-14 bg-[#D4AF37] text-black font-black text-[10px] uppercase tracking-widest italic rounded-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-2xl"><Save className="w-4 h-4" /> SALVAR</button>
                      <button onClick={() => setShowAdjForm(false)} className="w-14 h-14 bg-white/5 border border-white/5 text-gray-700 hover:text-white rounded-xl flex items-center justify-center transition-all"><X className="w-5 h-5" /></button>
                   </div>
                </div>
             </div>
           )}

           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden group w-full">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="p-10 border-b border-white/5 bg-black/40">
                 <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-5"><TrendingUp className="w-8 h-8 text-[#D4AF37]" /> Matriz de Performance Acumulativa</h3>
              </div>
              <div className="overflow-x-auto luxury-scroll w-full">
                 <table className="w-full text-left min-w-[1200px]">
                    <thead className="bg-black/60 border-b border-white/5">
                       <tr className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">
                          <th className="px-10 py-6">Operador</th>
                          <th className="px-6 py-6 text-right">Horas</th>
                          <th className="px-6 py-6 text-right">Taxa (UND)</th>
                          <th className="px-6 py-6 text-right text-green-500">Extras</th>
                          <th className="px-6 py-6 text-right text-orange-500">Energia</th>
                          <th className="px-6 py-6 text-right text-purple-500">Refeição</th>
                          <th className="px-6 py-6 text-right text-red-500">Retiradas</th>
                          <th className="px-10 py-6 text-right">Débito Líquido</th>
                          <th className="px-10 py-6 text-center">Transmissão</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-black/20">
                       {employees.map(emp => {
                          const h = calcHours(emp.id); const base = h * emp.hourly_rate;
                          const ot = calcAdjValue(emp.id, 'overtime'); const fa = calcAdjValue(emp.id, 'fuel_allowance');
                          const ma = calcAdjValue(emp.id, 'meal_allowance'); const dec = calcAdjValue(emp.id, 'advance');
                          const total = base + ot + fa + ma - dec;
                          return (
                             <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                <td className="px-10 py-8">
                                   <p className="text-lg font-black text-white italic tracking-tighter uppercase leading-none mb-1 group-hover/row:text-[#D4AF37] transition-colors">{emp.name}</p>
                                   <p className="text-[9px] text-gray-700 font-bold uppercase italic tracking-widest">{emp.role || '-'}</p>
                                </td>
                                <td className="px-6 py-8 text-right font-black italic text-white tabular-nums tracking-tighter">{h.toFixed(1)}H</td>
                                <td className="px-6 py-8 text-right text-gray-600 font-bold text-sm tracking-tight">R$ {emp.hourly_rate.toFixed(1)}</td>
                                <td className="px-6 py-8 text-right font-black italic tabular-nums text-green-500">{ot > 0 ? `+${ot.toFixed(0)}` : '—'}</td>
                                <td className="px-6 py-8 text-right font-black italic tabular-nums text-orange-500">{fa > 0 ? `+${fa.toFixed(0)}` : '—'}</td>
                                <td className="px-6 py-8 text-right font-black italic tabular-nums text-purple-500">{ma > 0 ? `+${ma.toFixed(0)}` : '—'}</td>
                                <td className="px-6 py-8 text-right font-black italic tabular-nums text-red-500">{dec > 0 ? `-${dec.toFixed(0)}` : '—'}</td>
                                <td className="px-10 py-8 text-right font-black italic text-2xl tracking-tighter tabular-nums" style={{ color: total >= 0 ? '#D4AF37' : '#dc2626' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                                <td className="px-10 py-8">
                                   <div className="flex items-center justify-center gap-3">
                                      <button onClick={() => sendViaWhatsApp(emp)} className="w-12 h-12 bg-green-500/10 border border-green-500/10 text-green-500 rounded-2xl flex items-center justify-center hover:bg-green-500 hover:text-black transition-all shadow-xl"><MessageCircle className="w-5 h-5" /></button>
                                      <button onClick={() => sendViaEmail(emp)} className="w-12 h-12 bg-blue-500/10 border border-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-xl"><Mail className="w-5 h-5" /></button>
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                    <tfoot className="bg-black/80 font-black italic text-md text-white border-t-2 border-[#D4AF37]/50">
                       <tr className="tabular-nums">
                          <td className="px-10 py-10 uppercase tracking-widest text-sm">Escopo Consolidado</td>
                          <td className="px-6 py-10 text-right">{employees.reduce((s, e) => s + calcHours(e.id), 0).toFixed(1)}H</td>
                          <td className="px-6 py-10"></td>
                          <td className="px-6 py-10 text-right text-green-500">+{employees.reduce((s, e) => s + calcAdjValue(e.id, 'overtime'), 0).toFixed(0)}</td>
                          <td className="px-6 py-10 text-right text-orange-500">+{employees.reduce((s, e) => s + calcAdjValue(e.id, 'fuel_allowance'), 0).toFixed(0)}</td>
                          <td className="px-6 py-10 text-right text-purple-500">+{employees.reduce((s, e) => s + calcAdjValue(e.id, 'meal_allowance'), 0).toFixed(0)}</td>
                          <td className="px-6 py-10 text-right text-red-500">-{employees.reduce((s, e) => s + calcAdjValue(e.id, 'advance'), 0).toFixed(0)}</td>
                          <td className="px-10 py-10 text-right text-3xl font-black text-[#D4AF37] tracking-tighter">R$ {employees.reduce((s, e) => s + (calcHours(e.id) * e.hourly_rate) + calcAdjValue(e.id, 'overtime') + calcAdjValue(e.id, 'fuel_allowance') + calcAdjValue(e.id, 'meal_allowance') - calcAdjValue(e.id, 'advance'), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                          <td className="px-10 py-10"></td>
                       </tr>
                    </tfoot>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* Trocar Senha Modal */}
      {passwordEmp && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-[#111111] border border-white/10 rounded-[3.5rem] w-full max-w-sm p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-5">
                  <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center"><Key className="w-7 h-7" /></div>
                  Auditoria de Acesso
                </h3>
                <button onClick={() => setPasswordEmp(null)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-600 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>
              <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-8 italic text-center">Reescrevendo Credenciais para: <span className="text-white">{passwordEmp.name.toUpperCase()}</span></p>
              <div className="relative mb-10">
                 <input value={changePassword} onChange={e => setChangePassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="NOVAS CREDENCIAIS" className="w-full h-20 bg-black border border-white/5 rounded-[2rem] px-8 text-white text-sm font-black italic tracking-widest outline-none focus:border-blue-500/40 transition-all shadow-inner" />
                 <button onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-all">{showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}</button>
              </div>
              <button onClick={handleChangePassword} disabled={savingPassword || changePassword.length < 4} className="w-full h-20 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center justify-center gap-4">
                 {savingPassword ? <Activity className="w-6 h-6 animate-spin" /> : <Shield className="w-6 h-6" />} EFETUAR RESET
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
