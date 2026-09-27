import React, { useState } from 'react';
import { X, User, Lock, Bell, Check, ShieldCheck, Mail, Phone } from 'lucide-react';
import { UserProfile } from '../../types';
import { updateUserProfile, requestPasswordReset } from '../../services/authService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const CitizenProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');

  // Profile Form
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');

  // Notifications
  const [criticalAlerts, setCriticalAlerts] = useState(
    currentUser.notificationPreferences?.criticalAlerts ?? true
  );
  const [statusUpdates, setStatusUpdates] = useState(
    currentUser.notificationPreferences?.statusUpdates ?? true
  );
  const [weatherAdvisories, setWeatherAdvisories] = useState(
    currentUser.notificationPreferences?.weatherAdvisories ?? false
  );

  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const updates = {
        name: name.trim(),
        phone: phone.trim(),
        notificationPreferences: {
          criticalAlerts,
          statusUpdates,
          weatherAdvisories
        }
      };
      await updateUserProfile(currentUser.uid, updates);

      const updatedProfile: UserProfile = {
        ...currentUser,
        ...updates
      };
      onProfileUpdated(updatedProfile);
      setFeedbackMsg({ text: 'Profile preferences updated successfully.', type: 'success' });
    } catch (err: any) {
      setFeedbackMsg({ text: err?.message || 'Failed to save changes.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await requestPasswordReset(currentUser.email);
      setFeedbackMsg({
        text: `Official password reset instructions sent to ${currentUser.email}.`,
        type: 'success'
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err?.message || 'Could not dispatch reset email.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">User Account & Settings</h3>
            <p className="text-xs text-slate-500">Manage dispatch profile and notification preferences</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setFeedbackMsg(null); }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Profile Details
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('notifications'); setFeedbackMsg(null); }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setFeedbackMsg(null); }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {feedbackMsg && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Managed via Firebase Authentication</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Contact (For Dispatch Callback)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98480 12345"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-500">Privilege Role:</span>
                <span className="font-bold text-slate-900 uppercase">{currentUser.role}</span>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <p className="text-xs text-slate-500">
                Configure your incident notification preferences. Critical dispatch status alerts cannot be muted.
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criticalAlerts}
                    onChange={(e) => setCriticalAlerts(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Critical Emergency Alerts</span>
                    <span className="text-[11px] text-slate-500">High-priority regional danger alerts and evacuation notices</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusUpdates}
                    onChange={(e) => setStatusUpdates(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Incident Status Progression</span>
                    <span className="text-[11px] text-slate-500">Live notifications when field responders are en route or on scene</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weatherAdvisories}
                    onChange={(e) => setWeatherAdvisories(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Disaster Preparedness Advisories</span>
                    <span className="text-[11px] text-slate-500">Seasonal storm, flood, and seismic advisories</span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Updating...' : 'Save Notification Preferences'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                For account security, password updates are verified directly through Firebase Authentication email authorization.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="text-slate-500 font-semibold block">Target Email Account:</span>
                <span className="text-slate-900 font-mono font-bold block">{currentUser.email}</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click below to receive a secure link to reset your account credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                {isSaving ? 'Sending...' : 'Send Password Reset Email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
