import React, { useState } from 'react';
import { Shield, Radio, AlertOctagon, User, LogOut, Menu, X, ChevronDown, Lock } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { NotificationBell } from './NotificationBell';

interface Props {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserProfile | null;
  onOpenCitizenAuth: () => void;
  onOpenStaffAuth: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onSelectIncident?: (incidentId: string) => void;
}

export const Header: React.FC<Props> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenCitizenAuth,
  onOpenStaffAuth,
  onOpenProfile,
  onSignOut,
  onSelectIncident
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNavClick = (view: string) => {
    if (currentUser?.role === 'responder' && (view === 'home' || view === 'landing' || view === 'citizen_home')) {
      onNavigate('responder');
    } else if (currentUser?.role === 'admin' && (view === 'home' || view === 'landing')) {
      onNavigate('admin');
    } else {
      onNavigate(view);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Operational Identity Matching Images */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => handleNavClick(currentUser?.role === 'admin' ? 'admin' : currentUser?.role === 'responder' ? 'responder' : 'home')}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#C8102E] flex items-center justify-center text-white shadow-sm ring-2 ring-red-500/20 shrink-0">
              <Shield className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">RESQ360</span>
                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {currentUser?.role === 'responder' ? 'FIELD OPS' : 'OPERATIONS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-tight hidden sm:block">
                Emergency Response & Disaster Management
              </p>
            </div>
          </div>

          {/* ADMIN TOP BAR (When currentView is admin) */}
          {currentView === 'admin' && currentUser?.role === 'admin' ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Connected</span>
              </div>

              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name || 'Director Rajesh Nair'}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    CENTRAL COMMAND (ADMIN)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (currentView === 'responder' || currentUser?.role === 'responder') ? (
            /* DEDICATED FIELD RESPONDER TOP BAR (No citizen emergency reporting, no SOS beacon, no citizen badge) */
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Field Telemetry Active</span>
              </div>

              {/* Responder-Specific Navigation */}
              <nav className="hidden md:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNavClick('responder')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    currentView === 'responder'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Tactical Console
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('preparedness')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currentView === 'preparedness'
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Protocols
                </button>
              </nav>

              {/* Responder Profile (Clean: Name, Unit ID, Sign Out - NO "citizen" badge) */}
              <div className="flex items-center gap-2 text-left pl-2 sm:pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'R'}
                </div>
                <div className="hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {currentUser?.name || 'Field Responder'}
                  </span>
                  <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider font-mono">
                    {currentUser?.badgeNumber || 'SDRF-704'} • RESPONDER
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
                title="Sign out of responder portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            /* STANDARD PUBLIC / CITIZEN NAVIGATION */
            <>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1 lg:gap-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currentView === 'home' || currentView === 'landing'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('preparedness')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currentView === 'preparedness'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Preparedness
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('about')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currentView === 'about'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  About
                </button>

                {currentUser && currentUser.role === 'citizen' && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('my_reports')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      currentView === 'my_reports'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    My Reports
                  </button>
                )}
              </nav>

              {/* Action CTAs & Auth Controls matching Image 1 & 2 */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* EMERGENCY SOS Button (Shown for public/citizen, not staff) */}
                {(!currentUser || currentUser.role === 'citizen') && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('report_wizard')}
                    className="px-4 py-2 text-xs font-black text-white bg-[#E0042A] hover:bg-red-700 rounded-xl shadow-xs transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    EMERGENCY SOS
                  </button>
                )}

                {/* Staff Access Button (Only shown when not logged in) */}
                {!currentUser && (
                  <button
                    type="button"
                    onClick={onOpenStaffAuth}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer hidden sm:flex"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Staff Access
                  </button>
                )}

                {/* Sign In / User Profile (Clean: NO "Citizen" badge or icon near profile!) */}
                {currentUser ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700 text-[11px]">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold max-w-[120px] truncate hidden sm:inline">
                        {currentUser.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3.5 py-2.5">
                          <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        </div>

                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onOpenProfile();
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            Account & Preferences
                          </button>
                        </div>

                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onSignOut();
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenCitizenAuth}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0B132B] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                )}

                {/* Mobile menu hamburger */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          {(!currentUser || currentUser.role === 'citizen') && (
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Home
            </button>
          )}

          {currentUser && currentUser.role === 'citizen' && (
            <>
              <button
                type="button"
                onClick={() => handleNavClick('citizen_home')}
                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Citizen Console
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('my_reports')}
                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                My Emergency Reports
              </button>
            </>
          )}

          {currentUser && currentUser.role === 'responder' && (
            <button
              type="button"
              onClick={() => handleNavClick('responder')}
              className="w-full text-left px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 font-bold rounded-lg"
            >
              Tactical Responder Console
            </button>
          )}

          {currentUser && currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleNavClick('admin')}
              className="w-full text-left px-3 py-2 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg font-bold"
            >
              Central Command Center
            </button>
          )}

          <button
            type="button"
            onClick={() => handleNavClick('preparedness')}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Preparedness
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            About
          </button>

          {currentUser ? (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({currentUser.name})
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenStaffAuth();
                }}
                className="flex-1 py-2 text-center text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
              >
                Staff Access
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCitizenAuth();
                }}
                className="flex-1 py-2 text-center text-xs font-semibold text-white bg-blue-600 rounded-lg"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
