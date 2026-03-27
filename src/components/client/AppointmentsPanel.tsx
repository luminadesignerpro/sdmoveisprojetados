import React, { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle, AlertCircle, Loader2, Wrench, Users, Shield, X, User, MapPin, Phone, Calendar as CalendarIcon, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    { value: 'visita_tecnica', label: 'Visita Técnica', icon: Wrench, desc: 'Medição ou instalação' },
    { value: 'reuniao_projeto', label: 'Reunião 3D', icon: Users, desc: 'Ajustes finos no projeto' },
    { value: 'assistencia', label: 'Pós-venda', icon: Shield, desc: 'Garantia ou reparo' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    pendente: { label: 'Pendente', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Clock },
    confirmado: { label: 'Confirmado', color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle },
    cancelado: { label: 'Cancelado', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: AlertCircle },
    concluido: { label: 'Concluído', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: CheckCircle },
};

const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00',
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

    const [type, setType] = useState('visita_tecnica');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [preferredDate, setPreferredDate] = useState<Date | undefined>(undefined);
    const [preferredTime, setPreferredTime] = useState('09:00');
    const [clientNameInput, setClientNameInput] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    useEffect(() => {
        fetchAppointments();
        const channel = supabase
            .channel('appointments-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAppointments())
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
            toast({ title: '⚠️ Campos Obrigatórios', description: 'Por favor, defina o título e a data.', variant: 'destructive' });
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
            toast({ title: '❌ Falha Operacional', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: `✨ Sucesso!`, description: `Agendamento ${editingApt ? 'atualizado' : 'protocolado'} com sucesso.` });
            resetForm();
        }
        setSubmitting(false);
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

    return (
        <div className="p-4 sm:p-8 space-y-8 overflow-auto h-full bg-[#0f0f0f] relative luxury-scroll">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-[100px] rounded-full" />
            </div>

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                   <h2 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-xl">
                            <CalendarIcon className="w-8 h-8 text-black" />
                        </div>
                        Agenda <span className="text-[#D4AF37]">Premium</span>
                    </h2>
                    <p className="text-gray-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Gestão de Tempo e Visitas em Tempo Real</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-8 py-4 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] active:scale-[0.95] transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Solicitar Horário
                </button>
            </header>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <header className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{editingApt ? 'Ajustar' : 'Novo'} Protocolo</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Defina os detalhes técnicos para nosso time</p>
                            </div>
                            <button onClick={resetForm} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                                    <div className="grid gap-3">
                                        {APPOINTMENT_TYPES.map((t) => (
                                            <button
                                                key={t.value}
                                                onClick={() => setType(t.value)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${type === t.value ? 'border-[#D4AF37] bg-amber-500/10 text-white' : 'border-white/5 bg-black/20 text-gray-500 hover:border-white/10'}`}
                                            >
                                                <t.icon className={`w-6 h-6 ${type === t.value ? 'text-[#D4AF37]' : 'text-gray-600'}`} />
                                                <div>
                                                    <p className="font-black text-[10px] uppercase tracking-widest">{t.label}</p>
                                                    <p className="text-[9px] opacity-50 font-bold">{t.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Observações adicionais..."
                                        className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-white text-sm focus:border-[#D4AF37]/50 outline-none transition-all resize-none italic min-h-[140px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título do Evento</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex: Medição Técnica Cozinha"
                                        className="w-full h-14 bg-black/20 border border-white/5 rounded-xl px-4 text-white placeholder:text-gray-700 text-sm focus:border-[#D4AF37]/50 outline-none transition-all italic font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Data</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-14 bg-black/20 border-white/5 rounded-xl px-4 text-white hover:bg-black/40 hover:text-white text-xs font-bold transition-all", !preferredDate && "text-gray-700")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-[#D4AF37]" />
                                                    {preferredDate ? format(preferredDate, "dd/MM/yyyy") : "Selecionar"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-[#111111] border-white/10" align="start">
                                                <Calendar mode="single" selected={preferredDate} onSelect={setPreferredDate} initialFocus locale={ptBR} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Horário</label>
                                        <select
                                            value={preferredTime}
                                            onChange={(e) => setPreferredTime(e.target.value)}
                                            className="w-full h-14 bg-black/20 border border-white/5 rounded-xl px-4 text-white text-sm focus:border-[#D4AF37]/50 outline-none appearance-none cursor-pointer italic font-bold"
                                        >
                                            {TIME_SLOTS.map((slot) => <option key={slot} value={slot} className="bg-[#111111]">{slot}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contato Local</label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full h-14 bg-black/20 border border-white/5 rounded-xl px-4 text-white placeholder:text-gray-700 text-sm focus:border-[#D4AF37]/50 outline-none transition-all italic font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {submitting ? 'PROCESSANDO...' : editingApt ? 'ATUALIZAR PROTOCOLO' : 'SOLICITAR AGENDAMENTO'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" /></div>
            ) : appointments.length === 0 ? (
                <div className="text-center py-24 bg-[#111111] rounded-[3rem] border border-dashed border-white/5 animate-in fade-in duration-700">
                    <CalendarIcon className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                    <p className="text-gray-500 font-black uppercase tracking-[0.2em] italic">Nenhum evento programado</p>
                    <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest mt-2">Clique em solicitar horário para começar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    {appointments.map((apt) => {
                        const statusInfo = STATUS_MAP[apt.status] || STATUS_MAP.pendente;
                        const typeInfo = APPOINTMENT_TYPES.find((t) => t.value === apt.type);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div key={apt.id} className="bg-[#111111] border border-white/5 rounded-[2rem] p-8 hover:border-[#D4AF37]/30 transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full" />
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform duration-500">
                                        {typeInfo ? <typeInfo.icon className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
                                    </div>
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusInfo.color}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <h4 className="font-black text-white text-lg italic tracking-tighter uppercase leading-tight line-clamp-1">{apt.title}</h4>
                                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{typeInfo?.label || apt.type}</p>
                                    
                                    <div className="pt-4 space-y-2">
                                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium italic">
                                            <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
                                            {format(new Date(apt.preferred_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium italic">
                                            <Clock className="w-4 h-4 text-[#D4AF37]" />
                                            {apt.preferred_time}
                                        </div>
                                    </div>
                                </div>

                                {apt.admin_notes && (
                                    <div className="mt-6 p-4 bg-black/50 border border-white/5 rounded-xl italic">
                                        <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1">Nota da Engenharia:</p>
                                        <p className="text-[11px] text-gray-400">{apt.admin_notes}</p>
                                    </div>
                                )}

                                {apt.status === 'pendente' && (
                                    <div className="mt-8 flex gap-3">
                                        <button onClick={() => handleEdit(apt)} className="flex-1 h-11 bg-white/5 border border-white/5 rounded-xl font-black text-[9px] text-gray-500 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">Editar</button>
                                        <button onClick={() => handleCancelApt(apt.id)} className="w-11 h-11 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 transition-colors group/cancel"><X className="w-5 h-5" /></button>
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
