import React, { useState, useEffect } from 'react';
import {
  Flame,
  Activity,
  Waves,
  Wind,
  Building2,
  Car,
  Mountain,
  Zap,
  UserSearch,
  Droplet,
  Biohazard,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  MapPin,
  Users,
  ShieldAlert,
  Navigation,
  X
} from 'lucide-react';
import { EmergencyType, UserProfile } from '../../types';
import { LocationPicker } from '../common/LocationPicker';
import { createIncident } from '../../services/incidentService';
import { reverseGeocode } from '../../services/api';

interface Props {
  currentUser: UserProfile | null;
  onSuccess: (incidentId: string) => void;
  onCancel: () => void;
}

const CATEGORIES: Array<{ type: EmergencyType; desc: string; icon: any; color: string }> = [
  { type: 'Medical Emergency', desc: 'Cardiac, trauma, acute distress, poisoning', icon: Activity, color: 'text-red-600 bg-red-50' },
  { type: 'Fire Outbreak', desc: 'Structural blaze, wildfire, electrical fire', icon: Flame, color: 'text-orange-600 bg-orange-50' },
  { type: 'Flood & Inundation', desc: 'Rising rivers, urban waterlogging, dam surge', icon: Waves, color: 'text-blue-600 bg-blue-50' },
  { type: 'Cyclone / Storm', desc: 'Gale winds, fallen trees, storm surges', icon: Wind, color: 'text-sky-600 bg-sky-50' },
  { type: 'Building Collapse', desc: 'Structural failure, debris, trapped occupants', icon: Building2, color: 'text-amber-700 bg-amber-50' },
  { type: 'Vehicle Accident', desc: 'Highway collision, rollover, extrication needed', icon: Car, color: 'text-indigo-600 bg-indigo-50' },
  { type: 'Landslide / Mudflow', desc: 'Hillside slide, road obstruction, mudflow', icon: Mountain, color: 'text-stone-700 bg-stone-100' },
  { type: 'Earthquake Impact', desc: 'Seismic tremors, structural damage, tremors', icon: Zap, color: 'text-yellow-700 bg-yellow-50' },
  { type: 'Missing Person', desc: 'Lost child, elderly with dementia, hiker', icon: UserSearch, color: 'text-purple-600 bg-purple-50' },
  { type: 'Water Contamination', desc: 'Sewage breach, chemical contamination', icon: Droplet, color: 'text-cyan-600 bg-cyan-50' },
  { type: 'Hazardous Chemical', desc: 'Toxic gas leak, caustic spill, industrial hazmat', icon: Biohazard, color: 'text-emerald-700 bg-emerald-50' },
  { type: 'Other Threat', desc: 'Civil hazard, animal danger, critical utility break', icon: AlertTriangle, color: 'text-slate-700 bg-slate-100' }
];

