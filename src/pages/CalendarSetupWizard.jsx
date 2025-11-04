
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Enabler, CalendarPreferences } from "@/api/entities";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ExternalLink, AlertCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import BlinkLogo from "../components/BlinkLogo";

const PRESET_MODES = [
  {
    id: "full_availability",
    name: "Hustle",
    icon: "💪",
    description: "Maximum availability for ambitious enablers",
    color: "text-green-600",
    bgColor: "bg-green-50",
    haloColor: "rgba(34, 197, 94, 0.2)",
    settings: {
      working_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      work_start_time: "09:00",
      work_end_time: "21:00",
      max_hours_per_day: 12,
      max_bookings_per_day: 3,
      allow_back_to_back_bookings: true,
      minimum_break_between_bookings_minutes: 30
    }
  },
  {
    id: "balanced",
    name: "Balanced",
    icon: "🌊",
    description: "Work-life harmony with reasonable limits",
    color: "text-sky-500",
    bgColor: "bg-sky-50",
    haloColor: "rgba(14, 165, 233, 0.2)",
    settings: {
      working_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      work_start_time: "10:00",
      work_end_time: "19:00",
      max_hours_per_day: 8,
      max_bookings_per_day: 2,
      allow_back_to_back_bookings: false,
      minimum_break_between_bookings_minutes: 60
    }
  },
  {
    id: "peak_hours",
    name: "Last Minute Hero",
    icon: "🚨",
    description: "Available for urgent, high-demand bookings",
    color: "text-red-500",
    bgColor: "bg-red-50",
    haloColor: "rgba(239, 68, 68, 0.2)",
    settings: {
      working_days: ["thursday", "friday", "saturday", "sunday"],
      work_start_time: "17:00",
      work_end_time: "23:00",
      max_hours_per_day: 6,
      max_bookings_per_day: 1,
      allow_back_to_back_bookings: false,
      minimum_break_between_bookings_minutes: 120
    }
  },
  {
    id: "weekend_specialist",
    name: "Weekend Specialist",
    icon: "🍸",
    description: "Focus on weekend events exclusively",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    haloColor: "rgba(168, 85, 247, 0.2)",
    settings: {
      working_days: ["friday", "saturday", "sunday"],
      work_start_time: "08:00",
      work_end_time: "22:00",
      max_hours_per_day: 14,
      max_bookings_per_day: 2,
      allow_back_to_back_bookings: false,
      minimum_break_between_bookings_minutes: 60
    }
  }
];

