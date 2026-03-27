import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const db = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { Navigation, Play, Square, MapPin, Clock, Route, AlertTriangle, Camera, CheckSquare, Send, X, Image, PackageCheck, Fuel, Terminal, ClipboardList, User, Star, Shield, Zap, Sparkles, ChevronRight, ChevronDown } from 'lucide-react';
import SignaturePad from '@/components/employee/SignaturePad';
import ToolInventory from '@/components/employee/ToolInventory';
import FuelLogForm from '@/components/fleet/FuelLogForm';
import { Geolocation } from '@capacitor/geolocation';
import { gpsTracker, GpsLogEntry } from '@/services/gpsTracker';

interface Trip {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  description: string | null;
  montagem_status: string;
  created_at?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  sort_order: number;
  checklist_type: string;
}

interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

interface ServiceOrder {
  id: string;
  order_number: number;
  description: string | null;
  notes: string | null;
  priority: string;
  status: string;
  estimated_date: string | null;
  completed_at: string | null;
  created_at: string;
  total_value: number | null;
  clients: { name: string; address: string | null } | null;
}

interface DriverTripPanelProps {
  employeeId: string;
  employeeName: string;
}

const DAILY_CHECKLIST = [
  'Conferir ferramentas (nível, parafusadeira, martelo, serras)',
  'Verificar carga de baterias das máquinas',
  'Conferir ferragens e puxadores do dia',
  'Validar se o veículo está abastecido e pneus calibrados',
  'Conferir projeto técnico e especificações',
  'Área de trabalho organizada no início do dia',
  'Uso de EPIs (botinas, luvas, óculos se necessário)',
];

const DELIVERY_CHECKLIST = [
  'Móveis nivelados e frentes alinhadas',
  'Gavetas deslizando suavemente e portas reguladas',
  'Puxadores instalados, firmes e alinhados',
  'Furos de fixação com acabamento (tapa-furo)',
  'Limpeza completa dos móveis (cola, pó e marcas)',
  'Ambiente do cliente limpo e organizado',
  'Explicação de uso e garantia ao cliente',
  'Ferramentas e sobras de material recolhidas',
  'Assinatura Digital do Cliente',
];

