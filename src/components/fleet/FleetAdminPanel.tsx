import React, { useState, useEffect, Suspense, useRef } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const db = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation, Route, Clock, Users, Eye, Fuel, Car, Plus, Pencil, ToggleLeft, ToggleRight, X, Save, RefreshCw, Shield, Zap, TrendingUp } from 'lucide-react';
import FleetMap from './FleetMap';
import FuelAdminPanel from './FuelAdminPanel';

interface Employee {
  id: string;
  name: string;
  role: string | null;
}

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: string | null;
  year: number | null;
  active: boolean;
}

interface Trip {
  id: string;
  employee_id: string;
  vehicle_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  description: string | null;
}

interface TripLocation {
  id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
}

const VEHICLE_TYPES = ['Carro', 'Van', 'Caminhão', 'Moto', 'Utilitário', 'Outro'];

const emptyVehicle = { plate: '', model: '', type: 'Carro', year: new Date().getFullYear() };

export default function FleetAdminPanel() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripLocations, setTripLocations] = useState<TripLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<'live' | 'history' | 'fuel' | 'vehicles'>('live');
  const [loading, setLoading] = useState(true);
  const [tripPointCounts, setTripPointCounts] = useState<Record<string, number>>({});

  const activeTripsRef = useRef<Trip[]>([]);
  const completedTripsRef = useRef<Trip[]>([]);
  const selectedTripIdRef = useRef<string | null>(null);
  const tabRef = useRef<string>('live');
  const liveSyncInProgressRef = useRef(false);

  useEffect(() => { activeTripsRef.current = activeTrips; }, [activeTrips]);
  useEffect(() => { completedTripsRef.current = completedTrips; }, [completedTrips]);
  useEffect(() => { selectedTripIdRef.current = selectedTripId; }, [selectedTripId]);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const mergeLocations = (previous: TripLocation[], incoming: TripLocation[]) => {
    const uniqueById = new Map<string, TripLocation>();
    [...previous, ...incoming].forEach((loc) => uniqueById.set(loc.id, loc));
    return Array.from(uniqueById.values()).sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  };

  const fetchData = async () => {
    setLoading(true);
    const [empRes, activeRes, completedRes, vehRes] = await Promise.all([
      db.from('employees').select('id, name, role').eq('active', true),
      db.from('trips').select('*').or('status.eq.active,ended_at.is.null').order('started_at', { ascending: false }),
      db.from('trips').select('*').or('status.eq.completed,ended_at.not.is.null').order('ended_at', { ascending: false }).limit(50),
      db.from('vehicles').select('id, plate, model, year, active').order('model'),
    ]);

    if (empRes.data) setEmployees(empRes.data);
    if (activeRes.data) {
      const nextActive = activeRes.data as Trip[];
      setActiveTrips(nextActive);
      activeTripsRef.current = nextActive;
      if (nextActive.length === 0 && tabRef.current === 'live') setTripLocations([]);
    }
    if (completedRes.data) {
      const nextCompleted = completedRes.data as Trip[];
      setCompletedTrips(nextCompleted);
      completedTripsRef.current = nextCompleted;
    }
    if (vehRes.data) setVehicles(vehRes.data);
    setLoading(false);
  };

  const fetchActiveTrips = async () => {
    const { data } = await db.from('trips').select('*').or('status.eq.active,ended_at.is.null').order('started_at', { ascending: false });
    const nextActiveTrips = (data || []) as Trip[];
    setActiveTrips(nextActiveTrips);
    activeTripsRef.current = nextActiveTrips;
    if (nextActiveTrips.length === 0 && tabRef.current === 'live') setTripLocations([]);
    return nextActiveTrips;
  };

  const fetchCompletedTrips = async () => {
    const { data } = await db.from('trips').select('*').or('status.eq.completed,ended_at.not.is.null').order('ended_at', { ascending: false }).limit(50);
    const nextCompletedTrips = (data || []) as Trip[];
    setCompletedTrips(nextCompletedTrips);
    completedTripsRef.current = nextCompletedTrips;
    return nextCompletedTrips;
  };

  const fetchTripLocationsByTripId = async (tripId: string) => {
    const { data } = await db.from('trip_locations').select('*').eq('trip_id', tripId).order('recorded_at', { ascending: true });
    if (data) setTripLocations(data as TripLocation[]);
  };

  const fetchActiveLocations = async (tripIdsParam?: string[]) => {
    const tripIds = tripIdsParam ?? (activeTripsRef.current.length > 0 ? activeTripsRef.current.map((t) => t.id) : activeTrips.map((t) => t.id));
    if (tripIds.length === 0) { setTripLocations([]); return; }
    const { data } = await db.from('trip_locations').select('*').in('trip_id', tripIds).order('recorded_at', { ascending: true });
    if (data) setTripLocations(data as TripLocation[]);
  };

  useEffect(() => {
    fetchData();
    const channel = db.channel('fleet-tracking')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_locations' }, (payload: any) => {
        const newLoc = payload.new as TripLocation;
        const curRelevant = selectedTripIdRef.current === newLoc.trip_id || (tabRef.current === 'live' && activeTripsRef.current.some((t) => t.id === newLoc.trip_id));
        if (curRelevant) setTripLocations((prev) => mergeLocations(prev, [newLoc]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async () => {
        const [latestActive, latestCompleted] = await Promise.all([fetchActiveTrips(), fetchCompletedTrips()]);
        if (tabRef.current === 'live') {
          if (selectedTripIdRef.current) await fetchTripLocationsByTripId(selectedTripIdRef.current);
          else await fetchActiveLocations(latestActive.map((t) => t.id));
        }
      })
      .subscribe();

    const poll = setInterval(async () => {
      if (liveSyncInProgressRef.current) return;
      liveSyncInProgressRef.current = true;
      try {
        const [latestActive] = await Promise.all([fetchActiveTrips(), fetchCompletedTrips()]);
        if (tabRef.current === 'live') {
          if (selectedTripIdRef.current) await fetchTripLocationsByTripId(selectedTripIdRef.current);
          else await fetchActiveLocations(latestActive.map((t) => t.id));
        }
      } finally { liveSyncInProgressRef.current = false; }
    }, 15000);

    return () => { db.removeChannel(channel); clearInterval(poll); };
  }, []);

  const fetchTripPointCounts = async (tripIds: string[]) => {
    if (tripIds.length === 0) return;
    const counts: Record<string, number> = {};
    for (const id of tripIds) {
      const { count } = await db.from('trip_locations').select('*', { count: 'exact', head: true }).eq('trip_id', id);
      counts[id] = count || 0;
    }
    setTripPointCounts(prev => ({ ...prev, ...counts }));
  };

  useEffect(() => {
    if (tab === 'history' && !selectedTripId && completedTrips.length > 0) {
      setSelectedTripId(completedTrips[0].id);
      fetchTripLocationsByTripId(completedTrips[0].id);
      fetchTripPointCounts(completedTrips.map(t => t.id));
    }
  }, [completedTrips, tab]);

  const viewTripRoute = async (tripId: string) => { setSelectedTripId(tripId); await fetchTripLocationsByTripId(tripId); };

  const saveVehicle = async () => {
    if (!vehicleForm.plate.trim() || !vehicleForm.model.trim()) return toast({ title: '⚠️ Preencha placa e modelo', variant: 'destructive' });
    setSavingVehicle(true);
    const payload = { plate: vehicleForm.plate.trim().toUpperCase(), model: vehicleForm.model.trim(), year: vehicleForm.year ? Number(vehicleForm.year) : null, type: vehicleForm.type };
    const { error } = editingVehicle ? await db.from('vehicles').update(payload).eq('id', editingVehicle.id) : await db.from('vehicles').insert({ ...payload, active: true });
    if (error) toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: '✅ Sucesso!' }); setShowVehicleForm(false); fetchData(); }
    setSavingVehicle(false);
  };

  const getEmployeeName = (empId: string) => employees.find(e => e.id === empId)?.name || 'N/A';
  const getVehiclePlate = (vehId: string | null) => { if (!vehId) return null; const v = vehicles.find(v => v.id === vehId); return v ? `${v.plate} — ${v.model}` : null; };
  const formatTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const calcDuration = (start: string, end: string | null) => {
    const s = new Date(start).getTime(); const e = end ? new Date(end).getTime() : Date.now();
    const mins = Math.round((e - s) / 60000); if (mins < 60) return `${mins}m`; return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] gap-6">
      <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
      <p className="text-[#D4AF37] font-black uppercase tracking-[0.5em] text-[10px] italic">Iniciando Sistemas de Rastreamento...</p>
    </div>
  );

  return (
    <div className="p-8 sm:p-12 space-y-12 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col rounded-[3.5rem] border border-white/5">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10 animate-in fade-in slide-in-from-top-6 duration-700">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter flex items-center gap-5 uppercase leading-none">
            <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] rounded-[22px] flex items-center justify-center text-black shadow-2xl">
              <Navigation className="w-8 h-8" />
            </div>
            Gestão <span className="text-[#D4AF37]">Logística</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-[#D4AF37]" /> Monitoramento de Frota SD Intelligence em Tempo Real
          </p>
        </div>
        <div className="flex items-center gap-4 bg-[#111111] border border-white/5 p-6 rounded-[2rem] shadow-2xl group overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4AF37]/5 blur-2xl rounded-full" />
           <div className="text-right">
              <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest italic leading-none mb-2">Monitorando Agora</p>
              <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">{activeTrips.length} <span className="text-xs text-[#D4AF37]">UNID</span></p>
           </div>
           <Zap className="w-8 h-8 text-[#D4AF37] opacity-20 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" />
        </div>
      </header>

      <nav className="flex flex-wrap gap-3 p-1.5 bg-[#111111] border border-white/5 rounded-[2.2rem] w-fit relative z-10 shadow-2xl">
        {[
          { id: 'live', icon: MapPin, label: 'TEMPO REAL' },
          { id: 'history', icon: Route, label: 'HISTÓRICO' },
          { id: 'fuel', icon: Fuel, label: 'OPERACIONAL' },
          { id: 'vehicles', icon: Car, label: 'ATIVOS' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as any); if (t.id === 'live') fetchActiveLocations(); }}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-500 italic ${
              tab === t.id ? 'bg-[#D4AF37] text-black shadow-xl scale-105 active:scale-95' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchData}
          className="ml-4 px-6 py-4 flex items-center gap-3 text-gray-700 hover:text-[#D4AF37] transition-all bg-black/40 rounded-full border border-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest italic">{loading ? 'SYNCING...' : 'FORCE SYNC'}</span>
        </button>
      </nav>

      {tab !== 'fuel' && tab !== 'vehicles' && (
        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 group" style={{ height: '600px' }}>
          <div className="absolute top-8 left-8 z-10 flex items-center gap-4 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl italic">
             <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_15px_#D4AF37]" />
             <p className="text-[10px] text-white font-black uppercase tracking-widest">Master Telemetry Feed Live</p>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Navigation className="w-12 h-12 text-[#D4AF37] animate-spin opacity-20" /></div>}>
            <FleetMap locations={tripLocations} />
          </Suspense>
        </div>
      )}

      {tab === 'live' && (
        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative z-10 group animate-in slide-in-from-bottom-6 duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-4 italic leading-none">
            <Users className="w-6 h-6 text-[#D4AF37]" /> Motoristas em Operação Crítica
          </h3>
          <div className="space-y-4 luxury-scroll max-h-[500px] overflow-auto pr-4">
            {activeTrips.map(trip => {
              const lastLoc = tripLocations.filter(l => l.trip_id === trip.id).sort((a,b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
              return (
                <div key={trip.id} className="flex flex-col md:flex-row items-center justify-between p-8 bg-black/40 border border-white/5 rounded-[2.5rem] group/item hover:border-[#D4AF37]/30 transition-all duration-500 gap-6">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <User className="w-8 h-8 text-gray-700 group-hover/item:text-white transition-colors" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-black animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xl font-black text-white italic tracking-tighter uppercase leading-none mb-3 group-hover/item:text-[#D4AF37] transition-colors">{getEmployeeName(trip.employee_id)}</p>
                      <div className="flex flex-wrap items-center gap-5">
                         <div className="bg-[#D4AF37]/10 px-4 py-1.5 rounded-lg border border-[#D4AF37]/20 flex items-center gap-2">
                           <Car className="w-3 h-3 text-[#D4AF37]" />
                           <span className="text-[10px] text-white font-black italic">{getVehiclePlate(trip.vehicle_id) || 'NÃO ATRIBUÍDO'}</span>
                         </div>
                         <div className="flex items-center gap-2 text-gray-600 italic font-black text-[10px] tracking-widest">
                            <Clock className="w-3 h-3" /> {formatTime(trip.started_at)} • {calcDuration(trip.started_at, null)}
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    {lastLoc && (
                      <div className="text-right">
                         <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest italic mb-1">Última Transmissão</p>
                         <p className="text-xs text-gray-400 font-black italic tracking-tight">{formatTime(lastLoc.recorded_at)}</p>
                      </div>
                    )}
                    <button
                      onClick={() => viewTripRoute(trip.id)}
                      className="px-8 h-12 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-black transition-all flex items-center gap-3 shadow-2xl italic group/btn"
                    >
                      <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-125" /> FOCUS ROTA
                    </button>
                  </div>
                </div>
              );
            })}
            {activeTrips.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <Navigation className="w-20 h-20 mx-auto mb-8 text-gray-700" />
                <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Base Estática: Sem Movimentações</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative z-10 group animate-in slide-in-from-bottom-6 duration-700">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-4 italic leading-none">
            <Clock className="w-6 h-6 text-amber-500" /> Logs de Atividades Concluídas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 luxury-scroll max-h-[600px] overflow-auto pr-6">
            {completedTrips.map(trip => (
              <button
                key={trip.id}
                onClick={() => viewTripRoute(trip.id)}
                className={`flex flex-col p-8 rounded-[2.5rem] border transition-all text-left group/item relative overflow-hidden ${
                  selectedTripId === trip.id ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30 shadow-[0_0_50px_rgba(212,175,55,0.05)]' : 'bg-black/30 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${selectedTripId === trip.id ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-gray-800'}`}>
                      <MapPin className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] text-gray-700 font-black uppercase mb-1 tracking-widest italic">Pontos GPS</p>
                      <p className="text-lg font-black text-white italic tracking-tighter tabular-nums leading-none">{tripPointCounts[trip.id] ?? '—'}</p>
                   </div>
                </div>
                <div className="space-y-4 mb-8">
                   <p className="text-lg font-black text-white italic tracking-tighter uppercase leading-tight group-hover/item:text-[#D4AF37] transition-colors">{getEmployeeName(trip.employee_id)}</p>
                   <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest italic line-clamp-1">{getVehiclePlate(trip.vehicle_id) || 'SEM VEÍCULO'}</p>
                </div>
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] text-gray-500 italic font-medium uppercase">
                      <Clock className="w-3.5 h-3.5 opacity-40" /> {calcDuration(trip.started_at, trip.ended_at)}
                   </div>
                   <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest italic">{formatTime(trip.started_at)}</span>
                </div>
                {selectedTripId === trip.id && <div className="absolute bottom-0 left-0 h-1 bg-[#D4AF37] w-full" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'fuel' && (
        <Suspense fallback={<div className="flex items-center justify-center py-24"><Fuel className="w-12 h-12 text-[#D4AF37] animate-spin opacity-20" /></div>}>
          <FuelAdminPanel />
        </Suspense>
      )}

      {tab === 'vehicles' && (
        <div className="space-y-10 relative z-10 animate-in slide-in-from-bottom-6 duration-700">
           <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 blur-[100px] rounded-full" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-12">
                 <div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                       <Car className="w-8 h-8 text-[#D4AF37]" /> Ativos da Corporação
                    </h3>
                    <p className="text-gray-700 font-black uppercase tracking-widest text-[10px] mt-2 italic flex items-center gap-2">
                       <Shield className="w-3 h-3" /> {filteredVehicles.length} UNIDADES EM ESTADO {showInactive ? 'TOTAL' : 'ATIVO'}
                    </p>
                 </div>
                 <div className="flex items-center gap-6">
                    <button
                      onClick={() => setShowInactive(!showInactive)}
                      className="text-[10px] text-gray-600 font-black uppercase tracking-widest hover:text-[#D4AF37] transition-all flex items-center gap-3 italic"
                    >
                      {showInactive ? <Zap className="w-4 h-4 text-[#D4AF37]" /> : <Clock className="w-4 h-4" />}
                      {showInactive ? 'FILTRAR DISPONÍVEIS' : 'MOSTRAR OBSOLETOS'}
                    </button>
                    <button
                      onClick={() => { setEditingVehicle(null); setVehicleForm(emptyVehicle); setShowVehicleForm(true); }}
                      className="px-8 h-16 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl italic flex items-center gap-3"
                    >
                      <Plus className="w-5 h-5" /> EXPANDIR FROTA
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map(v => (
                  <div key={v.id} className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group/item ${v.active ? 'bg-black/30 border-white/5 hover:border-[#D4AF37]/30' : 'bg-red-500/5 border-red-500/10 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-8">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${v.active ? 'bg-white/5 border border-white/5 text-gray-700 group-hover/item:text-[#D4AF37]' : 'bg-red-500/10 text-red-500'}`}>
                          <Car className="w-7 h-7" />
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => { setEditingVehicle(v); setVehicleForm({ plate: v.plate, model: v.model, type: v.type || 'Carro', year: v.year || 2024 }); setShowVehicleForm(true); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-600 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => {
                            const { error } = db.from('vehicles').update({ active: !v.active }).eq('id', v.id);
                            fetchData();
                          }} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${v.active ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                             {v.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                       </div>
                    </div>
                    <div className="space-y-2 mb-8">
                       <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">{v.model}</h4>
                       <span className="inline-block px-3 py-1 bg-black rounded-lg border border-white/10 text-[#D4AF37] font-black text-[10px] tracking-widest tabular-nums">{v.plate}</span>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-white/5 font-black uppercase text-[10px] italic tracking-widest text-gray-700">
                       <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> {v.type}</span>
                       <span>MOD {v.year}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {showVehicleForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-[#111111] border border-white/10 rounded-[3.5rem] w-full max-w-xl p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-5">
                <div className="w-12 h-12 rounded-[18px] bg-white text-black flex items-center justify-center"><Car className="w-7 h-7" /></div>
                {editingVehicle ? 'Ajustar Ativo' : 'Novo Alistamento'}
              </h3>
              <button onClick={() => setShowVehicleForm(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-600 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Placa Identificadora</label>
                <input
                  type="text"
                  value={vehicleForm.plate}
                  onChange={e => setVehicleForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))}
                  placeholder="BRA2E19"
                  className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-lg font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Modelo e Marca</label>
                <input
                  type="text"
                  value={vehicleForm.model}
                  onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value.toUpperCase() }))}
                  placeholder="EX: TOYOTA HILUX BLACK EDITION"
                  className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Vetor</label>
                  <select
                    value={vehicleForm.type}
                    onChange={e => setVehicleForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer"
                  >
                    {VEHICLE_TYPES.map(t => <option key={t} className="bg-black">{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ano Fabricação</label>
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={e => setVehicleForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full h-16 bg-black border border-white/5 rounded-2xl px-6 text-white text-sm font-black italic outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                onClick={saveVehicle}
                disabled={savingVehicle}
                className="w-full h-20 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-2xl italic mt-6 flex items-center justify-center gap-4"
              >
                <Save className="w-6 h-6" />
                {savingVehicle ? 'PROCESSANDO...' : editingVehicle ? 'CONFIRMAR ATUALIZAÇÃO' : 'EFETIVAR CADASTRO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
