import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Clock,
  MapPin,
  Shield,
  Search,
  Users,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { Incident, UserProfile, StatusHistoryItem } from '../../types';
import {
  subscribeToCitizenIncidents,
  subscribeToIncident,
  subscribeToStatusHistory,
  findIncidentByCode
} from '../../services/incidentService';
import { StatusBadge } from '../common/StatusBadge';
import { SeverityBadge } from '../common/SeverityBadge';
import { IncidentTimeline } from '../common/IncidentTimeline';

interface Props {
  currentUser: UserProfile | null;
  onNewSos: () => void;
  initialIncidentId?: string | null;
}

export const MyReportsView: React.FC<Props> = ({ currentUser, onNewSos, initialIncidentId }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Subscribe to authenticated user's incidents
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToCitizenIncidents(currentUser.uid, (list) => {
      setIncidents(list);
      // Auto-select initial incident or first incident
      if (initialIncidentId) {
        const found = list.find((i) => i.id === initialIncidentId);
        if (found) setSelectedIncident(found);
      } else if (!selectedIncident && list.length > 0) {
        setSelectedIncident(list[0]);
      }
    });
    return () => unsub();
  }, [currentUser, initialIncidentId]);

  // If initialIncidentId is set (e.g. from guest submission), load it directly
  useEffect(() => {
    if (initialIncidentId) {
      const unsub = subscribeToIncident(initialIncidentId, (inc) => {
        if (inc) setSelectedIncident(inc);
      });
      return () => unsub();
    }
  }, [initialIncidentId]);

  // Subscribe to status history of the selected incident
  useEffect(() => {
    if (!selectedIncident) {
      setHistory([]);
      return;
    }
    const unsub = subscribeToStatusHistory(selectedIncident.id, (hist) => {
      setHistory(hist);
    });
    return () => unsub();
  }, [selectedIncident?.id]);

  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    const found = await findIncidentByCode(searchCode.trim());
    setIsSearching(false);

    if (found) {
      setSelectedIncident(found);
      setSearchCode('');
    } else {
      setSearchError(`No incident found with identifier "${searchCode.trim().toUpperCase()}". Verify your incident code.`);
    }
  };

  const formatDateTime = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
            CITIZEN DISPATCH TRACKING
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            My Emergency Reports & Live Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of filed emergency incidents and field responder deployments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewSos}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse" />
            New Emergency SOS
          </button>
        </div>
      </div>

      {/* Guest / Code Lookup Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <form onSubmit={handleSearchCode} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Track guest emergency by Incident ID (e.g. RESQ-1047)..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Track Incident'}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {searchError}
          </p>
        )}
      </div>

      {/* Main Grid: Left List + Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Submitted Reports ({incidents.length})
          </h3>

          {incidents.length === 0 && !selectedIncident ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No active emergencies on record</p>
              <p className="text-xs text-slate-500">
                You currently have no emergency reports logged. In an emergency, broadcast an Emergency Distress SOS or launch the Emergency Report Wizard.
              </p>
              <button
                type="button"
                onClick={onNewSos}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Initiate Emergency Distress SOS
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {inc.incidentId}
                      </span>
                      <SeverityBadge severity={inc.severity} />
                    </div>

                    <p className="text-xs font-bold text-slate-800 truncate mb-1">
                      {inc.type}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <StatusBadge status={inc.status} />
                      <span className="font-mono">{formatDateTime(inc.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Incident Detail & Live Timeline */}
        <div className="lg:col-span-8">
          {selectedIncident ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              {/* Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl font-black text-slate-900 tracking-tight">
                      {selectedIncident.incidentId}
                    </span>
                    <SeverityBadge severity={selectedIncident.severity} />
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mt-1">
                    {selectedIncident.type}
                  </h4>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-500">
                  <span className="block font-medium">Logged Time:</span>
                  <span className="font-mono text-slate-700">{formatDateTime(selectedIncident.createdAt)}</span>
                </div>
              </div>

              {/* Location & Reported Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Dispatch Location</span>
                  </div>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    {selectedIncident.locationAddress}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    GPS Coordinates: {selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Casualty & Danger Indicators</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">PEOPLE</span>
                      <span className="font-bold text-slate-800">{selectedIncident.affectedPeople}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">INJURED</span>
                      <span className={`font-bold ${selectedIncident.isAnyoneInjured ? 'text-red-600' : 'text-slate-700'}`}>
                        {selectedIncident.isAnyoneInjured ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">TRAPPED</span>
                      <span className={`font-bold ${selectedIncident.isAnyoneTrapped ? 'text-red-600' : 'text-slate-700'}`}>
                        {selectedIncident.isAnyoneTrapped ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="text-xs">
                <span className="font-semibold text-slate-500 block mb-1">Situation Description:</span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed italic">
                  "{selectedIncident.description}"
                </p>
              </div>

              {/* Attached Evidence Photo if present */}
              {selectedIncident.photoStoragePath && (
                <div className="text-xs">
                  <span className="font-semibold text-slate-500 block mb-1">Attached Scene Evidence:</span>
                  <img
                    src={selectedIncident.photoStoragePath}
                    alt="Scene evidence"
                    className="max-h-60 rounded-xl border border-slate-200 object-cover shadow-2xs"
                  />
                </div>
              )}

              {/* Assigned Response Unit Info */}
              {(selectedIncident.assignedTeamName || selectedIncident.assignedResponderName) && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block">
                    Assigned Field Response Unit
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedIncident.assignedTeamName || 'Disaster Response Unit'}
                      </p>
                      {selectedIncident.assignedResponderName && (
                        <p className="text-xs text-slate-700 mt-0.5">
                          Lead Responder: <strong className="font-semibold">{selectedIncident.assignedResponderName}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Triage & Safety Guidance */}
              {selectedIncident.aiAssessment && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-blue-600" />
                      AI Incident Triage Assessment (Decision Support)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Priority Score: {selectedIncident.aiAssessment.priorityScore}/100
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {selectedIncident.aiAssessment.reasoning}
                  </p>

                  {selectedIncident.aiAssessment.safetyPrecautions && selectedIncident.aiAssessment.safetyPrecautions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-800 block mb-1">Recommended Safety Precautions:</span>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        {selectedIncident.aiAssessment.safetyPrecautions.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Status History Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Live Dispatch Progression & Audit History
                </h4>
                <IncidentTimeline history={history} />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select an incident from the left to view detailed dispatch updates and responder progression.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
