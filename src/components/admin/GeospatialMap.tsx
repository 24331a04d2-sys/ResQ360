import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Incident } from '../../types';

interface Props {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

export const GeospatialMap: React.FC<Props> = ({ incidents, onSelectIncident }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const getMarkerIcon = (severity: string) => {
    let color = '#2563eb'; // blue
    if (severity === 'CRITICAL') color = '#dc2626'; // red
    else if (severity === 'HIGH') color = '#ea580c'; // orange
    else if (severity === 'MEDIUM') color = '#ca8a04'; // yellow

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        <path fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-incident-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30]
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [17.7231, 83.3013],
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers on incidents change
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    incidents.forEach((inc) => {
      if (inc.latitude && inc.longitude && inc.status !== 'resolved' && inc.status !== 'cancelled') {
        const marker = L.marker([inc.latitude, inc.longitude], {
          icon: getMarkerIcon(inc.severity)
        });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 text-xs space-y-1.5 font-sans';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between gap-2 border-b pb-1">
            <strong class="font-mono text-sm">${inc.incidentId}</strong>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
              inc.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              inc.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }">${inc.severity}</span>
          </div>
          <p class="font-semibold text-slate-800">${inc.type}</p>
          <p class="text-[11px] text-slate-600 line-clamp-2">${inc.locationAddress}</p>
          <div class="pt-1 text-[11px] text-slate-500">
            Status: <strong class="text-slate-800">${inc.status.toUpperCase().replace('_', ' ')}</strong><br/>
            Team: <strong class="text-slate-800">${inc.assignedTeamName || 'Unassigned'}</strong>
          </div>
        `;

        const inspectBtn = document.createElement('button');
        inspectBtn.className = 'w-full mt-2 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors';
        inspectBtn.innerText = 'Inspect Incident';
        inspectBtn.onclick = () => onSelectIncident(inc);
        popupContent.appendChild(inspectBtn);

        marker.bindPopup(popupContent);
        layerGroupRef.current?.addLayer(marker);
        bounds.push([inc.latitude, inc.longitude]);
      }
    });

    if (bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [incidents]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Geospatial Legend Overlay */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
          Severity Legend:
        </span>
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <span className="font-medium text-slate-700">CRITICAL Threat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <span className="font-medium text-slate-700">HIGH Threat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
            <span className="font-medium text-slate-700">MEDIUM Threat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
            <span className="font-medium text-slate-700">LOW Threat</span>
          </div>
        </div>
      </div>
    </div>
  );
};