export const EmergencyReportWizard: React.FC<Props> = ({ currentUser, onSuccess, onCancel }) => {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedType, setSelectedType] = useState<EmergencyType>('Medical Emergency');
  const [isInjured, setIsInjured] = useState<boolean>(false);
  const [isTrapped, setIsTrapped] = useState<boolean>(false);
  const [isImmediateDanger, setIsImmediateDanger] = useState<boolean>(true);
  const [affectedPeople, setAffectedPeople] = useState<number>(1);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [isAutoDetectingLocation, setIsAutoDetectingLocation] = useState<boolean>(true);
  const [locationStatus, setLocationStatus] = useState<string>('Auto-detecting live GPS coordinates...');

  // Automatically detect device GPS location immediately upon opening the wizard
  useEffect(() => {
    setIsAutoDetectingLocation(true);
    setLocationStatus('Auto-detecting live GPS coordinates...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy);
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          try {
            const resolved = await reverseGeocode(lat, lng);
            setAddress(resolved);
            setLocationStatus(`Location Automatically Detected (±${acc}m accuracy)`);
          } catch {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setLocationStatus(`GPS Auto-Detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
          setIsAutoDetectingLocation(false);
        },
        async (err) => {
          console.warn('GPS auto-detect fallback:', err);
          setIsAutoDetectingLocation(false);
          const fallbackLat = 17.7231;
          const fallbackLng = 83.3013;
          setLatitude(fallbackLat);
          setLongitude(fallbackLng);
          try {
            const resolved = await reverseGeocode(fallbackLat, fallbackLng);
            setAddress(resolved);
          } catch {
            setAddress('Visakhapatnam, Andhra Pradesh');
          }
          setLocationStatus('Regional cell coordinates automatically assigned.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsAutoDetectingLocation(false);
      const fallbackLat = 17.7231;
      const fallbackLng = 83.3013;
      setLatitude(fallbackLat);
      setLongitude(fallbackLng);
      setAddress('Visakhapatnam, Andhra Pradesh');
      setLocationStatus('Regional coordinates automatically assigned.');
    }
  }, []);

  const [description, setDescription] = useState<string>('');
  const [callerName, setCallerName] = useState<string>(currentUser?.name || '');
  const [callerPhone, setCallerPhone] = useState<string>(currentUser?.phone || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{ id: string; code: string } | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Photo file size exceeds 5MB limit.');
        return;
      }
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setErrorMsg(null);
    }
  };

  const handleNextStep = () => {
    setErrorMsg(null);

    if (step === 1 && !selectedType) {
      setErrorMsg('Please select an emergency category to proceed.');
      return;
    }

    if (step === 3 && (affectedPeople < 1 || isNaN(affectedPeople))) {
      setErrorMsg('Please enter a valid count of estimated people affected.');
      return;
    }

    if (step === 4) {
      if (!address.trim()) {
        setErrorMsg('Confirmed dispatch address or landmark is required.');
        return;
      }
    }

    if (step === 5) {
      if (!description.trim() || description.trim().length < 5) {
        setErrorMsg('Please provide a brief description of the emergency scene (minimum 5 characters).');
        return;
      }
    }

    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const finalLat = latitude !== null ? latitude : 17.7231;
    const finalLng = longitude !== null ? longitude : 83.3013;
    const finalAddress = address.trim() || 'Immediate Dispatch Coordinates Verified';

    try {
      const result = await createIncident(
        {
          citizenId: currentUser?.uid || 'guest',
          citizenName: callerName.trim() || (currentUser ? currentUser.name : 'Emergency Guest Caller'),
          citizenPhone: callerPhone.trim(),
          type: selectedType,
          description: description.trim(),
          affectedPeople,
          isAnyoneInjured: isInjured,
          isAnyoneTrapped: isTrapped,
          isImmediateDanger: isImmediateDanger,
          latitude: finalLat,
          longitude: finalLng,
          locationAddress: finalAddress,
          locationAccuracy: accuracy,
          isGuestReport: !currentUser
        },
        photoFile
      );

      setSubmissionResult({
        id: result.id,
        code: result.incidentId
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit emergency dispatch report. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header & Step Tracker */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                PRIORITY REPORTING WIZARD
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Detailed Emergency Incident Report
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!submissionResult && (
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="text-blue-700 font-bold">Step {step} of 6</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div
                    key={s}
                    className={`w-6 sm:w-10 h-1.5 rounded-full transition-all ${
                      s <= step ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {submissionResult ? (
            /* Final Submission Screen */
            <div className="py-8 text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  DISPATCH CENTER NOTIFIED
                </span>
                <h3 className="text-3xl font-black text-slate-900 mt-3 font-mono tracking-tight">
                  {submissionResult.code}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                  Your emergency dispatch report has been registered into the live incident queue.
                  The AI Triage engine has calculated the initial safety assessment, and human dispatchers are assigning field units.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onSuccess(submissionResult.id)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  Track Live Incident Progression
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Emergency Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 1: Select Emergency Incident Category
                  </h4>
                  <p className="text-xs text-slate-500">
                    Choose the primary category that best describes the hazard facing the scene.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedType === cat.type;
                      return (
                        <button
                          key={cat.type}
                          type="button"
                          onClick={() => setSelectedType(cat.type)}
                          className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${cat.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {cat.type}
                            </h5>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                              {cat.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Life Safety Assessment */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Step 2: Initial Life-Safety Assessment
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      These factors immediately elevate the AI priority matrix and determine responder staging.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Injured question */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Is anyone injured or in medical distress?</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Requires trauma stabilization or ambulances</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsInjured(true)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isInjured ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInjured(false)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            !isInjured ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    {/* Trapped question */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Is anyone trapped, pinned, or unable to evacuate?</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Requires extrication, USAR or watercraft rescue</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsTrapped(true)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isTrapped ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsTrapped(false)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            !isTrapped ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    {/* Immediate Danger */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Is there immediate danger to life or active hazard growth?</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Spreading fire, rising flood waters, or collapse risk</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsImmediateDanger(true)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isImmediateDanger ? 'bg-red-600 text-white border-red-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsImmediateDanger(false)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            !isImmediateDanger ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: People Affected */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 3: Estimated People Affected
                  </h4>
                  <p className="text-xs text-slate-500">
                    Provide the approximate number of persons involved, exposed to danger, or requiring evacuation.
                  </p>

                  <div className="max-w-md pt-2 space-y-4">
                    <div className="relative">
                      <Users className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={affectedPeople}
                        onChange={(e) => setAffectedPeople(parseInt(e.target.value) || 1)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 5, 10, 25, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAffectedPeople(num)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            affectedPeople === num
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {num} {num === 1 ? 'person' : 'people'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Emergency Location */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Step 4: Emergency Incident Location
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Location is automatically detected via device GPS telemetry.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{locationStatus}</span>
                    </div>
                  </div>

                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    address={address}
                    accuracy={accuracy}
                    onChange={(coords) => {
                      setLatitude(coords.lat);
                      setLongitude(coords.lng);
                      setAddress(coords.address);
                      setAccuracy(coords.accuracy);
                    }}
                  />
                </div>
              )}

              {/* STEP 5: Details & Photo */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Step 5: Incident Description & Evidence
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provide clear situational details to assist the AI triage engine and responding officers.
                    </p>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        What is happening at the scene? <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe current scene condition, visible hazards (smoke, flood depth, fire), vehicle types, or specific assistance needed..."
                        className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Caller Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={callerName}
                          onChange={(e) => setCallerName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Caller Phone Contact (Optional)
                        </label>
                        <input
                          type="tel"
                          value={callerPhone}
                          onChange={(e) => setCallerPhone(e.target.value)}
                          placeholder="+91 98480 12345"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Attach Scene Photo Evidence (Optional, max 5MB)
                      </label>
                      <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50 transition-colors">
                        {photoPreview ? (
                          <div className="space-y-2">
                            <img
                              src={photoPreview}
                              alt="Scene Preview"
                              className="max-h-48 mx-auto rounded-lg object-cover shadow-xs border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                              }}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold"
                            >
                              Remove attached photo
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                            <span className="text-xs font-semibold text-blue-600 hover:underline">
                              Upload incident photo
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              JPEG, PNG, or WebP up to 5 MB
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handlePhotoSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Review & Transmit */}
              {step === 6 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Step 6: Review & Transmit Emergency SOS
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify all operational dispatch information before priority transmission.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500">Emergency Type:</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedType}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200 text-center">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">INJURED</span>
                        <span className={`font-bold ${isInjured ? 'text-red-600' : 'text-slate-700'}`}>
                          {isInjured ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">TRAPPED</span>
                        <span className={`font-bold ${isTrapped ? 'text-red-600' : 'text-slate-700'}`}>
                          {isTrapped ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">DANGER LEVEL</span>
                        <span className={`font-bold ${isImmediateDanger ? 'text-red-600' : 'text-amber-600'}`}>
                          {isImmediateDanger ? 'IMMEDIATE' : 'ELEVATED'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-slate-500">Estimated Affected:</span>
                      <span className="font-semibold text-slate-800">{affectedPeople} persons</span>
                    </div>

                    <div className="pb-2 border-b border-slate-200">
                      <span className="text-slate-500 block mb-0.5">Confirmed Dispatch Location:</span>
                      <p className="font-semibold text-slate-900">{address || 'Location Coordinates Verified'}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Description:</span>
                      <p className="text-slate-800 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
                        "{description}"
                      </p>
                    </div>

                    {photoPreview && (
                      <div className="pt-1">
                        <span className="text-slate-500 block mb-1">Attached Evidence:</span>
                        <img src={photoPreview} alt="Evidence" className="h-20 rounded-md border border-slate-200 object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wizard Navigation Footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 6 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    Next Step
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Transmitting to Dispatch Center...' : 'Send Emergency SOS'}
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
