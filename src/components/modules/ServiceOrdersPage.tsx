import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardList, Plus, Search, Edit, Calendar, User, DollarSign, Zap, Shield, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';

const db = supabase as any;

const ServiceOrdersPage: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: '',
    description: '',
    status: 'aberta',
    priority: 'normal',
    assigned_to: '',
    total_value: 0,
    notes: '',
    estimated_date: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [ordRes, cliRes, empRes] = await Promise.all([
      db.from('service_orders').select('*, clients(name, address), employees(name)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name, address').eq('status', 'active').order('name'),
      db.from('employees').select('id, name').eq('active', true).order('name'),
    ]);
    setOrders(ordRes.data || []);
    setClients(cliRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const payload = {
      ...form,
      assigned_to: form.assigned_to || null,
      client_id: form.client_id || null,
      estimated_date: form.estimated_date || null,
    };
    if (editingId) {
      await db.from('service_orders').update(payload).eq('id', editingId);
      toast({ title: '✅ OS Atualizada com Sucesso' });
    } else {
      await db.from('service_orders').insert(payload);
      toast({ title: '✅ Nova Ordem de Serviço SD Aberta' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const statusStyles: Record<string, string> = {
    aberta: 'bg-white/5 text-gray-400 border-white/10',
    em_andamento: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5',
    concluida: 'bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5',
    cancelada: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5',
  };

  const statusLabels: Record<string, string> = {
    aberta: 'Em Espera',
    em_andamento: 'Em Execução',
    concluida: 'Finalizada',
    cancelada: 'Interrompida',
  };

  const priorityStyles: Record<string, string> = {
    baixa: 'text-gray-600',
    normal: 'text-blue-500',
    alta: 'text-orange-500',
    urgente: 'text-red-600 font-black animate-pulse',
  };

  const filtered = orders.filter(o =>
    (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.employees?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (o?: any) => {
    if (o) {
      setEditingId(o.id);
      setForm({
        client_id: o.client_id || '',
        description: o.description || '',
        status: o.status,
        priority: o.priority,
        assigned_to: o.assigned_to || '',
        total_value: o.total_value || 0,
        notes: o.notes || '',
        estimated_date: o.estimated_date ? o.estimated_date.slice(0, 16) : '',
      });
    } else {
      setEditingId(null);
      setForm({ client_id: '', description: '', status: 'aberta', priority: 'normal', assigned_to: '', total_value: 0, notes: '', estimated_date: '' });
    }
    setShowForm(true);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full -translate-x-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[18px] flex items-center justify-center text-black shadow-2xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            Operação <span className="text-[#D4AF37]">Serviços</span>
          </h1>
          <p className="text-gray-500 mt-2 text-xs font-medium italic flex items-center gap-2">
             <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Gestão de Montagem e Entrega de Alto Padrão SD
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="px-8 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-3 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-5 h-5" /> ABRIR NOVA OS
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filtered.map(o => (
          <div 
            key={o.id} 
            className="group bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl hover:border-[#D4AF37]/30 transition-all cursor-pointer relative overflow-hidden flex flex-col"
            onClick={() => openForm(o)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-[#D4AF37]/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-8">
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${priorityStyles[o.priority] || ''}`}>
                Prioridade {o.priority}
              </span>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${statusStyles[o.status] || ''}`}>
                {statusLabels[o.status]?.toUpperCase() || o.status.toUpperCase()}
              </span>
            </div>

            <div className="mb-8">
               <h3 className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 italic tracking-tighter uppercase leading-none">#{o.order_number || 'Sem Ref'}</h3>
               <div className="flex items-center gap-2.5 mt-3 text-gray-500">
                  <User className="w-3.5 h-3.5 text-[#D4AF37]/50" />
                  <p className="font-bold text-xs italic uppercase tracking-tight truncate">{o.clients?.name || 'Cliente Direto SD'}</p>
               </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 flex-grow">
              <p className="text-gray-600 text-[11px] line-clamp-3 leading-relaxed italic font-medium">
                {o.description || 'Aguardando detalhamento técnico.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 pt-6 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">Responsável SD</p>
                <p className="text-white text-[11px] font-black italic truncate">{o.employees?.name || 'A definir'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">Valor Alocado</p>
                <p className="text-[#D4AF37] text-base font-black italic tabular-nums">R$ {(o.total_value || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-widest italic tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]/40" />
                {o.estimated_date ? format(new Date(o.estimated_date), 'dd/MM/yy HH:mm') : 'Agenda Aberta'}
              </div>
              <div className="w-10 h-10 bg-white/5 group-hover:bg-[#D4AF37] text-gray-600 group-hover:text-black rounded-xl flex items-center justify-center transition-all border border-white/5 group-hover:border-transparent">
                  <Edit className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 relative z-10 animate-in zoom-in-95 duration-300 overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto luxury-scroll">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
            <div className="flex justify-between items-center text-white relative z-10">
              <h3 className="font-black text-xl italic uppercase tracking-tighter flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center">
                    <ClipboardList className="w-6 h-6" />
                 </div>
                 {editingId ? 'Refinar Gestão OS' : 'Protocolo de Iniciação OS'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Titular do Atendimento</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                  <option value="" className="bg-black">Vincular Cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Técnico Encarregado</label>
                <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                  <option value="" className="bg-black">Destinar Responsável...</option>
                  {employees.map(e => <option key={e.id} value={e.id} className="bg-black">{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Grau de Criticidade</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                  <option value="baixa" className="bg-black">Eficiência Estendida (Baixa)</option>
                  <option value="normal" className="bg-black">Ciclo Padrão (Normal)</option>
                  <option value="alta" className="bg-black">Prioridade Técnica (Alta)</option>
                  <option value="urgente" className="bg-black text-red-500">Intervenção Imediata (Urgente)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Venda Direta / Previsão (R$)</label>
                <input type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: +e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-[#D4AF37] text-xl font-black italic tracking-tighter outline-none focus:border-[#D4AF37] transition-all tabular-nums shadow-inner" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Status Operacional</label>
                 <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                    <option value="aberta" className="bg-black">Em Espera</option>
                    <option value="em_andamento" className="bg-black">Em Execução</option>
                    <option value="concluida" className="bg-black">Finalizada</option>
                    <option value="cancelada" className="bg-black">Interrompida</option>
                 </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Previsão Agenda</label>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={form.estimated_date ? form.estimated_date.split('T')[0] : ''} 
                    onChange={e => {
                      const date = e.target.value;
                      const time = form.estimated_date ? form.estimated_date.split('T')[1] || '08:00' : '08:00';
                      setForm({ ...form, estimated_date: `${date}T${time}` });
                    }} 
                    className="flex-1 h-14 bg-white/5 border border-white/5 rounded-xl px-4 text-white text-xs font-bold outline-none focus:border-[#D4AF37]/40" 
                  />
                  <select 
                    value={form.estimated_date ? (form.estimated_date.split('T')[1]?.split(':')[0] || '08') : '08'}
                    onChange={e => {
                      const h = e.target.value;
                      const d = form.estimated_date ? form.estimated_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                      const m = form.estimated_date ? (form.estimated_date.split('T')[1]?.split(':')[1] || '00') : '00';
                      setForm({ ...form, estimated_date: `${d}T${h}:${m}` });
                    }}
                    className="w-20 h-14 bg-white/5 border border-white/5 rounded-xl px-2 text-white text-xs font-bold outline-none focus:border-[#D4AF37]/40 appearance-none text-center"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i.toString().padStart(2, '0')} className="bg-black">{i.toString().padStart(2, '0')}h</option>
                    ))}
                  </select>
                  <select 
                    value={form.estimated_date ? (form.estimated_date.split('T')[1]?.split(':')[1] || '00') : '00'}
                    onChange={e => {
                      const m = e.target.value;
                      const d = form.estimated_date ? form.estimated_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd');
                      const h = form.estimated_date ? (form.estimated_date.split('T')[1]?.split(':')[0] || '08') : '08';
                      setForm({ ...form, estimated_date: `${d}T${h}:${m}` });
                    }}
                    className="w-20 h-14 bg-white/5 border border-white/5 rounded-xl px-2 text-white text-xs font-bold outline-none focus:border-[#D4AF37]/40 appearance-none text-center"
                  >
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m} className="bg-black">{m}m</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ementa Técnica / Notas</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-4 bg-white/5 border border-white/5 rounded-xl text-white text-xs italic font-medium tracking-tight outline-none" rows={2} placeholder="Instruções para a equipe de montagem..." />
            </div>

            <div className="flex gap-4 relative z-10 pt-4">
              <button 
                onClick={handleSave} 
                className="flex-1 h-16 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
              >
                FINALIZAR PROTOCOLO OS
              </button>
              <button onClick={() => setShowForm(false)} className="px-8 h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 text-gray-600 border border-white/5 hover:bg-white/10 transition-all italic">DESCARTAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;
