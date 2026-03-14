import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Send, Loader2, Camera } from 'lucide-react';

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
      .limit(20);
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
    <div className="space-y-4">
      <div className="bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-200">
        <p className="font-bold text-orange-800 text-sm flex items-center gap-2">
          <Fuel className="w-4 h-4" /> Registrar Abastecimento
        </p>

        {/* Veículo */}
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase">Veículo *</label>
          <select
            value={vehicleId}
            onChange={e => setVehicleId(e.target.value)}
            className="w-full p-3 rounded-lg border border-orange-200 text-sm bg-white mt-1"
          >
            <option value="">Selecione o veículo...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plate} — {v.model}</option>
            ))}
          </select>
        </div>

        {/* KM e Valor/Litro */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">KM Atual (Odômetro) *</label>
            <input
              type="number"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
              placeholder="Ex: 45230"
              className="w-full p-3 rounded-lg border border-orange-200 bg-white text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Valor/Litro (R$) *</label>
            <input
              type="number"
              value={pricePerLiter}
              onChange={e => setPricePerLiter(e.target.value)}
              placeholder="Ex: 5.89"
              className="w-full p-3 rounded-lg border border-orange-200 bg-white text-sm mt-1"
              min="0.01"
              step="0.01"
            />
          </div>
        </div>

        {/* Valor Total e Litros */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Valor Total (R$) *</label>
            <input
              type="number"
              value={totalCostInput}
              onChange={e => setTotalCostInput(e.target.value)}
              placeholder="Ex: 200.00"
              className="w-full p-3 rounded-lg border border-orange-200 bg-white text-sm mt-1"
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Litros (auto)</label>
            <div className="w-full p-3 rounded-lg border border-orange-100 bg-orange-50 text-sm mt-1 font-bold text-orange-700 text-center">
              {autoLiters > 0 ? `${autoLiters.toFixed(1)}L` : '—'}
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase">Observações</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Posto, tipo de combustível.."
            className="w-full p-3 rounded-lg border border-orange-200 bg-white text-sm mt-1"
          />
        </div>

        {/* Foto Comprovante */}
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
          className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 rounded-lg text-sm text-orange-700 font-bold hover:bg-orange-50 transition-colors"
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'Enviando...' : receiptUrl ? '✅ Comprovante anexado' : '📷 Foto Comprovante'}
        </button>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={sending || !vehicleId || !totalCostInput || !pricePerLiter}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Registrar Abastecimento
        </button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-700">Últimos Abastecimentos</p>
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
              <div>
                <span className="font-bold text-gray-900">{Number(log.liters).toFixed(1)}L</span>
                <span className="text-gray-500 ml-2">× R$ {Number(log.price_per_liter).toFixed(2)}</span>
                {log.odometer && <span className="text-gray-400 ml-2 text-xs">{Number(log.odometer).toLocaleString('pt-BR')} km</span>}
              </div>
              <span className="font-bold text-orange-700">R$ {Number(log.total_cost).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
