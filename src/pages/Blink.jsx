
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Reel, Enabler, User, Event, Booking, Notification, Wishlist } from "@/api/entities"; // Added Wishlist import
import { Play, Heart, Eye, TrendingUp, Sparkles, Star, Plus, Calendar, Brain, Zap, Bell, CheckCircle2, Clock, Users, DollarSign } from "lucide-react"; // Removed ChevronRight, ChevronUp
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BlinkLogo from "../components/BlinkLogo";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion"; // Added AnimatePresence and motion

const categories = [
  { name: "Event Planners", icon: "📋", value: "event_planner" },
  { name: "Beauty & Style", icon: "💄", value: "beauty_specialist" },
  { name: "Photography", icon: "📸", value: "photographer" },
  { name: "Music & DJs", icon: "🎵", value: "musician" },
  { name: "Venues", icon: "🏛️", value: "venue" },
  { name: "Catering", icon: "🍽️", value: "caterer" },
  { name: "Flowers & Decor", icon: "💐", value: "florist" },
  { name: "Audio/Visual", icon: "🎬", value: "audio_visual" }
];

export default function Blink() {
  const navigate = useNavigate();
  const [enablers, setEnablers] = useState([]);
  const [activeSection, setActiveSection] = useState("trending");
  const [currentUser, setCurrentUser] = useState(null);
  const [hasAccessedBrain, setHasAccessedBrain] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Dashboard vitals - Updated structure
  const [dashboardData, setDashboardData] = useState({
    activeEvents: 0,
    pendingBookings: 0,
    nextPaymentAmount: 0,
    nextPaymentDue: null,
    daysUntilPayment: null,
    pendingRequests: 0,
    activeRequests: 0
  });

  // Saved Enablers state
  const [savedEnablers, setSavedEnablers] = useState([]);
  // showFavorites state is removed as per the requirements

  useEffect(() => {
    loadData();
    loadSavedEnablers(); // Load saved enablers on component mount
  }, []);

  const loadData = async () => {
    try {
      const flowActive = sessionStorage.getItem('event_flow_active');
      if (flowActive === 'true') {
        return;
      }

      const user = await base44.auth.me();
      setCurrentUser(user);
      
      setHasAccessedBrain(user.has_accessed_brain || false);
      
      // Load enablers
      const enablersData = await Enabler.list("-average_rating", 6);
      setEnablers(enablersData);
      
      // Load notifications
      const notificationsData = await Notification.filter(
        { user_id: user.id },
        "-created_date",
        10
      );
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
      
      // Load dashboard data
      await loadDashboardData(user.id);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadSavedEnablers = async () => {
    try {
      const user = await User.me();
      if (!user) {
        console.warn("User not logged in, cannot load saved enablers.");
        return;
      }
      const wishlist = await Wishlist.filter({ user_id: user.id }, "-created_date", 20);
      setSavedEnablers(wishlist.filter(w => w.enabler_id));
    } catch (error) {
      console.error("Error loading saved enablers:", error);
    }
  };

  // removeFavorite is no longer needed since the expandable section is removed, 
  // but keeping it here in case it's used elsewhere or for future functionality.
  const removeFavorite = async (wishlistItemId) => {
    try {
      await Wishlist.delete(wishlistItemId);
      await loadSavedEnablers(); // Reload after removal
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  const loadDashboardData = async (userId) => {
    try {
      const events = await Event.filter({ host_id: userId });
      const activeEvents = events.filter(e => e.status === 'planning' || e.status === 'confirmed');
      
      let pendingBookings = 0;
      let nextPaymentAmount = 0;
      let nextPaymentDue = null;
      let pendingRequests = 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const event of events) {
        const bookings = await Booking.filter({ event_id: event.id });
        pendingBookings += bookings.filter(b => b.status === 'pending').length;
        
        try {
          const { EditRequest } = await import("@/api/entities"); 
          const editRequests = await EditRequest.filter({ 
            event_id: event.id, 
            host_id: userId,
            status: "pending"
          });
          pendingRequests += editRequests.length;
        } catch (error) {
          console.warn("Could not load edit requests:", error);
        }
        
        const unpaidBookings = bookings.filter(b => b.payment_status === 'pending' || b.payment_status === 'partial');
        
        if (unpaidBookings.length > 0 && event.date) {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);

          if (eventDate >= today) {
            const diffTime = eventDate.getTime() - today.getTime();
            const currentDaysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (nextPaymentDue === null || currentDaysUntil < nextPaymentDue) {
              nextPaymentDue = currentDaysUntil;
              nextPaymentAmount = unpaidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
            }
          }
        }
      }
      
      setDashboardData({
        activeEvents: activeEvents.length,
        pendingBookings,
        nextPaymentAmount,
        nextPaymentDue: nextPaymentDue,
        daysUntilPayment: nextPaymentDue,
        pendingRequests,
        activeRequests: pendingBookings + pendingRequests
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      await loadData();
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
      await loadData();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleSwitchToEnabler = async () => {
    try {
      if (!currentUser) {
        console.error("Current user not loaded yet.");
        alert("Please wait a moment and try again.");
        return;
      }
      
      const enablerProfile = await Enabler.filter({ user_id: currentUser.id });
      
      await base44.auth.updateMe({ user_type: "enabler" });

      setCurrentUser(prevUser => ({ ...prevUser, user_type: "enabler" }));
      
      if (enablerProfile.length > 0) {
        window.location.href = createPageUrl("EnablerDashboard");
      } else {
        window.location.href = createPageUrl("CreateEnablerProfile");
      }
    } catch (error) {
      console.error("Error switching to enabler:", error);
      alert("Failed to switch role. Please try again.");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "payment_received":
        return "💰";
      case "booking_confirmed":
        return "✅";
      case "review_received":
        return "⭐";
      case "message_received":
        return "💬";
      case "event_created":
        return "🎉";
      case "enabler_joined":
        return "🤝";
      case "event_updated":
        return "🗓️";
      default:
        return "🔔";
    }
  };

  const SmartMetric = ({ icon: Icon, value, label, color = "emerald", sublabel = null }) => {
    const colorClasses = {
      emerald: { bg: "from-emerald-50 to-emerald-100", text: "text-emerald-600", border: "border-emerald-200/30" },
      blue: { bg: "from-blue-50 to-blue-100", text: "text-blue-600", border: "border-blue-200/30" },
      amber: { bg: "from-amber-50 to-amber-100", text: "text-amber-600", border: "border-amber-200/30" },
      purple: { bg: "from-purple-50 to-purple-100", text: "text-purple-600", border: "border-purple-200/30" }
    };
    
    const colorConfig = colorClasses[color];
    
    return (
      <div className={`flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br ${colorConfig.bg} border ${colorConfig.border}`}>
        <Icon className={`w-4 h-4 ${colorConfig.text} mb-1`} strokeWidth={1.5} />
        <span className={`text-xl font-bold ${colorConfig.text} tracking-tight`}>{value}</span>
        <p className="text-[9px] text-gray-500 font-light tracking-wide mt-0.5">{label}</p>
        {sublabel && (
          <p className="text-[8px] text-gray-400 font-light mt-0.5">{sublabel}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20"> {/* Updated background */}
      {/* Minimal Fixed Header with Notification Bell */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[9px] text-gray-400 tracking-[0.25em] uppercase font-light">Discover & Explore</p>
              
              {currentUser?.user_type === "host" && (
                <button 
                  onClick={handleSwitchToEnabler}
                  className="inline-block mt-1 text-[10px] text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1 mx-auto"
                >
                  <span>Switch to Enabler</span>
                  <span className="text-emerald-500">→</span>
                </button>
              )}
            </div>
            
            {/* Notification Bell - Same as Home Page */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '0.5px solid rgba(156, 163, 175, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <Bell 
                  className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" 
                  strokeWidth={1.5} 
                />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{unreadCount}</span>
                  </div>
                )}
              </button>

              {/* Notification Dropdown - Same as Home Page */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  
                  {/* Dropdown */}
                  <div 
                    className="absolute top-12 right-0 w-80 z-50 rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '0.5px solid rgba(156, 163, 175, 0.2)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="text-xs text-emerald-600">{unreadCount} new</span>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-gray-400">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.link) {
                                navigate(notification.link);
                              }
                              setShowNotifications(false);
                            }}
                            className="w-full p-4 hover:bg-gray-50/50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                          >
                            <div className="flex gap-3">
                              <span className="text-lg flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-xs font-medium text-gray-900 line-clamp-1">
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {format(new Date(notification.created_date), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            navigate(createPageUrl("Profile")); // Assuming Profile page has all notifications
                            setShowNotifications(false);
                          }}
                          className="w-full text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Reduced top padding */}
      <div className="max-w-md mx-auto px-4 pt-16 pb-32">
        {/* Blink Functions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Create Event Card - Sunwashed Peach */}
          <Link to={createPageUrl("GuidedEventCreation")}>
            <div className="relative group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200/30 via-peach-200/30 to-amber-200/30 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
              
              <div className="relative p-5 flex flex-col items-center justify-center h-28 border border-orange-200/50 group-hover:border-orange-300/70 transition-colors">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #FFDAB9 0%, #FFB07C 50%, #FF9966 100%)'
                  }}
                >
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-semibold text-gray-900 tracking-tight">Create Event</p>
                <p className="text-xs text-gray-500 mt-0.5">Guided setup</p>
              </div>
            </div>
          </Link>

          {/* Favorites Card - Pink/Rose - Direct link with count badge */}
          <Link to={createPageUrl("WishlistView")}>
            <div className="relative group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200/30 via-rose-200/30 to-red-200/30 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
              
              <div className="relative p-5 flex flex-col items-center justify-center h-28 border border-pink-200/50 group-hover:border-pink-300/70 transition-colors">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5 text-white" strokeWidth={2} fill="white" />
                </div>
                <p className="text-sm font-semibold text-gray-900 tracking-tight">Favorites</p>
                <p className="text-xs text-gray-500 mt-0.5">Your wishlist</p>
                
                {/* Count Badge */}
                {savedEnablers.length > 0 && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                    <span className="text-[11px] font-bold text-white">{savedEnablers.length}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Removed "Saved Professionals Section" as it's no longer needed */}
        
        {/* Ultra-Smart Dashboard */}
        <div className="mb-6">
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 backdrop-blur-xl"></div>
            <div className="absolute inset-0 bg-white/30 backdrop-blur-md"></div>
            
            <div className="relative p-4 border border-emerald-100/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-light text-gray-500 tracking-[0.2em] uppercase">Dashboard</h3>
                <Link to={createPageUrl("MyEvents")} className="text-[10px] text-emerald-500 hover:text-emerald-600 font-light tracking-wide">
                  View All →
                </Link>
              </div>
              
              {/* Smart Grid Layout */}
              <div className="space-y-3">
                {/* Row 1: Active + Pending Combined */}
                <div className="grid grid-cols-2 gap-3">
                  <SmartMetric
                    icon={Calendar}
                    value={dashboardData.activeEvents}
                    label="Active Events"
                    color="emerald"
                  />
                  
                  <SmartMetric
                    icon={Clock}
                    value={dashboardData.pendingBookings}
                    label="Pending"
                    sublabel="Bookings"
                    color="amber"
                  />
                </div>
                
                {/* Row 2: Payment Info */}
                {dashboardData.nextPaymentDue !== null && dashboardData.nextPaymentAmount > 0 ? (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-purple-500" strokeWidth={1.5} />
                          <span className="text-[9px] text-gray-500 font-light tracking-wide uppercase">Next Payment</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-purple-600">
                            ${dashboardData.nextPaymentAmount > 1000 
                              ? `${(dashboardData.nextPaymentAmount / 1000).toFixed(1)}k` 
                              : dashboardData.nextPaymentAmount}
                          </span>
                          <span className="text-xs text-gray-500 font-light">due in</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-white/60 backdrop-blur-sm border border-purple-200/50">
                        <span className="text-2xl font-bold text-purple-600">
                          {dashboardData.daysUntilPayment}
                        </span>
                        <span className="text-[8px] text-gray-500 font-light tracking-wide">
                          {dashboardData.daysUntilPayment === 1 ? 'DAY' : 'DAYS'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/30 p-4">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <span className="text-xs text-gray-500 font-light">No upcoming payments</span>
                    </div>
                  </div>
                )}
                
                {/* Row 3: Requests Status - Replaces Total Invested */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center border border-cyan-200/50">
                        <Clock className="w-4 h-4 text-cyan-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-light tracking-wide uppercase">Requests Status</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-cyan-600">
                            {dashboardData.activeRequests}
                          </span>
                          <span className="text-xs text-gray-500 font-light">active</span>
                        </div>
                      </div>
                    </div>
                    {dashboardData.pendingRequests > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200/50">
                        <span className="text-xs font-bold text-amber-600">{dashboardData.pendingRequests}</span>
                        <span className="text-[8px] text-amber-600 font-light">pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 justify-center flex-wrap mb-6">
          {/* Trending Button - Pale Aqua with Sparkling Animation */}
          <button
            onClick={() => setActiveSection("trending")}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all overflow-hidden ${
              activeSection === "trending"
                ? "bg-white/80 backdrop-blur-sm shadow-md trending-sparkle" // Added trending-sparkle class
                : "bg-white/60 backdrop-blur-sm text-gray-600 border-2 border-gray-200"
            }`}
            style={
              activeSection === "trending"
                ? {
                    border: '2px solid #AFEEEE', // Pale Aqua border
                    color: '#5FC9CB', // Pale Aqua text color
                  }
                : {}
            }
          >
            {activeSection === "trending" && (
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent animate-sparkle-slide"></div>
              </div>
            )}
            <TrendingUp className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Trending</span>
          </button>
          
          <button
            onClick={() => setActiveSection("categories")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
              activeSection === "categories"
                ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg"
                : "bg-white/60 backdrop-blur-sm text-gray-600 border-2 border-gray-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Categories
          </button>
        </div>

        {/* Trending Professionals Section */}
        {activeSection === "trending" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <Link
                to={createPageUrl("Browse")}
                className="ml-auto text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
              >
                View All →
              </Link>
            </div>
            
            {enablers.length > 0 ? (
              <div className="space-y-3">
                {enablers.map((enabler) => (
                  <Link
                    key={enabler.id}
                    to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}
                  >
                    <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-md"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-cyan-50/50"></div>
                      
                      <div className="relative p-4 border border-emerald-100/50">
                        <div className="flex gap-4">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-md">
                            {enabler.profile_image ? (
                              <img
                                src={enabler.profile_image}
                                alt={enabler.business_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-white">
                                {enabler.business_name?.[0] || "👤"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate mb-1">
                              {enabler.business_name}
                            </h3>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {enabler.tagline || enabler.category}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-amber-700">
                                  {enabler.average_rating || 4.5}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                ({enabler.total_reviews || 0} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-100">
                <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" strokeWidth={1.5} />
                <p className="text-gray-600 mb-2 font-medium">No enablers available yet</p>
                <p className="text-sm text-gray-500">
                  Enablers can create profiles to appear here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Categories Section */}
        {activeSection === "categories" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.value}
                  to={`${createPageUrl("Browse")}?category=${cat.value}`}
                  className="relative group"
                >
                  <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative p-4 border border-gray-200 group-hover:border-emerald-300 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">{cat.icon}</span>
                        <span className="text-xs text-center font-medium text-gray-700 leading-tight">
                          {cat.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Info Card */}
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-cyan-50"></div>
              <div className="relative p-6 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <BlinkLogo size="sm" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900 mb-2">
                      Find Your Perfect Match
                    </h3>
                    <p className="text-sm text-emerald-700 leading-relaxed">
                      Browse through our curated categories to find the best enablers for your event. Each professional is vetted and rated by our community.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        @keyframes sparkle-slide {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
        .animate-sparkle-slide {
          animation: sparkle-slide 3s ease-in-out infinite;
        }
        
        .trending-sparkle {
          position: relative;
        }
        
        .trending-sparkle::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(95, 201, 203, 0.1) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        
        @keyframes sparkle-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
