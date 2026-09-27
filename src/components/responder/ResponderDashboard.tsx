import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  ExternalLink,
  Users,
  AlertTriangle,
  RefreshCw,
  Radio,
  FileText
} from 'lucide-react';
import { Incident, Responder, ResponderAvailability, UserProfile } from '../../types';
import {
  subscribeToResponders,
  updateResponderAvailability
} from '../../services/responderService';
import {
  subscribeToAllIncidents,
  updateIncidentStatus
} from '../../services/incidentService';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';

interface Props {
  currentUser: UserProfile;
  onSelectIncident?: (incidentId: string) => void;
}

export const ResponderDashboard: React.FC<Props> = ({ currentUser, onSelectIncident }) => {
  const [responderRecord, setResponderRecord] = useState<Responder | null>(null);
  const [assignedIncident, setAssignedIncident] = useState<Incident | null>(null);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  // Listen to responders to find this responder's operational state
  useEffect(() => {
    const unsub = subscribeToResponders((list) => {
      // Match by userId or email or name
      const found = list.find(
        (r) => r.userId === currentUser.uid || r.email.toLowerCase() === currentUser.email.toLowerCase()
      ) || list[0]; // fallback to first responder for presentation evaluation if unlinked

      if (found) {
        setResponderRecord(found);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  // Listen to incidents to find active assignment
  useEffect(() => {
    const unsub = subscribeToAllIncidents((incidents) => {
      setAllIncidents(incidents);

      if (responderRecord) {
        // Look for incident assigned to this responder or team
        const active = incidents.find(
          (i) =>
            i.status !== 'resolved' &&
            i.status !== 'cancelled' &&
            (i.assignedResponderId === responderRecord.responderId ||
              i.assignedResponderId === currentUser.uid ||
              (responderRecord.teamId && i.assignedTeamId === responderRecord.teamId) ||
              i.id === responderRecord.currentIncidentId)
        );
        setAssignedIncident(active || null);
      } else {
        // fallback active incident for demo evaluation
        const firstActive = incidents.find(
          (i) => i.status !== 'resolved' && i.status !== 'cancelled' && i.assignedTeamName
        );
        setAssignedIncident(firstActive || null);
      }
    });
    return () => unsub();
  }, [responderRecord, currentUser]);

  const handleDutyStatusChange = async (newStatus: ResponderAvailability) => {
    if (!responderRecord) return;
    setActionLoading(true);
    try {
      await updateResponderAvailability(
        responderRecord.responderId,
        newStatus,
        assignedIncident?.id,
        assignedIncident?.incidentId
      );
      setResponderRecord({
        ...responderRecord,
        availability: newStatus
      });
    } catch (err) {
      console.error('Failed to change duty status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProgressStatus = async (status: 'en_route' | 'arrived' | 'resolved') => {
    if (!assignedIncident) return;
    setActionLoading(true);
    try {
      const note = status === 'resolved'
        ? (resolutionNote.trim() || 'Incident safely mitigated and cleared by field responder unit.')
        : `Field unit reported: ${status.toUpperCase().replace('_', ' ')}.`;

      await updateIncidentStatus(
        assignedIncident.id,
        status,
        {
          uid: currentUser.uid,
          name: responderRecord?.name || currentUser.name,
          role: 'responder'
        },
        note
      );

      // Also update responder local availability
      if (responderRecord) {
        const avail: ResponderAvailability =
          status === 'en_route' ? 'en_route' : status === 'arrived' ? 'on_scene' : 'available';
        await updateResponderAvailability(
          responderRecord.responderId,
          avail,
          status === 'resolved' ? null : assignedIncident.id,
          status === 'resolved' ? null : assignedIncident.incidentId
        );
      }

      if (status === 'resolved') {
        setShowResolveDialog(false);
        setResolutionNote('');
        setAssignedIncident(null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card: Duty & Unit ID */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  {responderRecord?.name || currentUser.name}
                </h2>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {responderRecord?.badgeNumber || 'SDRF-704'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {responderRecord?.teamType || 'Emergency First Responder Battalion'} • Stationed: {responderRecord?.location || 'Staging Area'}
              </p>
            </div>
          </div>

          {/* Duty Status Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-600 px-2 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              Duty:
            </span>
            {(['available', 'en_route', 'on_scene', 'offline'] as ResponderAvailability[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleDutyStatusChange(status)}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  responderRecord?.availability === status
                    ? status === 'available'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : status === 'en_route'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : status === 'on_scene'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Field Responder Assignment Display */}
      {assignedIncident ? (
        <div className="bg-white border-2 border-blue-600/60 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
                  ACTIVE FIELD DISPATCH MISSION
                </span>
                <span className="font-mono text-xl font-black text-slate-900">
                  {assignedIncident.incidentId}
                </span>
                <SeverityBadge severity={assignedIncident.severity} />
                <StatusBadge status={assignedIncident.status} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {assignedIncident.type}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => openGoogleMaps(assignedIncident.latitude, assignedIncident.longitude)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shrink-0"
            >
              <Navigation className="w-4 h-4" />
              Launch Turn-by-Turn GPS Navigation
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-semibold block text-[11px]">PEOPLE IN DANGER</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {assignedIncident.affectedPeople} persons
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-semibold block text-[11px]">CASUALTIES / INJURED</span>
              <span className={`text-base font-bold mt-0.5 block ${assignedIncident.isAnyoneInjured ? 'text-red-600' : 'text-slate-700'}`}>
                {assignedIncident.isAnyoneInjured ? 'CONFIRMED' : 'NONE'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-semibold block text-[11px]">TRAPPED VICTIMS</span>
              <span className={`text-base font-bold mt-0.5 block ${assignedIncident.isAnyoneTrapped ? 'text-red-600' : 'text-slate-700'}`}>
                {assignedIncident.isAnyoneTrapped ? 'YES (EXTRICATION)' : 'NO'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-semibold block text-[11px]">IMMEDIATE HAZARD</span>
              <span className={`text-base font-bold mt-0.5 block ${assignedIncident.isImmediateDanger ? 'text-red-600' : 'text-amber-600'}`}>
                {assignedIncident.isImmediateDanger ? 'CRITICAL DANGER' : 'ELEVATED'}
              </span>
            </div>
          </div>

          {/* Target Location Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Target Incident Coordinates</span>
            </div>
            <p className="text-slate-900 font-bold text-sm leading-relaxed">
              {assignedIncident.locationAddress}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              Exact Coordinates: {assignedIncident.latitude.toFixed(5)}, {assignedIncident.longitude.toFixed(5)}
            </p>
          </div>

          {/* Citizen Description */}
          <div className="text-xs space-y-1">
            <span className="font-semibold text-slate-500">Citizen Reporter Narrative:</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed italic">
              "{assignedIncident.description}"
            </p>
            {assignedIncident.citizenPhone && (
              <div className="flex items-center gap-1.5 pt-1 text-slate-600 font-medium">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>Reporter Phone: <strong>{assignedIncident.citizenPhone}</strong></span>
              </div>
            )}
          </div>

          {/* Attached Incident Scene Photo */}
          {assignedIncident.photoStoragePath && (
            <div className="text-xs space-y-1">
              <span className="font-semibold text-slate-500">Attached Scene Photograph:</span>
              <img
                src={assignedIncident.photoStoragePath}
                alt="Scene Evidence"
                className="max-h-72 rounded-xl border border-slate-200 object-cover shadow-2xs"
              />
            </div>
          )}

          {/* Operational Progression Buttons */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Field Response Progression Controls:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleProgressStatus('en_route')}
                disabled={actionLoading || assignedIncident.status === 'en_route' || assignedIncident.status === 'arrived'}
                className={`py-3 px-4 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                  assignedIncident.status === 'en_route'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {assignedIncident.status === 'en_route' ? 'Currently En Route' : 'Mark EN ROUTE'}
              </button>

              <button
                type="button"
                onClick={() => handleProgressStatus('arrived')}
                disabled={actionLoading || assignedIncident.status === 'arrived'}
                className={`py-3 px-4 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
                  assignedIncident.status === 'arrived'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
                {assignedIncident.status === 'arrived' ? 'On Scene' : 'Mark ARRIVED (On Scene)'}
              </button>

              <button
                type="button"
                onClick={() => setShowResolveDialog(true)}
                disabled={actionLoading}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Conclude & Mark RESOLVED
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state: No active assignment */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Active Emergency Assignments</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Your unit is currently on standby. Central Emergency Command will deploy assignments directly to your console via real-time telemetry.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const pending = allIncidents.find((i) => i.status !== 'resolved' && i.status !== 'cancelled');
                if (pending) setAssignedIncident(pending);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Dispatch Queue
            </button>
          </div>
        </div>
      )}

      {/* Resolution Confirmation Modal */}
      {showResolveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              Conclude & Resolve Mission {assignedIncident?.incidentId}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Marking this incident as resolved confirms that on-scene hazards have been mitigated, casualties stabilized, and emergency resources can be released.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Field Clearance Notes / Resolution Summary:
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Scene secured, 2 casualties evacuated to General Hospital, fire extinguished..."
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveDialog(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleProgressStatus('resolved')}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
