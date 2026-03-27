import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Send, Loader2, Camera, Shield, Zap, Sparkles } from 'lucide-react';

const db = supabase as any;

interface Vehicle {
  id: string;
  plate: string;
  model: string;
}

interface FuelLog {
  id: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer: number | null;
  notes: string | null;
  created_at: string;
  vehicle_id: string;
}

export default function FuelLogForm({ employeeId, tripId, vehicleId: defaultVehicleId, onClose }: { employeeId: string; tripId?: string; vehicleId?: string; onClose?: () => void }) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId || '');
  const [totalCostInput, setTotalCostInput] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVehicles();
    fetchLogs();
  }, [employeeId]);

  useEffect(() => {
    if (defaultVehicleId) setVehicleId(defaultVehicleId);
  }, [defaultVehicleId]);

  const fetchVehicles = async () => {
    const { data } = await db.from('vehicles').select('id, plate, model').eq('active', true);
    if (data) setVehicles(data);
  };

  const fetchLogs = async () => {
    const { data } = await db
      .from('fuel_logs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setLogs(data);
  };

  const totalCost = parseFloat(totalCostInput) || 0;
  const price = parseFloat(pricePerLiter) || 0;
  const autoLiters = price > 0 ? totalCost / price : 0;

  const uploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split('.').pop();
    const path = `fuel-receipts/${employeeId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await db.storage.from('trip-photos').upload(path, file);
    if (uploadErr) {
      toast({ title: '❌ Erro no upload', description: uploadErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = db.storage.from('trip-photos').getPublicUrl(path);
    setReceiptUrl(urlData.publicUrl);
    setUploading(false);
    toast({ title: '📸 Foto do comprovante salva!' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!vehicleId || !totalCostInput || !pricePerLiter) return;
    setSending(true);
    const { error } = await db.from('fuel_logs').insert({
      employee_id: employeeId,
      vehicle_id: vehicleId,
      trip_id: tripId || null,
      liters: autoLiters,
      price_per_liter: price,
      total_cost: totalCost,
      odometer: odometer ? parseFloat(odometer) : null,
      notes: notes.trim() || null,
    });
    setSending(false);
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '⛽ Abastecimento registrado!' });
      setTotalCostInput(''); setPricePerLiter(''); setOdometer(''); setNotes(''); setReceiptUrl(null);
      fetchLogs();
      onClose?.();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#111111] border border-[#D4AF37]/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <header className="mb-8">
           <p className="text-[10px] text-[#D4AF37]/60 font-black uppercase tracking-[0.4em] mb-3 italic flex items-center gap-3">
              <Fuel className="w-4 h-4" /> Registro de Abastecimento
           </p>
           <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Vetor de Energia Premium</h3>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Ativo da Frota *</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-xs font-black italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all appearance-none cursor-pointer shadow-inner"
            >
              <option value="" className="bg-black">SELECIONE O VEÍCULO...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} className="bg-black">{v.plate} — {v.model.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">KM / Odômetro *</label>
              <input
                type="number"
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                placeholder="EX: 45230"
                className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Valor/UND (R$) *</label>
              <input
                type="number"
                value={pricePerLiter}
                onChange={e => setPricePerLiter(e.target.value)}
                placeholder="EX: 5.89"
                className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Total Transação (R$) *</label>
              <input
                type="number"
                value={totalCostInput}
                onChange={e => setTotalCostInput(e.target.value)}
                placeholder="EX: 200.00"
                className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-sm font-black italic tracking-tighter outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner border-l-2 border-l-[#D4AF37]/30"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Volume (L)</label>
              <div className="w-full h-14 bg-black/50 border border-white/5 rounded-xl flex items-center justify-center text-sm font-black italic text-[#D4AF37] tracking-tighter tabular-nums shadow-inner">
                {autoLiters > 0 ? `${autoLiters.toFixed(1)} L` : '—'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest ml-1 italic">Notas de Campo</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="POSTO, TIPO DE COMBUSTÍVEL, ETC.."
              className="w-full h-14 bg-black border border-white/5 rounded-xl px-4 text-white text-[10px] font-bold italic tracking-widest outline-none focus:border-[#D4AF37]/40 transition-all shadow-inner uppercase"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={uploadReceipt}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`flex-1 h-14 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all italic flex items-center justify-center gap-3 ${receiptUrl ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-[#D4AF37]/30'}`}
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'UPLOADING...' : receiptUrl ? 'RECIBO ANEXADO' : 'REGISTRAR COMPROVANTE'}
            </button>

            <button
              onClick={submit}
              disabled={sending || !vehicleId || !totalCostInput || !pricePerLiter}
              className="flex-[1.5] h-14 bg-gradient-to-r from-[#D4AF37] to-[#b8952a] text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl italic"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 shadow-sm" />}
              EFETIVAR LANÇAMENTO
            </button>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="space-y-4">
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] italic ml-1">Histórico de Transmissões</p>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-5 bg-[#111111] border border-white/5 rounded-2xl group hover:border-[#D4AF37]/20 transition-all">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[#D4AF37]">
                      <Fuel className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <div>
                      <p className="text-white font-black italic text-sm tabular-nums leading-none mb-1">{Number(log.liters).toFixed(1)} <span className="text-[10px] opacity-40">L</span></p>
                      <p className="text-[9px] text-gray-700 font-bold uppercase italic tracking-widest">{new Date(log.created_at).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[#D4AF37] font-black italic text-lg tabular-nums leading-none">R$ {Number(log.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   {log.odometer && <p className="text-[9px] text-gray-700 font-bold italic tracking-tighter mt-1">{Number(log.odometer).toLocaleString('pt-BR')} KM</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
