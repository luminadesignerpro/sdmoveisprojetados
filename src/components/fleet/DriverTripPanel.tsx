import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const db = supabaseClient as any;
import { useToast } from '@/hooks/use-toast';
import { Navigation, Play, Square, MapPin, Clock, Route, AlertTriangle, Camera, CheckSquare, Send, X, Image, PackageCheck, Fuel, Terminal } from 'lucide-react';
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

  const [dailyChecklist, setDailyChecklist] = useState<ChecklistItem[]>(
    DAILY_CHECKLIST.map((label, i) => ({
      id: `init-daily-${i}`,
      label,
      checked: false,
      sort_order: i,
      checklist_type: 'daily',
    })) as any
  );
  const [deliveryChecklist, setDeliveryChecklist] = useState<ChecklistItem[]>(
    DELIVERY_CHECKLIST.map((label, i) => ({
      id: `init-del-${i}`,
      label,
      checked: false,
      sort_order: i + 100,
      checklist_type: 'delivery',
    })) as any
  );
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

  // Periodically refresh logs when debug is open
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
    // When component remounts (user returns to tab), reconnect the GPS callback
    // so locationCount stays in sync — but DO NOT stop tracking on unmount!
    return () => {
      // Only detach callback, do NOT call gpsTracker.stop() here.
      // Tracking continues in background when user switches tabs.
      gpsTracker.setCallback(() => { });
    };
  }, [employeeId, employeeName]);

  useEffect(() => {
    if (activeTrip && activeTrip.id) {
      Geolocation.requestPermissions()
        .catch(() => { })
        .finally(() => {
          // Start (or reconnect to) GPS tracking via the singleton
          gpsTracker.start(activeTrip.id, () => setLocationCount(prev => prev + 1));
        });
      fetchChecklists(activeTrip.id);
      fetchPhotos(activeTrip.id);
    }
  }, [activeTrip?.id]);

  const fetchVehicles = async () => {
    const { data } = await db.from('vehicles').select('id, plate, model').eq('active', true);
    if (data) {
      const uniqueVehicles = data.reduce((acc: Vehicle[], current: Vehicle) => {
        const x = acc.find(item => item.plate === current.plate);
        if (!x) return acc.concat([current]);
        else return acc;
      }, []);
      setVehicles(uniqueVehicles);
    }
  };

  const fetchEmployeeAndTrips = async () => {
    setLoading(true);
    let resolvedId = employeeId;
    if (!resolvedId) {
      const { data: empData } = await db
        .from('employees')
        .select('id')
        .eq('name', employeeName)
        .eq('active', true)
        .maybeSingle();
      if (empData) resolvedId = empData.id;
      else { setLoading(false); return; }
    }
    await fetchTrips(resolvedId);
  };

  const fetchTrips = async (empId: string) => {
    const { data: active } = await db
      .from('trips')
      .select('*')
      .eq('employee_id', empId)
      .eq('status', 'active') // Strictly check for active status
      .maybeSingle();

    if (active) {
      setActiveTrip(active as Trip);
      const { count } = await db
        .from('trip_locations')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', active.id);
      setLocationCount(count || 0);
    } else {
      setActiveTrip(null);
    }

    const { data: recent } = await db
      .from('trips')
      .select('*')
      .eq('employee_id', empId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(10);

    if (recent) setRecentTrips(recent as Trip[]);
    setResolvedEmployeeId(empId);
    setLoading(false);
  };

  const fetchChecklists = async (tripId: string) => {
    try {
      const { data, error } = await db
        .from('trip_checklists')
        .select('*')
        .eq('trip_id', tripId)
        .order('sort_order');

      if (error) throw error;

      const daily = (data || []).filter((c: any) => c.checklist_type === 'daily');
      const delivery = (data || []).filter((c: any) => c.checklist_type === 'delivery');

      if (daily.length > 0) setDailyChecklist(daily);
      else setDailyChecklist(DAILY_CHECKLIST.map((label, i) => ({ id: `temp-daily-${i}`, label, checked: false, sort_order: i, checklist_type: 'daily' })) as any);

      if (delivery.length > 0) setDeliveryChecklist(delivery);
      else setDeliveryChecklist(DELIVERY_CHECKLIST.map((label, i) => ({ id: `temp-del-${i}`, label, checked: false, sort_order: i + 100, checklist_type: 'delivery' })) as any);

      if (!data || data.length === 0) {
        const dailyItems = DAILY_CHECKLIST.map((label, i) => ({
          trip_id: tripId, label, checked: false, sort_order: i, checklist_type: 'daily' as string,
        }));
        const deliveryItems = DELIVERY_CHECKLIST.map((label, i) => ({
          trip_id: tripId, label, checked: false, sort_order: i + 100, checklist_type: 'delivery' as string,
        }));
        await db.from('trip_checklists').insert([...dailyItems, ...deliveryItems]);
      }
    } catch (error: any) {
      console.error('CRITICAL Error fetching checklists:', error);
      setDailyChecklist(DAILY_CHECKLIST.map((label, i) => ({ id: `err-${i}`, label, checked: false, sort_order: i, checklist_type: 'daily' })) as any);
      setDeliveryChecklist(DELIVERY_CHECKLIST.map((label, i) => ({ id: `err-del-${i}`, label, checked: false, sort_order: i + 100, checklist_type: 'delivery' })) as any);
    }
  };

  const fetchPhotos = async (tripId: string) => {
    const { data } = await db
      .from('trip_photos')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at');
    if (data) {
      setTripPhotos(data);
      const signature = data.find((p: any) => p.description === 'Assinatura do Cliente');
      if (signature) setSignatureUrl(signature.image_url);
    }
  };

  const startTracking = useCallback((tripId: string) => {
    // Delegate to the singleton (no-op if already tracking this trip)
    gpsTracker.start(tripId, () => setLocationCount(prev => prev + 1));
  }, []);

  const stopTracking = useCallback(() => {
    // Only used when a trip actually ends
    gpsTracker.stop();
  }, []);

  const startTrip = async (description?: string) => {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        toast({
          title: '❌ Permissão de GPS negada',
          description: 'Habilite a localização nas configurações do celular.',
          variant: 'destructive',
        });
        return;
      }
    } catch (e) {
      console.log('GPS permission error:', e);
    }

    if (!selectedVehicleId) {
      toast({ title: '⚠️ Selecione um veículo', variant: 'destructive' });
      return;
    }

    const finalEmployeeId = resolvedEmployeeId || employeeId;
    if (!finalEmployeeId) {
      toast({ title: '❌ Erro ao iniciar viagem', description: 'Funcionário não identificado. Faça login novamente.', variant: 'destructive' });
      return;
    }

    const { data, error } = await db
      .from('trips')
      .insert({
        employee_id: finalEmployeeId,
        description: description || null,
        vehicle_id: selectedVehicleId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      toast({ title: '❌ Erro ao iniciar viagem', description: error.message, variant: 'destructive' });
      return;
    }

    setActiveTrip(data as Trip);
    setLocationCount(0);
    startTracking(data.id);
    toast({ title: '🚗 Viagem iniciada!', description: 'GPS rastreando a cada 30s' });
  };

  const setMontagemConcluida = async () => {
    if (!activeTrip) return;

    const uncheckedDelivery = deliveryChecklist.filter(c => !c.checked);
    if (uncheckedDelivery.length > 0) {
      setShowDeliveryChecklist(true);
      toast({ title: '⚠️ Complete o checklist de entrega', description: `${uncheckedDelivery.length} item(ns) pendente(s)`, variant: 'destructive' });
      return;
    }

    const { error } = await db
      .from('trips')
      .update({ montagem_status: 'concluida' })
      .eq('id', activeTrip.id);

    if (!error) {
      setActiveTrip(prev => prev ? { ...prev, montagem_status: 'concluida' } : null);
      toast({ title: '✅ Montagem marcada como concluída!', description: 'Agora colete a assinatura do cliente.' });
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;

    // Stop GPS tracking (trip is done)
    gpsTracker.stop();

    const { error } = await db
      .from('trips')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', activeTrip.id);

    if (error) {
      toast({ title: '❌ Erro ao finalizar', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: '✅ Viagem do dia finalizada!' });
    setActiveTrip(null);
    setLocationCount(0);
    setDailyChecklist([]);
    setDeliveryChecklist([]);
    setTripPhotos([]);
    fetchEmployeeAndTrips();
  };

  const sendSOS = async () => {
    if (!activeTrip || !sosDesc.trim()) return;
    setSosSending(true);
    const { error } = await db.from('trip_incidents').insert({
      trip_id: activeTrip.id,
      employee_id: resolvedEmployeeId || employeeId,
      type: sosType,
      description: sosDesc.trim(),
    });
    setSosSending(false);
    if (error) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🆘 Imprevisto reportado!', description: 'O administrador será notificado.' });
      setSosDesc('');
      setShowSOS(false);
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTrip || !e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split('.').pop();
    const path = `${activeTrip.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await db.storage.from('trip-photos').upload(path, file);
    if (uploadErr) {
      toast({ title: '❌ Erro no upload', description: uploadErr.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = db.storage.from('trip-photos').getPublicUrl(path);
    await db.from('trip_photos').insert({
      trip_id: activeTrip.id,
      image_url: urlData.publicUrl,
    });

    await fetchPhotos(activeTrip.id);
    setUploading(false);
    toast({ title: '📸 Foto salva!' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveSignature = async (dataUrl: string) => {
    if (!activeTrip) return;
    setSavingSignature(true);

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const path = `${activeTrip.id}/signature_${Date.now()}.png`;

      const { error: uploadErr } = await db.storage.from('trip-photos').upload(path, blob);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = db.storage.from('trip-photos').getPublicUrl(path);

      const { error: dbErr } = await db.from('trip_photos').insert({
        trip_id: activeTrip.id,
        image_url: urlData.publicUrl,
        description: 'Assinatura do Cliente',
      });
      if (dbErr) throw dbErr;

      setSignatureUrl(urlData.publicUrl);
      setShowSignaturePad(false);
      toast({ title: '✅ Assinatura salva!', description: 'Entrega finalizada com sucesso.' });

      const sigItem = deliveryChecklist.find(c => c.label === 'Assinatura Digital do Cliente');
      if (sigItem && !sigItem.checked) {
        toggleCheckItem(sigItem);
      }
    } catch (err: any) {
      console.error('Error saving signature:', err);
      toast({ title: '❌ Erro ao salvar assinatura', description: err.message, variant: 'destructive' });
    } finally {
      setSavingSignature(false);
    }
  };

  const formatTime = (iso: string | null | undefined) => {
    const dateStr = iso || activeTrip?.created_at;
    if (!dateStr) return '---';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '---';
      return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '---';
    }
  };

  const calcDuration = (start: string | null | undefined, end: string | null | undefined) => {
    const dateStr = start || activeTrip?.created_at;
    if (!dateStr) return '--h --min';
    try {
      const startDate = new Date(dateStr);
      const endDate = end ? new Date(end) : new Date();
      if (isNaN(startDate.getTime())) return '--h --min';
      const diffMs = endDate.getTime() - startDate.getTime();
      if (diffMs < 0) return '--h --min';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${String(minutes).padStart(2, '0')}min`;
    } catch (e) {
      return '--h --min';
    }
  };

  const toggleCheckItem = async (item: ChecklistItem) => {
    const newChecked = !item.checked;
    const listSetter = item.checklist_type === 'daily' ? setDailyChecklist : setDeliveryChecklist;

    listSetter(prev =>
      prev.map(c => c.id === item.id ? { ...c, checked: newChecked } : c)
    );

    if (!item.id.startsWith('init-') && !item.id.startsWith('temp-') && !item.id.startsWith('err-')) {
      await db.from('trip_checklists').update({ checked: newChecked }).eq('id', item.id);
    } else if (activeTrip) {
      const { data: inserted } = await db.from('trip_checklists').insert({
        trip_id: activeTrip.id,
        label: item.label,
        checked: newChecked,
        sort_order: item.sort_order,
        checklist_type: item.checklist_type,
      }).select().single();

      if (inserted) {
        listSetter(prev =>
          prev.map(c => c.id === item.id ? { ...c, id: inserted.id, checked: newChecked } : c)
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <Navigation className="w-6 h-6" />
          <div>
            <h2 className="font-bold text-lg">Painel do Motorista</h2>
            <p className="text-blue-200 text-sm">{employeeName}</p>
          </div>
        </div>
      </div>

      {activeTrip ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-green-800">Viagem em Andamento</span>
              </div>
              {isDeliveryMode && (
                <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                  ✅ Montagem Concluída
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-2">
                <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Início</p>
                <p className="text-sm font-medium">{formatTime(activeTrip.started_at)}</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <Route className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Duração</p>
                <p className="text-sm font-medium">{calcDuration(activeTrip.started_at, null)}</p>
              </div>
              <div className="bg-white rounded-lg p-2">
                <MapPin className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">GPS</p>
                <p className="text-sm font-medium">{locationCount} pts</p>
              </div>
            </div>

            {activeTrip.description && (
              <p className="mt-2 text-sm text-gray-600 bg-white rounded-lg p-2">
                📍 {activeTrip.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowFuel(true)}
              className="flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-3 font-medium hover:bg-orange-100 transition-colors"
            >
              <Fuel className="w-5 h-5" />
              Abastecimento
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 font-medium hover:bg-blue-100 transition-colors"
            >
              <Camera className="w-5 h-5" />
              {uploading ? 'Enviando...' : 'Foto'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />

            <button
              onClick={() => setShowSOS(true)}
              className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 font-medium hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
              Imprevisto
            </button>

            {!isDeliveryMode ? (
              <button
                onClick={setMontagemConcluida}
                className="flex items-center justify-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl p-3 font-medium hover:bg-purple-100 transition-colors"
              >
                <PackageCheck className="w-5 h-5" />
                Concluir Montagem
              </button>
            ) : (
              <button
                onClick={() => setShowSignaturePad(true)}
                className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl p-3 font-medium hover:bg-indigo-100 transition-colors"
              >
                <CheckSquare className="w-5 h-5" />
                {signatureUrl ? '✅ Assinatura' : 'Coletar Assinatura'}
              </button>
            )}
          </div>

          {/* Debug GPS Section */}
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between p-3 text-slate-400 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-mono">
                <Terminal className="w-4 h-4" />
                <span>DEBUG GPS: {gpsTracker.isTracking() ? 'ATIVO' : 'PARADO'}</span>
              </div>
              <span className="text-[10px]">{showDebug ? 'ESCONDER' : 'MOSTRAR LOGS'}</span>
            </button>
            {showDebug && (
              <div className="p-2 pt-0 max-h-48 overflow-y-auto font-mono text-[10px] space-y-1">
                {gpsLogs.length === 0 ? (
                  <p className="text-slate-600 italic p-2">Sem logs registrados ainda...</p>
                ) : (
                  gpsLogs.map((log, i) => (
                    <div key={i} className={`border-l-2 pl-2 py-0.5 ${log.type === 'error' ? 'border-red-500 text-red-400' :
                      log.type === 'success' ? 'border-green-500 text-green-400' :
                        'border-blue-500 text-blue-300'
                      }`}>
                      <span className="text-slate-500 mr-1">[{log.timestamp}]</span>
                      {log.message}
                    </div>
                  ))
                )}
                <button
                  onClick={() => { gpsTracker.clearLogs(); setGpsLogs([]); }}
                  className="w-full mt-2 text-slate-500 hover:text-slate-300 underline text-[9px]"
                >
                  Limpar Logs
                </button>
              </div>
            )}
          </div>

          <ToolInventory tripId={activeTrip.id} />

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDailyChecklist(!showDailyChecklist)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Checklist Diário</span>
                <span className="text-sm text-gray-500">
                  ({dailyChecklist.filter(c => c.checked).length}/{dailyChecklist.length})
                </span>
              </div>
              <span className="text-gray-400">{showDailyChecklist ? '▲' : '▼'}</span>
            </button>
            {showDailyChecklist && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {dailyChecklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheckItem(item)}
                    className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${item.checked ? 'bg-green-50' : ''}`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.checked && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDeliveryChecklist(!showDeliveryChecklist)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Checklist de Entrega</span>
                <span className="text-sm text-gray-500">
                  ({deliveryChecklist.filter(c => c.checked).length}/{deliveryChecklist.length})
                </span>
              </div>
              <span className="text-gray-400">{showDeliveryChecklist ? '▲' : '▼'}</span>
            </button>
            {showDeliveryChecklist && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {deliveryChecklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => item.label === 'Assinatura Digital do Cliente' ? setShowSignaturePad(true) : toggleCheckItem(item)}
                    className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${item.checked ? 'bg-green-50' : ''}`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.checked && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tripPhotos.filter(p => p.description !== 'Assinatura do Cliente').length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                Fotos da Viagem ({tripPhotos.filter(p => p.description !== 'Assinatura do Cliente').length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {tripPhotos
                  .filter(p => p.description !== 'Assinatura do Cliente')
                  .map(photo => (
                    <a key={photo.id} href={photo.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={photo.image_url} alt="Foto da viagem" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                    </a>
                  ))}
              </div>
            </div>
          )}

          {signatureUrl && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                Assinatura do Cliente
              </h3>
              <img src={signatureUrl} alt="Assinatura do cliente" className="max-h-24 border border-gray-200 rounded-lg bg-gray-50 p-2" />
            </div>
          )}

          <button
            onClick={() => { if (window.confirm('Finalizar a viagem do dia?')) endTrip(); }}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl p-4 font-bold text-lg transition-colors"
          >
            <Square className="w-6 h-6" />
            Finalizar Viagem
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Iniciar Nova Viagem
            </h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um veículo...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.model} — {v.plate}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => startTrip()}
              disabled={!selectedVehicleId}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-4 font-bold text-lg transition-colors"
            >
              <Play className="w-6 h-6" />
              Iniciar Viagem
            </button>
          </div>

          {recentTrips.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Viagens Recentes
              </h3>
              <div className="space-y-2">
                {recentTrips.map(trip => (
                  <div key={trip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{formatTime(trip.started_at)}</p>
                      {trip.description && <p className="text-xs text-gray-500">{trip.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{calcDuration(trip.started_at, trip.ended_at)}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Concluída</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showSOS && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Reportar Imprevisto
              </h3>
              <button onClick={() => setShowSOS(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={sosType} onChange={e => setSosType(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm">
                <option>Peça danificada</option>
                <option>Acidente</option>
                <option>Problema com veículo</option>
                <option>Problema com cliente</option>
                <option>Atraso</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={sosDesc}
                onChange={e => setSosDesc(e.target.value)}
                placeholder="Descreva o imprevisto..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={sendSOS}
              disabled={sosSending || !sosDesc.trim()}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl p-3 font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              {sosSending ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </div>
        </div>
      )}

      {showFuel && activeTrip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Fuel className="w-5 h-5 text-orange-600" />
                Registrar Abastecimento
              </h3>
              <button onClick={() => setShowFuel(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FuelLogForm tripId={activeTrip.id} onClose={() => setShowFuel(false)} />
          </div>
        </div>
      )}

      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Assinatura do Cliente</h3>
              <button onClick={() => setShowSignaturePad(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SignaturePad
              onSave={saveSignature}
              onCancel={() => setShowSignaturePad(false)}
              saving={savingSignature}
            />
          </div>
        </div>
      )}
    </div>
  );
}
