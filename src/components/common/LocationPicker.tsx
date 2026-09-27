import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { reverseGeocode, searchAddress } from '../../services/api';

// Fix Leaflet's default marker icons in modern bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  latitude: number | null;
  longitude: number | null;
  address: string;
  accuracy?: number | null;
  onChange: (coords: { lat: number; lng: number; address: string; accuracy?: number }) => void;
  required?: boolean;
}

export const LocationPicker: React.FC<Props> = ({
  latitude,
  longitude,
  address,
  accuracy,
  onChange,
  required = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [statusMsg, setStatusMsg] = useState<string>('Select location on map or search address');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ latitude: number; longitude: number; address: string }>>([]);
  const [manualAddressInput, setManualAddressInput] = useState(address || '');

  // Default coordinate if neither lat nor lng is provided initially:
  // We use current GPS or prompt the user, but initialize leaflet with a view if needed
  const currentLat = latitude !== null ? latitude : 17.7231;
  const currentLng = longitude !== null ? longitude : 83.3013;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: latitude ? 15 : 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Handle map clicks
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setStatusMsg('Resolving address from map pin...');
        setStatusType('info');
        updatePosition(lat, lng);
        const resolvedAddress = await reverseGeocode(lat, lng);
        setManualAddressInput(resolvedAddress);
        onChange({ lat, lng, address: resolvedAddress });
        setStatusMsg('Location pinned successfully.');
        setStatusType('success');
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Automatically acquire GPS location on mount if not yet set
  useEffect(() => {
    if (latitude === null || longitude === null) {
      handleAcquireGps();
    }
  }, []);

  // Update manual address input if external address prop changes
  useEffect(() => {
    if (address && address !== manualAddressInput) {
      setManualAddressInput(address);
    }
  }, [address]);

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (latitude !== null && longitude !== null) {
      updatePosition(latitude, longitude, accuracy);
      mapInstanceRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude, accuracy]);

  const updatePosition = (lat: number, lng: number, acc?: number | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!markerRef.current) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        setStatusMsg('Updating address from moved pin...');
        setStatusType('info');
        const resolvedAddress = await reverseGeocode(pos.lat, pos.lng);
        setManualAddressInput(resolvedAddress);
        onChange({ lat: pos.lat, lng: pos.lng, address: resolvedAddress });
        setStatusMsg('Pin relocated.');
        setStatusType('success');
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    if (acc && acc > 0) {
      if (!circleRef.current) {
        circleRef.current = L.circle([lat, lng], {
          radius: acc,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(acc);
      }
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
  };

  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setStatusMsg('Geolocation is not supported by your browser. Please search or pick on map.');
      setStatusType('warning');
      return;
    }

    setIsLocating(true);
    setStatusMsg('Acquiring precise satellite GPS coordinates...');
    setStatusType('info');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setStatusMsg(`GPS Fix Obtained (Accuracy: ±${Math.round(acc)}m). Resolving address...`);
        setStatusType('success');

        const resolvedAddress = await reverseGeocode(lat, lng);
        setManualAddressInput(resolvedAddress);
        onChange({ lat, lng, address: resolvedAddress, accuracy: acc });
        setStatusMsg(`GPS Locked: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setStatusMsg('Location permission denied. Please select your location on the map or type an address below.');
          setStatusType('warning');
        } else {
          setStatusMsg(`GPS unavailable (${err.message}). Please use map pin or search address.`);
          setStatusType('warning');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setStatusMsg('Searching landmarks and streets...');
    const results = await searchAddress(searchQuery);
    setIsSearching(false);
    setSearchResults(results);

    if (results.length === 0) {
      setStatusMsg('No matching addresses found. You can click on the map directly or enter address manually.');
      setStatusType('warning');
    } else {
      setStatusMsg(`Found ${results.length} locations. Select one below.`);
      setStatusType('info');
    }
  };

  const selectSearchResult = (item: { latitude: number; longitude: number; address: string }) => {
    setSearchResults([]);
    setSearchQuery('');
    setManualAddressInput(item.address);
    onChange({ lat: item.latitude, lng: item.longitude, address: item.address });
    setStatusMsg(`Selected: ${item.address}`);
    setStatusType('success');
  };

  const handleManualAddressChange = (text: string) => {
    setManualAddressInput(text);
    if (latitude !== null && longitude !== null) {
      onChange({ lat: latitude, lng: longitude, address: text, accuracy: accuracy ?? undefined });
    }
  };

  return (
    <div className="space-y-3">
      {/* Top search & GPS triggers */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchAddress} className="flex-1 flex gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search area, landmark or street..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleAcquireGps}
          disabled={isLocating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-60"
        >
          {isLocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Auto-Detect GPS
        </button>
      </div>

      {/* Search results dropdown if any */}
      {searchResults.length > 0 && (
        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto shadow-sm">
          {searchResults.map((res, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectSearchResult(res)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-xs flex items-start gap-2 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-800">{res.address}</p>
                <p className="text-[11px] text-slate-500">{res.latitude.toFixed(5)}, {res.longitude.toFixed(5)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Leaflet Map container */}
      <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-100 h-64 sm:h-72">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Location overlay badge */}
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 shadow-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 truncate mr-2">
            {statusType === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusType === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-medium text-slate-700 truncate">{statusMsg}</span>
          </div>
          {latitude !== null && longitude !== null && (
            <span className="font-mono text-[11px] text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Exact address readout or manual edit */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Confirmed Dispatch Address / Landmark {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={manualAddressInput}
          onChange={(e) => handleManualAddressChange(e.target.value)}
          placeholder="e.g. Near Metro Pillar 140, MVP Colony Main Road"
          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          required={required}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          Drag the map marker or click anywhere to adjust location pin. Accurate landmarks help field responders reach you faster.
        </p>
      </div>
    </div>
  );
};
