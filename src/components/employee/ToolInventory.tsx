import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Plus, Trash2, Loader2, Shield, Zap, Sparkles, ChevronRight } from 'lucide-react';

const db = supabase as any;

interface Tool {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  notes: string | null;
}

export default function ToolInventory({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTools();
  }, [employeeId]);

  const fetchTools = async () => {
    const { data } = await db
      .from('tool_inventory')
      .select('*')
      .eq('employee_id', employeeId)
      .order('name');
    if (data) setTools(data);
  };

  const addTool = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await db.from('tool_inventory').insert({
      employee_id: employeeId,
      name: name.trim(),
      quantity: parseInt(quantity) || 1,
      condition,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🔧 Ativo registrado!' });
      setName(''); setQuantity('1'); setCondition('good'); setNotes(''); setShowAdd(false);
      fetchTools();
    }
  };

  const removeTool = async (id: string) => {
    await db.from('tool_inventory').delete().eq('id', id);
    toast({ title: '🗑️ Ativo removido' });
    fetchTools();
  };

  const conditionLabel: Record<string, string> = {
    good: 'FUNCIONALIDADE TOTAL',
    fair: 'MANUTENÇÃO REQUERIDA',
    poor: 'CRÍTICO / SUBSTITUIR',
  };

  const conditionColor: Record<string, string> = {
    good: 'bg-green-500/10 text-green-500 border-green-500/20',
    fair: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    poor: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <header>
           <p className="text-[9px] text-[#D4AF37]/60 font-black uppercase tracking-[0.4em] mb-2 italic flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Controle de Ativos
           </p>
           <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Inventário Individual</h3>
        </header>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`h-12 px-6 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all italic flex items-center gap-3 ${showAdd ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-[#D4AF37]/30'}`}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'CANCELAR' : 'ALISTAR FERRAMENTA'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-6 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Nomenclatura Técnica *</label>
               <input
                 type="text"
                 value={name}
                 onChange={e => setName(e.target.value)}
                 placeholder="EX: PARAFUSADEIRA MAKITA 18V"
                 className="w-full h-14 bg-black border border-white/5 rounded-xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase"
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">QTD</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full h-14 bg-black border border-white/5 rounded-xl px-6 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Estatus Operacional</label>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  className="w-full h-14 bg-black border border-white/5 rounded-xl px-6 text-white text-[10px] font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer shadow-inner uppercase"
                >
                  <option value="good">FUNCIONAL</option>
                  <option value="fair">REGULAR</option>
                  <option value="poor">RUIM</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Observações de Campo</label>
               <input
                 type="text"
                 value={notes}
                 onChange={e => setNotes(e.target.value)}
                 placeholder="EX: MALETA INCLUSA, 2 BATERIAS"
                 className="w-full h-14 bg-black border border-white/5 rounded-xl px-6 text-white text-[9px] font-bold italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase"
               />
            </div>

            <button
              onClick={addTool}
              disabled={saving || !name.trim()}
              className="w-full h-16 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-4 italic"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              EFETIVAR REGISTRO NO INVENTÁRIO
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tools.map(tool => (
          <div key={tool.id} className="group bg-[#111111] border border-white/5 rounded-[2rem] p-6 hover:border-[#D4AF37]/20 transition-all duration-500 relative overflow-hidden">
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 bg-black border border-white/5 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
                      <Wrench className="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-1">
                         <span className="text-lg font-black text-white italic tracking-tighter uppercase leading-none">{tool.name}</span>
                         <span className="text-[11px] font-black text-[#D4AF37] italic tabular-nums bg-[#D4AF37]/5 px-2 py-0.5 rounded-lg border border-[#D4AF37]/10">×{tool.quantity}</span>
                      </div>
                      {tool.notes && <p className="text-[9px] text-gray-700 font-bold uppercase italic tracking-widest">{tool.notes}</p>}
                   </div>
                </div>
                
                <div className="flex items-center gap-6">
                   <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest italic ${conditionColor[tool.condition] || conditionColor.good}`}>
                      {conditionLabel[tool.condition] || tool.condition}
                   </div>
                   <button onClick={() => removeTool(tool.id)} className="w-10 h-10 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 opacity-0 group-hover:opacity-[0.03] transition-opacity"><Wrench className="w-24 h-24" /></div>
          </div>
        ))}
        {tools.length === 0 && !showAdd && (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] group">
             <Wrench className="w-16 h-16 text-gray-900 mx-auto mb-6 group-hover:text-gray-800 transition-colors" />
             <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em] italic mb-2">Inventário Deserto</p>
             <p className="text-[9px] text-gray-800 font-bold italic">Nenhum ativo alistado para este colaborador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
