export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}

export async function reverseGeocodeServer(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RESQ360-Emergency-Platform/1.0 (emergency-response@resq360.local)'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with status ${response.status}`);
    }

    const data: any = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch (error) {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export async function forwardGeocodeServer(query: string): Promise<GeocodeResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RESQ360-Emergency-Platform/1.0 (emergency-response@resq360.local)'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return [];
    }

    const data: any = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name
    }));
  } catch (error) {
    return [];
  }
}
