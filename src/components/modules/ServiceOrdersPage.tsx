import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast'
import { ClipboardList, Plus, Search, Edit, Calendar, Clock, Phone, MapPin, User, DollarSign, StickyNote, MessageCircle, X, Eye, FileDown } from 'lucide-react';
import PdfUploader from '../admin/PdfUploader';
import { format } from 'date-fns';

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
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    client_name: '',
    client_phone: '',
    client_address: '',
    description: '',
    status: 'aberta',
    priority: 'normal',
    assigned_to: '',
    total_value: 0,
    notes: '',
    estimated_date: '',
    meeting_time: '09:00',
  });

  const fetchData = async () => {
    setLoading(true);
    const [ordRes, cliRes, empRes] = await Promise.all([
      db.from('service_orders').select('*, clients(name, phone, address), employees(name)').order('created_at', { ascending: false }),
      db.from('clients').select('id, name, phone, address').order('name'),
      db.from('employees').select('id, name').eq('active', true).order('name'),
    ]);
    setOrders(ordRes.data || []);
    setClients(cliRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = (overrides: any = {}) => ({
    client_id: '', client_name: '', client_phone: '', client_address: '',
    description: '', status: 'aberta', priority: 'normal', assigned_to: '',
    total_value: 0, notes: '', estimated_date: '', meeting_time: '09:00',
    ...overrides,
  });

  const handleSave = async () => {
    if (!form.description.trim() && !form.client_name.trim() && !form.client_id) {
      toast({ title: '⚠️ Preencha pelo menos o cliente e descrição', variant: 'destructive' });
      return;
    }

    let clientId = form.client_id || null;

    if (!clientId && form.client_name.trim()) {
      const { data: newClient, error: clientErr } = await db.from('clients').insert({ 
        name: form.client_name.trim(),
        phone: form.client_phone || null,
        address: form.client_address || null
      }).select('id').single();
      
      if (clientErr) {
        toast({ title: '❌ Erro ao criar cliente', description: clientErr.message, variant: 'destructive' });
        return;
      }
      clientId = newClient.id;
    } else if (clientId) {
      await db.from('clients').update({
        phone: form.client_phone || null,
        address: form.client_address || null
      }).eq('id', clientId);
    }

    const payload = {
      client_id: clientId,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      total_value: form.total_value,
      notes: form.notes || null,
      estimated_date: form.estimated_date || null,
    };

    let error;
    if (editingId) {
      const res = await db.from('service_orders').update(payload).eq('id', editingId);
      error = res.error;
      if (!error) toast({ title: '✅ OS atualizada' });
    } else {
      const res = await db.from('service_orders').insert(payload);
      error = res.error;
      if (!error) toast({ title: '✅ OS criada com sucesso' });
    }

    if (error) {
      toast({ title: '❌ Erro ao salvar OS', description: error.message, variant: 'destructive' });
      return;
    }

    // Se concluiu a OS, finalizar qualquer viagem ativa do funcionário
    if (form.status === 'concluida' && form.assigned_to) {
      try {
        const { data: activeTrips } = await db
          .from('trips')
          .select('id')
          .eq('employee_id', form.assigned_to)
          .eq('status', 'active');
        
        if (activeTrips && activeTrips.length > 0) {
          for (const trip of activeTrips) {
            await db
              .from('trips')
              .update({ status: 'completed', ended_at: new Date().toISOString() })
              .eq('id', trip.id);
          }
          toast({ title: '🏁 Viagem associada finalizada automaticamente' });
        }
      } catch (e) {
        console.error('Erro ao finalizar viagem:', e);
      }
    }

    setShowForm(false);
    setEditingId(null);
    fetchData();
  };

  const statusColors: Record<string, string> = {
    aberta: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    em_andamento: 'bg-amber-900/50 text-amber-500 border border-amber-500/30',
    concluida: 'bg-green-900/50 text-green-400 border border-green-500/30',
    cancelada: 'bg-red-900/50 text-red-500 border border-red-500/30',
  };

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  };

  const handleWhatsAppShare = async (o: any) => {
    const phone = o.clients?.phone || o.client_phone;
    if (!phone) {
      toast({ title: '⚠️ Cliente sem telefone cadastrado', variant: 'destructive' });
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const target = cleanPhone.length > 11 ? cleanPhone : '55' + cleanPhone;
    
    const message = `Olá *${o.clients?.name || o.client_name || 'Cliente'}*! 🛠️\n\n` +
      `Sou da *SD Móveis Projetados*. Tratando sobre a sua *Ordem de Serviço (OS #${o.order_number})*.\n\n` +
      `📝 *Serviço:* ${o.description}\n` +
      `📍 *Status:* ${statusLabels[o.status] || o.status}\n` +
      `💰 *Valor:* R$ ${(o.total_value || 0).toLocaleString('pt-BR')}\n` +
      `📅 *Previsão:* ${o.estimated_date ? format(new Date(o.estimated_date), 'dd/MM/yyyy') : 'A definir'}\n\n` +
      `🔑 *CHAVES PIX PARA PAGAMENTO:*\n\n` +
      `💎 *InfinityPay (CNPJ):* 49.228.811/0001-33\n` +
      `📧 *E-mail:* sdmoveis48@gmail.com\n` +
      `🏦 *Itaú (Celular):* 85 99760-2237\n\n` +
      `*Titular:* Samuel David C\n\n` +
      `Aguardamos seu contato!`;

    try {
      toast({ title: '⏳ Enviando PIX...', description: 'Aguarde um momento.' });
      
      const { data: conv } = await db.from('whatsapp_conversations').select('id').eq('phone_number', target).maybeSingle();
      let convId = conv?.id;
      if (!convId) {
        const { data: newConv } = await db.from('whatsapp_conversations').insert({ 
          phone_number: target, 
          contact_name: o.clients?.name || o.client_name 
        }).select('id').single();
        convId = newConv.id;
      }

      const res = await supabase.functions.invoke('whatsapp-send', {
        body: { 
          conversationId: convId, 
          message: message,
          mediaUrl: 'https://nglwscakhhdhelhbqkyb.supabase.co/storage/v1/object/public/documents/assets/pix_qr.png',
          fileName: 'pix_sd_moveis.png'
        }
      });

      if (res.error) throw res.error;
      toast({ title: '✅ Mensagem e QR Code enviados!', description: 'O cliente recebeu os dados da OS e o QR Code do Pix.' });
    } catch (e: any) {
      console.error('Erro ao enviar WhatsApp:', e);
      window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const priorityColors: Record<string, string> = {
    baixa: 'bg-white/10 text-gray-400 border border-white/20',
    normal: 'bg-blue-900/50 text-blue-400 border border-blue-500/30',
    alta: 'bg-orange-900/50 text-orange-400 border border-orange-500/30',
    urgente: 'bg-red-900/50 text-red-500 border border-red-500/30',
  };

  const priorityLabels: Record<string, string> = {
    baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
  };

  const filtered = orders.filter(o =>
    (o.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.employees?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (o?: any) => {
    if (o) {
      setEditingId(o.id);
      setForm(resetForm({
        client_id: o.client_id || '',
        client_name: o.client_name || o.clients?.name || '',
        client_phone: o.client_phone || o.clients?.phone || '',
        client_address: o.client_address || o.clients?.address || '',
        description: o.description || '',
        status: o.status,
        priority: o.priority,
        assigned_to: o.assigned_to || '',
        total_value: o.total_value || 0,
        notes: o.notes || '',
        estimated_date: o.estimated_date ? o.estimated_date.slice(0, 10) : '',
        meeting_time: '09:00',
      }));
    } else {
      setEditingId(null);
      setForm(resetForm());
    }
    setShowForm(true);
  };

  const inputCls = "w-full h-11 bg-[#1a1a1a] rounded-xl px-4 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all";
  const labelCls = "text-sm font-semibold text-gray-300 flex items-center gap-2 mb-1";

  return (
    <div className="p-4 sm:p-8 space-y-6 overflow-auto h-full bg-[#0f0f0f] w-full text-white">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-amber-500" />
            Ordens de Serviço
          </h1>
          <p className="text-gray-400 mt-1">Gerenciamento de OS</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <button onClick={() => setShowPdfUploader(true)}
            className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
            <FileDown className="w-5 h-5 text-amber-500" /> Importar PDF
          </button>
          <button onClick={() => openForm()}
            className="text-black px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
            <Plus className="w-5 h-5" /> + Nova OS
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['aberta', 'em_andamento', 'concluida', 'cancelada'].map(st => (
          <div key={st} className="bg-[#111111] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-amber-500/30 transition-colors">
            <p className="text-xs text-gray-500 uppercase font-bold">{statusLabels[st]}</p>
            <p className="text-2xl font-black text-white mt-1">{orders.filter(o => o.status === st).length}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, cliente ou responsável..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-gray-600" />
      </div>

      {showPdfUploader && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <PdfUploader 
            onClose={() => setShowPdfUploader(false)} 
            onSuccess={() => {
              fetchData();
              setShowPdfUploader(false);
            }}
          />
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] rounded-2xl border border-amber-500/30 p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl text-white">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                {editingId ? 'Editar' : 'Nova'} Ordem de Serviço
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome do Cliente */}
              <div>
                <label className={labelCls}><User className="w-4 h-4 text-amber-500" /> Nome do Cliente *</label>
                <input type="text" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Nome completo do cliente" className={inputCls} />
              </div>

              {/* Celular */}
              <div>
                <label className={labelCls}><Phone className="w-4 h-4 text-green-500" /> Celular</label>
                <input type="tel" value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                  placeholder="(00) 00000-0000" className={inputCls} />
              </div>

              {/* Endereço */}
              <div>
                <label className={labelCls}><MapPin className="w-4 h-4 text-red-500" /> Endereço</label>
                <input type="text" value={form.client_address} onChange={e => setForm({ ...form, client_address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade" className={inputCls} />
              </div>

              {/* Descrição do Serviço */}
              <div>
                <label className={labelCls}><ClipboardList className="w-4 h-4 text-amber-500" /> Descrição do Serviço *</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Medição da cozinha, Instalação de armários..." className={inputCls} />
              </div>

              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><Calendar className="w-4 h-4 text-amber-500" /> Data *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input type="date" value={form.estimated_date} onChange={e => setForm({ ...form, estimated_date: e.target.value })}
                      className="w-full h-11 bg-[#1a1a1a] rounded-xl pl-10 pr-3 border border-white/10 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><Clock className="w-4 h-4 text-amber-500" /> Horário</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <select value={form.meeting_time} onChange={e => setForm({ ...form, meeting_time: e.target.value })}
                      className="w-full h-11 bg-[#1a1a1a] rounded-xl pl-10 pr-3 border border-white/10 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all appearance-none">
                      {['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Responsável + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><User className="w-4 h-4 text-gray-400" /> Responsável</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full h-11 bg-[#1a1a1a] rounded-xl px-3 border border-white/10 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all">
                    <option value="">Selecionar funcionário</option>
                    {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}> Prioridade</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full h-11 bg-[#1a1a1a] rounded-xl px-3 border border-white/10 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all">
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Valor + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><DollarSign className="w-4 h-4 text-green-500" /> Valor (R$)</label>
                  <input type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: +e.target.value })}
                    placeholder="0,00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}> Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 bg-[#1a1a1a] rounded-xl px-3 border border-white/10 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all">
                    <option value="aberta">Aberta</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className={labelCls}><MessageCircle className="w-4 h-4 text-gray-500" /> Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Detalhes adicionais..." rows={3}
                  className="w-full bg-[#1a1a1a] rounded-xl px-4 py-3 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition-all resize-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSave}
                className="flex-1 h-12 text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #F5E583)' }}>
                <Plus className="w-4 h-4" />
                {editingId ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="h-12 px-5 bg-white/10 border border-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[#111111] border border-amber-500/30 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black text-white">OS #{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-400"><strong className="text-white">Cliente:</strong> {selectedOrder.clients?.name || selectedOrder.client_name || '-'}</p>
              {(selectedOrder.clients?.phone || selectedOrder.client_phone) && (
                <p className="text-gray-400 flex items-center gap-2"><Phone className="w-4 h-4 text-green-500" /> {selectedOrder.clients?.phone || selectedOrder.client_phone}</p>
              )}
              {(selectedOrder.clients?.address || selectedOrder.client_address) && (
                <p className="text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4 text-red-400" /> {selectedOrder.clients?.address || selectedOrder.client_address}</p>
              )}
              {selectedOrder.description && <p className="text-gray-400"><strong className="text-white">Serviço:</strong> {selectedOrder.description}</p>}
              <p className="text-gray-400"><strong className="text-white">Status:</strong> <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[selectedOrder.status] || ''}`}>{statusLabels[selectedOrder.status] || selectedOrder.status}</span></p>
              <p className="text-gray-400"><strong className="text-white">Prioridade:</strong> <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityColors[selectedOrder.priority] || ''}`}>{priorityLabels[selectedOrder.priority] || selectedOrder.priority}</span></p>
              {selectedOrder.employees?.name && <p className="text-gray-400"><strong className="text-white">Responsável:</strong> {selectedOrder.employees.name}</p>}
              {selectedOrder.estimated_date && <p className="text-gray-400"><strong className="text-white">Data Prevista:</strong> {format(new Date(selectedOrder.estimated_date), 'dd/MM/yyyy')}</p>}
              <p className="text-gray-400"><strong className="text-white">Valor:</strong> <span className="text-amber-500 font-bold">R$ {(selectedOrder.total_value || 0).toLocaleString('pt-BR')}</span></p>
              {selectedOrder.notes && <p className="text-gray-400"><strong className="text-white">Observações:</strong> {selectedOrder.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111111] border border-white/10 rounded-3xl shadow-xl overflow-x-auto text-white">
        <table className="w-full min-w-[900px]">
          <thead className="bg-[#1a1a1a] border-b border-white/10">
            <tr>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">OS #</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Cliente</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Contato</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Responsável</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Descrição</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Prioridade</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Previsto</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Valor</th>
              <th className="text-left p-4 text-xs font-black text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">#{o.order_number}</td>
                <td className="p-4">
                  <div className="font-bold text-white">{o.clients?.name || o.client_name || '-'}</div>
                  {(o.clients?.address || o.client_address) && (
                    <div className="text-[10px] text-gray-500 leading-tight max-w-[140px] truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
                      {o.clients?.address || o.client_address}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {(o.clients?.phone || o.client_phone) && (
                    <p className="text-sm text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3 text-green-500" /> {o.clients?.phone || o.client_phone}</p>
                  )}
                </td>
                <td className="p-4 text-gray-400 text-sm">{o.employees?.name || <span className="text-gray-600 italic">Não atribuído</span>}</td>
                <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{o.description || '-'}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityColors[o.priority] || ''}`}>{priorityLabels[o.priority] || o.priority}</span></td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[o.status] || ''}`}>{statusLabels[o.status] || o.status}</span></td>
                <td className="p-4 text-xs text-gray-400">
                  {o.estimated_date
                    ? format(new Date(o.estimated_date), 'dd/MM/yyyy')
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="p-4 font-bold text-white">R$ {(o.total_value || 0).toLocaleString('pt-BR')}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedOrder(o)}
                      className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-900/20 transition-all" title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleWhatsAppShare(o)}
                      className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10" title="Mandar texto via WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    {o.pdf_url && (
                      <button onClick={async () => {
                        const phone = o.clients?.phone || o.client_phone;
                        if (!phone) {
                          toast({ title: '⚠️ Cliente sem telefone', variant: 'destructive' });
                          return;
                        }
                        
                        const cleanPhone = phone.replace(/\D/g, '');
                        const target = cleanPhone.length > 11 ? cleanPhone : '55' + cleanPhone;
                        
                        try {
                          toast({ title: '⏳ Enviando PDF...', description: 'Aguarde um momento.' });
                          const { data: conv } = await db.from('whatsapp_conversations').select('id').eq('phone_number', target).maybeSingle();
                          
                          let convId = conv?.id;
                          if (!convId) {
                             const { data: newConv } = await db.from('whatsapp_conversations').insert({ 
                               phone_number: target, 
                               contact_name: o.clients?.name || o.client_name 
                             }).select('id').single();
                             convId = newConv.id;
                          }

                          const res = await supabase.functions.invoke('whatsapp-send', {
                            body: { 
                              conversationId: convId, 
                              message: `Segue o PDF da OS #${o.order_number}: *${o.description}*`,
                              mediaUrl: o.pdf_url,
                              fileName: `OS_${o.order_number}.pdf`
                            }
                          });

                          if (res.error) throw res.error;
                          toast({ title: '✅ PDF Enviado!', description: 'A OS foi enviada para o WhatsApp do cliente.' });
                        } catch (e: any) {
                          toast({ title: '❌ Erro ao enviar', description: e.message, variant: 'destructive' });
                        }
                      }}
                        className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-lg shadow-amber-500/10" title="Enviar PDF p/ WhatsApp">
                        <FileDown className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openForm(o)}
                      className="w-9 h-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 hover:border-amber-500/30 transition-all text-gray-400 hover:text-blue-400" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-gray-500">{loading ? 'Carregando...' : 'Nenhuma OS encontrada'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceOrdersPage;
