import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
}

// Fetch road-following route from OSRM (free, uses OpenStreetMap)
async function getRoutedPath(positions: [number, number][]): Promise<[number, number][]> {
  if (positions.length < 2) return positions;

  // Sample to max 50 waypoints to respect OSRM limits
  const step = Math.max(1, Math.floor(positions.length / 50));
  const sampled: [number, number][] = [];
  for (let i = 0; i < positions.length; i++) {
    if (i === 0 || i === positions.length - 1 || i % step === 0) {
      sampled.push(positions[i]);
    }
  }

  // OSRM expects lon,lat order
  const coords = sampled.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // OSRM returns [lon, lat] — convert back to [lat, lon] for Leaflet
      return data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
    }
  } catch (e) {
    console.warn('OSRM routing falhou, usando linha reta como fallback:', e);
  }

  return positions; // fallback to straight line
}

export default function FleetMap({ locations = [] }: { locations?: Location[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const defaultCenter: [number, number] = [-3.7172, -38.5433];

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(defaultCenter, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and polylines when locations change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (locations.length === 0) {
      L.marker(defaultCenter).addTo(layer).bindPopup('Sede — Caucaia, CE');
      map.setView(defaultCenter, 13);
      return;
    }

    // Group by trip_id
    const tripGroups: Record<string, Location[]> = {};
    locations.forEach(loc => {
      if (!tripGroups[loc.trip_id]) tripGroups[loc.trip_id] = [];
      tripGroups[loc.trip_id].push(loc);
    });

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    let idx = 0;

    // Draw each trip — fetch road route from OSRM first
    const drawTrips = async () => {
      for (const [, locs] of Object.entries(tripGroups)) {
        const rawPositions = locs.map(l => [l.latitude, l.longitude] as [number, number]);
        const lastLoc = locs[locs.length - 1];
        const color = colors[idx % colors.length];
        idx++;

        if (rawPositions.length > 1) {
          // 🗺️ Get route following actual roads via OSRM
          const routedPositions = await getRoutedPath(rawPositions);
          L.polyline(routedPositions, { color, weight: 4, opacity: 0.8 }).addTo(layer);
        }

        // Start marker (green dot)
        if (rawPositions.length > 0) {
          const startMarker = L.circleMarker(rawPositions[0], {
            radius: 6, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2,
          }).addTo(layer);
          startMarker.bindPopup(`<b>🟢 Início</b><br>${new Date(locs[0].recorded_at).toLocaleString('pt-BR')}`);
        }

        // End marker
        const marker = L.marker([lastLoc.latitude, lastLoc.longitude], { icon: activeIcon }).addTo(layer);
        const speedText = lastLoc.speed !== null ? `<p>Vel: ${(lastLoc.speed * 3.6).toFixed(0)} km/h</p>` : '';
        marker.bindPopup(`
          <div style="font-size:13px">
            <p style="font-weight:bold">📍 Última posição</p>
            <p>${new Date(lastLoc.recorded_at).toLocaleString('pt-BR')}</p>
            ${speedText}
            <p style="color:#888;font-size:11px">Pontos: ${locs.length}</p>
          </div>
        `);
      }

      // Fit map to all positions
      const allPositions = locations.map(l => [l.latitude, l.longitude] as [number, number]);
      if (allPositions.length === 1) {
        map.setView(allPositions[0], 15);
      } else {
        const bounds = L.latLngBounds(allPositions);
        if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
          map.setView(allPositions[0], 15);
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    };

    drawTrips();
  }, [locations]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} className="rounded-2xl z-0" />;
}
