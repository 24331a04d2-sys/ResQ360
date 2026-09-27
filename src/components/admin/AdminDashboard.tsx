import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  AlertOctagon,
  Map,
  Users,
  Package,
  Shield,
  FileSpreadsheet,
  Settings,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  Database,
  Cpu,
  Radio,
  Sliders,
  Trash2,
  Wrench,
  Truck,
  Stethoscope,
  LifeBuoy,
  Flame,
  Activity,
  Zap,
  Check,
  AlertCircle,
  User,
  LogOut,
  X
} from 'lucide-react';
import {
  Incident,
  Team,
  Responder,
  EmergencyResource,
  AuditLogEntry,
  UserProfile,
  AdminStats,
  SeverityLevel,
  IncidentStatus
} from '../../types';
import { subscribeToAllIncidents } from '../../services/incidentService';
import { subscribeToTeams, createTeam, deleteTeam } from '../../services/teamService';
import { subscribeToResponders, registerResponder, deleteResponder } from '../../services/responderService';
import { subscribeToResources, updateResourceStock } from '../../services/resourceService';
import { subscribeToAuditLogs, exportIncidentsToCsv } from '../../services/auditService';
import { resetOperationalBaseline, ensureIndiaBaselineData, INDIA_RESOURCES } from '../../services/demoService';
import { SeverityBadge } from '../common/SeverityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { IncidentDetailModal } from './IncidentDetailModal';
import { GeospatialMap } from './GeospatialMap';

interface Props {
  currentUser: UserProfile;
}

type AdminTab =
  | 'overview'
  | 'emergencies'
  | 'map'
  | 'teams'
  | 'resources'
  | 'responders'
  | 'audit'
  | 'settings';

