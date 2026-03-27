import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Save, Download, Eye, CheckCircle, AlertCircle, X, ChevronRight, Gavel, User, Banknote } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const db = supabase as any;

const ContractGenerator: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    contract_date: format(new Date(), 'yyyy-MM-dd'),
    payment_terms: '50% de entrada e 50% na montagem',
    deadline_days: '45',
    warranty_years: '5',
    clauses: `O CONTRATADO se compromete a entregar os móveis projetados conforme detalhamento técnico aprovado.
    
O CONTRATANTE deverá preparar o ambiente para a montagem, garantindo pontos de elétrica e hidráulica conforme projeto.

A garantia cobre defeitos de fabricação por 5 anos, não cobrindo mau uso ou infiltrações.`,
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: cls } = await db.from('clients').select('id, name, document, address');
      const { data: projs } = await db.from('projects').select('id, name, value, client_id');
      setClients(cls || []);
      setProjects(projs || []);
    };
    fetchData();
  }, []);

  const selectedClient = clients.find(c => c.id === form.client_id);
  const selectedProject = projects.find(p => p.id === form.project_id);

  const generatePDF = () => {
    const doc = new jsPDF();
    const lMargin = 20;
    const rMargin = 190;
    const bodyWidth = 170;
    
    doc.setFontSize(22);
    doc.setTextColor(184, 134, 11); // Gold-ish
    doc.text('SD MÓVEIS PROJETADOS', 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 105, 45, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(form.contract_date), 'dd/MM/yyyy')}`, 105, 52, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text('1. AS PARTES', lMargin, 70);
    doc.setFont('helvetica', 'normal');
    let y = 78;
    const clientInfo = `CONTRATANTE: ${selectedClient?.name || '____________________'}, portador(a) do documento ${selectedClient?.document || '____________________'}, residente em ${selectedClient?.address || '____________________'}.`;
    const lines = doc.splitTextToSize(clientInfo, bodyWidth);
    doc.text(lines, lMargin, y);
    y += (lines.length * 6) + 5;

    doc.setFont('helvetica', 'bold');
    doc.text('2. DO OBJETO', lMargin, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    const objectDesc = `Execução de projeto de mobiliário sob medida denominado "${selectedProject?.name || '____________________'}", conforme especificações técnicas anexas.`;
    const objLines = doc.splitTextToSize(objectDesc, bodyWidth);
    doc.text(objLines, lMargin, y);
    y += (objLines.length * 6) + 5;

    doc.setFont('helvetica', 'bold');
    doc.text('3. VALORES E PAGAMENTO', lMargin, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    const priceInfo = `O valor total do projeto é de R$ ${(selectedProject?.value || 0).toLocaleString('pt-BR')}.`;
    doc.text(priceInfo, lMargin, y);
    y += 6;
    doc.text(`Condições: ${form.payment_terms}`, lMargin, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('4. CLAUSULAS GERAIS', lMargin, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    const clauseLines = doc.splitTextToSize(form.clauses, bodyWidth);
    doc.text(clauseLines, lMargin, y);
    
    doc.save(`Contrato_${selectedClient?.name || 'SD'}_${Date.now()}.pdf`);
  };

  const saveContract = async () => {
    setLoading(true);
    const { error } = await db.from('contracts').insert({
      client_id: form.client_id,
      project_id: form.project_id,
      content: form.clauses,
      terms: form.payment_terms,
      status: 'active'
    });
    
    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } else {
      toast({ title: '✅ Contrato salvo com sucesso' });
      generatePDF();
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#0c0c0c] text-white overflow-hidden rounded-[2.5rem] flex flex-col h-[75vh]">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-all ${step >= s ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-gray-500'}`}>
                {s}
              </div>
              <div className={`h-1 w-8 rounded-full ${step > s ? 'bg-[#D4AF37]' : 'bg-white/5'}`} />
            </div>
          ))}
          <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">
            {step === 1 ? 'Partes & Projeto' : step === 2 ? 'Termos & Prazos' : 'Revisão Jurídica'}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 space-y-12">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] ml-1">Identificar Contratante</label>
              <div className="relative group">
                <User className="absolute left-4 top-4 w-5 h-5 text-gray-600 transition-colors group-hover:text-amber-500" />
                <select 
                  value={form.client_id} 
                  onChange={e => setForm({ ...form, client_id: e.target.value })} 
                  className="w-full p-4 pl-12 rounded-2xl bg-[#111111] border border-white/10 text-white focus:border-amber-500/50 outline-none appearance-none cursor-pointer group-hover:bg-[#151515] transition-all"
                >
                  <option value="">Selecione o Cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] ml-1">Projeto Vinculado</label>
              <div className="relative group">
                <Gavel className="absolute left-4 top-4 w-5 h-5 text-gray-600 transition-colors group-hover:text-amber-500" />
                <select 
                  value={form.project_id} 
                  onChange={e => setForm({ ...form, project_id: e.target.value })}
                  className="w-full p-4 pl-12 rounded-2xl bg-[#111111] border border-white/10 text-white focus:border-amber-500/50 outline-none appearance-none cursor-pointer group-hover:bg-[#151515] transition-all"
                >
                  <option value="">Vincular Projeto</option>
                  {projects.filter(p => !form.client_id || p.client_id === form.client_id).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.value.toLocaleString('pt-BR')}</option>)}
                </select>
              </div>
            </div>
            <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-[#111111]/50 border border-white/5 border-dashed flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                   <p className="font-black text-white text-sm uppercase">Verifique os Dados</p>
                   <p className="text-gray-500 text-xs font-medium italic">Dados incorretos podem invalidar o contrato legalmente.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] ml-1">Condições de Pagamento</label>
              <div className="relative">
                <Banknote className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
                <input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full p-4 pl-12 rounded-2xl bg-[#111111] border border-white/10 text-white focus:border-amber-500/50 outline-none" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] ml-1">Prazo de Entrega (Dias)</label>
              <input type="number" value={form.deadline_days} onChange={e => setForm({ ...form, deadline_days: e.target.value })} className="w-full p-4 rounded-2xl bg-[#111111] border border-white/10 text-white focus:border-amber-500/50 outline-none" />
            </div>
            <div className="md:col-span-2 space-y-4">
               <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] ml-1">Cláusulas de Fabricação & Montagem</label>
               <textarea 
                  value={form.clauses} 
                  onChange={e => setForm({ ...form, clauses: e.target.value })} 
                  className="w-full p-6 rounded-3xl bg-[#111111] border border-white/10 text-gray-300 focus:border-amber-500/50 outline-none font-mono text-sm leading-relaxed" 
                  rows={8}
               />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-[#151515] to-black border border-amber-500/20 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between gap-12">
                  <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      <CheckCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Contrato Pré-Validado</span>
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-white italic">R$ {(selectedProject?.value || 0).toLocaleString('pt-BR')}</h3>
                      <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">{selectedProject?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                      <div>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Contratante</p>
                        <p className="text-white font-bold">{selectedClient?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Doc</p>
                        <p className="text-white font-bold">{selectedClient?.document || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-80 p-8 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Resumo da Proteção</p>
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center text-gray-400"><span>Garantia:</span><span className="text-white font-bold">{form.warranty_years} anos</span></div>
                      <div className="flex justify-between items-center text-gray-400"><span>Prazo:</span><span className="text-white font-bold">{form.deadline_days} dias úteis</span></div>
                      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-amber-200 leading-relaxed font-medium italic">
                        {form.payment_terms}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-white/5 bg-black/20 backdrop-blur-md flex justify-between gap-4">
        <button 
          onClick={() => setStep(s => Math.max(1, s-1))} 
          disabled={step === 1}
          className="px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest bg-white/5 text-gray-400 border border-white/10 hover:text-white disabled:opacity-30 transition-all uppercase"
        >
          Voltar Etapa
        </button>
        {step < 3 ? (
          <button 
            onClick={() => setStep(s => s + 1)} 
            className="px-12 py-4 rounded-2xl font-black text-[10px] tracking-widest bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-all uppercase flex items-center gap-2"
          >
            Avançar <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button 
            onClick={saveContract}
            disabled={loading}
            className="px-12 py-4 rounded-2xl font-black text-[10px] tracking-widest bg-white text-black shadow-lg hover:scale-105 transition-all uppercase flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Processando...' : <><Save className="w-4 h-4" /> Validar & Emitir Contrato</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default ContractGenerator;
