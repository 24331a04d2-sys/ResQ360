import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Send,
  UserCheck,
  Check,
  XCircle,
  Clock,
  Phone
} from 'lucide-react';
import { Incident, Team, Responder, UserProfile, IncidentStatus, StatusHistoryItem } from '../../types';
import {
  verifyIncident,
  assignIncident,
  updateIncidentStatus,
  reRunAiTriage,
  subscribeToStatusHistory
} from '../../services/incidentService';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { IncidentTimeline } from '../common/IncidentTimeline';

interface Props {
  incident: Incident | null;
  onClose: () => void;
  teams: Team[];
  responders: Responder[];
  adminUser: UserProfile;
  onIncidentUpdated: () => void;
}

export const IncidentDetailModal: React.FC<Props> = ({
  incident,
  onClose,
  teams,
  responders,
  adminUser,
  onIncidentUpdated
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedResponderId, setSelectedResponderId] = useState<string>('');
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Status transitions
  const [confirmResolution, setConfirmResolution] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    if (!incident) return;
    setSelectedTeamId(incident.assignedTeamId || '');
    setSelectedResponderId(incident.assignedResponderId || '');

    const unsub = subscribeToStatusHistory(incident.id, (hist) => {
      setStatusHistory(hist);
    });
    return () => unsub();
  }, [incident?.id]);

  if (!incident) return null;

  const handleVerify = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await verifyIncident(incident.id, adminUser);
      setFeedback('Incident verified for operational dispatch.');
      onIncidentUpdated();
    } catch (err: any) {
      setFeedback(err?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const teamObj = teams.find((t) => t.id === selectedTeamId);
      const respObj = responders.find((r) => r.responderId === selectedResponderId);

      await assignIncident(
        incident.id,
        {
          teamId: teamObj?.id,
          teamName: teamObj?.name,
          responderId: respObj?.responderId,
          responderName: respObj?.name,
          responderTeam: respObj?.teamType
        },
        adminUser
      );

      setFeedback('Unit deployment successfully updated.');
      onIncidentUpdated();
    } catch (err: any) {
      setFeedback(err?.message || 'Assignment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReRunTriage = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await reRunAiTriage(incident.id, adminUser);
      setFeedback('AI Triage recalculated with latest incident indicators.');
      onIncidentUpdated();
    } catch (err: any) {
      setFeedback(err?.message || 'Triage re-analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: IncidentStatus, note?: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      await updateIncidentStatus(
        incident.id,
        newStatus,
        {
          uid: adminUser.uid,
          name: adminUser.name,
          role: 'admin'
        },
        note || actionNote.trim() || undefined
      );

      setConfirmResolution(false);
      setConfirmCancellation(false);
      setActionNote('');
      setFeedback(`Status updated to ${newStatus.toUpperCase().replace('_', ' ')}.`);
      onIncidentUpdated();
    } catch (err: any) {
      setFeedback(err?.message || 'Status transition failed.');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold tracking-tight">
              {incident.incidentId}
            </span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.isDemo && (
              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Demo Baseline
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {feedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* AI Incident Triage Assessment Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    AI Incident Triage Assessment (Decision Support)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Calculated via {incident.aiAssessment?.modelUsed || 'Rule-Based Safety Baseline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  Priority: {incident.severityScore}/100
                </span>
                <button
                  type="button"
                  onClick={handleReRunTriage}
                  disabled={loading}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Re-Run AI Triage
                </button>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed font-medium">
              {incident.aiAssessment?.reasoning || 'Triage completed based on reported situational indicators.'}
            </p>

            {/* AI Risk Factors & Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Identified Hazard & Risk Factors:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {(incident.aiAssessment?.riskFactors || incident.severityFactors || ['Immediate life safety hazard']).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Recommended Dispatch Actions:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {(incident.aiAssessment?.recommendedActions || ['Verify caller coordinates', 'Stage nearest response unit']).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Units & Resources */}
            {incident.aiAssessment && (
              <div className="flex flex-wrap gap-4 pt-2 text-[11px] border-t border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold">Suggested Teams: </span>
                  <span className="font-bold text-slate-800">
                    {incident.aiAssessment.suggestedTeams.join(', ') || 'Disaster Response Unit 01'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Suggested Resources: </span>
                  <span className="font-bold text-slate-800">
                    {incident.aiAssessment.suggestedResources.join(', ') || 'Rescue Vehicles'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Incident Overview & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 block">
                Incident Overview
              </span>
              <div className="space-y-1 text-slate-600">
                <p><strong className="text-slate-900">Type:</strong> {incident.type}</p>
                <p><strong className="text-slate-900">People At Risk:</strong> {incident.affectedPeople} persons</p>
                <p><strong className="text-slate-900">Injured:</strong> {incident.isAnyoneInjured ? 'YES' : 'NO'}</p>
                <p><strong className="text-slate-900">Trapped:</strong> {incident.isAnyoneTrapped ? 'YES' : 'NO'}</p>
                <p><strong className="text-slate-900">Immediate Danger:</strong> {incident.isImmediateDanger ? 'YES' : 'NO'}</p>
                <p><strong className="text-slate-900">Reporter:</strong> {incident.citizenName} {incident.citizenPhone ? `(${incident.citizenPhone})` : ''}</p>
                <p><strong className="text-slate-900">Reported At:</strong> {formatDateTime(incident.createdAt)}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Dispatch Location & Coordinates
              </span>
              <p className="font-bold text-slate-900 leading-relaxed">
                {incident.locationAddress}
              </p>
              <p className="font-mono text-slate-500 text-[11px]">
                Latitude: {incident.latitude.toFixed(5)} • Longitude: {incident.longitude.toFixed(5)}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`, '_blank')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Open in External Map
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Caller Description
            </span>
            <p className="text-slate-800 italic leading-relaxed">
              "{incident.description}"
            </p>
          </div>

          {/* Photo Evidence if available */}
          {incident.photoStoragePath && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 block">
                Attached Incident Scene Photograph
              </span>
              <img
                src={incident.photoStoragePath}
                alt="Scene Evidence"
                className="max-h-72 rounded-lg border border-slate-200 object-cover shadow-2xs"
              />
            </div>
          )}

          {/* Human Dispatch Operations & Unit Assignment Controls */}
          <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Human Command Dispatch Operations
              </h4>
              {!incident.verifiedByAdmin && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Verify Incident
                </button>
              )}
            </div>

            {/* Team & Responder Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assign Response Team / Battalion:
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium"
                >
                  <option value="">-- No Team Assigned --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type}) - [{t.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assign Lead Field Responder:
                </label>
                <select
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium"
                >
                  <option value="">-- No Individual Responder Assigned --</option>
                  {responders.map((r) => (
                    <option key={r.responderId} value={r.responderId}>
                      {r.name} ({r.badgeNumber}) - [{r.availability.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAssign}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch & Update Assignment
              </button>
            </div>
          </div>

          {/* Status Progression & Lifecycle Transitions */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold uppercase tracking-wider text-slate-700 block text-xs">
              Operational Status Transition Controls:
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('acknowledged')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700"
              >
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('dispatched')}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-semibold"
              >
                Dispatched
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('en_route')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold"
              >
                En Route
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('arrived')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-semibold"
              >
                On Scene
              </button>
              <button
                type="button"
                onClick={() => setConfirmResolution(true)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                Mark Resolved
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancellation(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
              >
                Cancel Incident
              </button>
            </div>
          </div>

          {/* Status History Timeline */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-3 text-xs">
              Incident Status History & Audit Trail
            </h4>
            <IncidentTimeline history={statusHistory} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Dispatcher: {adminUser.name} ({adminUser.role.toUpperCase()})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg"
          >
            Close Inspector
          </button>
        </div>
      </div>

      {/* Confirmation Dialog: Resolve */}
      {confirmResolution && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900">Mark Incident as Resolved?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This concludes the emergency response mission for <strong>{incident.incidentId}</strong>, records field clearance, and releases assigned response personnel.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution Closure Note:
              </label>
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="e.g. Fire suppressed, casualties stabilized."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResolution(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('resolved', actionNote)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Cancel */}
      {confirmCancellation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-red-600">Cancel Emergency Incident?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling marks this emergency call as false alarm or duplicate. Assigned units will stand down.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation:
              </label>
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="e.g. False alarm reported by citizen caller."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancellation(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('cancelled', actionNote)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