export default function CalendarSetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [enabler, setEnabler] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [showModeDetails, setShowModeDetails] = useState(null);
  const [customSettings, setCustomSettings] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(false);

  useEffect(() => {
    loadData();
    checkExistingPreferences();
    checkBackendAvailability();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      
      let enablerData;
      if (selectedProfileId) {
        const profiles = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
        enablerData = profiles[0];
      } else {
        const profiles = await Enabler.filter({ user_id: user.id });
        enablerData = profiles[0];
      }
      
      if (enablerData) {
        setEnabler(enablerData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const checkExistingPreferences = async () => {
    if (!enabler) return;
    
    try {
      const prefs = await CalendarPreferences.filter({ enabler_id: enabler.id });
      if (prefs[0]) {
        setSelectedMode(prefs[0].preset_mode);
        // Check if calendar was previously connected
        if (prefs[0].google_calendar_connected) {
          setCalendarConnected(true);
        }
      }
    } catch (error) {
      console.error("Error checking preferences:", error);
    }
  };

  const checkBackendAvailability = async () => {
    try {
      const response = await fetch('/api/calendar/health', { method: 'GET' });
      setBackendAvailable(response.ok);
    } catch (error) {
      setBackendAvailable(false);
    }
  };

  const handleModeSelect = async (mode) => {
    setSelectedMode(mode.id);
    
    // Save preferences
    try {
      const existingPrefs = await CalendarPreferences.filter({ enabler_id: enabler.id });
      
      const prefsData = {
        enabler_id: enabler.id,
        preset_mode: mode.id,
        ...mode.settings,
        default_setup_buffer_minutes: 30,
        default_teardown_buffer_minutes: 30,
        auto_accept_bookings: false,
        auto_block_after_large_events: true,
        availability_frequency: "daily",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ai_optimization_enabled: true,
        google_calendar_connected: false,
        last_updated: new Date().toISOString()
      };

      if (existingPrefs[0]) {
        await CalendarPreferences.update(existingPrefs[0].id, prefsData);
      } else {
        await CalendarPreferences.create(prefsData);
      }

      // Clear mode details and custom settings, then move to next step
      setShowModeDetails(null);
      setCustomSettings(null);
      setTimeout(() => setStep(2), 300);
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  };

  const handleCustomMode = () => {
    // Initialize custom settings with a sensible default
    const defaultCustomSettings = {
      working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      work_start_time: "09:00",
      work_end_time: "17:00",
      max_hours_per_day: 8,
      max_bookings_per_day: 2,
      allow_back_to_back_bookings: false,
      minimum_break_between_bookings_minutes: 60
    };
    setCustomSettings(defaultCustomSettings);
    setShowModeDetails({
      id: "custom",
      name: "Custom",
      icon: "⚙️",
      settings: defaultCustomSettings,
      color: "text-gray-900", // Default color for custom
      bgColor: "bg-gray-50",
      haloColor: "rgba(100, 100, 100, 0.2)"
    });
  };

  const saveCustomSettings = async () => {
    if (!customSettings) return;
    
    try {
      const existingPrefs = await CalendarPreferences.filter({ enabler_id: enabler.id });
      
      const prefsData = {
        enabler_id: enabler.id,
        preset_mode: "custom",
        ...customSettings, // Use the customized settings
        default_setup_buffer_minutes: 30,
        default_teardown_buffer_minutes: 30,
        auto_accept_bookings: false,
        auto_block_after_large_events: true,
        availability_frequency: "daily",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ai_optimization_enabled: true,
        google_calendar_connected: false,
        last_updated: new Date().toISOString()
      };

      if (existingPrefs[0]) {
        await CalendarPreferences.update(existingPrefs[0].id, prefsData);
      } else {
        await CalendarPreferences.create(prefsData);
      }

      setSelectedMode("custom");
      setShowModeDetails(null);
      setCustomSettings(null);
      setTimeout(() => setStep(2), 300);
    } catch (error) {
      console.error("Error saving custom settings:", error);
    }
  };

  const connectGoogleCalendar = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Check if backend is available
      if (!backendAvailable) {
        setConnectionError("backend_not_configured");
        setIsConnecting(false);
        return;
      }

      // Call backend to get OAuth URL
      const response = await fetch('/api/calendar/google/oauth/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabler_id: enabler.id,
          redirect_uri: `${window.location.origin}/calendar-oauth-callback`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize OAuth');
      }

      const { auth_url } = await response.json();

      // Store current enabler ID for callback
      localStorage.setItem('calendar_oauth_enabler_id', enabler.id);

      // Redirect to Google OAuth
      window.location.href = auth_url;

    } catch (error) {
      console.error("Error connecting calendar:", error);
      setConnectionError("connection_failed");
      setIsConnecting(false);
    }
  };

  const skipCalendarSync = async () => {
    // Mark as skipped in preferences
    try {
      const existingPrefs = await CalendarPreferences.filter({ enabler_id: enabler.id });
      if (existingPrefs[0]) {
        await CalendarPreferences.update(existingPrefs[0].id, {
          google_calendar_connected: false,
          calendar_sync_skipped: true
        });
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
    
    setStep(3);
  };

  const simulateConnection = async () => {
    setIsConnecting(true);
    
    // Simulate connection for demo purposes
    setTimeout(async () => {
      try {
        const existingPrefs = await CalendarPreferences.filter({ enabler_id: enabler.id });
        if (existingPrefs[0]) {
          await CalendarPreferences.update(existingPrefs[0].id, {
            google_calendar_connected: true,
            calendar_connection_simulated: true,
            last_calendar_sync: new Date().toISOString()
          });
        }
        setCalendarConnected(true);
        setIsConnecting(false);
        setTimeout(() => setStep(3), 1000);
      } catch (error) {
        console.error("Error simulating connection:", error);
        setIsConnecting(false);
      }
    }, 2000);
  };

  const completeSetup = () => {
    navigate(createPageUrl("EnablerCalendar"));
  };

  if (!enabler) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  const currentSettingsInModal = customSettings || showModeDetails?.settings;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </button>
            <div className="text-center flex-1">
              <h1 className="text-sm font-medium text-gray-900 tracking-tight">Calendar Setup</h1>
              <p className="text-xs text-gray-400 tracking-wide mt-0.5">STEP {step} OF 3</p>
            </div>
            <div className="w-10"></div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 transition-all ${
                  s <= step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Choose Schedule Mode */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-light text-gray-900 mb-1">Choose Your Schedule Mode</h2>
                <p className="text-xs text-gray-400 tracking-wide">
                  AUTO-SCHEDULING SETTINGS
                </p>
              </div>

              <div className="space-y-3">
                {PRESET_MODES.map((mode) => (
                  <motion.button
                    key={mode.id}
                    onClick={() => {
                      setShowModeDetails(mode);
                      setCustomSettings(null); // Reset custom settings when a preset is chosen
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left p-5 border border-gray-200 rounded-xl transition-all hover:shadow-lg relative overflow-hidden group"
                    style={{
                      boxShadow: selectedMode === mode.id ? `0 0 0 2px ${mode.haloColor}` : 'none'
                    }}
                  >
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle at center, ${mode.haloColor} 0%, transparent 70%)`
                      }}
                    />
                    
                    <div className="relative flex items-start gap-4">
                      <span className="text-3xl">{mode.icon}</span>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-gray-900 mb-1 ${mode.color}`}>{mode.name}</h3>
                        <p className="text-xs text-gray-600 mb-3">{mode.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="font-normal">
                            {mode.settings.working_days.length} days/week
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {mode.settings.max_hours_per_day}h max/day
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {mode.settings.max_bookings_per_day} bookings/day
                          </Badge>
                        </div>
                      </div>
                      {selectedMode === mode.id && (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                ))}

                {/* Custom Option */}
                <motion.button
                  onClick={handleCustomMode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left p-5 border-2 border-dashed border-gray-300 rounded-xl transition-all hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">⚙️</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Custom</h3>
                      <p className="text-xs text-gray-600">Create your own schedule preferences</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Connect Calendar */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Google Calendar</h2>
                <p className="text-gray-600 text-sm">
                  Sync your calendar to prevent double bookings and show real-time availability
                </p>
              </div>

              {connectionError === "backend_not_configured" && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">
                        Backend Configuration Required
                      </p>
                      <p className="text-sm text-yellow-800 mb-3">
                        Calendar sync requires server-side OAuth configuration. The backend endpoints are not yet deployed.
                      </p>
                      <div className="text-xs text-yellow-700 space-y-1">
                        <p>📋 To enable calendar sync:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>Deploy backend API endpoints</li>
                          <li>Configure Google OAuth credentials</li>
                          <li>Set up webhook endpoints</li>
                        </ul>
                        <p className="mt-2">
                          See <span className="font-semibold">DeveloperDocs</span> page for setup guide.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {connectionError === "connection_failed" && (
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">
                      Connection failed. Please try again or skip for now.
                    </p>
                  </div>
                </Card>
              )}

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3">Benefits of Calendar Sync</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Automatically block your personal appointments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Show real-time availability to clients</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Prevent double bookings automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Two-way sync keeps everything updated</span>
                  </li>
                </ul>
              </Card>

              {calendarConnected ? (
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-bold text-green-900">Calendar Connected!</h3>
                      <p className="text-sm text-green-700">Your Google Calendar is now synced</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setStep(3)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {backendAvailable ? (
                    <Button
                      onClick={connectGoogleCalendar}
                      disabled={isConnecting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Connect Google Calendar
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={simulateConnection}
                        disabled={isConnecting}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Simulating Connection...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Simulate Connection (Demo Mode)
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-gray-500">
                        Backend not configured - using demo mode
                      </p>
                    </>
                  )}

                  <button
                    onClick={skipCalendarSync}
                    className="w-full text-sm text-gray-600 hover:text-gray-900 py-3"
                  >
                    Skip for now (set up later)
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-emerald-500" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
                <p className="text-gray-600 text-sm">
                  Your calendar is ready to accept bookings
                </p>
              </div>

              <Card className="p-6 bg-emerald-50/50 border-emerald-200">
                <h3 className="font-bold text-gray-900 mb-4">What's Next?</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Your availability is now visible to potential clients</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>You'll receive booking requests based on your schedule</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>You can adjust your settings anytime in the calendar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold">4.</span>
                    <span>AI will optimize your schedule for maximum efficiency</span>
                  </li>
                </ul>
              </Card>

              <Button
                onClick={completeSetup}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg"
              >
                View My Calendar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Details / Custom Settings Popup */}
      <AnimatePresence>
        {showModeDetails && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => {
                setShowModeDetails(null);
                setCustomSettings(null); // Clear custom settings when closing modal
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 z-50 flex items-center justify-center"
            >
              <div 
                className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{showModeDetails.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{showModeDetails.name}</h3>
                      <p className="text-xs text-gray-500">Customize your schedule</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModeDetails(null);
                      setCustomSettings(null); // Clear custom settings when closing modal
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Settings */}
                <div className="p-6 space-y-6">
                  {/* Working Days */}
                  <div>
                    <label className="text-xs font-semibold text-gray-900 mb-3 block">WORKING DAYS</label>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                        const dayName = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx];
                        const isSelected = currentSettingsInModal?.working_days?.includes(dayName);
                        
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              const currentDays = currentSettingsInModal?.working_days || [];
                              const days = currentDays.includes(dayName)
                                ? currentDays.filter(d => d !== dayName)
                                : [...currentDays, dayName];
                              setCustomSettings({ ...currentSettingsInModal, working_days: days });
                            }}
                            className={`p-2 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-900 mb-2 block">START TIME</label>
                      <input
                        type="time"
                        value={currentSettingsInModal?.work_start_time || ''}
                        onChange={(e) => setCustomSettings({ 
                          ...currentSettingsInModal, 
                          work_start_time: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-900 mb-2 block">END TIME</label>
                      <input
                        type="time"
                        value={currentSettingsInModal?.work_end_time || ''}
                        onChange={(e) => setCustomSettings({ 
                          ...currentSettingsInModal, 
                          work_end_time: e.target.value 
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Max Hours & Bookings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-900 mb-2 block">MAX HOURS/DAY</label>
                      <input
                        type="number"
                        value={currentSettingsInModal?.max_hours_per_day || ''}
                        onChange={(e) => setCustomSettings({ 
                          ...currentSettingsInModal, 
                          max_hours_per_day: parseInt(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min="1"
                        max="24"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-900 mb-2 block">MAX BOOKINGS/DAY</label>
                      <input
                        type="number"
                        value={currentSettingsInModal?.max_bookings_per_day || ''}
                        onChange={(e) => setCustomSettings({ 
                          ...currentSettingsInModal, 
                          max_bookings_per_day: parseInt(e.target.value) || 0 
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>

                  {/* Break Time */}
                  <div>
                    <label className="text-xs font-semibold text-gray-900 mb-2 block">MINIMUM BREAK (MINUTES)</label>
                    <input
                      type="number"
                      value={currentSettingsInModal?.minimum_break_between_bookings_minutes || ''}
                      onChange={(e) => setCustomSettings({ 
                        ...currentSettingsInModal, 
                        minimum_break_between_bookings_minutes: parseInt(e.target.value) || 0 
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      step="15"
                    />
                  </div>

                  {/* Back-to-Back Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Back-to-back bookings</p>
                      <p className="text-xs text-gray-500">Allow consecutive bookings</p>
                    </div>
                    <button
                      onClick={() => setCustomSettings({
                        ...currentSettingsInModal,
                        allow_back_to_back_bookings: !currentSettingsInModal?.allow_back_to_back_bookings
                      })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        currentSettingsInModal?.allow_back_to_back_bookings
                          ? 'bg-emerald-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          currentSettingsInModal?.allow_back_to_back_bookings
                            ? 'translate-x-6'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowModeDetails(null);
                      setCustomSettings(null); // Clear custom settings when canceling
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (showModeDetails.id === "custom") {
                        saveCustomSettings();
                      } else {
                        // If it's a preset, use the current (possibly modified) settings
                        handleModeSelect({
                          id: showModeDetails.id,
                          settings: currentSettingsInModal
                        });
                      }
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Save & Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
