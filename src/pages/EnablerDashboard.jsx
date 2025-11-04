
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, EnablerBookingRequest, Booking, EnablerFinance, Notification, CalendarPreferences } from "@/api/entities";
import { TrendingUp, DollarSign, Calendar, Star, AlertCircle, CheckCircle2, Clock, Store, Briefcase, FileText, Hand, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

// IMPORTANT: For the 'pulse' animation to work, ensure you have the following CSS keyframes
// defined in your global stylesheet (e.g., index.css or a shared styles file):
/*
@keyframes pulse {
  0% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.15);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 50px rgba(59, 130, 246, 0.25);
  }
  100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.15);
  }
}
*/

const calendarModeLabels = {
  full_availability: { label: "Full Availability", icon: "🟢", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
  balanced: { label: "Balanced Mode", icon: "🔵", color: "text-sky-500", bgColor: "bg-sky-50", borderColor: "border-sky-200" },
  peak_hours: { label: "Last Min. Hero", icon: "🔴", color: "text-red-500", bgColor: "bg-red-50", borderColor: "border-red-200" },
  weekend_specialist: { label: "Weekend Specialist", icon: "🟣", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  custom: { label: "Custom Rules", icon: "🟤", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" }
};

const rankingSystem = {
  explorer: {
    name: "Explorer",
    level: "Entry Level",
    minEvents: 0,
    minRating: 0,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200"
  },
  specialist: {
    name: "Specialist",
    level: "Skilled Practitioner",
    minEvents: 10,
    minRating: 4.0,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  professional: {
    name: "Professional",
    level: "Established Expert",
    minEvents: 30,
    minRating: 4.5,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  elite_partner: {
    name: "Elite Partner",
    level: "Top-Tier Performer",
    minEvents: 75,
    minRating: 4.7,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  market_leader: {
    name: "Market Leader",
    level: "Industry Benchmark",
    minEvents: 150,
    minRating: 4.8,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }
};

export default function EnablerDashboard() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [finances, setFinances] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [calendarPreferences, setCalendarPreferences] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    quarterlyRevenue: 0,
    yearlyRevenue: 0,
    pendingRequests: 0,
    upcomingBookings: 0,
    yearlyEvents: 0,
    targetsMetMonthly: 0,
    totalTargets: 12,
    successRate: 0,
    rank: 'explorer'
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);

  // Available schedule modes in order
  const scheduleModes = ['full_availability', 'balanced', 'peak_hours', 'weekend_specialist', 'custom'];

  useEffect(() => {
    loadDashboard();
  }, []);

  const calculateRank = (completedEvents, avgRating) => {
    if (completedEvents >= rankingSystem.market_leader.minEvents && avgRating >= rankingSystem.market_leader.minRating) return 'market_leader';
    if (completedEvents >= rankingSystem.elite_partner.minEvents && avgRating >= rankingSystem.elite_partner.minRating) return 'elite_partner';
    if (completedEvents >= rankingSystem.professional.minEvents && avgRating >= rankingSystem.professional.minRating) return 'professional';
    if (completedEvents >= rankingSystem.specialist.minEvents && avgRating >= rankingSystem.specialist.minRating) return 'specialist';
    return 'explorer';
  };

  const loadDashboard = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      const allProfilesData = await Enabler.filter({ user_id: user.id }, "-created_date");
      setAllProfiles(allProfilesData);
      
      let enablerProfile = null;
      if (selectedProfileId) {
        enablerProfile = allProfilesData.find(p => p.id === selectedProfileId);
      }
      
      if (!enablerProfile && allProfilesData.length > 0) {
        enablerProfile = allProfilesData.find(p => p.is_primary) || allProfilesData[0];
        localStorage.setItem("selected_enabler_profile", enablerProfile.id);
      }
      
      if (enablerProfile) {
        setEnabler(enablerProfile);
        
        const requestsData = await EnablerBookingRequest.filter(
          { enabler_id: enablerProfile.id, status: "pending" },
          "-created_date"
        );
        setRequests(requestsData);
        
        const bookingsData = await Booking.filter(
          { enabler_id: enablerProfile.id },
          "-created_date"
        );
        setBookings(bookingsData);
        
        const financesData = await EnablerFinance.filter(
          { enabler_id: enablerProfile.id },
          "-created_date"
        );
        setFinances(financesData);
        
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        
        // Monthly Revenue
        const monthlyRevenue = financesData
          .filter(f => {
            const transactionDate = new Date(f.created_date);
            return f.transaction_type === "income" &&
              transactionDate >= monthStart &&
              transactionDate <= monthEnd;
          })
          .reduce((sum, f) => sum + f.amount, 0);
        
        // Quarterly Revenue
        const quarterlyRevenue = financesData
          .filter(f => {
            const transactionDate = new Date(f.created_date);
            return f.transaction_type === "income" &&
              transactionDate >= quarterStart &&
              transactionDate <= now;
          })
          .reduce((sum, f) => sum + f.amount, 0);
        
        // Yearly Revenue
        const yearlyRevenue = financesData
          .filter(f => {
            const transactionDate = new Date(f.created_date);
            return f.transaction_type === "income" &&
              transactionDate >= yearStart;
          })
          .reduce((sum, f) => sum + f.amount, 0);
        
        // Total All-Time Revenue (kept from original for potential future use or consistency)
        const totalRevenue = financesData
          .filter(f => f.transaction_type === "income")
          .reduce((sum, f) => sum + f.amount, 0);
        
        const upcomingBookings = bookingsData.filter(
          b => b.status === "confirmed" && new Date(b.event_start_date) > now
        ).length;

        const completedBookings = bookingsData.filter(
          b => b.status === "completed"
        ).length;

        const yearlyEvents = bookingsData.filter(b => {
          const bookingDate = new Date(b.created_date);
          return bookingDate >= yearStart && bookingDate <= now;
        }).length;

        const currentMonth = now.getMonth() + 1;
        const targetsMetMonthly = Math.min(currentMonth, completedBookings);

        const successRate = bookingsData.length > 0 
          ? Math.round((completedBookings / bookingsData.length) * 100) 
          : 0;

        const rank = calculateRank(completedBookings, enablerProfile.average_rating || 0);
        
        setStats({
          totalRevenue, // All-time total, if needed
          monthlyRevenue,
          quarterlyRevenue,
          yearlyRevenue,
          pendingRequests: requestsData.length,
          upcomingBookings,
          yearlyEvents,
          targetsMetMonthly,
          totalTargets: 12,
          successRate,
          rank
        });

        const prefs = await CalendarPreferences.filter({ enabler_id: enablerProfile.id });
        setCalendarPreferences(prefs[0] || null);
      }
      
      await loadNotifications(user.id);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const loadNotifications = async (userId) => {
    try {
      const allNotifications = await Notification.filter(
        { user_id: userId },
        "-created_date",
        50
      );
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      if (currentUser) {
        await loadNotifications(currentUser.id);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifications.map(notif => 
        Notification.update(notif.id, { read: true })
      ));
      if (currentUser) {
        await loadNotifications(currentUser.id);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "payment_received":
        return "💰";
      case "payment_delayed":
        return "⚠️";
      case "payment_upcoming":
        return "⏰";
      case "booking_request":
        return "📋";
      case "booking_confirmed":
        return "✅";
      case "review_received":
        return "⭐";
      case "contract_signed":
        return "📝";
      case "message_received":
        return "💬";
      case "profile_update":
        return "👤";
      default:
        return "🔔";
    }
  };

  const handleSwitchToHost = async () => {
    try {
      await base44.auth.updateMe({ user_type: "host" });
      window.location.href = createPageUrl("Home");
    } catch (error) {
      console.error("Failed to switch role:", error);
      alert("Failed to switch role. Please try again.");
    }
  };

  const changeScheduleMode = async (newMode) => {
    if (!calendarPreferences || !enabler) return;
    
    try {
      await CalendarPreferences.update(calendarPreferences.id, {
        preset_mode: newMode
      });
      
      setShowScheduleDropdown(false); // Close dropdown after selection
      await loadDashboard(); // Reload dashboard to reflect changes
    } catch (error) {
      console.error("Error changing schedule mode:", error);
    }
  };

  if (!enabler) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-400 mb-6 text-sm tracking-wide">CREATE YOUR PROFILE</p>
          <Link to={createPageUrl("CreateEnablerProfile")}>
            <Button className="bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-900 transition-colors">
              CREATE PROFILE
            </Button>
          </Link>
          {currentUser?.user_type === "enabler" && (
            <button 
              onClick={handleSwitchToHost}
              className="mt-6 text-xs text-gray-400 hover:text-black transition-colors tracking-wide"
            >
              SWITCH TO HOST →
            </button>
          )}
        </div>
      </div>
    );
  }

  const calendarMode = calendarPreferences?.preset_mode || null;
  const calendarModeInfo = calendarMode ? calendarModeLabels[calendarMode] : null;
  const currentRank = rankingSystem[stats.rank];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8 space-y-8">
        {/* Compact Profile Section */}
        <div className="flex items-center gap-3 mb-6">
          {/* Profile Photo */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {enabler?.business_name?.[0] || currentUser?.full_name?.[0] || "E"}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-gray-900 tracking-tight truncate">
              {enabler?.business_name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-gray-400 tracking-wider truncate">
                ENABLER PORTAL
              </p>
              {calendarPreferences?.preset_mode && (
                <div className="relative">
                  <button
                    onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-opacity-80 active:scale-95 transition-all cursor-pointer group"
                    style={{
                      background: `linear-gradient(135deg, ${
                        calendarPreferences.preset_mode === 'balanced' ? 'rgba(14, 165, 233, 0.15), rgba(6, 182, 212, 0.15)' :
                        calendarPreferences.preset_mode === 'peak_hours' ? 'rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15)' :
                        calendarPreferences.preset_mode === 'full_availability' ? 'rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15)' :
                        calendarPreferences.preset_mode === 'weekend_specialist' ? 'rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.15)' :
                        'rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15)'
                      })`
                    }}
                    title="Click to change schedule mode"
                  >
                    <div 
                      className="w-1.5 h-1.5 rounded-full animate-pulse group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, ${
                          calendarPreferences.preset_mode === 'balanced' ? '#0ea5e9, #06b6d4' :
                          calendarPreferences.preset_mode === 'peak_hours' ? '#ef4444, #dc2626' :
                          calendarPreferences.preset_mode === 'full_availability' ? '#10b981, #059669' :
                          calendarPreferences.preset_mode === 'weekend_specialist' ? '#a855f7, #9333ea' :
                          '#f59e0b, #d97706'
                        })`
                      }}
                    ></div>
                    <span 
                      className={`text-[9px] font-medium tracking-wide group-hover:opacity-80 transition-opacity ${
                        calendarModeLabels[calendarPreferences.preset_mode]?.color
                      }`}
                    >
                      {calendarModeLabels[calendarPreferences.preset_mode]?.label.toUpperCase()}
                    </span>
                  </button>

                  {/* Schedule Mode Dropdown */}
                  {showScheduleDropdown && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowScheduleDropdown(false)}
                      />
                      
                      {/* Dropdown Menu - Transparent with Compact Floating Badges */}
                      <div 
                        className="absolute top-full left-0 mt-2 z-50 p-1"
                        style={{
                          minWidth: 'auto'
                        }}
                      >
                        <div className="space-y-1.5">
                          {scheduleModes.map((mode) => {
                            const modeInfo = calendarModeLabels[mode];
                            const isActive = calendarPreferences.preset_mode === mode;
                            
                            return (
                              <button
                                key={mode}
                                onClick={() => changeScheduleMode(mode)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all text-left hover:scale-105 active:scale-95`}
                                style={{
                                  background: isActive 
                                    ? `linear-gradient(135deg, ${
                                        mode === 'balanced' ? 'rgba(14, 165, 233, 0.12), rgba(6, 182, 212, 0.12)' :
                                        mode === 'peak_hours' ? 'rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.12)' :
                                        mode === 'full_availability' ? 'rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.12)' :
                                        mode === 'weekend_specialist' ? 'rgba(168, 85, 247, 0.12), rgba(147, 51, 234, 0.12)' :
                                        'rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.12)'
                                      })`
                                    : 'rgba(255, 255, 255, 0.05)',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                <span className="text-xs">{modeInfo.icon}</span>
                                <p className={`text-[9px] font-bold tracking-wide whitespace-nowrap ${
                                  isActive ? modeInfo.color : 'text-gray-500'
                                }`}>
                                  {modeInfo.label.toUpperCase()}
                                </p>
                                {isActive && (
                                  <div 
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-0.5"
                                    style={{
                                      background: `linear-gradient(135deg, ${
                                        mode === 'balanced' ? '#0ea5e9, #06b6d4' :
                                        mode === 'peak_hours' ? '#ef4444, #dc2626' :
                                        mode === 'full_availability' ? '#10b981, #059669' :
                                        mode === 'weekend_specialist' ? '#a855f7, #9333ea' :
                                        '#f59e0b, #d97706'
                                      })`
                                    }}
                                  ></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {currentUser?.user_type === "enabler" && (
              <button 
                onClick={handleSwitchToHost}
                className="text-[10px] text-gray-400 hover:text-emerald-500 transition-colors tracking-wide flex items-center gap-1 mt-1"
              >
                SWITCH TO HOST <span className="text-emerald-500">→</span>
              </button>
            )}
          </div>
          
          {/* Profile Indicator - Only if multiple profiles */}
          {allProfiles.length > 1 && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-shrink-0">
              <Briefcase className="w-3 h-3" strokeWidth={1.5} />
              <span className="text-emerald-500 font-medium">{allProfiles.findIndex(p => p.id === enabler?.id) + 1}/{allProfiles.length}</span>
            </div>
          )}
        </div>

        {/* Stats Section Title */}
        <div className="mb-4">
          <h2 className="text-[11px] text-gray-400 tracking-widest font-semibold">STATS</h2>
        </div>

        {/* Stats Grid - Optimized Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Bookings Card - TOP LEFT with Always Glowing Halo */}
          <button
            onClick={() => navigate(`${createPageUrl("EnablerBookings")}?tab=confirmed`)}
            className="relative group border border-blue-100 p-3 overflow-hidden transition-all duration-300 hover:border-blue-200 text-left w-full"
            style={{
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.15)',
              animation: 'pulse 3s ease-in-out infinite'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <p className="text-[9px] text-gray-400 tracking-wide font-semibold">BOOKINGS</p>
              </div>
              <p className="text-lg font-light text-gray-900 tracking-tight mb-2">{stats.upcomingBookings}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">CONFIRMED</span>
                  <span className="text-[9px] font-medium text-blue-600">{stats.upcomingBookings} Events</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">THIS YEAR</span>
                  <span className="text-[9px] font-medium text-gray-700">{stats.yearlyEvents} Total</span>
                </div>
              </div>
            </div>
          </button>

          {/* Requests Card - TOP RIGHT */}
          <button
            onClick={() => navigate(createPageUrl("EnablerBookings"))}
            className="relative group border border-gray-100 p-3 overflow-hidden transition-all duration-300 hover:border-amber-100 text-left w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 to-amber-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-amber-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <p className="text-[9px] text-gray-400 tracking-wide font-semibold">REQUESTS</p>
              </div>
              <p className="text-lg font-light text-gray-900 tracking-tight mb-2">{stats.pendingRequests}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">PENDING</span>
                  <span className="text-[9px] font-medium text-amber-600">{stats.pendingRequests} New</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">RESPONSE TIME</span>
                  <span className="text-[9px] font-medium text-gray-700">~2h</span>
                </div>
              </div>
            </div>
          </button>

          {/* Revenue Overview Card - BOTTOM LEFT */}
          <button
            onClick={() => navigate(createPageUrl("EnablerFinance"))}
            className="relative group border border-gray-100 p-3 overflow-hidden transition-all duration-300 hover:border-emerald-100 text-left w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-emerald-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <p className="text-[9px] text-gray-400 tracking-wide font-semibold">REVENUE</p>
              </div>
              <p className="text-lg font-light text-gray-900 tracking-tight mb-2">${stats.yearlyRevenue.toLocaleString()}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">THIS YEAR</span>
                  <span className="text-[9px] font-medium text-gray-700">${(stats.yearlyRevenue / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">THIS QUARTER</span>
                  <span className="text-[9px] font-medium text-gray-700">${(stats.quarterlyRevenue / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">THIS MONTH</span>
                  <span className="text-[9px] font-medium text-emerald-600">${(stats.monthlyRevenue / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </div>
          </button>

          {/* Hustle Card - BOTTOM RIGHT - Consolidated with Performance Metrics */}
          <button
            onClick={() => navigate(createPageUrl("EnablerAnalytics"))}
            className="relative group border border-gray-100 p-3 overflow-hidden transition-all duration-300 hover:border-purple-100 text-left w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-purple-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-purple-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm group-hover:scale-110 transition-transform">💪</span>
                <p className="text-[9px] text-gray-400 tracking-wide font-semibold">HUSTLE</p>
              </div>
              <p className="text-lg font-light text-gray-900 tracking-tight mb-2">{stats.yearlyEvents}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">TARGETS</span>
                  <span className="text-[9px] font-medium text-gray-700">{stats.targetsMetMonthly}/{stats.totalTargets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">SUCCESS</span>
                  <span className="text-[9px] font-medium text-emerald-600">{stats.successRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">RANK</span>
                  <span className={`text-[8px] font-bold tracking-wide ${currentRank.color}`}>
                    {currentRank.name.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Actions with enhanced subtle liveliness */}
        <div className="border-t border-gray-100 pt-8">
          <h3 className="text-xs text-gray-400 tracking-wide mb-4">QUICK ACTIONS</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Contracts */}
            <Link to={createPageUrl("EnablerContracts")}>
              <div className="relative group w-full border border-gray-200 p-4 transition-all text-left overflow-hidden hover:border-emerald-200 hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
                
                <div className="relative z-10">
                  <FileText className="w-4 h-4 mb-2 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-900">Contracts</p>
                </div>
              </div>
            </Link>
            
            {/* Packages */}
            <Link to={`${createPageUrl("EnablerShop")}#packages`}>
              <div className="relative group w-full border border-gray-200 p-4 transition-all text-left overflow-hidden hover:border-emerald-200 hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
                
                <div className="relative z-10">
                  <Gift className="w-4 h-4 mb-2 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-900">Packages</p>
                </div>
              </div>
            </Link>
            
            {/* Reviews */}
            <Link to={createPageUrl("EnablerReviews")}>
              <div className="relative group w-full border border-gray-200 p-4 transition-all text-left overflow-hidden hover:border-emerald-200 hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
                
                <div className="relative z-10">
                  <Star className="w-4 h-4 mb-2 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-900">Reviews</p>
                </div>
              </div>
            </Link>
            
            {/* Analytics */}
            <Link to={createPageUrl("EnablerAnalytics")}>
              <div className="relative group w-full border border-gray-200 p-4 transition-all text-left overflow-hidden hover:border-emerald-200 hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-5 blur-3xl transition-all duration-700 group-hover:scale-150"></div>
                
                <div className="relative z-10">
                  <TrendingUp className="w-4 h-4 mb-2 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="border-t border-gray-100 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs text-gray-400 tracking-wide">PENDING REQUESTS</h3>
            {requests.length > 3 && (
              <Link to={createPageUrl("EnablerBookings")} className="text-xs text-gray-900 hover:text-emerald-500 transition-colors tracking-wide">
                VIEW ALL →
              </Link>
            )}
          </div>
          
          {requests.length === 0 ? (
            <div className="border border-gray-100 p-8 text-center">
              <Clock className="w-6 h-6 mx-auto text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 tracking-wide">NO PENDING REQUESTS</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 3).map((request) => (
                <div key={request.id} className="border border-gray-100 p-5 hover:border-gray-900 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{request.host_name}</p>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                        {request.event_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 border border-amber-200 text-amber-700 tracking-wide">
                      PENDING
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-4 tracking-wide">
                    <p>{format(new Date(request.event_date), "MMM d, yyyy")}</p>
                    <p>{request.guest_count} GUESTS</p>
                    <p>BUDGET: ${request.budget?.toLocaleString()}</p>
                  </div>
                  <Link to={`${createPageUrl("EnablerBookings")}?request=${request.id}`}>
                    <button className="w-full bg-black text-white py-2.5 text-xs font-medium tracking-wide hover:bg-gray-900 transition-colors">
                      REVIEW REQUEST
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border-t border-gray-100 pt-8">
          <h3 className="text-xs text-gray-400 tracking-wide mb-4">RECENT ACTIVITY</h3>
          <div className="border border-gray-100 divide-y divide-gray-100">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 tracking-tight">#{booking.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400 mt-1 tracking-wide">
                    {format(new Date(booking.created_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">${booking.total_amount}</p>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 tracking-wide mt-1 inline-block">
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400 tracking-wide">
                NO BOOKINGS YET
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
