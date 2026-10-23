import React, { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle, AlertCircle, Loader2, Wrench, Users, Shield, X, User, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



interface Appointment {
    id: string;
    type: string;
    title: string;
    description: string | null;
    preferred_date: string;
    preferred_time: string;
    status: string;
    admin_notes: string | null;
    created_at: string;
    client_name: string | null;
    client_address: string | null;
    client_phone: string | null;
}

const APPOINTMENT_TYPES = [
    { value: 'visita_tecnica', label: 'Visita Técnica', icon: Wrench, desc: 'Medição, instalação ou manutenção' },
    { value: 'reuniao_projeto', label: 'Reunião de Projeto', icon: Users, desc: 'Discutir detalhes do projeto' },
    { value: 'assistencia', label: 'Assistência/Pós-venda', icon: Shield, desc: 'Garantia ou reparo' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    pendente: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
    confirmado: { label: 'Confirmado', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: CheckCircle },
    cancelado: { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: AlertCircle },
    concluido: { label: 'Concluído', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', icon: CheckCircle },
};

const TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00',
];

interface AppointmentsPanelProps {
    clientId?: string;
    clientName?: string;
    projectId?: string;
}

const AppointmentsPanel: React.FC<AppointmentsPanelProps> = ({ clientId, clientName, projectId }) => {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingApt, setEditingApt] = useState<Appointment | null>(null);

    // Form state
    const [type, setType] = useState('visita_tecnica');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
    const [preferredTime, setPreferredTime] = useState('09:00');
    const [clientNameInput, setClientNameInput] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    // Fetch appointments
    useEffect(() => {
        fetchAppointments();

        const channel = supabase
            .channel('appointments-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [clientId]);

    const fetchAppointments = async () => {
        setLoading(true);
        let query = supabase.from('appointments').select('*').order('preferred_date', { ascending: true });
        if (clientId) query = query.eq('client_id', clientId);
        const { data, error } = await query;
        if (!error && data) setAppointments(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !preferredDate) {
            toast({ title: '⚠️ Preencha os campos', description: 'Título e data são obrigatórios', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        const dateStr = format(preferredDate, 'yyyy-MM-dd');

        const payload = {
            client_id: clientId || null,
            project_id: projectId || null,
            type,
            title: title.trim(),
            description: description.trim() || null,
            preferred_date: dateStr,
            preferred_time: preferredTime,
            status: editingApt ? editingApt.status : 'pendente',
            client_name: clientNameInput.trim() || clientName || null,
            client_address: clientAddress.trim() || null,
            client_phone: clientPhone.trim() || null,
        };

        const { error } = editingApt 
            ? await supabase.from('appointments').update(payload).eq('id', editingApt.id)
            : await supabase.from('appointments').insert(payload);

        if (error) {
            toast({ title: '❌ Erro ao salvar', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: `✅ Agendamento ${editingApt ? 'atualizado' : 'solicitado'}!`, description: 'Você será notificado quando for confirmado.' });

            if (!editingApt) {
                // Send WhatsApp notification for new appointments
                try {
                    await supabase.functions.invoke('whatsapp-send', {
                        body: {
                            phone: '5500000000000', // Admin phone - placeholder
                            message: `📅 *Novo Agendamento*\n\n👤 Cliente: ${clientName || 'N/A'}\n📋 Tipo: ${APPOINTMENT_TYPES.find(t => t.value === type)?.label}\n📝 ${title}\n📅 Data: ${format(preferredDate, "dd/MM/yyyy", { locale: ptBR })}\n⏰ Horário: ${preferredTime}${description ? `\n\n📄 Obs: ${description}` : ''}`,
                        },
                    });
                } catch (e) {}
            }

            resetForm();
        }
        setSubmitting(false);
    };

    const handleEdit = (apt: Appointment) => {
        setEditingApt(apt);
        setType(apt.type);
        setTitle(apt.title);
        setDescription(apt.description || '');
        setPreferredDate(new Date(apt.preferred_date + 'T12:00:00'));
        setPreferredTime(apt.preferred_time);
        setClientNameInput(apt.client_name || '');
        setClientAddress(apt.client_address || '');
        setClientPhone(apt.client_phone || '');
        setShowForm(true);
    };

    const handleCancelApt = async (id: string) => {
        if (!confirm('Deseja realmente cancelar este agendamento?')) return;
        const { error } = await supabase.from('appointments').update({ status: 'cancelado' }).eq('id', id);
        if (error) toast({ title: '❌ Erro ao cancelar', description: error.message, variant: 'destructive' });
        else toast({ title: '✅ Agendamento cancelado' });
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingApt(null);
        setTitle('');
        setDescription('');
        setPreferredDate(undefined);
        setPreferredTime('09:00');
        setType('visita_tecnica');
        setClientNameInput('');
        setClientAddress('');
        setClientPhone('');
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="p-4 md:p-8 pt-6 md:pt-10 space-y-6 overflow-auto h-full">
            {/* Header - Sticky with glass effect to prevent overlap issues */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4 md:-mx-8 md:px-8 flex items-center justify-between border-b border-border/50 mb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3">
                        <CalendarIcon className="w-7 h-7 text-primary" />
                        Agendamentos
                    </h2>
                    <p className="text-muted-foreground text-[10px] md:text-xs uppercase font-bold tracking-wider mt-1 opacity-70">Sincronização em tempo real</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-black text-xs md:text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95 touch-manipulation"
                >
                    <Plus className="w-4 h-4" />
                    NOVO AGENDAMENTO
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-foreground">{editingApt ? 'Editar' : 'Novo'} Agendamento</h3>
                        <button onClick={resetForm} className="text-muted-foreground hover:text-foreground p-1">
                            <X className="w-5 h-5" />
                        </button>
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-3 mb-5">
                            <label className="text-sm font-semibold text-foreground">Tipo</label>
                            <div className="grid gap-2">
                                {APPOINTMENT_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setType(t.value)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left touch-manipulation ${type === t.value
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                            }`}
                                    >
                                        <t.icon className="w-5 h-5 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm">{t.label}</p>
                                            <p className="text-xs opacity-70">{t.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cliente Info */}
                        <div className="space-y-3 mb-4">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" /> Nome do Cliente *
                            </label>
                            <input
                                type="text"
                                value={clientNameInput}
                                onChange={(e) => setClientNameInput(e.target.value)}
                                placeholder="Nome completo do cliente"
                                className="w-full h-11 bg-background rounded-xl px-4 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-3 mb-4">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4 text-primary" /> Celular
                            </label>
                            <input
                                type="tel"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full h-11 bg-background rounded-xl px-4 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                                maxLength={20}
                            />
                        </div>

                        <div className="space-y-3 mb-4">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" /> Endereço
                            </label>
                            <input
                                type="text"
                                value={clientAddress}
                                onChange={(e) => setClientAddress(e.target.value)}
                                placeholder="Rua, número, bairro, cidade"
                                className="w-full h-11 bg-background rounded-xl px-4 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                                maxLength={200}
                            />
                        </div>

                        {/* Title */}
                        <div className="space-y-2 mb-4">
                            <label className="text-sm font-semibold text-foreground">Título *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Medição da cozinha"
                                className="w-full h-11 bg-background rounded-xl px-4 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                                maxLength={100}
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">Data *</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-11 justify-start text-left font-normal rounded-xl border-border px-4",
                                                !preferredDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {preferredDate ? format(preferredDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={preferredDate}
                                            onSelect={setPreferredDate}
                                            initialFocus
                                            locale={ptBR}
                                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground">Horário</label>
                                <select
                                    value={preferredTime}
                                    onChange={(e) => setPreferredTime(e.target.value)}
                                    className="w-full h-11 bg-background rounded-xl px-3 border border-border text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                                >
                                    {TIME_SLOTS.map((slot) => (
                                        <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 mb-6">
                            <label className="text-sm font-semibold text-foreground">Observações</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalhes adicionais..."
                                rows={3}
                                className="w-full bg-background rounded-xl px-4 py-3 border border-border text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all resize-none"
                                maxLength={500}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 touch-manipulation"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingApt ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {submitting ? 'Salvando...' : editingApt ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                        </button>
                    </div>
                </div>
            )}

            {/* Appointments List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : appointments.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Nenhum agendamento</p>
                    <p className="text-muted-foreground/60 text-sm mt-1">Clique em "Novo Agendamento" para começar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {appointments.map((apt) => {
                        const statusInfo = STATUS_MAP[apt.status] || STATUS_MAP.pendente;
                        const typeInfo = APPOINTMENT_TYPES.find((t) => t.value === apt.type);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div
                                key={apt.id}
                                className="bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            {typeInfo ? <typeInfo.icon className="w-5 h-5 text-primary" /> : <CalendarIcon className="w-5 h-5 text-primary" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-foreground text-sm truncate">{apt.title}</h4>
                                            <p className="text-muted-foreground text-xs mt-0.5">{typeInfo?.label || apt.type}</p>
                                            {(apt.client_name || clientName) && (
                                                <p className="text-xs text-foreground/80 mt-1 flex items-center gap-1">
                                                    <User className="w-3 h-3 text-primary shrink-0" />
                                                    {apt.client_name || clientName}
                                                </p>
                                            )}
                                            {apt.client_phone && (
                                                <p className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-primary shrink-0" />
                                                    {apt.client_phone}
                                                </p>
                                            )}
                                            {apt.client_address && (
                                                <p className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                                                    {apt.client_address}
                                                </p>
                                            )}
                                            {apt.description && (
                                                <p className="text-muted-foreground/70 text-xs mt-1 line-clamp-2">{apt.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusInfo.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusInfo.label}
                                        </span>
                                        {apt.status === 'pendente' && (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEdit(apt)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Editar">
                                                    <Plus className="w-3.5 h-3.5 rotate-45" /> {/* Using Plus rotated as a pencil alternative if Pencil is not available */}
                                                </button>
                                                <button onClick={() => handleCancelApt(apt.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Cancelar">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {format(new Date(apt.preferred_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {apt.preferred_time}
                                    </span>
                                </div>

                                {apt.admin_notes && (
                                    <div className="mt-3 bg-primary/5 border border-primary/10 rounded-lg p-2.5">
                                        <p className="text-xs text-primary font-medium">📝 Resposta da equipe:</p>
                                        <p className="text-xs text-foreground/80 mt-1">{apt.admin_notes}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppointmentsPanel;
