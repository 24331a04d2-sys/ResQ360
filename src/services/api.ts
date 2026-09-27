import { IncidentTriageInput, runDeterministicTriage } from '../lib/triageFallback';
import { AiAssessment } from '../types';

export async function requestAiTriage(input: IncidentTriageInput): Promise<AiAssessment> {
  try {
    const res = await fetch('/api/analyze-incident', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      console.warn(`[Triage API] Server returned status ${res.status}. Falling back to rule-based engine.`);
      return runDeterministicTriage(input);
    }

    const data = await res.json();
    if (!data || !data.priorityLevel || typeof data.priorityScore !== 'number') {
      return runDeterministicTriage(input);
    }

    return data as AiAssessment;
  } catch (error) {
    console.warn('[Triage API] Network / service error, executing deterministic safety fallback:', error);
    return runDeterministicTriage(input);
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error('Geocode failed');
    const data = await res.json();
    return data.address || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch (error) {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export async function searchAddress(query: string): Promise<Array<{ latitude: number; longitude: number; address: string }>> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
}
