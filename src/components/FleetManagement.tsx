import React, { useState } from 'react';
import {
  Truck, MapPin, Fuel, Calendar, Clock, AlertTriangle,
  CheckCircle, Navigation, Plus, Eye, Wrench, Route,
  Car, Gauge, ArrowRight, Sparkles, User, Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance';
  km: number;
  fuel: number;
  driver: string;
  lastTrip: string;
}

interface Trip {
  id: string;
  vehicle: string;
  driver: string;
  origin: string;
  destination: string;
  date: string;
  kmStart: number;
  kmEnd: number;
  purpose: string;
  status: 'completed' | 'in_progress' | 'scheduled';
}

const VEHICLES: Vehicle[] = [
  { id: '1', plate: 'ABC-1234', model: 'Fiorino Furgão', type: '🚐', status: 'in_use', km: 45230, fuel: 65, driver: 'Carlos Mendes', lastTrip: '23/02/2026' },
  { id: '2', plate: 'DEF-5678', model: 'HR Baú', type: '🚛', status: 'available', km: 78450, fuel: 80, driver: '-', lastTrip: '22/02/2026' },
  { id: '3', plate: 'GHI-9012', model: 'Saveiro CE', type: '🛻', status: 'maintenance', km: 120300, fuel: 30, driver: '-', lastTrip: '20/02/2026' },
  { id: '4', plate: 'JKL-3456', model: 'Sprinter Baú', type: '🚐', status: 'available', km: 35600, fuel: 90, driver: '-', lastTrip: '21/02/2026' },
];

const TRIPS: Trip[] = [
  { id: '1', vehicle: 'ABC-1234', driver: 'Carlos Mendes', origin: 'Fábrica SD', destination: 'Cliente - Ricardo Almeida', date: '23/02/2026', kmStart: 45200, kmEnd: 45230, purpose: 'Instalação cozinha', status: 'in_progress' },
  { id: '2', vehicle: 'DEF-5678', driver: 'Pedro Santos', origin: 'Fábrica SD', destination: 'Fornecedor MDF Plus', date: '22/02/2026', kmStart: 78400, kmEnd: 78450, purpose: 'Buscar material', status: 'completed' },
  { id: '3', vehicle: 'ABC-1234', driver: 'Carlos Mendes', origin: 'Fábrica SD', destination: 'Cliente - Juliana Silva', date: '24/02/2026', kmStart: 0, kmEnd: 0, purpose: 'Entrega + instalação', status: 'scheduled' },
  { id: '4', vehicle: 'GHI-9012', driver: 'João Silva', origin: 'Fábrica SD', destination: 'Loja de Ferragens Central', date: '20/02/2026', kmStart: 120250, kmEnd: 120300, purpose: 'Compra de ferragens', status: 'completed' },
];

interface FleetManagementProps {
  isEmployee?: boolean;
}

