import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Square, History, User, Calendar, MapPin, Zap, Shield, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as any;

const TimeTrackingPanel: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await db.from('time_logs').select('*, profiles(full_name)').order('start_time', { ascending: false }).limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="p-8 sm:p-12 space-y-10 overflow-auto h-full bg-[#0a0a0a] relative luxury-scroll flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 relative z-10">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[22px] flex items-center justify-center text-white shadow-2xl">
              <Clock className="w-8 h-8" />
            </div>
            Gestão de <span className="text-blue-500">Ponto</span>
          </h1>
          <p className="text-gray-500 mt-4 font-medium italic flex items-center gap-3">
             <Shield className="w-4 h-4 text-blue-500" /> Controle Jornada e Produtividade em Tempo Real
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-3 italic">Colaboradores Ativos</p>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">12 <span className="text-xs text-blue-500">ONLINE</span></p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-3 italic">Horas Médias / Dia</p>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">7.8 <span className="text-xs text-indigo-500">H</span></p>
        </div>
        <div className="bg-[#111111] border border-blue-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mb-3 italic">Alertas de Excesso</p>
          <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">0 <span className="text-xs text-green-500">OK</span></p>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/5 rounded-[4rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="overflow-x-auto luxury-scroll">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/60 border-b border-white/5">
              <tr>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Colaborador</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Entrada / Saída</th>
                <th className="text-left p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Duração</th>
                <th className="text-center p-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(log => (
                <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-blue-500 border border-white/5 group-hover:border-blue-500/30 transition-all">
                        <User className="w-6 h-6" />
                      </div>
                      <p className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{log.profiles?.full_name || 'Equipe SD'}</p>
                    </div>
                  </td>
                  <td className="p-10">
                    <div className="space-y-2">
                       <p className="text-sm text-white italic font-bold tabular-nums flex items-center gap-3">
                         <Play className="w-4 h-4 text-green-500" /> {format(new Date(log.start_time), 'HH:mm')}
                       </p>
                       {log.end_time && (
                         <p className="text-sm text-gray-500 italic font-bold tabular-nums flex items-center gap-3">
                           <Square className="w-4 h-4 text-red-500" /> {format(new Date(log.end_time), 'HH:mm')}
                         </p>
                       )}
                    </div>
                  </td>
                  <td className="p-10">
                    <span className="bg-white/5 text-gray-400 px-5 py-2 rounded-full text-[10px] font-black tracking-widest border border-white/10 uppercase italic">
                      {log.duration || 'Em Curso'}
                    </span>
                  </td>
                  <td className="p-10 text-center">
                    <button className="text-blue-500 hover:text-blue-400 transition-colors inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-widest italic group">
                      <MapPin className="w-4 h-4 group-hover:animate-bounce" /> Ver Mapa
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                   <td colSpan={4} className="p-32 text-center text-gray-700 font-black uppercase tracking-[0.4em] text-xs">Aguardando Sincronização de Ponto...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingPanel;
