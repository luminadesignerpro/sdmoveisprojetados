import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Square, DollarSign, Calendar, User, Send, CheckCircle, XCircle, Loader2, Download, Zap, Shield, Wallet, Activity } from 'lucide-react';
import jsPDF from 'jspdf';

interface Employee {
  id: string;
  name: string;
  role: string | null;
  hourly_rate: number;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
}

interface Adjustment {
  id: string;
  employee_id: string;
  type: string;
  description: string | null;
  amount: number;
  hours: number;
  reference_date: string;
}

type Period = 'week' | 'biweekly' | 'month';

interface EmployeePortalProps {
  employeeName: string;
}

export default function EmployeePortal({ employeeName }: EmployeePortalProps) {
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  // Vale/Adiantamento
  const [showVale, setShowVale] = useState(false);
  const [valeAmount, setValeAmount] = useState('');
  const [valeReason, setValeReason] = useState('');
  const [valeSending, setValeSending] = useState(false);
  const [valeRequests, setValeRequests] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  useEffect(() => {
    fetchEmployee();
  }, [employeeName]);

  const fetchEmployee = async () => {
    setLoading(true);
    const { data: empData } = await supabase
      .from('employees')
      .select('*')
      .eq('name', employeeName)
      .eq('active', true)
      .limit(1)
      .single();

    if (empData) {
      setEmployee(empData);
      const [entriesRes, valeRes, adjRes] = await Promise.all([
        supabase.from('time_entries').select('*').eq('employee_id', empData.id).order('clock_in', { ascending: false }).limit(200),
        supabase.from('advance_requests').select('*').eq('employee_id', empData.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('employee_adjustments').select('*').eq('employee_id', empData.id).order('created_at', { ascending: false }).limit(200),
      ]);
      if (entriesRes.data) setEntries(entriesRes.data);
      if (valeRes.data) setValeRequests(valeRes.data);
      if (adjRes.data) setAdjustments(adjRes.data as Adjustment[]);
    }
    setLoading(false);
  };

  const clockIn = async () => {
    if (!employee) return;
    const { error } = await supabase.from('time_entries').insert({ employee_id: employee.id });
    if (error) {
      toast({ title: '❌ Erro no Sistema', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Jornada Iniciada!', description: 'Tenha um ótimo turno de trabalho SD.' });
      fetchEmployee();
    }
  };

  const clockOut = async (entryId: string) => {
    const { error } = await supabase.from('time_entries').update({
      clock_out: new Date().toISOString(),
    }).eq('id', entryId);
    if (error) {
      toast({ title: '❌ Erro no Registro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Jornada Concluída!', description: 'Registro de saída efetuado com sucesso.' });
      fetchEmployee();
    }
  };

  const submitVale = async () => {
    if (!employee || !valeAmount) return;
    setValeSending(true);
    const { error } = await supabase.from('advance_requests').insert({
      employee_id: employee.id,
      amount: parseFloat(valeAmount),
      reason: valeReason.trim() || null,
    });
    setValeSending(false);
    if (error) {
      toast({ title: '❌ Falha na Requisição', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Solicitação Enviada!', description: 'Aguarde a análise do gestor.' });
      setValeAmount('');
      setValeReason('');
      setShowVale(false);
      fetchEmployee();
    }
  };

  const openEntry = entries.find(e => !e.clock_out);

  const getPeriodDates = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date(now);
    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'biweekly') start.setDate(now.getDate() - 15);
    else start.setDate(now.getDate() - 30);
    return { start, end: now };
  };

  const calcHours = (): number => {
    const { start, end } = getPeriodDates();
    return entries
      .filter(e => e.clock_out && new Date(e.clock_in) >= start && new Date(e.clock_in) <= end)
      .reduce((sum, e) => {
        const diff = (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000;
        return sum + diff;
      }, 0);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getPeriodAdjustments = () => {
    if (!employee) return [];
    const { start, end } = getPeriodDates();
    return adjustments.filter(a =>
      a.employee_id === employee.id &&
      new Date(a.reference_date) >= start &&
      new Date(a.reference_date) <= end
    );
  };

  const calcOvertime = () => getPeriodAdjustments().filter(a => a.type === 'overtime').reduce((s, a) => s + Number(a.amount), 0);
  const calcFuelAllowance = () => getPeriodAdjustments().filter(a => a.type === 'fuel_allowance').reduce((s, a) => s + Number(a.amount), 0);
  const calcDeductions = () => getPeriodAdjustments().filter(a => a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0);

  const downloadPayslip = async () => {
    if (!employee) return;
    const hours = calcHours();
    const base = hours * employee.hourly_rate;
    const overtime = calcOvertime();
    const fuelAllowance = calcFuelAllowance();
    const deductions = calcDeductions();
    const totalProventos = base + overtime + fuelAllowance;
    const total = totalProventos - deductions;
    const periodLabel = period === 'week' ? 'Semana' : period === 'biweekly' ? 'Quinzena' : 'Mês';
    const today = new Date().toLocaleDateString('pt-BR');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    const contentW = W - margin * 2;

    let logoData: string | null = null;
    try {
      const resp = await fetch('/images/logo-sd-payslip.jpeg');
      const blob = await resp.blob();
      logoData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* skip logo */ }

    const gold = [184, 151, 60] as const;
    const darkGray = [40, 40, 40] as const;

    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');

    if (logoData) doc.addImage(logoData, 'JPEG', margin, 10, 22, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...darkGray);
    doc.text('SD MÓVEIS PROJETADOS', logoData ? margin + 26 : margin, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('CNPJ: 27.693.081/0001-09', logoData ? margin + 26 : margin, 25);
    doc.text('Rua Jorge Figueiredo, 740 • Itaitinga - CE • CEP 61880-000', logoData ? margin + 26 : margin, 30);

    doc.setFillColor(...darkGray);
    doc.rect(margin, 38, contentW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`CONTRACHEQUE — ${periodLabel.toUpperCase()}`, W / 2, 44.5, { align: 'center' });

    let y = 56;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, contentW, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text('Funcionário:', margin + 3, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.name.toUpperCase(), margin + 30, y + 1);

    doc.setFont('helvetica', 'bold');
    doc.text('Cargo:', margin + 3, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.role || '-', margin + 30, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Período:', contentW / 2 + margin, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(periodLabel, contentW / 2 + margin + 20, y + 1);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', contentW / 2 + margin, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(today, contentW / 2 + margin + 20, y + 7);

    y = 80;
    doc.setFillColor(...gold);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PROVENTOS', margin + 3, y + 5.5);
    doc.text('VALOR (R$)', margin + contentW - 3, y + 5.5, { align: 'right' });

    y += 8;
    const drawRow = (label: string, value: string, bg: boolean) => {
      if (bg) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentW, 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.text(label, margin + 3, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(value, margin + contentW - 3, y + 5, { align: 'right' });
      y += 7;
    };

    drawRow(`Salário Base (${hours.toFixed(1)}h × R$ ${employee.hourly_rate.toFixed(2)})`, base.toFixed(2), true);
    if (overtime > 0) drawRow('Horas Extra', `+ ${overtime.toFixed(2)}`, false);
    if (fuelAllowance > 0) drawRow('Vale Combustível', `+ ${fuelAllowance.toFixed(2)}`, overtime > 0 ? true : false);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentW, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkGray);
    doc.text('Total Proventos', margin + 3, y + 5);
    doc.setTextColor(22, 163, 74);
    doc.text(totalProventos.toFixed(2), margin + contentW - 3, y + 5, { align: 'right' });
    y += 9;

    doc.setFillColor(220, 38, 38);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCONTOS', margin + 3, y + 5.5);
    doc.text('VALOR (R$)', margin + contentW - 3, y + 5.5, { align: 'right' });
    y += 8;

    if (deductions > 0) {
      drawRow('Adiantamentos / Vales', `- ${deductions.toFixed(2)}`, true);
    } else {
      drawRow('Nenhum desconto no período', '0.00', true);
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentW, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Descontos', margin + 3, y + 5);
    doc.setTextColor(220, 38, 38);
    doc.text(deductions.toFixed(2), margin + contentW - 3, y + 5, { align: 'right' });
    y += 12;

    doc.setFillColor(...darkGray);
    doc.rect(margin, y, contentW, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL LÍQUIDO', margin + 5, y + 8);
    doc.setTextColor(...gold);
    doc.setFontSize(14);
    doc.text(`R$ ${total.toFixed(2)}`, margin + contentW - 5, y + 8.5, { align: 'right' });

    y += 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentW / 2 - 10, y);
    doc.line(margin + contentW / 2 + 10, y, margin + contentW, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Assinatura do Empregador', margin + contentW / 4, y + 5, { align: 'center' });
    doc.text('Assinatura do Funcionário', margin + contentW * 3 / 4, y + 5, { align: 'center' });

    doc.setFillColor(...gold);
    doc.rect(0, 293, W, 4, 'F');

    doc.save(`contracheque-${employee.name.toLowerCase().replace(/\s+/g, '-')}-${periodLabel.toLowerCase()}.pdf`);
    toast({ title: '📄 Contracheque Premium Gerado!' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] text-gray-500 gap-6 p-12 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5">
           <User className="w-12 h-12 opacity-20" />
        </div>
        <div className="max-w-xs">
          <p className="text-2xl font-black text-white italic uppercase tracking-tighter">Acesso Negado</p>
          <p className="text-sm mt-2 font-medium italic">O perfil "{employeeName}" não foi localizado ou não possui credenciais ativas no SD Neural Core.</p>
        </div>
      </div>
    );
  }

  const hours = calcHours();
  const overtime = calcOvertime();
  const fuelAllowance = calcFuelAllowance();
  const deductions = calcDeductions();
  const total = hours * employee.hourly_rate + overtime + fuelAllowance - deductions;

  return (
    <div className="h-full bg-[#0a0a0a] p-8 sm:p-12 overflow-auto luxury-scroll flex flex-col gap-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
               <Clock className="w-8 h-8" />
            </div>
            Portal do <span className="text-[#D4AF37]">Time</span>
          </h1>
          <p className="text-gray-500 mt-4 flex items-center gap-3 font-medium italic">
             <Zap className="w-4 h-4 text-[#D4AF37]" /> Bem-vindo, {employee.name} • {employee.role || 'Elite Team'}
          </p>
        </div>
        <div className="flex items-center gap-4 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl shadow-xl">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Sistema Integrado</span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-10">
          {/* Clock Control */}
          <section className="bg-[#111111] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-4 mb-4">
                  <div className={`w-3 h-3 rounded-full ${openEntry ? 'bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                  <span className="text-lg font-black text-white italic uppercase tracking-tighter">
                    {openEntry ? 'Jornada em Curso' : 'Offline / Descanso'}
                  </span>
                </div>
                <p className="text-gray-500 italic font-medium mb-2">
                   {openEntry ? `Entrada registrada em: ${formatTime(openEntry.clock_in)}` : 'Inicie seu registro para contabilizar sua performance de hoje.'}
                </p>
                {openEntry && (
                   <div className="mt-6 flex items-center gap-4 bg-black/40 px-6 py-4 rounded-3xl border border-white/5 w-fit mx-auto sm:mx-0">
                      <Activity className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums">
                         {((new Date().getTime() - new Date(openEntry.clock_in).getTime()) / 3600000).toFixed(2)}h decorridas
                      </span>
                   </div>
                )}
              </div>
              
              <div className="w-full sm:w-auto">
                {openEntry ? (
                  <button
                    onClick={() => clockOut(openEntry.id)}
                    className="w-full sm:w-64 h-24 bg-red-600 rounded-[2rem] text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-red-500 transition-all shadow-2xl shadow-red-900/20 active:scale-95 italic"
                  >
                    <Square className="w-6 h-6 fill-white" /> Finalizar Turno
                  </button>
                ) : (
                  <button
                    onClick={clockIn}
                    className="w-full sm:w-64 h-24 bg-[#D4AF37] rounded-[2rem] text-black font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-2xl shadow-amber-500/20 active:scale-95 italic"
                  >
                    <Play className="w-6 h-6 fill-black" /> Iniciar Jornada
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Performance Summary */}
          <section className="bg-[#111111] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                <DollarSign className="w-6 h-6 text-[#D4AF37]" /> Extrato de Performance
              </h3>
              <div className="flex gap-2 p-1.5 bg-black/60 rounded-[1.5rem] border border-white/5 self-end">
                {(['week', 'biweekly', 'month'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                  >
                    {p === 'week' ? 'Semana' : p === 'biweekly' ? 'Quinzena' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 text-center hover:border-[#D4AF37]/30 transition-all flex flex-col justify-center min-h-[140px]">
                  <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-3">Horas Totais</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{hours.toFixed(1)}<span className="text-sm ml-1 text-gray-600">H</span></p>
               </div>
               <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 text-center hover:border-[#D4AF37]/30 transition-all flex flex-col justify-center min-h-[140px]">
                  <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-3">Taxa Horária</p>
                  <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">R$ {employee.hourly_rate.toFixed(0)}</p>
               </div>
               <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 text-center hover:border-[#D4AF37]/30 transition-all flex flex-col justify-center min-h-[140px]">
                  <p className="text-[9px] font-black text-green-900 uppercase tracking-widest mb-3">Extras / Bônus</p>
                  <p className="text-3xl font-black text-green-500 italic tracking-tighter tabular-nums">+{overtime + fuelAllowance > 0 ? (overtime + fuelAllowance).toFixed(0) : '0'}</p>
               </div>
               <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/30 rounded-[2.5rem] p-6 text-center shadow-lg flex flex-col justify-center min-h-[140px]">
                  <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-3">Crédito Líquido</p>
                  <p className="text-3xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
               </div>
            </div>

            <button
              onClick={downloadPayslip}
              className="mt-10 w-full h-18 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#D4AF37] transition-all shadow-2xl shadow-white/5 italic"
            >
              <Download className="w-5 h-5" /> Exportar Contracheque Premium (PDF)
            </button>
          </section>

          {/* History */}
          <section className="bg-[#111111] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-white/5 bg-black/40 flex justify-between items-center">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                <Calendar className="w-6 h-6 text-[#D4AF37]" /> Registros de Performance
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {entries.slice(0, 8).map(entry => (
                <div key={entry.id} className="p-8 hover:bg-white/[0.02] transition-colors group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl border border-white/5 flex items-center justify-center shadow-xl ${entry.clock_out ? 'bg-black text-gray-600' : 'bg-green-500/10 text-green-500'}`}>
                       <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white italic tracking-tight flex items-center gap-3">
                         {new Date(entry.clock_in).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                         {!entry.clock_out && <span className="text-[9px] bg-green-500 text-black px-3 py-1 rounded-full uppercase italic animate-pulse">Ativo</span>}
                      </p>
                      <div className="flex gap-4 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">
                        <span>ENT: {new Date(entry.clock_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {entry.clock_out && <span>SAI: {new Date(entry.clock_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  </div>
                  {entry.clock_out && (
                     <div className="bg-black/60 px-6 py-2.5 rounded-full border border-white/5">
                        <span className="text-xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">
                           {((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000).toFixed(1)}h
                        </span>
                     </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar / Vale */}
        <div className="space-y-10">
           <section className="bg-[#111111] rounded-[3.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full" />
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                 <Wallet className="w-6 h-6 text-[#D4AF37]" /> Solicitar Vale
               </h3>
               <button
                 onClick={() => setShowVale(!showVale)}
                 className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${showVale ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-[#D4AF37] border-transparent text-black'}`}
               >
                 {showVale ? <XCircle className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
               </button>
             </div>

             {showVale && (
               <div className="space-y-6 mb-10 animate-in slide-in-from-top duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Montante (R$)</label>
                    <input
                      type="number"
                      value={valeAmount}
                      onChange={e => setValeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 outline-none text-white text-lg font-black italic tracking-tighter focus:border-[#D4AF37]/40 transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Finalidade</label>
                    <input
                      type="text"
                      value={valeReason}
                      onChange={e => setValeReason(e.target.value)}
                      placeholder="Ex: Despesa Técnica"
                      className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 outline-none text-white text-sm italic font-medium focus:border-[#D4AF37]/40 transition-all shadow-inner"
                    />
                  </div>
                  <button
                    onClick={submitVale}
                    disabled={valeSending || !valeAmount}
                    className="w-full h-16 bg-[#D4AF37] text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-amber-500/10 disabled:opacity-50"
                  >
                    {valeSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Confirmar Pedido
                  </button>
               </div>
             )}

             <div className="space-y-4 max-h-[500px] overflow-auto luxury-scroll pr-2">
               {valeRequests.map(req => (
                 <div key={req.id} className="bg-black/40 border border-white/5 rounded-[2rem] p-6 hover:border-[#D4AF37]/20 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <p className="text-xl font-black text-white italic tracking-tighter tabular-nums">R$ {Number(req.amount).toLocaleString('pt-BR')}</p>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        req.status === 'Aprovado' ? 'bg-green-500 text-black' :
                        req.status === 'Recusado' ? 'bg-red-500 text-white' : 'bg-white/5 text-[#D4AF37] border border-[#D4AF37]/20'
                      }`}>
                        {req.status}
                      </span>
                   </div>
                   <p className="text-xs text-gray-600 italic font-medium line-clamp-2">{req.reason || 'Sem descrição informada'}</p>
                   <div className="mt-4 flex items-center gap-2 text-[8px] text-gray-800 font-black uppercase tracking-tighter">
                      <Clock className="w-3 h-3" /> Solicitado em {new Date(req.created_at).toLocaleDateString()}
                   </div>
                 </div>
               ))}
               {valeRequests.length === 0 && (
                 <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <Shield className="w-10 h-10 text-gray-800 mx-auto mb-4" />
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest">Nenhum adiantamento registrado</p>
                 </div>
               )}
             </div>
           </section>

           <section className="bg-gradient-to-br from-[#111111] to-black rounded-[3.5rem] p-10 border border-[#D4AF37]/20 shadow-2xl relative overflow-hidden text-center group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
              <Star className="w-12 h-12 text-[#D4AF37] mx-auto mb-6 group-hover:scale-125 transition-transform" />
              <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Elite SD Móveis</h4>
              <p className="text-sm text-gray-500 italic font-medium leading-relaxed">Você faz parte da elite do mobiliário projetado. Sua performance é o que constrói nosso legado.</p>
           </section>
        </div>
      </div>
    </div>
  );
}
