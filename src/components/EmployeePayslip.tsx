import React, { useState } from 'react';
import { FileText, Download, Calendar, DollarSign, ChevronDown, ChevronUp, TrendingUp, Minus, Plus, Zap, Shield, Wallet, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayslipData {
  id: string;
  month: string;
  year: string;
  salarioBase: number;
  horasExtras: number;
  valorHorasExtras: number;
  adicionalNoturno: number;
  insalubridade: number;
  valeTransporte: number;
  valeAlimentacao: number;
  descontoINSS: number;
  descontoIRRF: number;
  descontoValeTransporte: number;
  descontoValeAlimentacao: number;
  descontoVale: number;
  faltas: number;
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
}

const PAYSLIPS: PayslipData[] = [
  {
    id: '1', month: 'Fevereiro', year: '2026',
    salarioBase: 2800, horasExtras: 12, valorHorasExtras: 315,
    adicionalNoturno: 0, insalubridade: 280, valeTransporte: 0, valeAlimentacao: 0,
    descontoINSS: 271.04, descontoIRRF: 0, descontoValeTransporte: 168,
    descontoValeAlimentacao: 50, descontoVale: 500, faltas: 0,
    totalProventos: 3395, totalDescontos: 989.04, liquido: 2405.96
  },
  {
    id: '2', month: 'Janeiro', year: '2026',
    salarioBase: 2800, horasExtras: 8, valorHorasExtras: 210,
    adicionalNoturno: 0, insalubridade: 280, valeTransporte: 0, valeAlimentacao: 0,
    descontoINSS: 263.20, descontoIRRF: 0, descontoValeTransporte: 168,
    descontoValeAlimentacao: 50, descontoVale: 0, faltas: 1,
    totalProventos: 3290, totalDescontos: 481.20, liquido: 2808.80
  },
];

interface EmployeePayslipProps {
  employeeName: string;
}

const EmployeePayslip: React.FC<EmployeePayslipProps> = ({ employeeName }) => {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const handleDownload = (payslip: PayslipData) => {
    toast({ title: '📄 Geração Premium Iniciada', description: `O extrato de ${payslip.month.toUpperCase()}/${payslip.year} está sendo processado via SD Secure Core.` });
  };

  return (
    <div className="h-full p-8 sm:p-12 overflow-auto bg-[#0a0a0a] flex flex-col luxury-scroll gap-12 rounded-[3rem] border border-white/5 relative">
       <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5 leading-none">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
               <FileText className="w-8 h-8" />
            </div>
            DRE <span className="text-[#D4AF37]">Colaborador</span>
          </h1>
          <p className="text-gray-500 mt-4 flex items-center gap-3 font-medium italic">
             <Zap className="w-4 h-4 text-[#D4AF37]" /> {employeeName.toUpperCase()} • Demonstrativo de Resultados de Elite
          </p>
        </div>
        <div className="flex items-center gap-6 bg-[#111111] border border-white/5 px-8 py-5 rounded-[2rem] shadow-2xl overflow-hidden group">
           <div className="text-right">
              <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest italic leading-none mb-2">Protocolo de Segurança</p>
              <p className="text-xl font-black text-white italic tracking-tighter tabular-nums leading-none flex items-center gap-3">
                 AES-256 <Shield className="w-4 h-4 text-green-500 opacity-40 group-hover:opacity-100 transition-opacity" />
              </p>
           </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
             <DollarSign className="w-4 h-4 text-green-500" /> Rendimento Líquido Atual
          </p>
          <p className="text-4xl font-black text-green-400 italic tracking-tighter tabular-nums">R$ {PAYSLIPS[0].liquido.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest mt-6 italic flex items-center gap-2">
             <Calendar className="w-3.5 h-3.5" /> REF: {PAYSLIPS[0].month.toUpperCase()} / {PAYSLIPS[0].year}
          </p>
        </div>
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
             <TrendingUp className="w-4 h-4 text-[#D4AF37]" /> Vencimento Base SD
          </p>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">R$ {PAYSLIPS[0].salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest mt-6 italic flex items-center gap-2">
             <Star className="w-3.5 h-3.5" /> CONTRATO DE PERFORMANCE ELITE
          </p>
        </div>
        <div className="bg-[#111111] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
             <Zap className="w-4 h-4 text-amber-500" /> Adicionais de Voo
          </p>
          <p className="text-4xl font-black text-amber-500 italic tracking-tighter tabular-nums">{PAYSLIPS[0].horasExtras}H <span className="text-[10px] font-black uppercase tracking-widest ml-2 opacity-40 italic">EXTRAS</span></p>
          <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest mt-6 italic flex items-center gap-2">
             <Activity className="w-3.5 h-3.5" /> MÉTRICA DE ENGAJAMENTO TÉCNICO
          </p>
        </div>
      </div>

      {/* Payslip List */}
      <div className="space-y-6 relative z-10 animate-in slide-in-from-bottom-10 duration-700">
        {PAYSLIPS.map(payslip => {
          const isExpanded = expandedId === payslip.id;
          return (
            <div key={payslip.id} className="bg-[#111111] rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden group/item">
              <button
                onClick={() => setExpandedId(isExpanded ? null : payslip.id)}
                className="w-full p-10 flex flex-col sm:flex-row justify-between items-center gap-8 hover:bg-white/[0.02] transition-all text-left group-hover/item:border-white/10"
              >
                <div className="flex items-center gap-8 w-full sm:w-auto">
                  <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-700 border shadow-2xl ${isExpanded ? 'bg-[#D4AF37] border-[#D4AF37] text-black rotate-12 scale-110' : 'bg-black border-white/5 text-[#D4AF37]'}`}>
                     <FileText className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter group-hover/item:text-[#D4AF37] transition-colors leading-none mb-3">{payslip.month} {payslip.year}</h3>
                    <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em] italic leading-none">Demonstrativo de Créditos Liquidados</p>
                  </div>
                </div>
                <div className="flex items-center gap-10 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-3xl font-black text-green-400 italic tracking-tighter tabular-nums leading-none mb-2 group-hover/item:scale-105 transition-transform origin-right">R$ {payslip.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest italic">Saldo Disponível em Conta</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full border border-white/5 flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-white/5 -rotate-180 text-white' : 'text-gray-700'}`}>
                     <ChevronDown className="w-6 h-6" />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-10 pb-10 animate-in slide-in-from-top-6 duration-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6 border-t border-white/5 pt-12">
                    {/* Proventos */}
                    <div className="bg-black/60 rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group/prov">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full" />
                      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-4 italic">
                        <Plus className="w-5 h-5 text-green-500" /> Memoria de Créditos
                      </h4>
                      <div className="space-y-6">
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Base Contratual</span>
                          <span className="text-md font-black text-white italic tabular-nums">R$ {payslip.salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {payslip.valorHorasExtras > 0 && (
                          <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Performance Adicional ({payslip.horasExtras}H)</span>
                            <span className="text-md font-black text-green-400 italic tabular-nums">+ R$ {payslip.valorHorasExtras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {payslip.insalubridade > 0 && (
                          <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Adicional Técnico (Insalubridade)</span>
                            <span className="text-md font-black text-white italic tabular-nums">R$ {payslip.insalubridade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-6 mt-8 bg-white/5 px-8 rounded-2xl border border-white/5 shadow-inner">
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Total Bruto</span>
                          <span className="text-2xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">R$ {payslip.totalProventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Descontos */}
                    <div className="bg-black/60 rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group/des">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />
                      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-4 italic">
                        <Minus className="w-5 h-5 text-red-500" /> Matriz de Deduções
                      </h4>
                      <div className="space-y-6">
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Proteção Social (INSS)</span>
                          <span className="text-md font-black text-red-500 italic tabular-nums">- R$ {payslip.descontoINSS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {payslip.descontoIRRF > 0 && (
                          <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Fisco Federal (IRRF)</span>
                            <span className="text-md font-black text-red-500 italic tabular-nums">- R$ {payslip.descontoIRRF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase italic tracking-widest">Subsídio Mobilidade (VT)</span>
                          <span className="text-md font-black text-gray-700 italic tabular-nums">- R$ {payslip.descontoValeTransporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {payslip.descontoVale > 0 && (
                          <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-[11px] font-bold text-[#D4AF37] uppercase italic tracking-widest">Liquidado Antecipado (VALE)</span>
                            <span className="text-md font-black text-red-500 italic tabular-nums">- R$ {payslip.descontoVale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-6 mt-8 bg-white/5 px-8 rounded-2xl border border-white/5 shadow-inner">
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Total Deduções</span>
                          <span className="text-2xl font-black text-red-500 italic tracking-tighter tabular-nums">R$ {payslip.totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Liquid Card */}
                  <div className="mt-12 flex flex-col md:flex-row justify-between items-center p-12 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[3.5rem] text-black shadow-2xl relative overflow-hidden group/footer">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="relative z-10 text-center md:text-left mb-8 md:mb-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-4 opacity-50 italic">Liquidez Real Disponível em Carteira</p>
                      <p className="text-6xl font-black italic tracking-tighter tabular-nums leading-none">R$ {payslip.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(payslip)}
                      className="bg-black text-[#D4AF37] px-12 h-24 rounded-[2rem] font-black italic text-[11px] uppercase tracking-[0.4em] flex items-center gap-5 transition-all hover:scale-105 active:scale-95 shadow-2xl relative z-10"
                    >
                      <Download className="w-8 h-8" /> EXTRAIR DOCUMENTO VIP (PDF)
                    </button>
                    <div className="absolute -bottom-10 -left-10 opacity-10 group-hover/footer:scale-125 transition-transform"><Star className="w-40 h-40" /></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeePayslip;
