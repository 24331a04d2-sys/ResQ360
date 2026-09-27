import React, { useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Navigation,
  Activity,
  Flame,
  Waves,
  Wind,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  HeartPulse,
  LifeBuoy
} from 'lucide-react';
import { SOSConsole } from '../citizen/SOSConsole';
import { UserProfile } from '../../types';

interface Props {
  currentUser: UserProfile | null;
  onTrackIncident: (incidentId: string) => void;
  onDetailedReport: () => void;
  onOpenCitizenAuth: () => void;
  onOpenStaffAuth: () => void;
}

export const LandingPage: React.FC<Props> = ({
  currentUser,
  onTrackIncident,
  onDetailedReport,
  onOpenCitizenAuth,
  onOpenStaffAuth
}) => {
  const [openPrepTopic, setOpenPrepTopic] = useState<string | null>('medical');

  const toggleTopic = (id: string) => {
    setOpenPrepTopic(openPrepTopic === id ? null : id);
  };

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section Matching Image 1 & Image 2 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-4 pb-10 space-y-6">
        {/* Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          EMERGENCY OPERATIONS NETWORK
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
          Emergency help, when it matters
          <br className="hidden sm:inline" /> most.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          ResQ360 coordinates emergency response across citizens, first responders, and dispatch authorities. Quickly report an active crisis or follow real-time incident progress until help arrives.
        </p>

        {/* Prominent Centered SOS Console */}
        <div className="pt-2 max-w-2xl mx-auto">
          <SOSConsole
            currentUser={currentUser}
            onTrackIncident={onTrackIncident}
            onDetailedReport={onDetailedReport}
            onOpenCitizenAuth={onOpenCitizenAuth}
            onOpenStaffAuth={onOpenStaffAuth}
          />
        </div>
      </section>

      {/* Operational Workflow Section */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              OPERATIONAL LIFECYCLE
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              From Distress Beacon to Scene Resolution
            </h2>
            <p className="text-xs text-slate-500">
              A human-in-the-loop coordination protocol supported by AI incident triage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Report */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                01
              </div>
              <h3 className="text-base font-bold text-slate-900">Report</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                GPS-Enabled Emergency Reporting
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizens trigger 1-tap SOS or detailed reports with geolocation, casualty counts, and photos. The server-side AI triage engine calculates risk scores and suggested response teams.
              </p>
            </div>

            {/* Step 2: Response */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                02
              </div>
              <h3 className="text-base font-bold text-slate-900">Response</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Dispatch to Appropriate Field Units
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central command operators verify the report and assign designated response teams (Medical, Fire, USAR, Disaster Response) with real-time turn-by-turn guidance.
              </p>
            </div>

            {/* Step 3: Track */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                03
              </div>
              <h3 className="text-base font-bold text-slate-900">Track</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Updates Through Resolution
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live Firestore listeners synchronize status updates: from Verified, Dispatched, En Route, On Scene, to Final Resolution and logistics restock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Preparedness Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              CITIZEN SAFETY GUIDANCE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Emergency Preparedness Protocols
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Life-saving first-response guidance to protect yourself and others before rescue teams arrive.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Topic 1: Medical */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => toggleTopic('medical')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Medical Emergencies</h3>
                  <p className="text-[11px] text-slate-500">Bleeding control, CPR, burns, and airway management</p>
                </div>
              </div>
              {openPrepTopic === 'medical' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openPrepTopic === 'medical' && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>• <strong>Severe Bleeding:</strong> Apply firm, direct pressure over the wound using a clean cloth. Do not remove dressing if soaked; apply additional layers on top.</p>
                <p>• <strong>Unconscious / No Breathing:</strong> Call for an ALS ambulance immediately. Place hands in the center of the chest and push hard and fast (100–120 beats per minute).</p>
                <p>• <strong>Thermal Burns:</strong> Cool with gentle running tap water for at least 10 minutes. Do not apply ice, butter, or paste. Cover loosely with sterile plastic wrap or clean cloth.</p>
              </div>
            )}
          </div>

          {/* Topic 2: Fire Safety */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => toggleTopic('fire')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Fire Safety & Evacuation</h3>
                  <p className="text-[11px] text-slate-500">RACE principles, smoke containment, and exit protocol</p>
                </div>
              </div>
              {openPrepTopic === 'fire' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openPrepTopic === 'fire' && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>• <strong>Stay Low Under Smoke:</strong> Smoke and toxic gases rise. Crawl on hands and knees where cleaner air is present near the floor.</p>
                <p>• <strong>Check Closed Doors:</strong> Touch door handles with the back of your hand before opening. If hot to the touch, do not open; use an alternative secondary exit.</p>
                <p>• <strong>Do NOT Use Elevators:</strong> Always take stairways. Once outside, assemble at designated open-ground assembly points and do not re-enter.</p>
              </div>
            )}
          </div>

          {/* Topic 3: Floods & Water Hazards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => toggleTopic('flood')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Floods & Water Hazards</h3>
                  <p className="text-[11px] text-slate-500">Inundation evacuation, electrical hazard avoidance</p>
                </div>
              </div>
              {openPrepTopic === 'flood' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openPrepTopic === 'flood' && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>• <strong>Never Drive or Walk in Moving Water:</strong> Just 15 cm of moving flood water can sweep an adult off their feet; 30 cm can float passenger vehicles.</p>
                <p>• <strong>Shut Off Power:</strong> If water approaches home breakers, turn off the main circuit disconnect before water contacts wiring.</p>
                <p>• <strong>Seek High Elevation:</strong> If trapped in a building, move to the roof only if necessary; ensure you have signaling equipment (flashlight, whistle, bright cloth).</p>
              </div>
            )}
          </div>

          {/* Topic 4: Storms & Earthquakes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <button
              type="button"
              onClick={() => toggleTopic('storm')}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Severe Storms & Earthquakes</h3>
                  <p className="text-[11px] text-slate-500">Drop, Cover, and Hold On; cyclone shelter protocols</p>
                </div>
              </div>
              {openPrepTopic === 'storm' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openPrepTopic === 'storm' && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>• <strong>Earthquake Tremor:</strong> Drop onto your hands and knees, take Cover under a sturdy table, and Hold On until shaking stops.</p>
                <p>• <strong>Stay Away from Glass & Facades:</strong> Falling debris and shattering window panels cause the highest frequency of seismic injuries.</p>
                <p>• <strong>Cyclone Protocols:</strong> Secure loose outdoor objects, stay indoors away from windows, and preserve emergency drinking water supplies.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="max-w-3xl space-y-2">
            <h3 className="text-lg font-bold text-slate-900">About RESQ360 Platform</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              RESQ360 is an emergency response and disaster-management coordination platform engineered to connect citizens, field responders, and central emergency command operations.
              The architecture pairs Firebase Authentication, Cloud Firestore real-time synchronization, and Firebase Storage with server-side AI Incident Triage for human-in-the-loop emergency operations.
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              RESQ360 coordinates emergency operations and decision support. In life-critical emergencies, always contact official national emergency services directly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
