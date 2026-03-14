/**
 * gpsTracker.ts
 *
 * Singleton GPS tracker that runs OUTSIDE React component lifecycle.
 * This ensures GPS tracking continues even when the DriverTripPanel
 * component unmounts (e.g., user navigates to another tab).
 */

import { Geolocation } from '@capacitor/geolocation';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

const db = supabaseClient as any;

const SESSION_KEY = 'gps_active_trip_id';
const INTERVAL_MS = 30000; // 30 seconds

let currentTripId: string | null = null;
let intervalId: any = null;
let onLocationSaved: (() => void) | null = null;

// Internal debug log to track GPS behavior on mobile
export interface GpsLogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
}
let gpsDebugLog: GpsLogEntry[] = [];
const MAX_LOG_SIZE = 50;

function addLog(message: string, type: GpsLogEntry['type'] = 'info') {
    const entry = { timestamp: new Date().toLocaleTimeString(), message, type };
    gpsDebugLog.unshift(entry);
    if (gpsDebugLog.length > MAX_LOG_SIZE) gpsDebugLog.pop();
    console.log(`[GPSTracker] ${message}`);
}

async function sendLocation(tripId: string) {
    try {
        addLog('Iniciando captura de posição...');
        let pos;
        try {
            // First try with high accuracy
            pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
            });
        } catch (e) {
            addLog('Alta precisão falhou, tentando modo econômico...', 'info');
            // Fallback to lower accuracy if high accuracy fails (e.g. indoors)
            pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: 10000,
            });
        }

        addLog(`Salvando posição em ${tripId.slice(0, 8)}... (acc: ${pos.coords.accuracy.toFixed(0)}m)`);

        const { error } = await db.from('trip_locations').insert({
            trip_id: tripId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            recorded_at: new Date().toISOString()
        });

        if (!error) {
            addLog('Posição salva com sucesso!', 'success');
            onLocationSaved?.();
        } else {
            addLog(`Erro ao salvar no banco: ${error.message || JSON.stringify(error)}`, 'error');
        }
    } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        addLog(`Falha total de rede/Supabase: ${errorMsg}`, 'error');
        if (errorMsg.includes('Failed to fetch')) {
            addLog('DICA: Verifique a internet e se o VPN está bloqueando o Supabase.', 'error');
        }
    }
}

export const gpsTracker = {
    /** Start tracking for a trip. Safe to call multiple times — idempotent. */
    start(tripId: string, callback?: () => void) {
        if (currentTripId === tripId && intervalId !== null) {
            onLocationSaved = callback || null;
            return;
        }

        this.stop();
        currentTripId = tripId;
        onLocationSaved = callback || null;

        try { localStorage.setItem(SESSION_KEY, tripId); } catch { }
        addLog(`🚀 Iniciando rastreamento para viagem ${tripId.slice(0, 8)}`);
        sendLocation(tripId);
        intervalId = setInterval(() => sendLocation(tripId), INTERVAL_MS);
    },

    /** Stop tracking entirely (call only when trip ends). */
    stop() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (currentTripId) {
            addLog(`🛑 Parando rastreamento para viagem ${currentTripId.slice(0, 8)}`);
        }
        currentTripId = null;
        onLocationSaved = null;
        try { localStorage.removeItem(SESSION_KEY); } catch { }
    },

    setCallback(callback: () => void) {
        onLocationSaved = callback;
    },

    getActiveTripId(): string | null {
        return currentTripId;
    },

    isTracking(): boolean {
        return intervalId !== null;
    },

    getLogs(): GpsLogEntry[] {
        return gpsDebugLog;
    },

    clearLogs() {
        gpsDebugLog = [];
    }
};
