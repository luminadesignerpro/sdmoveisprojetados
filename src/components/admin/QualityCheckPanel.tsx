import React, { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, CheckCircle, XCircle, Plus, AlertTriangle, ShieldCheck, Search, ArrowRight, Sparkles, User, Shield } from 'lucide-react';

interface QualityCheckPanelProps {
  projectId: string;
  projectName: string;
}

const DEFAULT_ITEMS = [
  'Superfícies sem riscos ou danos estruturais',
  'Furação técnica completa e alinhamento milimétrico',
  'Ferragens premium (slow-motion) testadas',
  'Acabamento de bordas uniforme e selagem protetora',
  'Portas e gavetas com fechamento perfeito',
  'Dimensões finais em conformidade com o projeto 3D',
  'Embalagem de proteção multicamada instalada',
  'Kit de acessórios e puxadores conferidos',
];

export default function QualityCheckPanel({ projectId, projectName }: QualityCheckPanelProps) {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  useEffect(() => {
    fetchChecklist();
  }, [projectId]);

  const fetchChecklist = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quality_checklists')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setChecklist(data);
      setNotes(data.notes || '');
      setInspectorName(data.inspector_name || '');
      const { data: checkItems } = await supabase
        .from('quality_check_items')
        .select('*')
        .eq('checklist_id', data.id)
        .order('sort_order');
      if (checkItems) setItems(checkItems);
    }
    setLoading(false);
  };

  const createChecklist = async () => {
    if (!inspectorName) {
      toast({ title: '⚠️ Identificação Necessária', description: 'Por favor, insira o nome do inspetor.', variant: 'destructive' });
      return;
    }
    const { data: cl, error } = await supabase
      .from('quality_checklists')
      .insert({ project_id: projectId, inspector_name: inspectorName || null })
      .select()
      .single();
    if (error || !cl) return;

    const checkItems = DEFAULT_ITEMS.map((label, i) => ({
      checklist_id: cl.id,
      label,
      checked: false,
      sort_order: i,
    }));
    await supabase.from('quality_check_items').insert(checkItems);
    toast({ title: '🔍 Inspeção Iniciada', description: 'Checklist técnico gerado para conferência.' });
    fetchChecklist();
  };

  const toggleItem = async (item: any) => {
    await supabase.from('quality_check_items').update({ checked: !item.checked }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
  };

  const finalizeChecklist = async () => {
    if (!checklist) return;
    const unchecked = items.filter(i => !i.checked);
    if (unchecked.length > 0) {
      toast({ title: '⚠️ Pendências de Qualidade', description: `${unchecked.length} item(ns) ainda não conferidos.`, variant: 'destructive' });
      return;
    }
    await supabase.from('quality_checklists').update({
      status: 'Aprovado',
      notes,
      inspector_name: inspectorName,
      completed_at: new Date().toISOString(),
    }).eq('id', checklist.id);
    toast({ title: '🏆 Certificação Emitida', description: 'Móvel aprovado pelo Controle de Qualidade SD.' });
    fetchChecklist();
  };

  const checkedCount = items.filter(i => i.checked).length;
  const progressPct = items.length > 0 ? (checkedCount / items.length * 100) : 0;

  return (
    <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col rounded-[3.5rem] border border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter flex items-center gap-5 uppercase">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            Controle de <span className="text-[#D4AF37]">Qualidade</span>
          </h2>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Protocolo Técnico de Verificação Final SD Premium
          </p>
        </div>
        {checklist?.status === 'Aprovado' && (
          <div className="px-8 h-12 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 italic animate-pulse">
            <ShieldCheck className="w-4 h-4" /> CERTIFICADO APROVADO
          </div>
        )}
      </header>

      {!checklist ? (
        <div className="bg-[#111111] border border-white/5 rounded-[4rem] p-20 shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-700 relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full" />
          <div className="w-28 h-28 bg-white/5 border border-white/5 rounded-[32px] flex items-center justify-center shadow-inner">
             <Search className="w-12 h-12 text-gray-800" />
          </div>
          <div className="max-w-md mx-auto space-y-8">
            <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px] italic">Silêncio de Inspeção: Nenhuma Atividade Ativa</p>
            <div className="space-y-6">
               <div className="relative">
                 <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]/40" />
                 <input
                  value={inspectorName}
                  onChange={e => setInspectorName(e.target.value)}
                  placeholder="IDENTIFICAÇÃO DO INSPETOR RESPONSÁVEL"
                  className="w-full h-16 bg-black border border-white/5 rounded-2xl pl-16 pr-6 text-white text-sm font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all placeholder:text-gray-800 uppercase shadow-inner"
                />
               </div>
               <button
                  onClick={createChecklist}
                  className="w-full h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl italic"
                >
                  <Plus className="w-5 h-5" /> INICIAR PROTOCOLO DE INSPEÇÃO
                </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
               <div className="flex justify-between items-end mb-8">
                  <div>
                     <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-2 italic">Status da Verificação Analítica</p>
                     <p className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{checkedCount === items.length ? '100% CONFERIDO & CERTIFICADO' : 'EM PROCESSAMENTO DE ANÁLISE'}</p>
                  </div>
                  <span className="text-sm font-black text-[#D4AF37] italic tabular-nums">{checkedCount}/{items.length} ITENS</span>
               </div>
               <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(212,175,55,0.4)] ${checkedCount === items.length ? 'bg-green-500 shadow-green-900/40' : 'bg-[#D4AF37]'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => checklist.status !== 'Aprovado' && toggleItem(item)}
                  className={`flex items-center gap-6 p-6 rounded-[2rem] border transition-all text-left group/item relative overflow-hidden ${
                    item.checked ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-[#111111] border-white/5 hover:border-[#D4AF37]/20'
                  } ${checklist.status === 'Aprovado' ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02] active:scale-98 shadow-2xl'}`}
                >
                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 z-10 ${
                    item.checked ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg scale-110' : 'border-gray-800 text-transparent'
                  }`}>
                    <CheckCircle className="w-5 h-5 font-black" />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest leading-relaxed z-10 flex-1 ${item.checked ? 'text-white italic' : 'text-gray-600 group-hover/item:text-gray-400'} transition-colors duration-500`}>{item.label}</span>
                  {item.checked && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/5 to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-1000" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-10">
            <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
               <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-8 flex items-center gap-4 italic leading-none">
                  <User className="w-5 h-5 text-[#D4AF37]/60" /> Autoridade Inspetora
               </h3>
               <p className="text-white font-black text-2xl italic uppercase tracking-tighter leading-none group-hover:text-[#D4AF37] transition-colors">{inspectorName || 'IDENTIDADE OCULTA'}</p>
               <div className="mt-10 pt-8 border-t border-white/5">
                  <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.2em] mb-2 italic leading-none">Data de Emissão do Laudo</p>
                  <p className="text-sm text-gray-500 font-black italic tabular-nums uppercase">{checklist.completed_at ? new Date(checklist.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'VALIDAÇÃO EM CURSO...'}</p>
               </div>
            </div>

            <div className="bg-gradient-to-br from-[#111111] to-black border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col">
               <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-8 italic leading-none">Parecer Técnico SD</h3>
               <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  readOnly={checklist.status === 'Aprovado'}
                  placeholder="DESREVA OBSERVAÇÕES CRÍTICAS DO CONTROLE DE QUALIDADE..."
                  className="w-full bg-black border border-white/5 rounded-[2rem] p-8 text-white text-sm resize-none h-48 focus:border-[#D4AF37]/30 outline-none transition-all italic font-medium placeholder:text-gray-800 uppercase tracking-tight shadow-inner"
                />
               {checklist.status !== 'Aprovado' && (
                  <button
                    onClick={finalizeChecklist}
                    className="w-full mt-10 h-20 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-0.98 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-green-900/30 italic"
                  >
                    <ShieldCheck className="w-6 h-6" /> LIBERAR EXPEDIÇÃO ELITE
                  </button>
               )}
               {checklist.status === 'Aprovado' && (
                  <div className="mt-10 p-8 rounded-[2rem] bg-green-500/5 border border-green-500/10 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-40" />
                    <p className="text-green-500/60 font-black text-[10px] uppercase tracking-[0.3em] italic">PROTOCOLO ENCERRADO</p>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