const FleetManagement: React.FC<FleetManagementProps> = ({ isEmployee = false }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'trips'>('vehicles');

  const statusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    available: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', label: 'Disponível' },
    in_use: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', label: 'Em Rota' },
    maintenance: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', label: 'Workshop' },
  };

  const tripStatusColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    completed: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', label: 'Concluída' },
    in_progress: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', label: 'Ativa' },
    scheduled: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', label: 'Agendada' },
  };

  if (isEmployee) {
    const myTrips = TRIPS.filter(t => t.driver === 'Carlos Mendes' || t.driver === 'Pedro Santos');
    return (
      <div className="h-full p-4 sm:p-8 overflow-auto bg-[#0f0f0f] relative luxury-scroll">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
        </div>

        <header className="mb-10 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
           <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-xl">
              <Navigation className="w-8 h-8 text-black" />
            </div>
            Minha <span className="text-[#D4AF37]">Rota</span>
          </h1>
          <p className="text-gray-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Logística e Operações de Campo</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 relative z-10">
          <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Missões Mensais</p>
            <p className="text-3xl font-black text-white italic tracking-tighter">12</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Odômetro Acumulado</p>
            <p className="text-3xl font-black text-blue-500 italic tracking-tighter">580 km</p>
          </div>
          <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest mb-1">Próxima Saída</p>
            <p className="text-3xl font-black text-amber-500 italic tracking-tighter">24/02</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-black text-white text-lg flex items-center gap-3 italic uppercase tracking-tighter">
              <Route className="w-5 h-5 text-[#D4AF37]" /> Log de Deslocamentos
            </h3>
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Sincronização GPS Ativa</span>
          </div>
          <div className="p-8 space-y-6">
            {myTrips.map(trip => (
              <div key={trip.id} className="bg-black/30 rounded-[2rem] p-6 border border-white/5 group hover:border-[#D4AF37]/20 transition-all shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <h4 className="font-black text-white text-xl uppercase italic tracking-tighter group-hover:text-[#D4AF37] transition-colors">{trip.purpose}</h4>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">{trip.date} • Placa: {trip.vehicle}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${tripStatusColors[trip.status].bg} ${tripStatusColors[trip.status].border} ${tripStatusColors[trip.status].text}`}>
                    {tripStatusColors[trip.status].label}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-sm">
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-gray-300 font-medium italic">{trip.origin}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-800 rotate-90 sm:rotate-0" />
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-gray-300 font-medium italic">{trip.destination}</span>
                  </div>
                  {trip.kmEnd > 0 && (
                    <div className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl text-blue-500 font-black text-[10px] uppercase tracking-widest">
                       <Gauge className="w-3.5 h-3.5" /> {trip.kmEnd - trip.kmStart} KM Percorridos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 sm:p-8 overflow-auto bg-[#0f0f0f] relative luxury-scroll">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#b8952a] shadow-xl">
              <Truck className="w-8 h-8 text-black" />
            </div>
            Gestão de <span className="text-[#D4AF37]">Frota</span>
          </h1>
          <p className="text-gray-500 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Controle Inteligente de Veículos e Logística</p>
        </div>
        <button className="px-8 py-4 bg-gradient-to-br from-[#D4AF37] to-[#b8952a] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] active:scale-[0.95] transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nova Ordem de Saída
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Unidades Ativas</p>
          <p className="text-3xl font-black text-white italic tracking-tighter">{VEHICLES.length}</p>
        </div>
        <div className="bg-[#111111] border border-green-500/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-green-500/50 font-black uppercase tracking-widest mb-1">Prontos p/ Carga</p>
          <p className="text-3xl font-black text-green-500 italic tracking-tighter">{VEHICLES.filter(v => v.status === 'available').length}</p>
        </div>
        <div className="bg-[#111111] border border-blue-500/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-blue-500/50 font-black uppercase tracking-widest mb-1">Em Trânsito</p>
          <p className="text-3xl font-black text-blue-500 italic tracking-tighter">{VEHICLES.filter(v => v.status === 'in_use').length}</p>
        </div>
        <div className="bg-[#111111] border border-red-500/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-red-500/50 font-black uppercase tracking-widest mb-1">Em Revisão</p>
          <p className="text-3xl font-black text-red-500 italic tracking-tighter">{VEHICLES.filter(v => v.status === 'maintenance').length}</p>
        </div>
      </div>

      <div className="flex p-1 bg-[#111111] border border-white/5 rounded-[2rem] w-fit mb-10 relative z-10 font-black text-[10px] uppercase tracking-widest">
        <button onClick={() => setActiveTab('vehicles')} className={`px-8 py-4 rounded-[1.8rem] transition-all duration-500 flex items-center gap-3 ${activeTab === 'vehicles' ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-white'}`}>
          <Car className="w-4 h-4" /> Frota Local
        </button>
        <button onClick={() => setActiveTab('trips')} className={`px-8 py-4 rounded-[1.8rem] transition-all duration-500 flex items-center gap-3 ${activeTab === 'trips' ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-white'}`}>
          <Route className="w-4 h-4" /> Monitoramento
        </button>
      </div>

      {activeTab === 'vehicles' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {VEHICLES.map(vehicle => (
            <div key={vehicle.id} className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl hover:border-[#D4AF37]/30 transition-all group overflow-hidden">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                  <div className="text-5xl bg-white/5 w-20 h-20 rounded-[1.5rem] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">{vehicle.type}</div>
                  <div>
                    <h4 className="font-black text-white text-2xl italic tracking-tighter uppercase">{vehicle.model}</h4>
                    <p className="text-[10px] text-gray-500 font-mono tracking-[0.3em] font-black uppercase mt-1">{vehicle.plate}</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${statusColors[vehicle.status].bg} ${statusColors[vehicle.status].border} ${statusColors[vehicle.status].text}`}>
                  {statusColors[vehicle.status].label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-center group/stat">
                  <Gauge className="w-5 h-5 text-gray-700 mx-auto mb-2 group-hover/stat:text-blue-500 transition-colors" />
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Odômetro</p>
                  <p className="font-black text-white text-lg italic tracking-tighter">{vehicle.km.toLocaleString()} KM</p>
                </div>
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-center group/stat">
                  <Fuel className="w-5 h-5 text-gray-700 mx-auto mb-2 group-hover/stat:text-amber-500 transition-colors" />
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Nível Tanque</p>
                  <p className={`font-black text-lg italic tracking-tighter ${vehicle.fuel > 50 ? 'text-green-500' : vehicle.fuel > 25 ? 'text-amber-500' : 'text-red-500'}`}>{vehicle.fuel}%</p>
                </div>
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-center group/stat">
                  <Calendar className="w-5 h-5 text-gray-700 mx-auto mb-2 group-hover/stat:text-[#D4AF37] transition-colors" />
                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Último Check</p>
                  <p className="font-black text-white text-lg italic tracking-tighter">{vehicle.lastTrip}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                   </div>
                   <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Condutor: <span className="text-white italic">{vehicle.driver !== '-' ? vehicle.driver : 'Nenhum Alocado'}</span></p>
                </div>
                <button className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest hover:translate-x-2 transition-transform duration-500 flex items-center gap-2">Detalhes Técnicos <ArrowRight className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="overflow-x-auto luxury-scroll">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Serviço / Ordem</th>
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Unidade</th>
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Condutor</th>
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Roteirização</th>
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest">Métrica</th>
                  <th className="text-left p-8 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {TRIPS.map(trip => (
                  <tr key={trip.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-8">
                      <p className="font-black text-white text-lg italic uppercase tracking-tighter group-hover:text-[#D4AF37] transition-colors">{trip.purpose}</p>
                      <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">ID: TRP-{trip.id.padStart(4, '0')}</p>
                    </td>
                    <td className="p-8 font-mono text-gray-500 text-sm tracking-widest font-bold">{trip.vehicle}</td>
                    <td className="p-8">
                       <span className="text-gray-400 font-bold italic text-sm">{trip.driver}</span>
                    </td>
                    <td className="p-8 min-w-[240px]">
                      <div className="flex flex-col gap-2">
                         <span className="flex items-center gap-2 text-xs text-gray-500 italic"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {trip.origin}</span>
                         <span className="flex items-center gap-2 text-xs text-gray-500 italic"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {trip.destination}</span>
                      </div>
                    </td>
                    <td className="p-8">
                       <span className="text-white font-black italic tracking-tighter">{trip.kmEnd > 0 ? `${trip.kmEnd - trip.kmStart} KM` : '—'}</span>
                    </td>
                    <td className="p-8 text-right">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${tripStatusColors[trip.status].bg} ${tripStatusColors[trip.status].border} ${tripStatusColors[trip.status].text}`}>
                        {tripStatusColors[trip.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
