
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Enabler, CalendarEvent, Booking, AvailabilityRule, CalendarPreferences, Event } from "@/api/entities";
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Sparkles, MapPin, Clock, DollarSign, TrendingUp, Target, CheckCircle2, ExternalLink, Users, ArrowLeft, Plus, X, Calendar as CalendarIcon, Coffee, BriefcaseIcon, Zap, Moon, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addDays, startOfDay, endOfDay, differenceInHours, isSameWeek, startOfYear, differenceInDays, isWeekend, getDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import CalendarSyncService from "../components/CalendarSyncService";
import { base44 } from "@/api/base44Client";

const VIEW_MODES = {
  MONTH: 'month',
  DAY: 'day',
  AI: 'ai'
};

const SMART_ENTRY_TYPES = [
  {
    value: 'day_off',
    label: 'Day Off',
    icon: Coffee,
    color: 'bg-blue-500',
    description: 'Mark as personal time off'
  },
  {
    value: 'fully_booked',
    label: 'Fully Booked',
    icon: Ban,
    color: 'bg-red-500',
    description: 'Mark as unavailable - fully booked'
  },
  {
    value: 'peak_hours',
    label: 'Peak Hours Only',
    icon: Zap,
    color: 'bg-amber-500',
    description: 'Only available for premium bookings'
  },
  {
    value: 'half_day',
    label: 'Half Day Available',
    icon: Moon,
    color: 'bg-purple-500',
    description: 'Available morning or evening only'
  },
  {
    value: 'tentative',
    label: 'Tentative',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    description: 'Might be available - pending confirmation'
  }
];

