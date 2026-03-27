import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Fuel, TrendingUp, Droplets, AlertTriangle, CheckCircle, Shield, Zap, ArrowRight, Sparkles, Navigation } from 'lucide-react';

const db = supabase as any;

interface FuelLog {
  id: string;
  employee_id: string;
  vehicle_id: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer: number | null;
  notes: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
}

interface TripWithLocations {
  id: string;
  employee_id: string;
  started_at: string;
  ended_at: string | null;
  gpsKm: number;
  odometer: number | null;
  estimatedKm: number;
  desvio: number;
}

const SEDE_LAT = -3.7389;
const SEDE_LON = -38.5897;
const ESTIMATED_ROUTE_KM = 62.8;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FuelAdminPanel() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trips, setTrips] = useState<TripWithLocations[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [logsRes, empRes, tripsRes] = await Promise.all([
      db.from('fuel_logs').select('*').order('created_at', { ascending: false }),
      db.from('employees').select('id, name').eq('active', true),
      db.from('trips').select('*').eq('status', 'completed').order('ended_at', { ascending: false }).limit(50),
    ]);

    if (empRes.data) setEmployees(empRes.data);
    if (logsRes.data) setLogs(logsRes.data);

    if (tripsRes.data) {
      const tripIds = tripsRes.data.map((t: any) => t.id);
      const { data: allLocs } = await db.from('trip_locations').select('*').in('trip_id', tripIds).order('recorded_at', { ascending: true });
      const locsByTrip = (allLocs || []).reduce((acc: any, loc: any) => {
        if (!acc[loc.trip_id]) acc[loc.trip_id] = [];
        acc[loc.trip_id].push(loc);
        return acc;
      }, {});

      const enriched = tripsRes.data.map((trip: any) => {
        const locs = locsByTrip[trip.id] || [];
        let gpsKm = 0;
        for (let i = 1; i < locs.length; i++) {
          gpsKm += haversineDistance(locs[i - 1].latitude, locs[i - 1].longitude, locs[i].latitude, locs[i].longitude);
        }
        const desvio = ESTIMATED_ROUTE_KM > 0 ? ((gpsKm - ESTIMATED_ROUTE_KM) / ESTIMATED_ROUTE_KM) * 100 : 0;
        return { ...trip, gpsKm, estimatedKm: ESTIMATED_ROUTE_KM, desvio, odometer: null };
      });
      setTrips(enriched);
    }
    setLoading(false);
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || '—';
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.employee_id === filter);
  const totalGasto = filteredLogs.reduce((s, l) => s + Number(l.total_cost), 0);
  const totalLitros = filteredLogs.reduce((s, l) => s + Number(l.liters), 0);

  const sortedLogs = [...filteredLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let avgKmL = 0;
  if (sortedLogs.length >= 2) {
    const first = sortedLogs[0];
    const last = sortedLogs[sortedLogs.length - 1];
    if (first.odometer && last.odometer) {
      const kmDriven = Number(last.odometer) - Number(first.odometer);
      const litersUsed = sortedLogs.slice(1).reduce((s, l) => s + Number(l.liters), 0);
      if (litersUsed > 0) avgKmL = kmDriven / litersUsed;
    }
  }

  const alerts = trips.filter(t => t.desvio > 15).length;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-4 uppercase leading-none">
            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
              <Fuel className="w-6 h-6" />
            </div>
            Inteligência de <span className="text-[#D4AF37]">Abastecimento</span>
          </h2>
          <p className="text-gray-700 mt-2 font-black uppercase tracking-widest text-[9px] italic flex items-center gap-2">
            <Shield className="w-3 h-3" /> Monitoramento Analítico de Consumo de Energia
          </p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer italic shadow-2xl"
        >
          <option value="all" className="bg-[#0a0a0a]">FILTRAR TODOS MOTORISTAS</option>
          {employees.map(e => (<option key={e.id} value={e.id} className="bg-[#0a0a0a]">{e.name.toUpperCase()}</option>))}
        </select>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111111] border border-red-500/10 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-red-500/60 font-black uppercase tracking-widest mb-6 italic">Investimento Total</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#111111] border border-blue-500/10 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest mb-6 italic">Litros Adquiridos</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">{totalLitros.toFixed(1)} <span className="text-sm">L</span></p>
        </div>
        <div className="bg-[#111111] border border-[#D4AF37]/10 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-[#D4AF37]/60 font-black uppercase tracking-widest mb-6 italic">Eficiência KM/L</p>
          <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">{avgKmL > 0 ? avgKmL.toFixed(1) : '—'}</p>
        </div>
        <div className="bg-[#111111] border border-green-500/10 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-green-500/60 font-black uppercase tracking-widest mb-6 italic">Incidências / Desvios</p>
          <div className="flex items-center gap-4">
             <p className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none">{alerts}</p>
             <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-500" />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4 italic leading-none shadow-sm">
            <TrendingUp className="w-6 h-6 text-[#D4AF37]" /> Log de Transações Financeiras
          </h3>
          <div className="luxury-scroll max-h-[500px] overflow-auto pr-6 space-y-4">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-[2rem] group/item hover:border-[#D4AF37]/30 transition-all duration-500">
                <div className="flex items-center gap-6">
                  <div className="text-left font-black italic tracking-tighter">
                     <p className="text-white uppercase text-lg group-hover/item:text-[#D4AF37] transition-colors">{getEmployeeName(log.employee_id)}</p>
                     <p className="text-[10px] text-gray-700 tracking-widest">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-10 text-right">
                   <div>
                      <p className="text-[9px] text-gray-700 font-bold uppercase italic tracking-widest">Consumo</p>
                      <p className="text-white font-black italic text-md tabular-nums">{Number(log.liters).toFixed(1)} L</p>
                   </div>
                   <div className="min-w-[120px]">
                      <p className="text-[9px] text-gray-700 font-bold uppercase italic tracking-widest">Vlr Total</p>
                      <p className="text-[#D4AF37] font-black italic text-xl tabular-nums leading-none">R$ {Number(log.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <Fuel className="w-16 h-16 mx-auto mb-6 text-gray-700" />
                <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Sem Registros Ativos</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-4 flex items-center gap-4 italic leading-none">
            <Navigation className="w-6 h-6 text-blue-500" /> Real vs Direcionamento Analítico
          </h3>
          <p className="text-gray-700 text-[10px] font-bold uppercase tracking-tight italic mb-10 max-w-sm">
             Alerta de integridade operacional ativado para desvios superiores a 15% do vetor estimado.
          </p>
          <div className="luxury-scroll max-h-[500px] overflow-auto pr-6 space-y-4">
            {trips.map(trip => (
              <div key={trip.id} className="flex flex-col p-6 bg-black/40 border border-white/5 rounded-[2.5rem] group/item hover:border-blue-500/30 transition-all duration-500">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-lg font-black text-white italic tracking-tighter uppercase leading-none group-hover/item:text-blue-500 transition-colors">{getEmployeeName(trip.employee_id)}</p>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic border ${trip.desvio > 15 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                    {trip.desvio > 0 ? '+' : ''}{trip.desvio.toFixed(0)}% VARIAÇÃO
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
                   <div>
                      <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest italic mb-1">Trajeto GPS</p>
                      <p className="text-white font-black italic text-md tabular-nums">{trip.gpsKm.toFixed(1)} km</p>
                   </div>
                   <div>
                      <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest italic mb-1">Estimativa</p>
                      <p className="text-gray-500 font-black italic text-md tabular-nums">{trip.estimatedKm.toFixed(1)} km</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] text-gray-800 font-black uppercase tracking-widest italic mb-1">Data Log</p>
                      <p className="text-gray-500 font-black italic text-[11px] tabular-nums">{new Date(trip.started_at).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
              </div>
            ))}
            {trips.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <Route className="w-16 h-16 mx-auto mb-6 text-gray-700" />
                <p className="font-black uppercase tracking-[0.5em] text-[10px] italic">Sem Malha Rodoviária Logada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
