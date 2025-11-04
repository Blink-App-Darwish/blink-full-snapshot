
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Bell, Lock, Shield, Brain, Calendar, Palette, Globe, ChevronRight, Smartphone, Moon, Sun, Sparkles, AlertCircle, Eye, Fingerprint, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Added Input import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import BlinkLogo from "../components/BlinkLogo";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Notification Settings
  const [notifications, setNotifications] = useState({
    app_notifications: true,
    email_notifications: true,
    sms_alerts: false,
    event_updates: true,
    booking_alerts: true,
    negotiation_messages: true,
    financial_alerts: true,
    push_sound: true,
    dnd_enabled: false,
    dnd_start: "22:00",
    dnd_end: "08:00"
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    camera_access: false,
    mic_access: false,
    location_access: true,
    app_lock: false
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    ai_negotiation: true,
    suggestion_level: "balanced",
    tone_preference: "friendly",
    save_chat_history: true,
    data_training_consent: false
  });

  // Calendar Settings
  const [calendarSettings, setCalendarSettings] = useState({
    default_view: "weekly",
    auto_sync_apple: false,
    auto_sync_google: false,
    event_reminders: true,
    reminder_timing: "1_hour",
    auto_backup: false
  });

  // Appearance Settings
  const [appearance, setAppearance] = useState({
    theme: "auto",
    font_size: "medium",
    layout_preset: "expressive"
  });

  // Language Settings
  const [language, setLanguage] = useState({
    app_language: "en",
    auto_detect: true,
    region_format: "US"
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load saved settings from user preferences
      if (userData.settings) {
        if (userData.settings.notifications) setNotifications({...notifications, ...userData.settings.notifications});
        if (userData.settings.privacy) setPrivacy({...privacy, ...userData.settings.privacy});
        if (userData.settings.ai) setAiSettings({...aiSettings, ...userData.settings.ai});
        if (userData.settings.calendar) setCalendarSettings({...calendarSettings, ...userData.settings.calendar});
        if (userData.settings.appearance) setAppearance({...appearance, ...userData.settings.appearance});
        if (userData.settings.language) setLanguage({...language, ...userData.settings.language});
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (section, data) => {
    setIsSaving(true);
    try {
      const currentSettings = user.settings || {};
      const updatedSettings = {
        ...currentSettings,
        [section]: data
      };
      
      await base44.auth.updateMe({ settings: updatedSettings });
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  const sections = [
    {
      id: "notifications",
      label: "Notifications & Communication",
      icon: Bell,
      color: "from-blue-400 to-cyan-500"
    },
    {
      id: "privacy",
      label: "Privacy & Security",
      icon: Shield,
      color: "from-emerald-400 to-green-500"
    },
    {
      id: "ai",
      label: "Smart Experience",
      icon: Brain,
      color: "from-purple-400 to-pink-500"
    },
    {
      id: "calendar",
      label: "Event & Calendar",
      icon: Calendar,
      color: "from-orange-400 to-red-500"
    },
    {
      id: "appearance",
      label: "App Appearance",
      icon: Palette,
      color: "from-indigo-400 to-purple-500"
    },
    {
      id: "language",
      label: "Language & Region",
      icon: Globe,
      color: "from-teal-400 to-cyan-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400 tracking-wider mt-0.5">PERSONALIZE YOUR EXPERIENCE</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24 space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;
          
          return (
            <Card key={section.id} className="overflow-hidden border border-gray-100">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                </motion.div>
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 space-y-4 bg-gray-50/30">
                      {/* NOTIFICATIONS SECTION */}
                      {section.id === "notifications" && (
                        <>
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">App Notifications</Label>
                              <p className="text-xs text-gray-500 mt-0.5">In-app push notifications</p>
                            </div>
                            <Switch
                              checked={notifications.app_notifications}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, app_notifications: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">Email Notifications</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Receive updates via email</p>
                            </div>
                            <Switch
                              checked={notifications.email_notifications}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, email_notifications: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">SMS Alerts</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Text message notifications</p>
                            </div>
                            <Switch
                              checked={notifications.sms_alerts}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, sms_alerts: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notification Categories</p>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-gray-700">Event Updates</Label>
                            <Switch
                              checked={notifications.event_updates}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, event_updates: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-gray-700">Booking Confirmations & Cancellations</Label>
                            <Switch
                              checked={notifications.booking_alerts}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, booking_alerts: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-gray-700">Negotiation Messages</Label>
                            <Switch
                              checked={notifications.negotiation_messages}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, negotiation_messages: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-gray-700">Financial Alerts</Label>
                            <Switch
                              checked={notifications.financial_alerts}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, financial_alerts: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm font-medium text-gray-900">Push Sound</Label>
                            <Switch
                              checked={notifications.push_sound}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, push_sound: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-gray-900">Do Not Disturb</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Mute notifications during hours</p>
                            </div>
                            <Switch
                              checked={notifications.dnd_enabled}
                              onCheckedChange={(checked) => {
                                const updated = {...notifications, dnd_enabled: checked};
                                setNotifications(updated);
                                saveSettings('notifications', updated);
                              }}
                            />
                          </div>

                          {notifications.dnd_enabled && (
                            <div className="flex gap-3 items-center pl-4 pt-2">
                              <div className="flex-1">
                                <Label className="text-xs text-gray-600">Start Time</Label>
                                <Input
                                  type="time"
                                  value={notifications.dnd_start}
                                  onChange={(e) => {
                                    const updated = {...notifications, dnd_start: e.target.value};
                                    setNotifications(updated);
                                    saveSettings('notifications', updated);
                                  }}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-gray-600">End Time</Label>
                                <Input
                                  type="time"
                                  value={notifications.dnd_end}
                                  onChange={(e) => {
                                    const updated = {...notifications, dnd_end: e.target.value};
                                    setNotifications(updated);
                                    saveSettings('notifications', updated);
                                  }}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* PRIVACY SECTION */}
                      {section.id === "privacy" && (
                        <>
                          <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                              <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Privacy Policy</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>

                            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                              <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Terms of Use</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Permissions</p>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-500" />
                              <Label className="text-sm text-gray-700">Camera Access</Label>
                            </div>
                            <Switch
                              checked={privacy.camera_access}
                              onCheckedChange={(checked) => {
                                const updated = {...privacy, camera_access: checked};
                                setPrivacy(updated);
                                saveSettings('privacy', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎤</span>
                              <Label className="text-sm text-gray-700">Microphone Access</Label>
                            </div>
                            <Switch
                              checked={privacy.mic_access}
                              onCheckedChange={(checked) => {
                                const updated = {...privacy, mic_access: checked};
                                setPrivacy(updated);
                                saveSettings('privacy', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📍</span>
                              <Label className="text-sm text-gray-700">Location Access</Label>
                            </div>
                            <Switch
                              checked={privacy.location_access}
                              onCheckedChange={(checked) => {
                                const updated = {...privacy, location_access: checked};
                                setPrivacy(updated);
                                saveSettings('privacy', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Fingerprint className="w-4 h-4 text-gray-600" />
                                <Label className="text-sm font-medium text-gray-900">App Lock</Label>
                              </div>
                              <p className="text-xs text-gray-500">Require Face ID or Touch ID</p>
                            </div>
                            <Switch
                              checked={privacy.app_lock}
                              onCheckedChange={(checked) => {
                                const updated = {...privacy, app_lock: checked};
                                setPrivacy(updated);
                                saveSettings('privacy', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>

                          <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                              <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Authorized Devices</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>

                            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                              <div className="flex items-center gap-3">
                                <Lock className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Manage Personal Data</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>

                            <button className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:border-red-500 transition-colors">
                              <div className="flex items-center gap-3">
                                <Trash2 className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-medium text-red-900">Delete Account</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </>
                      )}

                      {/* AI SETTINGS SECTION */}
                      {section.id === "ai" && (
                        <>
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">AI Negotiation Assistant</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Auto-negotiate within your preferences</p>
                            </div>
                            <Switch
                              checked={aiSettings.ai_negotiation}
                              onCheckedChange={(checked) => {
                                const updated = {...aiSettings, ai_negotiation: checked};
                                setAiSettings(updated);
                                saveSettings('ai', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">Smart Suggestions Level</Label>
                            <Select
                              value={aiSettings.suggestion_level}
                              onValueChange={(value) => {
                                const updated = {...aiSettings, suggestion_level: value};
                                setAiSettings(updated);
                                saveSettings('ai', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minimal">Minimal - Only when asked</SelectItem>
                                <SelectItem value="balanced">Balanced - Helpful suggestions</SelectItem>
                                <SelectItem value="aggressive">Aggressive - Proactive assistance</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">AI Tone Preference</Label>
                            <Select
                              value={aiSettings.tone_preference}
                              onValueChange={(value) => {
                                const updated = {...aiSettings, tone_preference: value};
                                setAiSettings(updated);
                                saveSettings('ai', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="formal">Formal - Professional tone</SelectItem>
                                <SelectItem value="friendly">Friendly - Casual and warm</SelectItem>
                                <SelectItem value="neutral">Neutral - Balanced approach</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm text-gray-700">Save AI Chat History</Label>
                            <Switch
                              checked={aiSettings.save_chat_history}
                              onCheckedChange={(checked) => {
                                const updated = {...aiSettings, save_chat_history: checked};
                                setAiSettings(updated);
                                saveSettings('ai', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm text-gray-900">Data Training Consent</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Help improve AI features</p>
                            </div>
                            <Switch
                              checked={aiSettings.data_training_consent}
                              onCheckedChange={(checked) => {
                                const updated = {...aiSettings, data_training_consent: checked};
                                setAiSettings(updated);
                                saveSettings('ai', updated);
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* CALENDAR SECTION */}
                      {section.id === "calendar" && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">Default Calendar View</Label>
                            <Select
                              value={calendarSettings.default_view}
                              onValueChange={(value) => {
                                const updated = {...calendarSettings, default_view: value};
                                setCalendarSettings(updated);
                                saveSettings('calendar', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly View</SelectItem>
                                <SelectItem value="monthly">Monthly View</SelectItem>
                                <SelectItem value="agenda">Agenda View</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Auto-Sync Calendars</p>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg"></span>
                              <Label className="text-sm text-gray-700">Apple Calendar</Label>
                            </div>
                            <Switch
                              checked={calendarSettings.auto_sync_apple}
                              onCheckedChange={(checked) => {
                                const updated = {...calendarSettings, auto_sync_apple: checked};
                                setCalendarSettings(updated);
                                saveSettings('calendar', updated);
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">G</span>
                              <Label className="text-sm text-gray-700">Google Calendar</Label>
                            </div>
                            <Switch
                              checked={calendarSettings.auto_sync_google}
                              onCheckedChange={(checked) => {
                                const updated = {...calendarSettings, auto_sync_google: checked};
                                setCalendarSettings(updated);
                                saveSettings('calendar', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div className="flex items-center justify-between py-2">
                            <Label className="text-sm font-medium text-gray-900">Event Reminders</Label>
                            <Switch
                              checked={calendarSettings.event_reminders}
                              onCheckedChange={(checked) => {
                                const updated = {...calendarSettings, event_reminders: checked};
                                setCalendarSettings(updated);
                                saveSettings('calendar', updated);
                              }}
                            />
                          </div>

                          {calendarSettings.event_reminders && (
                            <div className="pl-4">
                              <Label className="text-xs text-gray-600 mb-2 block">Reminder Timing</Label>
                              <Select
                                value={calendarSettings.reminder_timing}
                                onValueChange={(value) => {
                                  const updated = {...calendarSettings, reminder_timing: value};
                                  setCalendarSettings(updated);
                                  saveSettings('calendar', updated);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="15_min">15 minutes before</SelectItem>
                                  <SelectItem value="30_min">30 minutes before</SelectItem>
                                  <SelectItem value="1_hour">1 hour before</SelectItem>
                                  <SelectItem value="1_day">1 day before</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">Auto-Backup Events</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Backup to iCloud or Google Drive</p>
                            </div>
                            <Switch
                              checked={calendarSettings.auto_backup}
                              onCheckedChange={(checked) => {
                                const updated = {...calendarSettings, auto_backup: checked};
                                setCalendarSettings(updated);
                                saveSettings('calendar', updated);
                              }}
                            />
                          </div>

                          {/* Calendar Preview */}
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Week Preview</p>
                            <div className="grid grid-cols-7 gap-1">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center">
                                  <p className="text-[10px] text-gray-400 mb-1">{day}</p>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                                    i === 3 ? 'bg-emerald-500 text-white font-bold' : 'bg-gray-50 text-gray-600'
                                  }`}>
                                    {i + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* APPEARANCE SECTION */}
                      {section.id === "appearance" && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-3 block">Theme</Label>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { value: "light", icon: Sun, label: "Light" },
                                { value: "dark", icon: Moon, label: "Dark" },
                                { value: "auto", icon: Sparkles, label: "Auto" }
                              ].map((theme) => {
                                const Icon = theme.icon;
                                return (
                                  <button
                                    key={theme.value}
                                    onClick={() => {
                                      const updated = {...appearance, theme: theme.value};
                                      setAppearance(updated);
                                      saveSettings('appearance', updated);
                                    }}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                      appearance.theme === theme.value
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <Icon className={`w-5 h-5 mx-auto mb-1 ${
                                      appearance.theme === theme.value ? 'text-emerald-600' : 'text-gray-600'
                                    }`} />
                                    <p className="text-xs font-medium text-gray-900">{theme.label}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>

                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">Font Size</Label>
                            <Select
                              value={appearance.font_size}
                              onValueChange={(value) => {
                                const updated = {...appearance, font_size: value};
                                setAppearance(updated);
                                saveSettings('appearance', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>

                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-3 block">Layout Preset</Label>
                            <div className="space-y-2">
                              {[
                                { value: "minimal", label: "Minimal", desc: "Clean and focused" },
                                { value: "expressive", label: "Expressive", desc: "Rich and visual" },
                                { value: "business", label: "Business", desc: "Professional and efficient" }
                              ].map((preset) => (
                                <button
                                  key={preset.value}
                                  onClick={() => {
                                    const updated = {...appearance, layout_preset: preset.value};
                                    setAppearance(updated);
                                    saveSettings('appearance', updated);
                                  }}
                                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                    appearance.layout_preset === preset.value
                                      ? 'border-emerald-500 bg-emerald-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <p className="text-sm font-medium text-gray-900">{preset.label}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{preset.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="h-px bg-gray-200 my-4"></div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const defaultAppearance = {
                                theme: "auto",
                                font_size: "medium",
                                layout_preset: "expressive"
                              };
                              setAppearance(defaultAppearance);
                              saveSettings('appearance', defaultAppearance);
                            }}
                          >
                            Reset to Default
                          </Button>
                        </>
                      )}

                      {/* LANGUAGE SECTION */}
                      {section.id === "language" && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">App Language</Label>
                            <Select
                              value={language.app_language}
                              onValueChange={(value) => {
                                const updated = {...language, app_language: value};
                                setLanguage(updated);
                                saveSettings('language', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ar">Arabic (العربية)</SelectItem>
                                <SelectItem value="es">Spanish (Español)</SelectItem>
                                <SelectItem value="fr">French (Français)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <Label className="text-sm font-medium text-gray-900">Auto-Detect Language</Label>
                              <p className="text-xs text-gray-500 mt-0.5">Based on device settings</p>
                            </div>
                            <Switch
                              checked={language.auto_detect}
                              onCheckedChange={(checked) => {
                                const updated = {...language, auto_detect: checked};
                                setLanguage(updated);
                                saveSettings('language', updated);
                              }}
                            />
                          </div>

                          <div className="h-px bg-gray-200 my-3"></div>

                          <div>
                            <Label className="text-sm font-medium text-gray-900 mb-2 block">Region Formatting</Label>
                            <Select
                              value={language.region_format}
                              onValueChange={(value) => {
                                const updated = {...language, region_format: value};
                                setLanguage(updated);
                                saveSettings('language', updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">United States (MM/DD/YYYY, $)</SelectItem>
                                <SelectItem value="AE">UAE (DD/MM/YYYY, AED)</SelectItem>
                                <SelectItem value="GB">United Kingdom (DD/MM/YYYY, £)</SelectItem>
                                <SelectItem value="EU">Europe (DD.MM.YYYY, €)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-2">
                              Affects date, time, and currency display
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