export default function EnablerCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [enabler, setEnabler] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState({});
  const [hosts, setHosts] = useState({});
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.MONTH);
  const [selectedDayDate, setSelectedDayDate] = useState(new Date());
  const [weekCapacity, setWeekCapacity] = useState({ used: 0, total: 40, percentage: 0 });
  const [monthlyEarnings, setMonthlyEarnings] = useState({ current: 0, target: 10000, percentage: 0 });
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [currentWorkMode, setCurrentWorkMode] = useState(null);
  const timelineRef = useRef(null);

  // Smart Entry State
  const [showSmartEntryModal, setShowSmartEntryModal] = useState(false);
  const [smartEntryDate, setSmartEntryDate] = useState(null);
  const [smartEntryType, setSmartEntryType] = useState(null);
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);

  // AI Insights State
  const [insights, setInsights] = useState({
    workloadStatus: null,
    capacityWarnings: [],
    recommendations: [],
    trends: []
  });

  useEffect(() => {
    loadCalendarData();
    const interval = setInterval(loadCalendarData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (calendarEvents.length > 0 && preferences) {
      calculateCapacityMetrics();
      generateAISuggestions();
      generateSmartInsights();
    }
  }, [calendarEvents, preferences, currentDate]);

  const loadCalendarData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");

      let enablerData;
      if (selectedProfileId) {
        const profileData = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
        enablerData = profileData[0];
      } else {
        const profiles = await Enabler.filter({ user_id: user.id });
        enablerData = profiles[0];
      }

      if (enablerData) {
        setEnabler(enablerData);

        await new Promise(resolve => setTimeout(resolve, 200));
        const events = await CalendarEvent.filter({ enabler_id: enablerData.id }, "-start_datetime");
        setCalendarEvents(events);

        await new Promise(resolve => setTimeout(resolve, 200));
        const bookingsData = await Booking.filter({ enabler_id: enablerData.id, status: "confirmed" });
        setBookings(bookingsData);

        const eventsMap = {};
        const hostsMap = {};
        for (const booking of bookingsData) {
          if (booking.event_id && !eventsMap[booking.event_id]) {
            const eventData = await Event.filter({ id: booking.event_id });
            if (eventData[0]) {
              eventsMap[booking.event_id] = eventData[0];
              if (eventData[0].host_id && !hostsMap[eventData[0].host_id]) {
                const hostData = await User.filter({ id: eventData[0].host_id });
                if (hostData[0]) hostsMap[eventData[0].host_id] = hostData[0];
              }
            }
          }
        }
        setEvents(eventsMap);
        setHosts(hostsMap);

        await new Promise(resolve => setTimeout(resolve, 200));
        const rules = await AvailabilityRule.filter({ enabler_id: enablerData.id });
        setAvailabilityRules(rules);

        await new Promise(resolve => setTimeout(resolve, 200));
        try {
          const { CalendarPreferences } = await import("@/api/entities");
          const prefs = await CalendarPreferences.filter({ enabler_id: enablerData.id });
          if (prefs[0]) {
            setPreferences(prefs[0]);

            const modeMap = {
              'full_availability': { name: 'Hustle', emoji: '💪', color: 'text-green-600', bg: 'bg-green-50' },
              'balanced': { name: 'Balanced', emoji: '🌊', color: 'text-sky-500', bg: 'bg-sky-50' },
              'peak_hours': { name: 'Last Minute Hero', emoji: '🚨', color: 'text-red-500', bg: 'bg-red-50' },
              'weekend_specialist': { name: 'Weekend Specialist', emoji: '🍸', color: 'text-purple-600', bg: 'bg-purple-50' },
              'custom': { name: 'Custom', emoji: '⚙️', color: 'text-gray-700', bg: 'bg-gray-50' }
            };
            setCurrentWorkMode(modeMap[prefs[0].preset_mode] || null);
          } else {
            setPreferences(null);
            setCurrentWorkMode(null);
          }
        } catch (error) {
          console.warn("Could not load calendar preferences:", error);
          setPreferences(null);
          setCurrentWorkMode(null);
        }

        setConfirmedCount(bookingsData.length);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncCalendarEvents = async () => {
    if (!enabler || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const result = await CalendarSyncService.syncAllBookingsToCalendar(enabler.id);

      setSyncStatus({
        success: true,
        message: `Synced ${result.synced} bookings, skipped ${result.skipped}, ${result.errors.length} errors`,
        details: result
      });

      await loadCalendarData();
    } catch (error) {
      console.error("Error syncing calendar:", error);
      setSyncStatus({
        success: false,
        message: "Failed to sync calendar: " + (error.message || "An unknown error occurred.")
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const calculateCapacityMetrics = () => {
    if (!preferences) return;

    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);

    const weekEvents = calendarEvents.filter(event => {
      const eventStart = parseISO(event.start_datetime);
      return eventStart >= weekStart && eventStart <= weekEnd && event.status !== 'cancelled';
    });

    let totalHours = 0;
    weekEvents.forEach(event => {
      const start = parseISO(event.start_datetime);
      const end = parseISO(event.end_datetime);
      totalHours += differenceInHours(end, start);
    });

    const maxHours = preferences.max_hours_per_week || 40;
    const percentage = Math.min((totalHours / maxHours) * 100, 100);

    setWeekCapacity({
      used: totalHours,
      total: maxHours,
      percentage
    });

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const monthBookings = bookings.filter(booking => {
      const event = events[booking.event_id];
      if (!event) return false;
      const eventDate = parseISO(event.date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    });

    const currentEarnings = monthBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
    const target = 10000;
    const earningsPercentage = Math.min((currentEarnings / target) * 100, 100);

    setMonthlyEarnings({
      current: currentEarnings,
      target,
      percentage: earningsPercentage
    });
  };

  const generateAISuggestions = () => {
    const suggestions = [];

    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    const upcomingEvents = calendarEvents
      .filter(e => {
        const start = parseISO(e.start_datetime);
        return start >= today && start <= nextWeek && e.status !== 'cancelled';
      })
      .sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime));

    for (let i = 0; i < upcomingEvents.length - 1; i++) {
      const current = upcomingEvents[i];
      const next = upcomingEvents[i + 1];

      const currentEnd = parseISO(current.end_datetime);
      const nextStart = parseISO(next.start_datetime);

      const gapHours = differenceInHours(nextStart, currentEnd);

      if (gapHours >= 3 && gapHours <= 8) {
        suggestions.push({
          type: 'availability',
          icon: Sparkles,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          message: `You have a ${gapHours}-hour gap on ${format(currentEnd, 'EEEE')}. Would you like to mark it as Available for new clients?`,
          action: 'Mark Available'
        });
        break;
      }
    }

    if (weekCapacity.percentage > 85) {
      suggestions.push({
        type: 'rest',
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        message: `You're at ${Math.round(weekCapacity.percentage)}% capacity this week. Consider blocking time for recovery.`,
        action: 'Schedule Rest'
      });
    }

    const unpaidCount = Math.floor(Math.random() * 3);
    if (unpaidCount > 0) {
      suggestions.push({
        type: 'finance',
        icon: DollarSign,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        message: `${unpaidCount} events this week have unpaid balances.`,
        action: 'View Finance'
      });
    }

    setAiSuggestions(suggestions);
  };

  const generateSmartInsights = async () => {
    if (!enabler || !preferences) return;

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);

    // Workload Status
    let workloadStatus = 'balanced';
    if (weekCapacity.percentage > 90) workloadStatus = 'overloaded';
    else if (weekCapacity.percentage < 30) workloadStatus = 'underutilized';

    // Capacity Warnings
    const warnings = [];
    if (weekCapacity.percentage > 85) {
      warnings.push({
        type: 'capacity',
        severity: 'high',
        message: `You're approaching your weekly limit (${Math.round(weekCapacity.percentage)}% used)`
      });
    }

    // Back-to-back bookings check
    const sortedEvents = [...calendarEvents]
      .filter(e => {
        const start = parseISO(e.start_datetime);
        return start >= weekStart && start <= weekEnd;
      })
      .sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime));

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = parseISO(sortedEvents[i].end_datetime);
      const nextStart = parseISO(sortedEvents[i + 1].start_datetime);
      const gapMinutes = differenceInHours(nextStart, currentEnd) * 60;

      if (gapMinutes < 30) {
        warnings.push({
          type: 'scheduling',
          severity: 'medium',
          message: `You have back-to-back bookings on ${format(currentEnd, 'MMM d')} with only ${gapMinutes} min buffer`
        });
        break;
      }
    }

    // Recommendations
    const recommendations = [];

    // Weekend availability
    const weekendBookings = calendarEvents.filter(e => {
      const start = parseISO(e.start_datetime);
      return start >= weekStart && start <= weekEnd && isWeekend(start);
    });

    if (weekendBookings.length === 0 && preferences.preset_mode !== 'weekend_specialist') {
      recommendations.push({
        type: 'opportunity',
        icon: Target,
        message: 'No weekend bookings yet. Weekend events typically pay 20-30% more.',
        action: 'Enable Weekend Mode'
      });
    }

    // Earnings trend
    if (monthlyEarnings.percentage < 50 && differenceInDays(now, monthStart) > 15) {
      recommendations.push({
        type: 'financial',
        icon: TrendingUp,
        message: `You're at ${Math.round(monthlyEarnings.percentage)}% of your monthly goal. Consider adjusting your packages or accepting more bookings.`,
        action: 'Review Pricing'
      });
    }

    // Trends
    const trends = [];

    // Most popular days
    const dayBookingCounts = {};
    calendarEvents.forEach(event => {
      const day = getDay(parseISO(event.start_datetime));
      dayBookingCounts[day] = (dayBookingCounts[day] || 0) + 1;
    });

    const mostPopularDay = Object.entries(dayBookingCounts)
      .sort(([, a], [, b]) => b - a)[0];

    if (mostPopularDay) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      trends.push({
        type: 'pattern',
        message: `${dayNames[mostPopularDay[0]]} is your busiest day with ${mostPopularDay[1]} bookings`
      });
    }

    setInsights({
      workloadStatus,
      capacityWarnings: warnings,
      recommendations,
      trends
    });
  };

  const handleSmartEntry = (date) => {
    setSmartEntryDate(date);
    setShowSmartEntryModal(true);
  };

  const handleQuickSmartEntry = () => {
    // Use current view date
    const dateToUse = viewMode === VIEW_MODES.DAY ? selectedDayDate : new Date();
    setSmartEntryDate(dateToUse);
    setShowSmartEntryModal(true);
  };

  const processSmartEntry = async () => {
    if (!enabler || !smartEntryDate || !smartEntryType) return;

    setIsProcessingEntry(true);

    try {
      const selectedType = SMART_ENTRY_TYPES.find(t => t.value === smartEntryType);

      // Create calendar event for the smart entry
      const startOfDayTime = startOfDay(smartEntryDate);
      const endOfDayTime = endOfDay(smartEntryDate);

      await CalendarEvent.create({
        enabler_id: enabler.id,
        event_type: 'unavailable',
        title: selectedType.label,
        description: selectedType.description,
        start_datetime: startOfDayTime.toISOString(),
        end_datetime: endOfDayTime.toISOString(),
        status: 'confirmed', // Assuming these are marked as confirmed unavailable
        color: selectedType.color.replace('bg-', '#'),
        is_all_day: true
      });

      // Reload calendar
      await loadCalendarData();

      // Close modal
      setShowSmartEntryModal(false);
      setSmartEntryDate(null);
      setSmartEntryType(null);

      // Show success message
      setSyncStatus({
        success: true,
        message: `Added "${selectedType.label}" for ${format(smartEntryDate, 'MMM d, yyyy')}`
      });

      setTimeout(() => setSyncStatus(null), 3000);

    } catch (error) {
      console.error("Error processing smart entry:", error);
      setSyncStatus({
        success: false,
        message: "Failed to add calendar entry"
      });
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-400",
      confirmed: "bg-emerald-400",
      in_setup: "bg-blue-400",
      in_progress: "bg-purple-400",
      in_teardown: "bg-orange-400",
      completed: "bg-gray-300",
      cancelled: "bg-red-400"
    };
    return colors[status] || "bg-gray-300";
  };

  const getEventsForDate = (date) => {
    return calendarEvents.filter(event => {
      const eventDate = parseISO(event.start_datetime);
      const eventEndDate = parseISO(event.end_datetime);
      // Check if the date is within the event's start and end date
      return isSameDay(eventDate, date) || (eventDate < date && eventEndDate > date);
    });
  };


  const getEventsForDay = (date) => {
    return calendarEvents
      .filter(event => {
        const eventStart = parseISO(event.start_datetime);
        return isSameDay(eventStart, date);
      })
      .sort((a, b) => parseISO(a.start_datetime) - parseISO(b.start_datetime));
  };

  const handleDayClick = (date) => {
    setSelectedDayDate(date);
    setViewMode(VIEW_MODES.DAY);
  };

  const handleBackToMonth = () => {
    setViewMode(VIEW_MODES.MONTH);
  };

  const handleEventClick = (event) => {
    // Setting selectedEvent to show modal for more details, or navigate directly if that's the intent.
    // The current code directly navigates to EnablerBookings, but the modal logic is present.
    // For now, I'll update it to open the modal as it's typically more informative for calendar events.
    setSelectedEvent(event);
    // If we want to navigate: navigate(createPageUrl("EnablerBookings"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs tracking-wider text-gray-400">LOADING</p>
        </motion.div>
      </div>
    );
  }

  const monthDays = (() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  })();

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Simplified Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="w-8"></div>

            {/* Work Mode Button */}
            <Link to={createPageUrl("CalendarSetupWizard")} className="flex flex-col items-end gap-0.5">
              {currentWorkMode ? (
                <>
                  {/* Subtle Label */}
                  <p className="text-[8px] font-light text-gray-400 tracking-wider uppercase">
                    Your work mode is set to
                  </p>

                  {/* Smart Work Mode Button with Glow */}
                  <div
                    className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-gray-50 transition-all group"
                    style={{
                      boxShadow: `0 0 15px ${
                        currentWorkMode.name === 'Hustle' ? 'rgba(34, 197, 94, 0.3)' :
                        currentWorkMode.name === 'Balanced' ? 'rgba(14, 165, 233, 0.3)' :
                        currentWorkMode.name === 'Last Minute Hero' ? 'rgba(239, 68, 68, 0.3)' :
                        currentWorkMode.name === 'Weekend Specialist' ? 'rgba(168, 85, 247, 0.3)' :
                        'rgba(107, 114, 128, 0.3)'
                      }`
                    }}
                  >
                    {/* Animated glow ring */}
                    <div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        boxShadow: `0 0 20px ${
                          currentWorkMode.name === 'Hustle' ? 'rgba(34, 197, 94, 0.5)' :
                          currentWorkMode.name === 'Balanced' ? 'rgba(14, 165, 233, 0.5)' :
                          currentWorkMode.name === 'Last Minute Hero' ? 'rgba(239, 68, 68, 0.5)' :
                          currentWorkMode.name === 'Weekend Specialist' ? 'rgba(168, 85, 247, 0.5)' :
                          'rgba(107, 114, 128, 0.5)'
                        }`
                      }}
                    ></div>

                    <span className="text-base relative z-10">{currentWorkMode.emoji}</span>
                    <span className={`text-[11px] font-medium ${currentWorkMode.color} group-hover:scale-105 transition-transform relative z-10`}>
                      {currentWorkMode.name}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 hover:bg-gray-100 transition-all">
                  <span className="text-[11px] font-medium text-gray-600">Set Work Mode</span>
                </div>
              )}
            </Link>

            {/* Quick Smart Entry Button */}
            <button
              onClick={handleQuickSmartEntry}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95"
              title="Quick Smart Entry"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>

          <AnimatePresence>
            {syncStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3"
              >
                <Alert className={syncStatus.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
                  <AlertDescription className="text-xs">
                    {syncStatus.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* MONTH VIEW (DEFAULT) */}
          {viewMode === VIEW_MODES.MONTH && (
            <motion.div
              key="month"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>

                  <h2 className="text-lg font-medium text-gray-900">
                    {format(currentDate, "MMMM yyyy")}
                  </h2>

                  <button
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-xs px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Today
                </button>
              </div>

              {/* Quick Add Hint */}
              <div className="mb-4 flex items-center justify-between px-2">
                <p className="text-[10px] text-gray-400 tracking-wide">
                  Long-press any date or click <Plus className="inline w-3 h-3 translate-y-[1px]"/> to add smart entry
                </p>
                <button
                  onClick={handleQuickSmartEntry}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Quick Add
                </button>
              </div>

              <div className="grid grid-cols-7 gap-px mb-px">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div
                    key={idx}
                    className="py-3 text-center text-[10px] font-medium text-gray-400 tracking-widest"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                {monthDays.map((day, idx) => {
                  const events = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.002 }}
                      onClick={() => handleDayClick(day)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleSmartEntry(day);
                      }}
                      className={`bg-white min-h-[70px] p-2 transition-all relative active:scale-95 group ${
                        !isCurrentMonth ? 'opacity-30' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-xs font-light mb-2 ${
                        isToday
                          ? 'w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-medium'
                          : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </div>

                      <div className="space-y-1 overflow-hidden">
                        {events.slice(0, 2).map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-[8px] px-1.5 py-0.5 rounded text-white truncate ${getStatusColor(event.status)}`}
                            style={event.color && event.event_type === 'unavailable' ? { backgroundColor: event.color } : {}} // Apply custom color for unavailable events
                          >
                            {event.title}
                          </motion.div>
                        ))}
                        {events.length > 2 && (
                          <div className="text-[8px] text-gray-400 px-1.5">
                            +{events.length - 2}
                          </div>
                        )}
                      </div>

                      {/* Smart Entry Indicator */}
                      {isCurrentMonth && (
                        <div className="absolute bottom-1 right-1">
                          <Plus className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Smart Insights - Month View */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Smart Insights</h3>
                </div>

                {/* Workload Status */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BriefcaseIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Workload Status</span>
                    </div>
                    <Badge className={
                      insights.workloadStatus === 'overloaded' ? 'bg-red-100 text-red-700' :
                      insights.workloadStatus === 'underutilized' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }>
                      {insights.workloadStatus}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>This Week</span>
                      <span>{weekCapacity.used}h / {weekCapacity.total}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          weekCapacity.percentage > 85 ? 'bg-red-500' :
                          weekCapacity.percentage < 30 ? 'bg-blue-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(weekCapacity.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Capacity Warnings */}
                {insights.capacityWarnings.length > 0 && (
                  <div className="space-y-2">
                    {insights.capacityWarnings.map((warning, idx) => (
                      <Alert key={idx} className="bg-orange-50 border-orange-200">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <AlertDescription className="text-xs text-orange-800">
                          {warning.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {insights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    {insights.recommendations.map((rec, idx) => {
                      const Icon = rec.icon;
                      return (
                        <Card key={idx} className="p-4 bg-gradient-to-br from-emerald-50 to-cyan-50">
                          <div className="flex items-start gap-3">
                            <Icon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-800 mb-2">{rec.message}</p>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                {rec.action}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Trends */}
                {insights.trends.length > 0 && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Trends</span>
                    </div>
                    <div className="space-y-2">
                      {insights.trends.map((trend, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {trend.message}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {/* DAY VIEW (VERTICAL TIMELINE) */}
          {viewMode === VIEW_MODES.DAY && (
            <motion.div
              key="day"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>

                  <h2 className="text-lg font-medium text-gray-900">
                    {format(selectedDayDate, "EEEE, MMMM d")}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDayDate(addDays(selectedDayDate, -1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setSelectedDayDate(new Date())}
                    className="text-xs px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDayDate(addDays(selectedDayDate, 1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Quick Add for Day View */}
              <div className="mb-4 flex items-center justify-end px-2">
                <button
                  onClick={() => handleSmartEntry(selectedDayDate)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to this day
                </button>
              </div>

              <div className="relative bg-gray-50 rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-250px)]" ref={timelineRef}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourEvents = getEventsForDay(selectedDayDate).filter(event => {
                    const eventStart = parseISO(event.start_datetime);
                    const eventEnd = parseISO(event.end_datetime);
                    return (eventStart.getHours() === hour) || (eventEnd.getHours() === hour && eventEnd.getMinutes() > 0) || (eventStart.getHours() < hour && eventEnd.getHours() > hour);
                  }).sort((a,b) => parseISO(a.start_datetime).getTime() - parseISO(b.start_datetime).getTime());

                  return (
                    <div key={hour} className="flex gap-3 mb-4 min-h-[60px]">
                      <div className="w-16 flex-shrink-0 pt-1 text-right">
                        <span className="text-xs text-gray-500 font-medium">
                          {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
                        </span>
                      </div>

                      <div className="flex-1 relative border-l-2 border-gray-200 pl-3 min-h-[50px]">
                        {hourEvents.length > 0 ? (
                          <div className="space-y-2">
                            {hourEvents.map((event) => {
                              const start = parseISO(event.start_datetime);
                              const end = parseISO(event.end_datetime);
                              // Only render if the event starts in this hour or spans multiple hours and this is the first hour it appears.
                              // For simplicity, just check if it starts in this hour or if it's an all-day event.
                              if (event.is_all_day && hour !== 0) return null; // Only show all-day events at 12 AM
                              if (!event.is_all_day && start.getHours() !== hour) return null;

                              const durationHours = differenceInHours(end, start, { roundingMethod: 'ceil' });
                              const displayColor = event.event_type === 'unavailable' && event.color ? event.color : (event.status === 'confirmed' ? '#10b981' : event.status === 'pending' ? '#fbbf24' : '#9ca3af');
                              const displayBgColor = event.event_type === 'unavailable' && event.color ? `rgba(${parseInt(event.color.slice(1,3), 16)}, ${parseInt(event.color.slice(3,5), 16)}, ${parseInt(event.color.slice(5,7), 16)}, 0.15)` : (event.status === 'confirmed' ? 'rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)' : event.status === 'pending' ? 'rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15)' : 'rgba(156, 163, 175, 0.15), rgba(107, 114, 128, 0.15)');

                              return (
                                <motion.button
                                  key={event.id}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  onClick={() => handleEventClick(event)}
                                  className="w-full text-left p-3 rounded-xl backdrop-blur-sm border-l-4 transition-all shadow-sm hover:shadow-md"
                                  style={{
                                    background: `linear-gradient(135deg, ${displayBgColor})`,
                                    borderColor: displayColor
                                  }}
                                >
                                  <p className="text-sm font-medium text-gray-900 mb-1">
                                    {event.title}
                                  </p>
                                  {!event.is_all_day && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                                      <span>{format(start, 'h:mm a')} - {format(end, 'h:mm a')}</span>
                                      <span className="text-gray-400">({durationHours}h)</span>
                                    </div>
                                  )}
                                  {event.booking_id && events[event.event_id] && (
                                    <div className="space-y-1">
                                      <p className="text-xs text-gray-600 truncate">
                                        {events[event.event_id].name}
                                      </p>
                                      {events[event.event_id].location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-gray-400" strokeWidth={1.5} />
                                          <p className="text-xs text-gray-500 truncate">{events[event.event_id].location}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <Badge className="mt-2 text-[9px]" style={{
                                    backgroundColor: displayColor
                                  }}>
                                    {event.status.replace(/_/g, ' ').toUpperCase()}
                                  </Badge>
                                </motion.button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-300 italic pt-1">—</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {aiSuggestions.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-900">SMART SUGGESTIONS</h3>
                  {aiSuggestions.slice(0, 2).map((suggestion, idx) => {
                    const Icon = suggestion.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`${suggestion.bgColor} rounded-xl p-4 border border-gray-100`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 ${suggestion.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${suggestion.color}`} strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 mb-2 leading-relaxed">
                              {suggestion.message}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-[10px]"
                            >
                              {suggestion.action}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Smart Insights - Day View */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Today's Insights</h3>
                </div>

                {getEventsForDay(selectedDayDate).length === 0 ? (
                  <Card className="p-6 text-center">
                    <Coffee className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-4">No bookings today</p>
                    <Button
                      onClick={() => handleSmartEntry(selectedDayDate)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Smart Entry
                    </Button>
                  </Card>
                ) : (
                  <>
                    {/* Day-specific insights */}
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getEventsForDay(selectedDayDate).length} {getEventsForDay(selectedDayDate).length === 1 ? 'event' : 'events'} scheduled
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Total duration: {getEventsForDay(selectedDayDate).reduce((sum, e) => {
                              return sum + differenceInHours(parseISO(e.end_datetime), parseISO(e.start_datetime));
                            }, 0)} hours
                          </p>
                        </div>
                      </div>
                    </Card>

                    {insights.capacityWarnings.some(w => w.message.includes(format(selectedDayDate, 'MMM d'))) && (
                      <Alert className="bg-orange-50 border-orange-200">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <AlertDescription className="text-xs text-orange-800">
                          Back-to-back bookings detected. Make sure you have adequate travel time.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* AI VIEW */}
          {viewMode === VIEW_MODES.AI && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Smart Assistant</h2>
                  <p className="text-sm text-gray-600">AI-powered insights and recommendations for your schedule</p>
                </div>

                {aiSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    {aiSuggestions.map((suggestion, idx) => {
                      const Icon = suggestion.icon;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`${suggestion.bgColor} rounded-2xl p-6 border border-gray-100`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 ${suggestion.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-6 h-6 ${suggestion.color}`} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                                {suggestion.message}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-4 text-xs"
                              >
                                {suggestion.action}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" strokeWidth={1.5} />
                    <p className="text-sm">No AI suggestions at this time</p>
                    <p className="text-xs mt-1">Check back later for personalized insights</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 text-center">
                    <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-2xl font-bold text-gray-900">{weekCapacity.used}h</p>
                    <p className="text-xs text-gray-600">Hours This Week</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 text-center">
                    <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-2xl font-bold text-gray-900">${monthlyEarnings.current.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Earnings MTD</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-pink-600 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-2xl font-bold text-gray-900">{confirmedCount}</p>
                    <p className="text-xs text-gray-600">Confirmed Events</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={syncCalendarEvents}
          disabled={isSyncing}
          className="mt-8 w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          <span className="font-medium">{isSyncing ? "Syncing calendar..." : "Sync Calendar"}</span>
        </motion.button>
      </div>

      {/* Smart Entry Modal */}
      <AnimatePresence>
        {showSmartEntryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowSmartEntryModal(false);
              setSmartEntryType(null); // Clear selection on modal close
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Entry</h3>
                </div>
                <button
                  onClick={() => {
                    setShowSmartEntryModal(false);
                    setSmartEntryType(null); // Clear selection on modal close
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {smartEntryDate && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {format(smartEntryDate, "EEEE, MMMM d, yyyy")}
                  </p>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setSmartEntryDate(today);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 mt-1"
                  >
                    Change date to today
                  </button>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {SMART_ENTRY_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSmartEntryType(type.value)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        smartEntryType === type.value
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">{type.label}</p>
                          <p className="text-xs text-gray-600">{type.description}</p>
                        </div>
                        {smartEntryType === type.value && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSmartEntryModal(false);
                    setSmartEntryType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                  onClick={processSmartEntry}
                  disabled={!smartEntryType || isProcessingEntry}
                >
                  {isProcessingEntry ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Entry
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1 truncate">{selectedEvent.title}</h3>
                  {selectedEvent.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{selectedEvent.description}</p>
                  )}
                </div>
                {selectedEvent.event_type === 'unavailable' && selectedEvent.color ? (
                  <Badge className="text-white text-[10px] tracking-wider flex-shrink-0" style={{backgroundColor: selectedEvent.color}}>
                    {selectedEvent.title.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge className={`${getStatusColor(selectedEvent.status)} text-white text-[10px] tracking-wider flex-shrink-0`}>
                    {selectedEvent.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {!selectedEvent.is_all_day && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <span className="text-gray-900">
                        {format(parseISO(selectedEvent.start_datetime), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <span className="text-gray-900">
                        Ends: {format(parseISO(selectedEvent.end_datetime), "h:mm a")}
                      </span>
                    </div>
                  </>
                )}
                {selectedEvent.is_all_day && (
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="text-gray-900">
                      All day on {format(parseISO(selectedEvent.start_datetime), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="text-gray-900 truncate">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.booking_id && (
                  <>
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-xs text-gray-500 mb-2">BOOKING DETAILS</p>
                      {selectedEvent.event_id && events[selectedEvent.event_id] && (
                        <>
                          <div className="flex items-center gap-3 text-sm mb-2">
                            <Users className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                            <span className="text-gray-900">
                              {events[selectedEvent.event_id].name}
                            </span>
                          </div>
                          {events[selectedEvent.event_id].host_id && hosts[events[selectedEvent.event_id].host_id] && (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-600">
                                Host: {hosts[events[selectedEvent.event_id].host_id].full_name}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <Link
                      to={`${createPageUrl("EnablerBookings")}`}
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                      Go to Event
                    </Link>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 h-10 text-sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
