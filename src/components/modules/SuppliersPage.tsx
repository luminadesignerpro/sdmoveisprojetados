import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react';

const db = supabase as any;

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string;
  notes: string | null;
  active: boolean;
}

const SuppliersPage: React.FC = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' });

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await db.from('suppliers').select('*').eq('active', true).order('name');
    setSuppliers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: '⚠️ Nome obrigatório', variant: 'destructive' }); return; }

    if (editingId) {
      await db.from('suppliers').update(form).eq('id', editingId);
      toast({ title: '✅ Fornecedor atualizado' });
    } else {
      await db.from('suppliers').insert(form);
      toast({ title: '✅ Fornecedor cadastrado' });
    }
    setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' });
    setShowForm(false);
    setEditingId(null);
    fetchSuppliers();
  };

  const handleEdit = (s: Supplier) => {
    setForm({ name: s.name, cnpj: s.cnpj || '', phone: s.phone || '', email: s.email || '', address: s.address || '', category: s.category, notes: s.notes || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await db.from('suppliers').update({ active: false }).eq('id', id);
    toast({ title: '🗑️ Fornecedor removido' });
    fetchSuppliers();
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.cnpj || '').includes(search));

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] relative w-full pt-16">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <Building className="w-8 h-8 text-amber-500" />
            Fornecedores
          </h1>
          <p className="text-gray-500 mt-1">Cadastro e gestão de fornecedores</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', cnpj: '', phone: '', email: '', address: '', category: 'Geral', notes: '' }); }} className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Novo Fornecedor
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ..." className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-gray-500" />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 text-white">
          <h3 className="font-bold text-lg text-amber-500">{editingId ? 'Editar' : 'Novo'} Fornecedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome *" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="CNPJ" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Telefone" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none col-span-2" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option>Geral</option><option>MDF/MDP</option><option>Ferragens</option><option>Vidros</option><option>Pedras</option><option>Tintas</option><option>Acessórios</option>
            </select>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observações" className="p-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700">Salvar</button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
        <table className="w-full min-w-[700px]">
          <thead className="bg-[#1a1a1a] border-b border-white/10">
            <tr>
              <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Fornecedor</th>
              <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">CNPJ</th>
              <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Contato</th>
              <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Categoria</th>
              <th className="text-left p-4 text-xs font-black text-amber-500/80 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{s.name}</td>
                <td className="p-4 text-gray-400 text-sm">{s.cnpj || '-'}</td>
                <td className="p-4">
                  {s.phone && <p className="text-sm text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</p>}
                  {s.email && <p className="text-sm text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</p>}
                </td>
                <td className="p-4"><span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold">{s.category}</span></td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => handleEdit(s)} className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="w-9 h-9 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhum fornecedor encontrado'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliersPage;