export const AdminDashboard: React.FC<Props> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('resources');

  // Realtime collections
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Selection / Modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showRegisterResponderModal, setShowRegisterResponderModal] = useState(false);
  const [showResetBaselineModal, setShowResetBaselineModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPopulatingBaseline, setIsPopulatingBaseline] = useState(false);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters for emergencies table
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Register responder form
  const [newRespName, setNewRespName] = useState('');
  const [newRespPhone, setNewRespPhone] = useState('');
  const [newRespEmail, setNewRespEmail] = useState('');
  const [newRespBadge, setNewRespBadge] = useState('');
  const [newRespTeamType, setNewRespTeamType] = useState('Advanced Emergency Life Support');
  const [newRespPassword, setNewRespPassword] = useState('Responder#2026');
  const [newRespTeamId, setNewRespTeamId] = useState('');

  // Enroll new team form
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState('Hydrological & Cyclone Rescue');
  const [newTeamMemberCount, setNewTeamMemberCount] = useState(10);
  const [newTeamStation, setNewTeamStation] = useState('');
  const [newTeamBaseLocation, setNewTeamBaseLocation] = useState('');
  const [newTeamVehicles, setNewTeamVehicles] = useState('');
  const [newTeamEquipment, setNewTeamEquipment] = useState('');
  const [newTeamContact, setNewTeamContact] = useState('');

  // Search & filter states for teams
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('all');
  const [teamTypeFilter, setTeamTypeFilter] = useState('all');

  // Search & filter states for responders
  const [responderSearch, setResponderSearch] = useState('');
  const [responderAvailabilityFilter, setResponderAvailabilityFilter] = useState('all');
  const [responderTeamFilter, setResponderTeamFilter] = useState('all');

  // Attach Firestore realtime listeners & ensure baseline exists
  useEffect(() => {
    ensureIndiaBaselineData();

    const unsubIncidents = subscribeToAllIncidents(setIncidents);
    const unsubTeams = subscribeToTeams(setTeams);
    const unsubResponders = subscribeToResponders(setResponders);
    const unsubResources = subscribeToResources(setResources);
    const unsubLogs = subscribeToAuditLogs(setAuditLogs);

    return () => {
      unsubIncidents();
      unsubTeams();
      unsubResponders();
      unsubResources();
      unsubLogs();
    };
  }, []);

  // Calculate Operational Metrics
  const activeEmergencies = incidents.filter(
    (i) => i.status !== 'resolved' && i.status !== 'cancelled'
  );
  const criticalEmergencies = activeEmergencies.filter((i) => i.severity === 'CRITICAL');
  const highEmergencies = activeEmergencies.filter((i) => i.severity === 'HIGH');
  const awaitingVerification = activeEmergencies.filter((i) => !i.verifiedByAdmin);
  const availableResponders = responders.filter((r) => r.availability === 'available');
  const availableTeams = teams.filter((t) => t.status === 'available');

  const resolvedToday = incidents.filter((i) => {
    if (i.status !== 'resolved') return false;
    const now = new Date();
    const resolvedDate = i.resolvedAt?.toDate ? i.resolvedAt.toDate() : (i.resolvedAt ? new Date(i.resolvedAt) : null);
    if (!resolvedDate) return false;
    return resolvedDate.toDateString() === now.toDateString();
  });

  const handleResetBaseline = async () => {
    setIsResetting(true);
    setActionSuccess(null);
    try {
      await resetOperationalBaseline(currentUser);
      setShowResetBaselineModal(false);
      setActionSuccess('Operational baseline reset successfully. Seeded representative demo dataset.');
    } catch (err: any) {
      console.error(err);
      alert('Failed to reset baseline: ' + err?.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRegisterResponderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedTeam = teams.find(t => t.id === newRespTeamId);
      await registerResponder(
        {
          name: newRespName,
          phone: newRespPhone,
          email: newRespEmail,
          badgeNumber: newRespBadge,
          teamType: assignedTeam?.type || newRespTeamType,
          teamId: newRespTeamId || undefined,
          password: newRespPassword || 'Responder#2026'
        },
        currentUser
      );
      setShowRegisterResponderModal(false);
      setActionSuccess(`Field Responder ${newRespName} enrolled! Operational Email: ${newRespEmail}, Security Key: ${newRespPassword || 'Responder#2026'}. They can log in immediately via Staff Portal.`);
      setNewRespName('');
      setNewRespPhone('');
      setNewRespEmail('');
      setNewRespBadge('');
      setNewRespPassword('Responder#2026');
      setNewRespTeamId('');
    } catch (err: any) {
      alert('Error registering responder: ' + err?.message);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createTeam(
        {
          name: newTeamName.trim(),
          type: newTeamType,
          memberCount: Number(newTeamMemberCount) || 8,
          status: 'available',
          currentIncidentId: null,
          currentIncidentCode: null,
          contact: newTeamContact.trim() || '+91 11 2436 0000',
          station: newTeamStation.trim() || 'Central Regional Operations Hub',
          baseLocation: newTeamBaseLocation.trim() || 'Command Staging Bay',
          vehicles: newTeamVehicles.trim() || 'Rapid Emergency Response Interceptors',
          equipment: newTeamEquipment.trim() || 'Tactical Gear, Communication Radios, Emergency Medical Packs',
          isDemo: false
        },
        currentUser
      );
      setShowCreateTeamModal(false);
      setActionSuccess(`New Response Team "${created.name}" (${created.type}) commissioned with ${created.memberCount} certified personnel.`);
      setNewTeamName('');
      setNewTeamStation('');
      setNewTeamBaseLocation('');
      setNewTeamVehicles('');
      setNewTeamEquipment('');
      setNewTeamContact('');
    } catch (err: any) {
      alert('Error creating team: ' + err?.message);
    }
  };

  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to disband tactical response team "${name}"?`)) return;
    try {
      await deleteTeam(teamId, currentUser);
      setActionSuccess(`Response team "${name}" disbanded.`);
    } catch (err: any) {
      alert('Error disbanding team: ' + err?.message);
    }
  };

  const handleDeleteResponder = async (responderId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to de-register field responder "${name}"?`)) return;
    try {
      await deleteResponder(responderId, currentUser);
      setActionSuccess(`Field responder "${name}" removed from roster.`);
    } catch (err: any) {
      alert('Error removing responder: ' + err?.message);
    }
  };

  const handleQuickSeedBaseline = async () => {
    setIsPopulatingBaseline(true);
    setActionSuccess(null);
    try {
      await ensureIndiaBaselineData();
      setActionSuccess('Successfully synchronized baseline operational units and responders.');
    } catch (err: any) {
      console.error(err);
      alert('Error populating baseline: ' + err?.message);
    } finally {
      setIsPopulatingBaseline(false);
    }
  };

  const handleStepResource = async (res: EmergencyResource, delta: number) => {
    const total = res.totalQuantity || 1;
    const currentAllocated = res.allocatedQuantity || 0;
    const newAllocated = Math.max(0, Math.min(total, currentAllocated + delta));
    if (newAllocated === currentAllocated) return;

    // Optimistic local state update for instant UI feedback
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === res.id) {
          const avail = Math.max(0, total - newAllocated);
          return {
            ...r,
            allocatedQuantity: newAllocated,
            availableQuantity: avail
          };
        }
        return r;
      })
    );

    try {
      await updateResourceStock(
        res.id,
        {
          totalQuantity: total,
          allocatedQuantity: newAllocated
        },
        currentUser
      );
    } catch (err: any) {
      console.error('Error updating resource stock count:', err);
    }
  };

  const handleRefreshInventory = async () => {
    setIsRefreshingInventory(true);
    try {
      await ensureIndiaBaselineData();
      setActionSuccess('Resource logistics inventory synchronized with regional staging depot.');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRefreshingInventory(false);
    }
  };

  // Filtered teams for Response Teams tab
  const filteredTeams = teams.filter((t) => {
    const q = teamSearch.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      t.name.toLowerCase().includes(q) ||
      (t.station || '').toLowerCase().includes(q) ||
      (t.vehicles || '').toLowerCase().includes(q) ||
      (t.equipment || '').toLowerCase().includes(q) ||
      (t.type || '').toLowerCase().includes(q);
    const matchesStatus = teamStatusFilter === 'all' || t.status === teamStatusFilter;
    const matchesType = teamTypeFilter === 'all' || t.type === teamTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Filtered responders for Responders tab
  const filteredResponders = responders.filter((r) => {
    const q = responderSearch.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      r.name.toLowerCase().includes(q) ||
      r.badgeNumber.toLowerCase().includes(q) ||
      (r.phone || '').includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.teamType || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q);
    const matchesAvail = responderAvailabilityFilter === 'all' || r.availability === responderAvailabilityFilter;
    const matchesTeam = responderTeamFilter === 'all' || r.teamType === responderTeamFilter;
    return matchesSearch && matchesAvail && matchesTeam;
  });

  // Dynamic filter dropdown lists
  const availableTeamTypes = Array.from(new Set(teams.map((t) => t.type))).filter(Boolean);
  const availableResponderSpecializations = Array.from(new Set(responders.map((r) => r.teamType))).filter(Boolean);

  // Filtered incidents for emergencies table
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (inc.incidentId || '').toLowerCase().includes(q);
      const matchType = (inc.type || '').toLowerCase().includes(q);
      const matchLoc = (inc.locationAddress || '').toLowerCase().includes(q);
      const matchName = (inc.citizenName || '').toLowerCase().includes(q);
      if (!matchId && !matchType && !matchLoc && !matchName) return false;
    }
    return true;
  });

  const formatDateTime = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Dark/Navy Sidebar for Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight block text-sm">ADMIN OPS</span>
              <span className="text-[10px] text-slate-400 font-mono">Central Command Hub</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            ONLINE
          </span>
        </div>

        {/* Sidebar Navigation Matching Image 3 */}
        <nav className="p-3 space-y-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('emergencies')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'emergencies' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-4 h-4" />
              <span>Emergencies</span>
            </div>
            <span className="w-5 h-5 rounded-full text-[10px] font-bold bg-[#E0042A] text-white flex items-center justify-center">
              {activeEmergencies.length > 0 ? activeEmergencies.length : 7}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'map' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Incident Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'teams' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>Response Teams</span>
            </div>
          </button>

          {/* Equipment & Stock active tab in Image 3 */}
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'resources' ? 'bg-[#E0042A] text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Equipment & Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('responders')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'responders' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4" />
              <span>Responders</span>
            </div>
            <span className="w-5 h-5 rounded-full text-[10px] font-bold bg-[#E0042A] text-white flex items-center justify-center">
              {responders.length > 0 ? responders.length : 7}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'audit' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Audit Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'settings' ? 'bg-[#E0042A] text-white font-bold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Dispatcher footer Matching Image 3 */}
        <div className="p-4 mt-auto border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-white text-xs truncate">
                {currentUser.name || 'Director Rajesh Nair'}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ROLE: ADMIN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="mt-3 w-full flex items-center gap-2 text-slate-400 hover:text-white text-xs font-medium pt-2 border-t border-slate-800/80 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Operator</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CENTRAL EMERGENCY COMMAND
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Command Operations Overview
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('emergencies')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  View All Queue
                </button>
              </div>
            </div>

            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Active Emergencies
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {activeEmergencies.length}
                  </span>
                  <span className="text-[11px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Live active incident queue</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Critical Emergencies
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-black text-red-600 font-mono">
                    {criticalEmergencies.length}
                  </span>
                  <span className="text-[11px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">
                    PRIORITY 1
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Immediate threat to life</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Available Responders
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {availableResponders.length} <span className="text-xs text-slate-400 font-normal">/ {responders.length}</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    READY
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Field personnel on duty</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Resolved Today
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-3xl font-black text-emerald-600 font-mono">
                    {resolvedToday.length}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    CLEARED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Incidents completed</p>
              </div>
            </div>

            {/* Secondary Operational Stats Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">TOTAL INCIDENTS</span>
                <span className="text-lg font-black text-slate-800 font-mono">{incidents.length}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">HIGH SEVERITY</span>
                <span className="text-lg font-black text-amber-600 font-mono">{highEmergencies.length}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">AWAITING VERIFY</span>
                <span className="text-lg font-black text-blue-600 font-mono">{awaitingVerification.length}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">ACTIVE RESPONSES</span>
                <span className="text-lg font-black text-indigo-600 font-mono">
                  {incidents.filter((i) => i.status === 'en_route' || i.status === 'arrived').length}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">AVAILABLE TEAMS</span>
                <span className="text-lg font-black text-emerald-600 font-mono">
                  {availableTeams.length} / {teams.length}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 font-semibold block text-[10px]">STANDBY RESPONDERS</span>
                <span className="text-lg font-black text-slate-700 font-mono">
                  {availableResponders.length} / {responders.length}
                </span>
              </div>
            </div>

            {/* Live Active Incident Queue preview */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Live Active Emergency Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time operational distress calls awaiting verification, assignment, or completion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('emergencies')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  View All ({incidents.length})
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {activeEmergencies.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No active emergencies in queue. All systems operating at normal readiness.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="pb-3 font-semibold">Incident ID</th>
                        <th className="pb-3 font-semibold">Category</th>
                        <th className="pb-3 font-semibold">Location</th>
                        <th className="pb-3 font-semibold">Severity</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Time</th>
                        <th className="pb-3 font-semibold">Assigned Unit</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeEmergencies.slice(0, 5).map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-900">
                            {inc.incidentId}
                          </td>
                          <td className="py-3 font-medium text-slate-800">
                            {inc.type}
                          </td>
                          <td className="py-3 text-slate-600 max-w-xs truncate">
                            {inc.locationAddress}
                          </td>
                          <td className="py-3">
                            <SeverityBadge severity={inc.severity} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={inc.status} />
                          </td>
                          <td className="py-3 font-mono text-slate-500">
                            {formatDateTime(inc.createdAt)}
                          </td>
                          <td className="py-3 font-medium text-slate-700">
                            {inc.assignedTeamName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(inc)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-bold rounded-lg border border-slate-300 transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EMERGENCIES QUEUE TABLE */}
        {activeTab === 'emergencies' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  DISPATCH MANAGEMENT
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Incident Reports & Dispatch Queue
                </h2>
              </div>

              <button
                type="button"
                onClick={() => exportIncidentsToCsv(filteredIncidents)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, keyword, address, or reporter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="reported">Reported</option>
                  <option value="ai_analyzed">AI Analyzed</option>
                  <option value="verified">Verified</option>
                  <option value="assigned">Assigned</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="en_route">En Route</option>
                  <option value="arrived">Arrived (On Scene)</option>
                  <option value="resolved">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  <option value="all">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Incident ID</th>
                      <th className="py-3.5 px-4 font-semibold">Type</th>
                      <th className="py-3.5 px-4 font-semibold">Location</th>
                      <th className="py-3.5 px-4 font-semibold">Severity</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">Reported Time</th>
                      <th className="py-3.5 px-4 font-semibold">Assigned Unit</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No matching incidents found.
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inc.incidentId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {inc.type}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {inc.locationAddress}
                          </td>
                          <td className="py-3 px-4">
                            <SeverityBadge severity={inc.severity} />
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={inc.status} />
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {formatDateTime(inc.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {inc.assignedTeamName || (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(inc)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors border border-blue-200"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GEOSPATIAL INCIDENT MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SATELLITE & GIS DISPATCH
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Geospatial Incident Map
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time emergency coordinates and responder deployments
              </p>
            </div>

            <GeospatialMap
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          </div>
        )}

        {/* TAB 4: RESPONSE TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  TACTICAL UNITS & BATTALIONS
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Emergency Response Teams & Readiness
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-disciplinary rescue battalions, paramedic strike teams, and hazardous emergency forces
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickSeedBaseline}
                  disabled={isPopulatingBaseline}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  title="Ensure all baseline Indian tactical units are loaded"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPopulatingBaseline ? 'animate-spin' : ''}`} />
                  Sync Baseline Teams
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Enroll Response Team
                </button>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Total Teams</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{teams.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Tactical strike units</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Standby Available</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{availableTeams.length}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Ready for immediate dispatch</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Active Dispatches</span>
                  <Activity className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  {teams.filter(t => t.status === 'dispatched' || t.status === 'responding').length}
                </div>
                <div className="text-[11px] text-amber-600 mt-0.5">Engaged on missions</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Certified Strength</span>
                  <Shield className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                  {teams.reduce((acc, t) => acc + (t.memberCount || 0), 0)}
                </div>
                <div className="text-[11px] text-indigo-600 mt-0.5">Operational personnel</div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search teams by name, station, equipment, or vehicle..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={teamStatusFilter}
                  onChange={(e) => setTeamStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  <option value="all">All Statuses ({teams.length})</option>
                  <option value="available">Available ({teams.filter(t => t.status === 'available').length})</option>
                  <option value="dispatched">Dispatched ({teams.filter(t => t.status === 'dispatched').length})</option>
                  <option value="responding">Responding ({teams.filter(t => t.status === 'responding').length})</option>
                  <option value="busy">Busy ({teams.filter(t => t.status === 'busy').length})</option>
                  <option value="maintenance">Maintenance</option>
                </select>

                <select
                  value={teamTypeFilter}
                  onChange={(e) => setTeamTypeFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium max-w-[200px] truncate"
                >
                  <option value="all">All Specializations</option>
                  {availableTeamTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teams Grid / Empty State */}
            {filteredTeams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">No Response Teams Found</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {teams.length === 0
                      ? 'No operational response teams are currently registered in the database. Initialize the standard Indian disaster response battalion roster or enroll a new unit.'
                      : 'No response teams match your current search query and filters.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleQuickSeedBaseline}
                    disabled={isPopulatingBaseline}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPopulatingBaseline ? 'animate-spin' : ''}`} />
                    Seed Baseline Response Teams
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Enroll New Team
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">{t.name}</h3>
                          <span className="inline-block mt-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {t.type}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            t.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : t.status === 'dispatched' || t.status === 'responding'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600 mt-3">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span><strong className="text-slate-800">{t.memberCount}</strong> certified responders</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Map className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-700">Station:</strong> {t.station || 'Regional Operations Hub'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-700">Apparatus:</strong> {t.vehicles || 'Rapid Response Transport'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong className="text-slate-700">Gear:</strong> {t.equipment || 'Standard First Response Kit'}</span>
                        </div>
                        {t.contact && (
                          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                            <span>📞 {t.contact}</span>
                          </div>
                        )}
                        {t.currentIncidentCode && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-bold flex items-center justify-between">
                            <span>Mission: {t.currentIncidentCode}</span>
                            <span className="text-[10px] uppercase text-blue-600">Active</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono">ID: {t.id}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Disband Team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: EQUIPMENT & STOCK MATCHING IMAGE 3 */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Emergency Logistics & Resource Inventory
                  </h2>
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    6 Stock Categories
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time tracking and field mobilization of critical rescue apparatus, vehicles, and disaster medical kits
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefreshInventory}
                disabled={isRefreshingInventory}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 border border-slate-200 shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInventory ? 'animate-spin' : ''}`} />
                <span>Refresh Inventory</span>
              </button>
            </div>

            {/* 6 Stock Cards Grid Matching Image 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(resources.length > 0 ? resources : (INDIA_RESOURCES as EmergencyResource[])).map((r) => {
                const total = r.totalQuantity || 1;
                const deployed = r.allocatedQuantity || 0;
                const available = r.availableQuantity ?? Math.max(0, total - deployed);
                const allocationRatio = Math.round((deployed / total) * 100);
                const isMedical = (r.category || '').toLowerCase().includes('medical');

                return (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top icon and titles */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          {isMedical ? (
                            <Activity className="w-5 h-5 text-slate-700" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-700" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-base font-bold text-slate-900 leading-snug">{r.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {r.category} • {r.location || 'Depot'}
                          </p>
                        </div>
                      </div>

                      {/* 3-column stats block matching Image 3 */}
                      <div className="grid grid-cols-3 gap-2 py-3 px-2 my-4 text-center bg-slate-50/80 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">TOTAL</span>
                          <span className="text-base font-black text-slate-900 font-mono">{total}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">DEPLOYED</span>
                          <span className="text-base font-black text-rose-600 font-mono">{deployed}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">AVAILABLE</span>
                          <span className="text-base font-black text-emerald-600 font-mono">{available}</span>
                        </div>
                      </div>

                      {/* Deployed Allocation bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-500">Deployed Allocation</span>
                          <span className="font-bold text-slate-800 font-mono">{allocationRatio}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, allocationRatio))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stepper Footer matching Image 3 */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        DEPLOY / RETURN:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStepResource(r as EmergencyResource, -1)}
                          disabled={deployed <= 0}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                          {deployed}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStepResource(r as EmergencyResource, 1)}
                          disabled={deployed >= total}
                          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: RESPONDERS */}
        {activeTab === 'responders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  FIELD PERSONNEL & SPECIALISTS
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Field Responders Directory & Roster
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified emergency medical technicians, fire commanders, Hazmat technicians, and search & rescue officers
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickSeedBaseline}
                  disabled={isPopulatingBaseline}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                  title="Ensure all baseline Indian field responders are registered"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPopulatingBaseline ? 'animate-spin' : ''}`} />
                  Sync Baseline Responders
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterResponderModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Register Field Responder
                </button>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Total Personnel</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{responders.length}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Active field responders</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Available on Standby</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">{availableResponders.length}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Ready to mobilize</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Deployed In Field</span>
                  <Activity className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
                  {responders.filter(r => r.availability === 'on_scene' || r.availability === 'en_route').length}
                </div>
                <div className="text-[11px] text-amber-600 mt-0.5">On scene / En route</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Specializations</span>
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-purple-600 mt-1 font-mono">
                  {availableResponderSpecializations.length}
                </div>
                <div className="text-[11px] text-purple-600 mt-0.5">Emergency disciplines</div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search responders by name, badge ID, phone, email, or team..."
                  value={responderSearch}
                  onChange={(e) => setResponderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={responderAvailabilityFilter}
                  onChange={(e) => setResponderAvailabilityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
                >
                  <option value="all">All Availabilities ({responders.length})</option>
                  <option value="available">Available ({responders.filter(r => r.availability === 'available').length})</option>
                  <option value="en_route">En Route ({responders.filter(r => r.availability === 'en_route').length})</option>
                  <option value="on_scene">On Scene ({responders.filter(r => r.availability === 'on_scene').length})</option>
                  <option value="offline">Offline ({responders.filter(r => r.availability === 'offline').length})</option>
                </select>

                <select
                  value={responderTeamFilter}
                  onChange={(e) => setResponderTeamFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium max-w-[200px] truncate"
                >
                  <option value="all">All Disciplines</option>
                  {availableResponderSpecializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Responders Table / Empty State */}
            {filteredResponders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">No Field Responders Found</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {responders.length === 0
                      ? 'No field personnel records are currently stored in the directory. Populate the verified Indian responders baseline or register a new personnel record.'
                      : 'No responders match your current search query and filters.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleQuickSeedBaseline}
                    disabled={isPopulatingBaseline}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPopulatingBaseline ? 'animate-spin' : ''}`} />
                    Seed Baseline Responders
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegisterResponderModal(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register Field Responder
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Badge / ID</th>
                        <th className="py-3 px-4 font-semibold">Name & Contact</th>
                        <th className="py-3 px-4 font-semibold">Specialization Team</th>
                        <th className="py-3 px-4 font-semibold">Availability</th>
                        <th className="py-3 px-4 font-semibold">Current Mission</th>
                        <th className="py-3 px-4 font-semibold">Staging Location</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResponders.map((r) => (
                        <tr key={r.responderId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {r.badgeNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{r.name}</p>
                            <p className="text-[11px] text-slate-500">{r.phone} • {r.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800 block">{r.teamType}</span>
                            {r.teamId && (
                              <span className="text-[10px] text-slate-400 font-mono">Unit: {r.teamId}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.availability === 'available'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : r.availability === 'en_route'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : r.availability === 'on_scene'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {r.availability.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                            {r.currentIncidentCode || <span className="text-slate-400 font-normal italic">None</span>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {r.location || 'Central Staging'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteResponder(r.responderId, r.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="De-register Responder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: AUDIT REPORTS */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  COMPLIANCE & AUDIT LOGS
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Incident Reports & Dispatch History
                </h2>
              </div>

              <button
                type="button"
                onClick={() => exportIncidentsToCsv(incidents)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Incident Data (CSV)
              </button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Operational Event Log ({auditLogs.length} events)
                </span>
                <span className="text-[11px] text-slate-500">Immutable Firestore Log</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                      <th className="py-3 px-4 font-semibold">Operator / Actor</th>
                      <th className="py-3 px-4 font-semibold">Target Entity</th>
                      <th className="py-3 px-4 font-semibold">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 font-mono">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {log.actorName} ({log.actorRole})
                        </td>
                        <td className="py-2.5 px-4 font-mono text-blue-700">
                          {log.targetCode || log.targetType}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-md truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SETTINGS & DEMO CONTROLS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SYSTEM CONFIGURATION
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Platform Diagnostic & Operational Settings
              </h2>
            </div>

            {/* Diagnostic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Cloud Firestore</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real-time database connection active on Enterprise edition. Synchronizing incidents, responders, and audit records.
                </p>
                <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  CONNECTED
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span>Gemini AI Triage Engine</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Secure server-side AI evaluation with deterministic safety fallback active. Analyzes life-safety severity scores.
                </p>
                <span className="inline-block text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  gemini-3.8-flash ACTIVE
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>Firebase Storage</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Secure incident scene evidence bucket active. Enforces size boundaries (&lt; 5MB) and type authorization.
                </p>
                <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ONLINE
                </span>
              </div>
            </div>

            {/* Controlled Baseline Reset Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Incident Baseline & Status Reset
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                    Resets demo incidents (RESQ-1042 through RESQ-1046), initial response teams, responders, and logistics stock to default presentation state. Preserves real user accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetBaselineModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  Reset Operational Baseline
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Inspect Incident Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          teams={teams}
          responders={responders}
          adminUser={currentUser}
          onIncidentUpdated={() => {
            // Updated in realtime by Firestore listeners
          }}
        />
      )}

      {/* Register Responder Modal */}
      {showRegisterResponderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b">
              <h4 className="text-base font-bold text-slate-900">Register Field Responder</h4>
              <button type="button" onClick={() => setShowRegisterResponderModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterResponderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newRespName}
                  onChange={(e) => setNewRespName(e.target.value)}
                  placeholder="Officer S. Rao"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Contact</label>
                <input
                  type="tel"
                  required
                  value={newRespPhone}
                  onChange={(e) => setNewRespPhone(e.target.value)}
                  placeholder="+91 98480 33445"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Email</label>
                <input
                  type="email"
                  required
                  value={newRespEmail}
                  onChange={(e) => setNewRespEmail(e.target.value)}
                  placeholder="s.rao@resq360.ops"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Badge Number</label>
                <input
                  type="text"
                  required
                  value={newRespBadge}
                  onChange={(e) => setNewRespBadge(e.target.value)}
                  placeholder="SDRF-810"
                  className="w-full px-3 py-2 border rounded-lg uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign to Active Response Team (Optional)</label>
                <select
                  value={newRespTeamId}
                  onChange={(e) => {
                    setNewRespTeamId(e.target.value);
                    const selected = teams.find(t => t.id === e.target.value);
                    if (selected) setNewRespTeamType(selected.type);
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">-- Standalone / Unassigned --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization Capability</label>
                <select
                  value={newRespTeamType}
                  onChange={(e) => setNewRespTeamType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Advanced Emergency Life Support">Advanced Emergency Life Support</option>
                  <option value="Rapid Paramedic First Response">Rapid Paramedic First Response</option>
                  <option value="Structural Firefighting & Extrication">Structural Firefighting & Extrication</option>
                  <option value="Hydrological & Cyclone Rescue">Hydrological & Cyclone Rescue</option>
                  <option value="Chemical & Hazmat Emergency Force">Chemical & Hazmat Emergency Force</option>
                  <option value="Coastal Marine & Flood Rescue">Coastal Marine & Flood Rescue</option>
                  <option value="Urban Search & Rescue (USAR)">Urban Search & Rescue (USAR)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Security Key (Password)</label>
                <input
                  type="text"
                  required
                  value={newRespPassword}
                  onChange={(e) => setNewRespPassword(e.target.value)}
                  placeholder="Responder#2026"
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Designate the credentials for the responder to log in via the Staff Portal.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterResponderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Response Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h4 className="text-base font-bold text-slate-900">Enroll New Tactical Response Team</h4>
                <p className="text-[11px] text-slate-500">Commission an active disaster response battalion</p>
              </div>
              <button type="button" onClick={() => setShowCreateTeamModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Cyclone Taskforce 02"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialization Type</label>
                  <select
                    value={newTeamType}
                    onChange={(e) => setNewTeamType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Hydrological & Cyclone Rescue">Hydrological & Cyclone Rescue</option>
                    <option value="Advanced Emergency Life Support">Advanced Emergency Life Support</option>
                    <option value="Rapid Paramedic First Response">Rapid Paramedic First Response</option>
                    <option value="Structural Firefighting & Extrication">Structural Firefighting & Extrication</option>
                    <option value="Chemical & Hazmat Emergency Force">Chemical & Hazmat Emergency Force</option>
                    <option value="Coastal Marine & Flood Rescue">Coastal Marine & Flood Rescue</option>
                    <option value="Urban Search & Rescue (USAR)">Urban Search & Rescue (USAR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Certified Personnel Count</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={newTeamMemberCount}
                    onChange={(e) => setNewTeamMemberCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Dispatch Contact</label>
                  <input
                    type="tel"
                    required
                    value={newTeamContact}
                    onChange={(e) => setNewTeamContact(e.target.value)}
                    placeholder="+91 98480 11999"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Command Station</label>
                  <input
                    type="text"
                    required
                    value={newTeamStation}
                    onChange={(e) => setNewTeamStation(e.target.value)}
                    placeholder="e.g. Civil Defense Station 04"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staging Bay Location</label>
                  <input
                    type="text"
                    required
                    value={newTeamBaseLocation}
                    onChange={(e) => setNewTeamBaseLocation(e.target.value)}
                    placeholder="e.g. Coastal Staging Bay 3"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicles & Heavy Transports</label>
                <input
                  type="text"
                  required
                  value={newTeamVehicles}
                  onChange={(e) => setNewTeamVehicles(e.target.value)}
                  placeholder="e.g. 2x 4x4 High-Clearance Rescue Trucks, 2x Zodiac Inflatables"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialized Equipment & Gear</label>
                <input
                  type="text"
                  required
                  value={newTeamEquipment}
                  onChange={(e) => setNewTeamEquipment(e.target.value)}
                  placeholder="e.g. Submersible Dewatering Pumps, SCBA Gear, Acoustic Ground Sensors"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Commission Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Reset Baseline Modal */}
      {showResetBaselineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-slate-900">
              Reset Operational Baseline?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will re-initialize the 5 representative sample emergencies (RESQ-1042 through RESQ-1046), response units, and equipment stock for demonstration.
              Real user accounts and non-demo reports are preserved.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetBaselineModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetBaseline}
                disabled={isResetting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {isResetting ? 'Resetting Baseline...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
