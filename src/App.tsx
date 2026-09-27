import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { getOrCreateProfile, logoutUser } from './services/authService';
import { ensureIndiaBaselineData } from './services/demoService';
import { UserProfile, UserRole } from './types';
import { Header } from './components/common/Header';
import { LandingPage } from './components/public/LandingPage';
import { CitizenHome } from './components/citizen/CitizenHome';
import { EmergencyReportWizard } from './components/citizen/EmergencyReportWizard';
import { MyReportsView } from './components/citizen/MyReportsView';
import { ResponderDashboard } from './components/responder/ResponderDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CitizenAuthModal } from './components/auth/CitizenAuthModal';
import { StaffAuthModal } from './components/auth/StaffAuthModal';
import { StaffLoginPage } from './components/auth/StaffLoginPage';
import { CitizenProfileModal } from './components/citizen/CitizenProfileModal';
import { Shield, RefreshCw, AlertTriangle, PhoneCall } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<string>('landing');
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Modals
  const [citizenAuthOpen, setCitizenAuthOpen] = useState(false);
  const [staffAuthOpen, setStaffAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Target incident for direct tracking
  const [trackingIncidentId, setTrackingIncidentId] = useState<string | null>(null);

  // Firebase Auth State Observer
  useEffect(() => {
    ensureIndiaBaselineData();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getOrCreateProfile(user);
          setCurrentUser(profile);
          // Set sensible initial landing if on generic view
          if (profile.role === 'responder') {
            setCurrentView('responder');
          } else if (profile.role === 'admin') {
            if (currentView === 'landing' || currentView === 'home' || currentView === 'citizen_home') {
              setCurrentView('admin');
            }
          } else if (currentView === 'landing' || currentView === 'home') {
            setCurrentView('citizen_home');
          }
        } catch (error) {
          console.error('Failed to load profile on auth state change:', error);
        }
      } else {
        const savedSession = localStorage.getItem('resq360_fallback_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed?.uid) {
              const profileSnap = await getDoc(doc(db, 'profiles', parsed.uid));
              if (profileSnap.exists()) {
                const profile = profileSnap.data() as UserProfile;
                setCurrentUser(profile);
                if (profile.role === 'responder') {
                  setCurrentView('responder');
                } else if (profile.role === 'admin') {
                  if (currentView === 'landing' || currentView === 'home' || currentView === 'citizen_home') {
                    setCurrentView('admin');
                  }
                } else if (currentView === 'landing' || currentView === 'home') {
                  setCurrentView('citizen_home');
                }
              } else {
                setCurrentUser(null);
              }
            } else {
              setCurrentUser(null);
            }
          } catch (_) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setCurrentView('landing');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    // Demonstration persona switcher for evaluator inspection
    const demoProfile: UserProfile = {
      uid: role === 'admin' ? 'demo-admin-uid' : 'demo-responder-uid',
      role,
      name: role === 'admin' ? 'Director Rajesh Nair' : 'Officer Rajesh Varma',
      email: role === 'admin' ? '24331a04d2@mvgrce.edu.in' : 'rajesh.varma@resq360.ops',
      badgeNumber: role === 'admin' ? 'DISPATCH-01' : 'SDRF-704',
      teamType: role === 'admin' ? 'Central Emergency Command' : 'Hydrological & Cyclone Rescue',
      active: true,
      notificationPreferences: {
        criticalAlerts: true,
        statusUpdates: true,
        weatherAdvisories: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setCurrentUser(demoProfile);
    if (role === 'admin') setCurrentView('admin');
    else if (role === 'responder') setCurrentView('responder');
    else setCurrentView('citizen_home');
  };

  const handleTrackIncident = (incidentId: string) => {
    setTrackingIncidentId(incidentId);
    setCurrentView('my_reports');
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-md animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800 tracking-tight">RESQ360</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to Emergency Operations Network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Global Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          if (currentUser?.role === 'responder') {
            if (view === 'preparedness' || view === 'about') {
              setCurrentView(view);
            } else {
              setCurrentView('responder');
            }
          } else if (currentUser?.role === 'admin' && (view === 'home' || view === 'landing')) {
            setCurrentView('admin');
          } else {
            setCurrentView(view);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onOpenCitizenAuth={() => setCitizenAuthOpen(true)}
        onOpenStaffAuth={() => {
          setCurrentView('staff_login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenProfile={() => setProfileOpen(true)}
        onSignOut={handleSignOut}
        onSelectIncident={handleTrackIncident}
      />

      {/* Main View Container */}
      <div className="flex-1">
        {/* VIEW 1: PUBLIC LANDING PAGE (Responders & Admins are routed to their operational consoles) */}
        {(currentView === 'landing' || currentView === 'home') && (
          currentUser?.role === 'responder' ? (
            <ResponderDashboard
              currentUser={currentUser}
              onSelectIncident={handleTrackIncident}
            />
          ) : currentUser?.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
            />
          ) : (
            <LandingPage
              currentUser={currentUser}
              onTrackIncident={handleTrackIncident}
              onDetailedReport={() => setCurrentView('report_wizard')}
              onOpenCitizenAuth={() => setCitizenAuthOpen(true)}
              onOpenStaffAuth={() => setCurrentView('staff_login')}
            />
          )
        )}

        {/* VIEW 2: CITIZEN HOME */}
        {currentView === 'citizen_home' && (
          currentUser?.role === 'responder' ? (
            <ResponderDashboard
              currentUser={currentUser}
              onSelectIncident={handleTrackIncident}
            />
          ) : currentUser?.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
            />
          ) : currentUser ? (
            <CitizenHome
              currentUser={currentUser}
              onTrackIncident={handleTrackIncident}
              onDetailedReport={() => setCurrentView('report_wizard')}
              onViewMyReports={() => setCurrentView('my_reports')}
              onOpenProfile={() => setProfileOpen(true)}
            />
          ) : (
            <LandingPage
              currentUser={null}
              onTrackIncident={handleTrackIncident}
              onDetailedReport={() => setCurrentView('report_wizard')}
              onOpenCitizenAuth={() => setCitizenAuthOpen(true)}
              onOpenStaffAuth={() => setCurrentView('staff_login')}
            />
          )
        )}

        {/* VIEW: DEDICATED STAFF & RESPONDER PORTAL (NO CITIZEN REPORT EMERGENCY SECTION) */}
        {currentView === 'staff_login' && (
          <StaffLoginPage
            onSuccess={(profile) => {
              setCurrentUser(profile);
              if (profile.role === 'admin') setCurrentView('admin');
              else if (profile.role === 'responder') setCurrentView('responder');
              else setCurrentView('citizen_home');
            }}
            onCancel={() => setCurrentView('landing')}
          />
        )}

        {/* VIEW 3: DETAILED REPORT WIZARD */}
        {currentView === 'report_wizard' && (
          <EmergencyReportWizard
            currentUser={currentUser}
            onSuccess={(incId) => handleTrackIncident(incId)}
            onCancel={() => {
              if (currentUser?.role === 'citizen') setCurrentView('citizen_home');
              else if (currentUser?.role === 'admin') setCurrentView('admin');
              else if (currentUser?.role === 'responder') setCurrentView('responder');
              else setCurrentView('landing');
            }}
          />
        )}

        {/* VIEW 4: CITIZEN MY REPORTS & TRACKING */}
        {currentView === 'my_reports' && (
          currentUser?.role === 'responder' ? (
            <ResponderDashboard
              currentUser={currentUser}
              onSelectIncident={handleTrackIncident}
            />
          ) : (
            <MyReportsView
              currentUser={currentUser}
              onNewSos={() => setCurrentView('report_wizard')}
              initialIncidentId={trackingIncidentId}
            />
          )
        )}

        {/* VIEW 5: RESPONDER DASHBOARD */}
        {currentView === 'responder' && (
          currentUser && (currentUser.role === 'responder' || currentUser.role === 'admin') ? (
            <ResponderDashboard
              currentUser={currentUser}
              onSelectIncident={handleTrackIncident}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Responder Access Required</h3>
              <p className="text-xs text-slate-600">
                This area is reserved for authenticated emergency first responders.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('staff_login')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Authenticate as Staff
              </button>
            </div>
          )
        )}

        {/* VIEW 6: ADMIN CENTRAL COMMAND */}
        {currentView === 'admin' && (
          currentUser && currentUser.role === 'admin' ? (
            <AdminDashboard currentUser={currentUser} />
          ) : (
            <div className="max-w-md mx-auto my-16 p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Central Command Authorized Only</h3>
              <p className="text-xs text-slate-600">
                You must possess verified administrator credentials to access command-center dispatch operations.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('staff_login')}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Sign In as Dispatch Supervisor
              </button>
            </div>
          )
        )}

        {/* VIEW 7: PREPAREDNESS GUIDELINES */}
        {currentView === 'preparedness' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                DISASTER RESILIENCE
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Emergency Preparedness Guidelines
              </h1>
              <p className="text-xs text-slate-500">
                Practical life-safety protocols to follow during sudden emergencies and extreme natural disasters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
                <h3 className="text-base font-bold text-slate-900">Medical Emergency Response</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In acute trauma, severe bleeding, or unconsciousness, immediate bystander stabilization determines survival rates before paramedics arrive on scene.
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1.5">
                  <p>• Call 112 or trigger RESQ360 SOS immediately.</p>
                  <p>• For cardiac arrest: perform chest compressions hard and fast at center of chest.</p>
                  <p>• Do not move accident victims with suspected spinal trauma unless active fire or flood is imminent.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
                <h3 className="text-base font-bold text-slate-900">Structural Fire Evacuation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fire doubles in size every 60 seconds under typical residential or commercial fuel loads.
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1.5">
                  <p>• Never open doors that feel hot to the touch.</p>
                  <p>• Crawl low under smoke to preserve breathable oxygen.</p>
                  <p>• Assemble outside at a pre-designated assembly zone and never re-enter a burning structure.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
                <h3 className="text-base font-bold text-slate-900">Floods & Rising Inundation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Flash floods and river breaches occur rapidly. Submerged vehicles and contaminated water present major hazards.
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1.5">
                  <p>• Turn off primary electrical breaker before water contacts outlets.</p>
                  <p>• Evacuate to higher ground; never drive into water across roadways.</p>
                  <p>• Signal rescue aircraft or boats from rooftops with bright fabric or flashlights.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
                <h3 className="text-base font-bold text-slate-900">Severe Storms & Earthquakes</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  High gale winds cause falling trees and flying debris; seismic tremors trigger structural facade collapses.
                </p>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1.5">
                  <p>• During earthquakes: Drop, Cover under sturdy furniture, and Hold On.</p>
                  <p>• Stay away from glass windows, unanchored bookcases, and exterior brick facades.</p>
                  <p>• Preserve mobile phone battery for emergency communication.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 8: ABOUT RESQ360 */}
        {currentView === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                PLATFORM OVERVIEW
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                About RESQ360 Operations
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                RESQ360 is an emergency response and disaster-management coordination platform engineered to connect citizens, field responders, and central emergency command operations.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">Core Architecture & Principles</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  RESQ360 eliminates brittle local database and server dependencies by utilizing Google Cloud & Firebase enterprise services:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5 pt-1">
                  <li><strong>Firebase Authentication:</strong> Secure citizen and authorized emergency staff identity verification.</li>
                  <li><strong>Cloud Firestore:</strong> Sub-second real-time synchronization between citizens, tactical units, and command dashboards.</li>
                  <li><strong>Firebase Storage:</strong> Secure storage of incident scene photographs and physical evidence.</li>
                  <li><strong>Gemini AI Incident Triage:</strong> Secure server-side risk scoring and life-safety decision support.</li>
                  <li><strong>OpenStreetMap & Leaflet:</strong> Precise geospatial coordinates and field navigation without proprietary lock-in.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <PhoneCall className="w-4 h-4 text-blue-600" />
                  <span>Official Emergency Hotline Reference</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  RESQ360 provides software coordination and decision support. In India, for direct life-saving police, medical, or fire emergency response, contact national helpline <strong>112</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">RESQ360</span>
            <span>• Emergency Operations & Disaster Management Network</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-600 font-medium">National Emergency Operations Command</span>
            <span>Official Emergency: Dial 112</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CitizenAuthModal
        isOpen={citizenAuthOpen}
        onClose={() => setCitizenAuthOpen(false)}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          if (profile.role === 'admin') setCurrentView('admin');
          else if (profile.role === 'responder') setCurrentView('responder');
          else setCurrentView('citizen_home');
        }}
      />

      <StaffAuthModal
        isOpen={staffAuthOpen}
        onClose={() => setStaffAuthOpen(false)}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          if (profile.role === 'admin') setCurrentView('admin');
          else if (profile.role === 'responder') setCurrentView('responder');
          else setCurrentView('citizen_home');
        }}
      />

      {currentUser && (
        <CitizenProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
        />
      )}
    </div>
  );
}
