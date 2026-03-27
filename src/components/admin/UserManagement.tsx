import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Key, Edit, Trash2, Mail, Loader2, Search, X, Save, Eye, EyeOff, Shield, User, Sparkles, Fingerprint } from 'lucide-react';

const UserManagement: React.FC = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formParams, setFormParams] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
    });

    // Edit user modal
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Change password modal
    const [passwordUser, setPasswordUser] = useState<any | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            toast({ title: '❌ Erro ao buscar', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formParams.name || !formParams.password) {
            toast({ title: '⚠️ Dados Obrigatórios', description: 'Preencha Nome e Senha.', variant: 'destructive' });
            return;
        }
        try {
            setLoading(true);
            const payload = {
                name: formParams.name,
                email: formParams.email || null,
                role: formParams.role === 'ADMIN' ? 'Administrador' : formParams.role === 'CLIENT' ? 'Cliente' : 'Funcionário',
                password: formParams.password,
                active: true
            };
            const { error } = await supabase.from('employees').insert([payload]);
            if (error) throw error;
            toast({ title: '✨ Usuário Criado', description: 'Credenciais de acesso geradas com sucesso.' });
            setShowForm(false);
            setFormParams({ name: '', email: '', password: '', role: 'EMPLOYEE' });
            fetchUsers();
        } catch (error: any) {
            toast({ title: '❌ Falha no Cadastro', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (u: any) => {
        setEditingUser(u);
        setEditForm({
            name: u.name || '',
            email: u.email || '',
            role: u.role || 'Funcionário',
        });
    };

    const handleEdit = async () => {
        if (!editForm.name.trim()) {
            toast({ title: '⚠️ Nome é obrigatório', variant: 'destructive' });
            return;
        }
        setSavingEdit(true);
        try {
            const { error } = await supabase.from('employees').update({
                name: editForm.name.trim(),
                email: editForm.email.trim() || null,
                role: editForm.role,
            }).eq('id', editingUser.id);
            if (error) throw error;
            toast({ title: '✅ Perfil Atualizado' });
            setEditingUser(null);
            fetchUsers();
        } catch (error: any) {
            toast({ title: '❌ Erro ao atualizar', description: error.message, variant: 'destructive' });
        } finally {
            setSavingEdit(false);
        }
    };

    const openChangePassword = (u: any) => {
        setPasswordUser(u);
        setNewPassword('');
        setShowPassword(false);
    };

    const handleChangePassword = async () => {
        if (!newPassword.trim() || newPassword.length < 4) {
            toast({ title: '⚠️ Senha Fraca', description: 'Mínimo de 4 caracteres.', variant: 'destructive' });
            return;
        }
        setSavingPassword(true);
        try {
            const { error } = await supabase.from('employees').update({
                password: newPassword.trim(),
            }).eq('id', passwordUser.id);
            if (error) throw error;
            toast({ title: '🔐 Senha Redefinida', description: `Nova chave de acesso para ${passwordUser.name}.` });
            setPasswordUser(null);
            setNewPassword('');
        } catch (error: any) {
            toast({ title: '❌ Erro no Reset', description: error.message, variant: 'destructive' });
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja desvincular este usuário em definitivo?')) return;
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: '🗑️ Usuário Removido' });
            fetchUsers();
        } catch (error: any) {
            toast({ title: '❌ Erro ao remover', description: error.message, variant: 'destructive' });
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
            </div>

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
                            <Users className="w-8 h-8" />
                        </div>
                        Gestão de <span className="text-[#D4AF37]">Acessos</span>
                    </h1>
                    <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
                         <Shield className="w-4 h-4 text-[#D4AF37]" /> Administração de Credenciais e Permissões Elite
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-10 h-20 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl text-black flex items-center gap-4 w-full sm:w-auto justify-center italic bg-gradient-to-r from-[#D4AF37] to-[#b8952a]"
                >
                    <Plus className="w-5 h-5" /> PROVISIONAR USUÁRIO
                </button>
            </header>

            <div className="relative max-w-2xl z-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#D4AF37]/40" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rastrear perfil por nome ou identificador SD..."
                    className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-white/5 bg-[#111111] text-white text-sm italic font-medium tracking-tight placeholder:text-gray-700 focus:border-[#D4AF37]/40 transition-all outline-none shadow-2xl"
                />
            </div>

            {showForm && (
                <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[3.5rem] p-12 shadow-2xl space-y-10 relative z-20 animate-in zoom-in-95 duration-500 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="flex items-center justify-between relative z-10">
                       <h3 className="font-black text-2xl text-white italic uppercase tracking-tighter flex items-center gap-5">
                            <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            Novo Perfil de Acesso
                       </h3>
                       <button onClick={() => setShowForm(false)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 transition-all">
                          <X className="w-8 h-8" />
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Identificação Nominal</label>
                            <input
                                value={formParams.name}
                                onChange={e => setFormParams({ ...formParams, name: e.target.value })}
                                className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm italic font-medium tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                                placeholder="NOME DO COLABORADOR OU CLIENTE"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Login Corporativo (E-mail)</label>
                            <input
                                value={formParams.email}
                                onChange={e => setFormParams({ ...formParams, email: e.target.value })}
                                className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                                placeholder="exemplo@sdmoveis.com"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Chave de Segurança Primária</label>
                            <div className="relative">
                               <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]/40" />
                               <input
                                    value={formParams.password}
                                    onChange={e => setFormParams({ ...formParams, password: e.target.value })}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 text-white text-sm font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase"
                                    type="text"
                                    placeholder="DEFINIR SENHA DE ACESSO"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Nível Hierárquico</label>
                            <select
                                value={formParams.role}
                                onChange={e => setFormParams({ ...formParams, role: e.target.value })}
                                className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer italic"
                            >
                                <option value="EMPLOYEE" className="bg-black">Operacional / Logística</option>
                                <option value="ADMIN" className="bg-black">Diretoria Administrativa</option>
                                <option value="CLIENT" className="bg-black">Portal do Cliente Elite</option>
                            </select>
                        </div>
                    </div>
                    <button 
                       onClick={handleSave} 
                       disabled={loading} 
                       className="w-full h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.01] active:scale-98 transition-all shadow-2xl flex items-center justify-center gap-4 italic"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
                        {loading ? 'PROCESSANDO PROTOCOLO...' : 'CONFIRMAR PROVISIONAMENTO'}
                    </button>
                </div>
            )}

            <div className="bg-[#111111] border border-white/5 rounded-[4rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="overflow-x-auto luxury-scroll">
                    <table className="w-full min-w-[1000px]">
                        <thead>
                            <tr className="bg-black/60 border-b border-white/5">
                                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Identidade Usuário</th>
                                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Permissões</th>
                                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Data Ingresso</th>
                                <th className="text-center p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Ações Críticas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="p-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 flex items-center justify-center font-black text-xl text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all duration-500 shadow-inner">
                                                {u.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-xl italic tracking-tighter uppercase group-hover:text-[#D4AF37] transition-colors">{u.name}</p>
                                                <p className="text-[10px] text-gray-600 font-bold flex items-center gap-2 mt-2 uppercase tracking-widest italic">
                                                    <Mail className="w-3.5 h-3.5 opacity-40" /> {u.email || 'login_nao_vinculado'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-10">
                                        <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-xl italic ${
                                            u.role === 'Administrador' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            u.role === 'Funcionário' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'}`}>
                                            {u.role || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="p-10 text-gray-500 font-black italic tabular-nums text-sm truncate uppercase tracking-tighter">
                                        {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="p-10">
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                onClick={() => openEdit(u)}
                                                className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:border-white transition-all active:scale-95"
                                                title="Reconfigurar Perfil"
                                            >
                                                <Edit className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => openChangePassword(u)}
                                                className="w-14 h-14 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all active:scale-95"
                                                title="Resetar Chave"
                                            >
                                                <Key className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="w-14 h-14 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center text-red-900 group-hover:text-red-600 transition-all active:scale-95"
                                                title="Revogar Acesso"
                                            >
                                                <Trash2 className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                           <Users className="w-20 h-20 text-gray-800" />
                                           <p className="font-black uppercase tracking-[0.4em] text-xs text-gray-600 italic">Rede de Acessos Silenciosa</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setEditingUser(null)}>
                    <div className="bg-[#0f0f0f] border border-[#D4AF37]/30 rounded-[3.5rem] w-full max-w-lg p-12 shadow-[0_0_100px_rgba(212,175,55,0.05)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <h3 className="font-black text-2xl text-white flex items-center gap-5 uppercase italic tracking-tighter">
                                <Edit className="w-8 h-8 text-[#D4AF37]" />
                                Reconfigurar Perfil
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-gray-500 transition-all">
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-2 italic">Identificação Nominal</label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-tight outline-none focus:border-[#D4AF37]/30 transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-2 italic">Login Corporativo</label>
                                <input
                                    value={editForm.email}
                                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-bold tracking-tight outline-none focus:border-[#D4AF37]/30 transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-2 italic">Nível Hierárquico</label>
                                <select
                                    value={editForm.role}
                                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white text-sm font-black tracking-tight outline-none focus:border-[#D4AF37]/30 transition-all appearance-none cursor-pointer italic"
                                >
                                    <option value="Funcionário" className="bg-black">Operacional / Logística</option>
                                    <option value="Administrador" className="bg-black">Diretoria Administrativa</option>
                                    <option value="Cliente" className="bg-black text-[#D4AF37]">Portal do Cliente Elite</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-6 mt-12 relative z-10">
                            <button onClick={() => setEditingUser(null)} className="flex-1 h-20 bg-white/5 text-gray-500 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all italic border border-white/5">
                                Abortar
                            </button>
                            <button onClick={handleEdit} disabled={savingEdit} className="flex-[2] h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-4 shadow-2xl italic">
                                <Save className="w-5 h-5" />
                                {savingEdit ? 'PROCESSANDO...' : 'EFETIVAR AJUSTES'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {passwordUser && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setPasswordUser(null)}>
                    <div className="bg-[#0f0f0f] border border-[#D4AF37]/30 rounded-[3.5rem] w-full max-w-md p-12 shadow-[0_0_100px_rgba(59,130,246,0.05)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <h3 className="font-black text-2xl text-white flex items-center gap-5 uppercase italic tracking-tighter">
                                <Key className="w-8 h-8 text-blue-500" />
                                Reset de Chave
                            </h3>
                            <button onClick={() => setPasswordUser(null)} className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-gray-500 transition-all">
                                <X className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="text-center bg-black/40 rounded-3xl p-8 border border-white/5 mb-10 relative z-10">
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2 italic">Alvo de Reconfiguração</p>
                            <p className="text-xl font-black text-white italic tracking-tighter uppercase">{passwordUser.name}</p>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-2 block mb-3 italic">Nova Chave de Acesso SD</label>
                                <div className="relative">
                                    <input
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="MÍNIMO 4 CARACTERES"
                                        className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 pr-16 text-white focus:border-blue-500/40 outline-none transition-all font-black text-sm tracking-[0.3em] italic uppercase shadow-inner"
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white p-3 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 mt-12 relative z-10">
                            <button onClick={() => setPasswordUser(null)} className="flex-1 h-20 bg-white/5 text-gray-500 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all italic border border-white/5">
                                Abortar
                            </button>
                            <button onClick={handleChangePassword} disabled={savingPassword} className="flex-[2] h-20 bg-blue-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-4 shadow-2xl italic shadow-blue-900/10">
                                <Key className="w-5 h-5" />
                                {savingPassword ? 'PROCESSANDO...' : 'EFETIVAR RESET'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
