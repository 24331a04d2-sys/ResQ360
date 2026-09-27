import React from 'react';
import {
  AlertOctagon,
  FileText,
  Clock,
  PhoneCall,
  Shield,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Info,
  Radio
} from 'lucide-react';
import { UserProfile } from '../../types';
import { SOSConsole } from './SOSConsole';

interface Props {
  currentUser: UserProfile;
  onTrackIncident: (incidentId: string) => void;
  onDetailedReport: () => void;
  onViewMyReports: () => void;
  onOpenProfile: () => void;
}

export const CitizenHome: React.FC<Props> = ({
  currentUser,
  onTrackIncident,
  onDetailedReport,
  onViewMyReports,
  onOpenProfile
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Operational Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ACTIVE DISPATCH LINK CONNECTED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Citizen Emergency Coordination Console. Your device is connected to the regional emergency response network.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onViewMyReports}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              My Emergency Reports
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors border border-blue-200"
            >
              Account Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left SOS Console + Right Quick Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Emergency Distress Console */}
        <div className="lg:col-span-7 space-y-4">
          <SOSConsole
            currentUser={currentUser}
            onTrackIncident={onTrackIncident}
            onDetailedReport={onDetailedReport}
          />
        </div>

        {/* Right: Emergency Guidelines & Direct Actions */}
        <div className="lg:col-span-5 space-y-4">
          {/* Detailed Report Action Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comprehensive Incident Report
                </h3>
                <p className="text-[11px] text-slate-500">
                  Provide casualty counts, precise hazards, and scene photos
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If safe to do so, submit a multi-step emergency report to give tactical field teams full situational awareness.
            </p>

            <button
              type="button"
              onClick={onDetailedReport}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              Launch Detailed Report Wizard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Practical Emergency Safety Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Immediate Safety Actions:</span>
            </div>

            <ul className="space-y-2 text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span><strong>Remain Calm & Assess:</strong> Check your immediate surroundings for electrical, fire, or structural hazards.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span><strong>Relocate to Safety:</strong> If possible, move to an open visible landmark so rescue teams can identify you.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span><strong>Keep Phone Line Clear:</strong> Emergency dispatchers may contact you to verify coordinates or casualty status.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span><strong>Official National Hotline:</strong> In extreme life danger situations, you can also dial <strong>112</strong> immediately.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
