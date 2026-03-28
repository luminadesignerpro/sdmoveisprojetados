import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, X, Shield, Zap, CheckCircle2 } from 'lucide-react';

const db = supabase as any;

const SuppliersPage: React.FC = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'Geral',
    contact_info: '',
    email: '',
    phone: '',
    address: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await db.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name) {
      toast({ title: '⚠️ Razão Social obrigatória', variant: 'destructive' });
      return;
    }
    if (editingId) {
      await db.from('suppliers').update(form).eq('id', editingId);
      toast({ title: '✅ Cadastro de Parceiro Atualizado' });
    } else {
      await db.from('suppliers').insert(form);
      toast({ title: '✅ Novo Parceiro Homologado' });
    }
    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      category: s.category || 'Geral',
      contact_info: s.contact_info || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja descontinuar a parceria com este fornecedor?')) {
      await db.from('suppliers').delete().eq('id', id);
      toast({ title: '🗑️ Parceiro Removido do Sistema' });
      fetchData();
    }
  };

  const filtered = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_info || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-xl flex items-center justify-center text-black shadow-lg">
              <Truck className="w-5 h-5" />
            </div>
            Rede de <span className="text-[#D4AF37]">Suprimentos</span>
          </h1>
          <p className="text-gray-500 mt-2 text-[10px] font-medium italic flex items-center gap-2">
             <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Gestão de Parcerias SD
          </p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', category: 'Geral', contact_info: '', email: '', phone: '', address: '' }); }} 
          className="px-6 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl text-black flex items-center gap-2 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
        >
          <Plus className="w-4 h-4" /> HOMOLOGAR PARCEIRO
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-between group hover:border-[#D4AF37]/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Parceiros Ativos</p>
            <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{suppliers.length}</p>
          </div>
          <Truck className="w-10 h-10 text-[#D4AF37]/20 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-between group hover:border-[#D4AF37]/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Segmentos SD</p>
            <p className="text-3xl font-black text-[#D4AF37] italic tracking-tighter tabular-nums">{new Set(suppliers.map(s => s.category)).size}</p>
          </div>
          <Zap className="w-10 h-10 text-[#D4AF37]/20 transition-colors" />
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-2xl flex items-center justify-between group hover:border-green-500/20 transition-all overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-1 italic">Status de Integridade</p>
            <p className="text-3xl font-black text-green-500 italic tracking-tighter tabular-nums">100% <span className="text-xs">OK</span></p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-green-500/20 transition-colors" />
        </div>
      </div>

      <div className="relative max-w-xl z-10">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]/40" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Localizar parceiro por nome, segmento ou contato..." 
          className="w-full pl-14 pr-6 py-4 rounded-2xl border border-white/5 bg-[#111111] text-white text-xs italic font-medium tracking-tight placeholder:text-gray-700 focus:border-[#D4AF37]/40 transition-all outline-none shadow-2xl" 
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 relative z-10 animate-in zoom-in-95 duration-300 overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto luxury-scroll">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
            <div className="flex justify-between items-center text-white relative z-10">
              <h3 className="font-black text-xl italic uppercase tracking-tighter flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                 </div>
                 {editingId ? 'Sincronizar Dados Parceiro' : 'Protocolo de Homologação'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Razão Social / Nome Fantasia</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Segmento de Atuação</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer">
                  <option className="bg-black">Geral</option><option className="bg-black">MDF</option><option className="bg-black">Ferragens</option><option className="bg-black">Vidros</option><option className="bg-black">Pedras</option><option className="bg-black">Tintas</option><option className="bg-black">Comunicação Visual</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Canal de Voz / WhatsApp</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all tabular-nums" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Correio Eletrônico Corporativo</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-14 bg-white/5 border border-white/5 rounded-xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all" />
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Localização / Base de Operação</label>
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full p-6 bg-white/5 border border-white/5 rounded-xl text-white text-sm italic font-medium tracking-tight" rows={2} />
            </div>
            <div className="flex gap-4 relative z-10 pt-4">
              <button 
                onClick={handleSave} 
                className="flex-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.01] active:scale-95 shadow-2xl italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
              >
                EFETIVAR HOMOLOGAÇÃO PARCEIRO
              </button>
              <button 
                onClick={() => setShowForm(false)} 
                className="px-8 h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-white/5 text-gray-600 border border-white/5 hover:bg-white/10 transition-all italic"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Identificação Parceiro</th>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Segmento</th>
                <th className="text-left p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Canais Diretos</th>
                <th className="text-center p-6 text-[9px] font-black text-gray-600 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-6">
                    <p className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors uppercase italic tracking-tighter leading-none">{s.name}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1.5 italic flex items-center gap-1.5">
                       <MapPin className="w-3 h-3 opacity-40 text-[#D4AF37]" /> {s.address || 'Sem base física registrada'}
                    </p>
                  </td>
                  <td className="p-6">
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#D4AF37]/20">
                      {s.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                      {s.phone && <p className="text-[10px] text-gray-500 flex items-center gap-2 italic font-medium tabular-nums"><Phone className="w-3 h-3 text-[#D4AF37]/30" /> {s.phone}</p>}
                      {s.email && <p className="text-[9px] text-gray-700 flex items-center gap-2 font-black tracking-tighter"><Mail className="w-3 h-3 text-[#D4AF37]/30" /> {s.email.toLowerCase()}</p>}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(s)} className="w-9 h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="w-9 h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/40 transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-gray-800 animate-pulse">
                         <Truck className="w-8 h-8" />
                      </div>
                      <p className="text-gray-700 font-black uppercase tracking-[0.3em] text-[10px]">
                        {loading ? 'Sincronizando Parceiros...' : 'Nenhum Provedor Homologado'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