export default function DriverTripPanel({ employeeId, employeeName }: DriverTripPanelProps) {
  const { toast } = useToast();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationCount, setLocationCount] = useState(0);
  const [resolvedEmployeeId, setResolvedEmployeeId] = useState(employeeId);

  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [activeServiceOrder, setActiveServiceOrder] = useState<ServiceOrder | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);

  const [dailyChecklist, setDailyChecklist] = useState<ChecklistItem[]>([]);
  const [deliveryChecklist, setDeliveryChecklist] = useState<ChecklistItem[]>([]);
  const [showDailyChecklist, setShowDailyChecklist] = useState(true);
  const [showDeliveryChecklist, setShowDeliveryChecklist] = useState(true);

  const [showSOS, setShowSOS] = useState(false);
  const [sosType, setSosType] = useState('Peça danificada');
  const [sosDesc, setSosDesc] = useState('');
  const [sosSending, setSosSending] = useState(false);

  const [tripPhotos, setTripPhotos] = useState<{ id: string; image_url: string; description: string | null }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFuel, setShowFuel] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [gpsLogs, setGpsLogs] = useState<GpsLogEntry[]>([]);

  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      setGpsLogs([...gpsTracker.getLogs()]);
    }, 2000);
    return () => clearInterval(interval);
  }, [showDebug]);

  const isDeliveryMode = activeTrip?.montagem_status === 'concluida';

  useEffect(() => {
    fetchEmployeeAndTrips();
    fetchVehicles();
    return () => { gpsTracker.setCallback(() => { }); };
  }, [employeeId, employeeName]);

  useEffect(() => {
    if (resolvedEmployeeId) fetchServiceOrders(resolvedEmployeeId);
  }, [resolvedEmployeeId]);

  useEffect(() => {
    if (!resolvedEmployeeId) return;
    const syncInterval = setInterval(() => { void fetchTrips(resolvedEmployeeId, false); }, 15000);
    return () => clearInterval(syncInterval);
  }, [resolvedEmployeeId]);

  useEffect(() => {
    if (activeTrip?.id) {
       Geolocation.requestPermissions().catch(() => {}).finally(() => {
         void gpsTracker.start(activeTrip.id, () => setLocationCount(prev => prev + 1));
       });
       fetchChecklists(activeTrip.id);
       fetchPhotos(activeTrip.id);
    }
  }, [activeTrip?.id]);

  const fetchVehicles = async () => {
    const { data } = await db.from('vehicles').select('id, plate, model').eq('active', true);
    if (data) setVehicles(data);
  };

  const fetchServiceOrders = async (empId: string) => {
    try {
      const { data } = await db.from('service_orders').select('id, order_number, description, notes, priority, status, estimated_date, completed_at, created_at, total_value, clients(name, address)').eq('assigned_to', empId).in('status', ['aberta', 'em_andamento']).order('created_at', { ascending: false }).limit(5);
      if (data && data.length > 0) {
        setServiceOrders(data as ServiceOrder[]);
        const firstOpen = data.find((o: ServiceOrder) => o.status === 'aberta') || data[0];
        setActiveServiceOrder(firstOpen as ServiceOrder);
      } else { setServiceOrders([]); setActiveServiceOrder(null); }
    } catch (err) { console.error('[OS] Error:', err); }
  };

  const fetchEmployeeAndTrips = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    let resolvedId = employeeId;
    if (!resolvedId) {
      const search = employeeName.trim().toLowerCase();
      if (!search) { if (showLoader) setLoading(false); return; }
      const { data: empData } = await db.from('employees').select('id, name, email').eq('active', true).or(`name.ilike.${search},email.ilike.${search}`);
      resolvedId = (empData || []).find((e: any) => e?.name?.toLowerCase() === search || e?.email?.toLowerCase() === search)?.id || empData?.[0]?.id;
      if (!resolvedId) { if (showLoader) setLoading(false); return; }
    }
    await fetchTrips(resolvedId, showLoader);
  };

  const fetchTrips = async (empId: string, finishLoading = true) => {
    const { data: activeTripsData } = await db.from('trips').select('*').eq('employee_id', empId).is('ended_at', null).order('started_at', { ascending: false }).limit(2);
    const latestActive = (activeTripsData?.[0] as Trip | undefined) || null;
    if (latestActive) {
      setActiveTrip(latestActive);
      const { count } = await db.from('trip_locations').select('*', { count: 'exact', head: true }).eq('trip_id', latestActive.id);
      setLocationCount(count || 0);
    } else { setActiveTrip(null); setLocationCount(0); }
    const { data: recent } = await db.from('trips').select('*').eq('employee_id', empId).or('status.eq.completed,ended_at.not.is.null').order('started_at', { ascending: false }).limit(5);
    if (recent) setRecentTrips(recent as Trip[]);
    setResolvedEmployeeId(empId);
    if (finishLoading) setLoading(false);
  };

  const fetchChecklists = async (tripId: string) => {
    const { data } = await db.from('trip_checklists').select('*').eq('trip_id', tripId).order('sort_order');
    const daily = (data || []).filter((c: any) => c.checklist_type === 'daily');
    const delivery = (data || []).filter((c: any) => c.checklist_type === 'delivery');
    if (daily.length > 0) setDailyChecklist(daily);
    else setDailyChecklist(DAILY_CHECKLIST.map((label, i) => ({ id: `temp-daily-${i}`, label, checked: false, sort_order: i, checklist_type: 'daily' })) as any);
    if (delivery.length > 0) setDeliveryChecklist(delivery);
    else setDeliveryChecklist(DELIVERY_CHECKLIST.map((label, i) => ({ id: `temp-del-${i}`, label, checked: false, sort_order: i + 100, checklist_type: 'delivery' })) as any);
  };

  const fetchPhotos = async (tripId: string) => {
    const { data } = await db.from('trip_photos').select('*').eq('trip_id', tripId).order('created_at');
    if (data) {
      setTripPhotos(data);
      const signature = data.find((p: any) => p.description === 'Assinatura do Cliente');
      if (signature) setSignatureUrl(signature.image_url);
    }
  };

  const startTrip = async () => {
    if (!selectedVehicleId) return toast({ title: '⚠️ Selecione um veículo', variant: 'destructive' });
    const finalId = resolvedEmployeeId || employeeId;
    if (!finalId) return toast({ title: '❌ Funcionário não identificado', variant: 'destructive' });

    const osDesc = activeServiceOrder ? `OS #${activeServiceOrder.order_number} — ${activeServiceOrder.clients?.name || 'Cliente'}: ${activeServiceOrder.description || ''}` : null;
    const { data, error } = await db.from('trips').insert({ employee_id: finalId, description: osDesc, vehicle_id: selectedVehicleId, status: 'active' }).select().single();

    if (error) return toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    if (activeServiceOrder) await db.from('service_orders').update({ status: 'em_andamento' }).eq('id', activeServiceOrder.id);

    setActiveTrip(data as Trip);
    setLocationCount(0);
    gpsTracker.start(data.id, () => setLocationCount(prev => prev + 1));
    toast({ title: '🚗 Operação Logística Iniciada!', description: 'GPS monitorando em tempo real.' });
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    gpsTracker.stop();
    const { error } = await db.from('trips').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', activeTrip.id);
    if (error) return toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    if (activeServiceOrder) await db.from('service_orders').update({ status: 'concluida', completed_at: new Date().toISOString() }).eq('id', activeServiceOrder.id);
    toast({ title: '✅ Operação Concluída com Sucesso!' });
    setActiveTrip(null); fetchEmployeeAndTrips();
  };

  const toggleCheckItem = async (item: ChecklistItem) => {
    const newChecked = !item.checked;
    const listSetter = item.checklist_type === 'daily' ? setDailyChecklist : setDeliveryChecklist;
    listSetter(prev => prev.map(c => c.id === item.id ? { ...c, checked: newChecked } : c));
    if (!item.id.startsWith('temp-')) await db.from('trip_checklists').update({ checked: newChecked }).eq('id', item.id);
  };

  if (loading) return (
     <div className="flex flex-col items-center justify-center p-20 bg-[#0a0a0a] min-h-screen">
        <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6" />
        <p className="text-[#D4AF37] font-black uppercase text-[10px] tracking-widest italic">Sincronizando Feed de Campo...</p>
     </div>
  );

  return (
    <div className="space-y-8 p-6 max-w-2xl mx-auto bg-[#0a0a0a] min-h-screen luxury-scroll">
      <header className="bg-[#111111] border border-[#D4AF37]/30 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-in fade-in duration-700">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
               <Navigation className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Terminal do <span className="text-[#D4AF37]">Colaborador</span></h2>
               <p className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] italic flex items-center gap-3">
                  <Shield className="w-3.5 h-3.5" /> ID: {employeeName.toUpperCase()}
               </p>
            </div>
         </div>
      </header>

      {!activeTrip && (
        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom-6 duration-700">
           <header>
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">Preparar <span className="text-[#D4AF37]">Nova Rota</span></h3>
              <p className="text-gray-700 font-black uppercase tracking-widest text-[9px] italic flex items-center gap-2">Selecione o ativo e vincule a ordem de serviço</p>
           </header>

           <div className="space-y-8">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Vetor Logístico (Veículo)</label>
                 <select
                   value={selectedVehicleId}
                   onChange={e => setSelectedVehicleId(e.target.value)}
                   className="w-full h-16 bg-black border border-white/10 rounded-2xl px-6 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer"
                 >
                   <option value="" className="bg-black">SELECIONE O VEÍCULO...</option>
                   {vehicles.map(v => (<option key={v.id} value={v.id} className="bg-black">{v.plate} — {v.model.toUpperCase()}</option>))}
                 </select>
              </div>

              {serviceOrders.length > 0 && (
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ordem de Serviço Proativa</label>
                   <div className="space-y-4">
                      {serviceOrders.map(os => (
                        <button
                          key={os.id}
                          onClick={() => setActiveServiceOrder(os)}
                          className={`w-full p-8 rounded-[2rem] border transition-all text-left relative overflow-hidden group ${activeServiceOrder?.id === os.id ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                        >
                           <div className="flex justify-between items-start mb-4">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 italic">OS #{os.order_number}</span>
                              <div className={`w-3 h-3 rounded-full ${os.priority === 'alta' ? 'bg-red-500 animate-pulse' : 'bg-[#D4AF37]'}`} />
                           </div>
                           <p className="text-lg font-black text-white italic tracking-tighter uppercase leading-tight group-hover:text-[#D4AF37] transition-colors mb-2">{os.clients?.name || 'Cliente de Campo'}</p>
                           <p className="text-[10px] text-gray-700 font-bold italic line-clamp-1">{os.clients?.address || 'Endereço não informado'}</p>
                           {activeServiceOrder?.id === os.id && <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#D4AF37]"><CheckSquare className="w-8 h-8 opacity-20" /></div>}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <button
                onClick={startTrip}
                className="w-full h-24 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center justify-center gap-5"
              >
                <Play className="w-8 h-8" /> EFETIVAR INÍCIO DE ROTA
              </button>
           </div>
        </div>
      )}

      {activeTrip && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
           <div className="bg-[#111111] border border-green-500/30 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full" />
              <div className="flex justify-between items-start mb-10">
                 <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_#22c55e]" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest italic">Rastreamento Ativo</span>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] text-gray-700 font-black uppercase italic tracking-widest mb-1">Status Montagem</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest italic px-4 py-1 rounded-full border ${isDeliveryMode ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                       {isDeliveryMode ? 'MASTER CONCLUÍDO' : 'EM EXECUÇÃO'}
                    </span>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-10">
                 <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] text-center">
                    <Clock className="w-6 h-6 text-gray-700 mx-auto mb-3" />
                    <p className="text-[9px] text-gray-800 font-black uppercase italic mb-1">Início</p>
                    <p className="text-sm font-black text-white italic tabular-nums">{formatTime(activeTrip.started_at)}</p>
                 </div>
                 <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] text-center">
                    <Route className="w-6 h-6 text-gray-700 mx-auto mb-3" />
                    <p className="text-[9px] text-gray-800 font-black uppercase italic mb-1">Voo</p>
                    <p className="text-sm font-black text-white italic tabular-nums">{calcDuration(activeTrip.started_at, null)}</p>
                 </div>
                 <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] text-center">
                    <MapPin className="w-6 h-6 text-gray-700 mx-auto mb-3" />
                    <p className="text-[9px] text-gray-800 font-black uppercase italic mb-1">Sinais</p>
                    <p className="text-sm font-black text-[#D4AF37] italic tabular-nums">{locationCount}</p>
                 </div>
              </div>

              {activeTrip.description && (
                <div className="p-8 bg-black/80 border border-white/5 rounded-[2rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Shield className="w-12 h-12" /></div>
                   <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest italic mb-3">Detalhes Alistados</p>
                   <p className="text-sm text-gray-300 font-medium italic leading-relaxed">{activeTrip.description}</p>
                </div>
              )}
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowFuel(true)} className="h-24 bg-[#111111] border border-[#D4AF37]/20 rounded-3xl flex flex-col items-center justify-center gap-2 group hover:border-[#D4AF37] transition-all">
                 <Fuel className="w-7 h-7 text-[#D4AF37]" />
                 <span className="text-[10px] font-black text-white uppercase italic tracking-widest">ENERGIA</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="h-24 bg-[#111111] border border-blue-500/20 rounded-3xl flex flex-col items-center justify-center gap-2 group hover:border-blue-500 transition-all">
                 <Camera className="w-7 h-7 text-blue-500" />
                 <span className="text-[10px] font-black text-white uppercase italic tracking-widest">SENSOR</span>
              </button>
              <button onClick={() => setShowSOS(true)} className="h-24 bg-[#111111] border border-red-500/20 rounded-3xl flex flex-col items-center justify-center gap-2 group hover:border-red-500 transition-all">
                 <AlertTriangle className="w-7 h-7 text-red-500" />
                 <span className="text-[10px] font-black text-white uppercase italic tracking-widest">ALERTA</span>
              </button>
              <button onClick={isDeliveryMode ? () => setShowSignaturePad(true) : () => setMontagemConcluida()} className={`h-24 bg-[#111111] border rounded-3xl flex flex-col items-center justify-center gap-2 group transition-all ${isDeliveryMode ? 'border-purple-500/20 hover:border-purple-500' : 'border-[#D4AF37]/20 hover:border-[#D4AF37]'}`}>
                 {isDeliveryMode ? <PackageCheck className="w-7 h-7 text-purple-500" /> : <Shield className="w-7 h-7 text-[#D4AF37]" />}
                 <span className="text-[10px] font-black text-white uppercase italic tracking-widest">{isDeliveryMode ? 'ASSINAR' : 'EFETIVAR'}</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
           </div>

           {/* Checklist Sections */}
           <div className="bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <button onClick={() => setShowDailyChecklist(!showDailyChecklist)} className="w-full h-20 px-10 flex items-center justify-between group hover:bg-white/5 transition-all">
                 <div className="flex items-center gap-5">
                    <CheckSquare className="w-6 h-6 text-[#D4AF37]" />
                    <span className="text-sm font-black text-white uppercase italic tracking-widest">Protocolo Diário de Qualidade</span>
                 </div>
                 <ChevronDown className={`w-6 h-6 text-gray-700 transition-transform duration-500 ${showDailyChecklist ? '' : '-rotate-90'}`} />
              </button>
              {showDailyChecklist && (
                <div className="p-10 pt-0 space-y-4 animate-in slide-in-from-top-6 duration-500">
                   {dailyChecklist.map(item => (
                     <button key={item.id} onClick={() => toggleCheckItem(item)} className="w-full flex items-center gap-6 p-6 bg-black/40 border border-white/5 rounded-[1.8rem] transition-all group/check hover:border-[#D4AF37]/30 text-left">
                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${item.checked ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_#D4AF37]' : 'border-white/10 text-transparent'}`}><CheckSquare className="w-5 h-5" /></div>
                        <span className={`text-[11px] font-bold italic transition-colors ${item.checked ? 'text-gray-500' : 'text-white'}`}>{item.label}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>

           <div className="bg-[#111111] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <button onClick={() => setShowDeliveryChecklist(!showDeliveryChecklist)} className="w-full h-20 px-10 flex items-center justify-between group hover:bg-white/5 transition-all">
                 <div className="flex items-center gap-5">
                    <Zap className="w-6 h-6 text-purple-500" />
                    <span className="text-sm font-black text-white uppercase italic tracking-widest">Standard de Entrega Premium</span>
                 </div>
                 <ChevronDown className={`w-6 h-6 text-gray-700 transition-transform duration-500 ${showDeliveryChecklist ? '' : '-rotate-90'}`} />
              </button>
              {showDeliveryChecklist && (
                <div className="p-10 pt-0 space-y-4 animate-in slide-in-from-top-6 duration-500">
                   {deliveryChecklist.map(item => (
                     <button key={item.id} onClick={() => toggleCheckItem(item)} className="w-full flex items-center gap-6 p-6 bg-black/40 border border-white/5 rounded-[1.8rem] transition-all group/check hover:border-purple-500/30 text-left">
                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${item.checked ? 'bg-purple-500 border-purple-500 text-white shadow-[0_0_15px_#a855f7]' : 'border-white/10 text-transparent'}`}><CheckSquare className="w-5 h-5" /></div>
                        <span className={`text-[11px] font-bold italic transition-colors ${item.checked ? 'text-gray-500' : 'text-white'}`}>{item.label}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>

           <button
             onClick={endTrip}
             className="w-full h-24 bg-red-600 hover:bg-red-700 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl italic flex items-center justify-center gap-5"
           >
             <Square className="w-8 h-8 fill-current" /> FINALIZAR OPERAÇÃO DO DIA
           </button>
        </div>
      )}

      {/* Modals with premium styling */}
      {showFuel && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto luxury-scroll relative bg-[#0a0a0a] rounded-[4rem] border border-white/5 p-4 shadow-2xl">
              <button onClick={() => setShowFuel(false)} className="absolute top-10 right-10 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-600 hover:text-white transition-all z-20"><X className="w-6 h-6" /></button>
              <div className="p-8">
                <FuelLogForm employeeId={resolvedEmployeeId} tripId={activeTrip?.id} vehicleId={activeTrip?.vehicle_id} onClose={() => setShowFuel(false)} />
              </div>
           </div>
        </div>
      )}

      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="w-full max-w-2xl bg-[#111111] border border-[#D4AF37]/30 rounded-[4rem] p-12 shadow-2xl relative">
              <button onClick={() => setShowSignaturePad(false)} className="absolute -top-6 -right-6 w-16 h-16 bg-[#D4AF37] text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-20"><X className="w-8 h-8" /></button>
              <header className="mb-10 text-center">
                 <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.5em] italic mb-4">Autenticação Biográfica</p>
                 <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Coleta de Assinatura</h3>
              </header>
              <div className="bg-white rounded-[2rem] p-4 overflow-hidden shadow-inner">
                <SignaturePad onSave={saveSignature} />
              </div>
           </div>
        </div>
      )}

      {showSOS && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="w-full max-w-xl bg-[#111111] border border-red-500/30 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-5">
                  <div className="w-12 h-12 rounded-[18px] bg-red-600 text-white flex items-center justify-center shadow-lg animate-pulse"><AlertTriangle className="w-7 h-7 fill-current" /></div>
                  Relatório de Crise
                </h3>
                <button onClick={() => setShowSOS(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-600 hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Natureza da Ocorrência</label>
                  <select
                    value={sosType}
                    onChange={e => setSosType(e.target.value)}
                    className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-[10px] font-black italic tracking-widest outline-none focus:border-red-500/40 transition-all appearance-none cursor-pointer"
                  >
                    <option className="bg-black">PEÇA DANIFICADA</option>
                    <option className="bg-black">ATRASO LOGÍSTICO</option>
                    <option className="bg-black">PENDÊNCIA TÉCNICA</option>
                    <option className="bg-black">SINISTRO VEICULAR</option>
                    <option className="bg-black">OUTROS</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Memorial Descritivo</label>
                  <textarea
                    value={sosDesc}
                    onChange={e => setSosDesc(e.target.value)}
                    placeholder="DESCREVA DETALHADAMENTE A SITUAÇÃO PARA O COMANDO CENTRAL..."
                    className="w-full h-40 bg-black border border-white/5 rounded-3xl p-6 text-white text-xs font-medium italic outline-none focus:border-red-500/40 transition-all shadow-inner uppercase resize-none"
                  />
                </div>

                <button
                  onClick={sendSOS}
                  disabled={sosSending || !sosDesc.trim()}
                  className="w-full h-20 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic mt-6 flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {sosSending ? 'PROCESSANDO...' : 'TRANSMITIR ALERTA'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
