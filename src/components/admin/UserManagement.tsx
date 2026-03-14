import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Key, Edit, Trash2, Mail, Loader2, Search, X, Save, Eye, EyeOff } from 'lucide-react';

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
            toast({ title: '⚠️ Preencha Nome e Senha', variant: 'destructive' });
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
            toast({ title: '✅ Usuário criado com sucesso!' });
            setShowForm(false);
            setFormParams({ name: '', email: '', password: '', role: 'EMPLOYEE' });
            fetchUsers();
        } catch (error: any) {
            toast({ title: '❌ Erro ao salvar', description: error.message, variant: 'destructive' });
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
            toast({ title: '✅ Usuário atualizado!' });
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
            toast({ title: '⚠️ Senha deve ter pelo menos 4 caracteres', variant: 'destructive' });
            return;
        }
        setSavingPassword(true);
        try {
            const { error } = await supabase.from('employees').update({
                password: newPassword.trim(),
            }).eq('id', passwordUser.id);
            if (error) throw error;
            toast({ title: '✅ Senha alterada com sucesso!', description: `Senha de ${passwordUser.name} foi atualizada.` });
            setPasswordUser(null);
            setNewPassword('');
        } catch (error: any) {
            toast({ title: '❌ Erro ao alterar senha', description: error.message, variant: 'destructive' });
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: '✅ Usuário removido' });
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
        <div className="p-8 space-y-6 overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-amber-500" />
                        Gestão de Usuários
                    </h1>
                    <p className="text-gray-500 mt-1">Funcionários e Clientes do Sistema</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Novo Usuário
                </button>
            </header>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
            </div>

            {showForm && (
                <div className="bg-white rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="font-bold text-lg">Cadastrar Novo Usuário</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome Completo *</label>
                            <input
                                value={formParams.name}
                                onChange={e => setFormParams({ ...formParams, name: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200"
                                placeholder="Robson Silva"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">E-mail para Login</label>
                            <input
                                value={formParams.email}
                                onChange={e => setFormParams({ ...formParams, email: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200"
                                placeholder="robson@sdmoveis.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Senha Inicial *</label>
                            <input
                                value={formParams.password}
                                onChange={e => setFormParams({ ...formParams, password: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200"
                                type="text"
                                placeholder="Senha segura"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nível de Acesso *</label>
                            <select
                                value={formParams.role}
                                onChange={e => setFormParams({ ...formParams, role: e.target.value })}
                                className="w-full p-3 rounded-xl border border-gray-200"
                            >
                                <option value="EMPLOYEE">Funcionário</option>
                                <option value="ADMIN">Administrador</option>
                                <option value="CLIENT">Cliente</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={handleSave} disabled={loading} className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Usuário'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left p-6 text-xs font-black text-gray-500 uppercase">Usuário</th>
                            <th className="text-left p-6 text-xs font-black text-gray-500 uppercase">Acesso</th>
                            <th className="text-left p-6 text-xs font-black text-gray-500 uppercase">Data de Cadastro</th>
                            <th className="text-right p-6 text-xs font-black text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                                            {u.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{u.name}</p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {u.email || 'Sem e-mail'}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'Administrador' ? 'bg-red-100 text-red-700' :
                                        u.role === 'Funcionário' ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'}`}>
                                        {u.role || 'Usuário'}
                                    </span>
                                </td>
                                <td className="p-6 text-sm text-gray-500">
                                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                            title="Editar Usuário"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openChangePassword(u)}
                                            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            title="Trocar Senha"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(u.id)}
                                            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Remover Usuário"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400">
                                    {loading ? 'Carregando usuários...' : 'Nenhum usuário encontrado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Edit className="w-5 h-5 text-amber-500" />
                                Editar Usuário
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome Completo *</label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="Nome do usuário"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">E-mail</label>
                                <input
                                    value={editForm.email}
                                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="email@sdmoveis.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nível de Acesso</label>
                                <select
                                    value={editForm.role}
                                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                    <option value="Funcionário">Funcionário</option>
                                    <option value="Administrador">Administrador</option>
                                    <option value="Cliente">Cliente</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">
                                Cancelar
                            </button>
                            <button onClick={handleEdit} disabled={savingEdit} className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50">
                                <Save className="w-4 h-4" />
                                {savingEdit ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {passwordUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Key className="w-5 h-5 text-blue-500" />
                                Trocar Senha
                            </h3>
                            <button onClick={() => setPasswordUser(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500">
                            Definindo nova senha para <span className="font-bold text-gray-800">{passwordUser.name}</span>
                        </p>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nova Senha *</label>
                            <div className="relative">
                                <input
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Digite a nova senha..."
                                    className="w-full p-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Mínimo de 4 caracteres.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setPasswordUser(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">
                                Cancelar
                            </button>
                            <button onClick={handleChangePassword} disabled={savingPassword} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                                <Key className="w-4 h-4" />
                                {savingPassword ? 'Salvando...' : 'Alterar Senha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
