import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Event, Booking, Enabler, EventTimeline, CalendarEvent } from "@/api/entities";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function HostCalendar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [enablersData, setEnablersData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    loadEventData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshTimeline();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadEventData = async () => {
    const user = await User.me();
    const eventsData = await Event.filter({ host_id: user.id, status: "confirmed" }, "-date");
    setEvents(eventsData);

    if (eventsData[0]) {
      setSelectedEvent(eventsData[0]);
      await loadEventTimeline(eventsData[0].id);
    }
  };

  const loadEventTimeline = async (eventId) => {
    const timelineData = await EventTimeline.filter({ event_id: eventId });
    
    if (timelineData[0]) {
      setTimeline(timelineData[0]);
      setLastSyncTime(new Date());
      
      // Load enabler details
      const enablerIds = timelineData[0].timeline_items?.map(item => item.enabler_id) || [];
      const enablersMap = {};
      
      for (const id of enablerIds) {
        const enabler = await Enabler.filter({ id });
        if (enabler[0]) {
          enablersMap[id] = enabler[0];
        }
      }
      
      setEnablersData(enablersMap);
    }
  };

  const refreshTimeline = async () => {
    if (!selectedEvent) return;
    
    setIsRefreshing(true);
    try {
      // Sync with enabler calendars
      await syncWithEnablerCalendars(selectedEvent.id);
      await loadEventTimeline(selectedEvent.id);
    } catch (error) {
      console.error("Error refreshing timeline:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const syncWithEnablerCalendars = async (eventId) => {
    // Get all bookings for this event
    const bookings = await Booking.filter({ event_id: eventId });
    
    // Get calendar events for each enabler
    const timelineItems = [];
    
    for (const booking of bookings) {
      const calendarEvents = await CalendarEvent.filter({ 
        enabler_id: booking.enabler_id,
        booking_id: booking.id 
      });
      
      if (calendarEvents[0]) {
        const event = calendarEvents[0];
        const enabler = await Enabler.filter({ id: booking.enabler_id });
        
        timelineItems.push({
          id: booking.id,
          enabler_id: booking.enabler_id,
          enabler_name: enabler[0]?.business_name || "Unknown",
          service_type: enabler[0]?.category || "service",
          scheduled_start: event.start_datetime,
          scheduled_end: event.end_datetime,
          setup_start: event.start_datetime, // Will be calculated with buffer
          setup_end: event.start_datetime,
          teardown_start: event.end_datetime,
          teardown_end: event.end_datetime,
          status: event.status,
          color: event.color || "#10b981",
          dependencies: []
        });
      }
    }
    
    // Update or create timeline
    const existingTimeline = await EventTimeline.filter({ event_id: eventId });
    
    const timelineData = {
      event_id: eventId,
      host_id: (await User.me()).id,
      timeline_items: timelineItems,
      last_synced: new Date().toISOString()
    };
    
    if (existingTimeline[0]) {
      await EventTimeline.update(existingTimeline[0].id, timelineData);
    } else {
      await EventTimeline.create(timelineData);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      in_setup: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-purple-100 text-purple-800 border-purple-200",
      in_teardown: "bg-orange-100 text-orange-800 border-orange-200",
      completed: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "in_setup":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-purple-600" />;
      case "in_teardown":
        return <Clock className="w-4 h-4 text-orange-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("MyEvents")}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">Event Timeline</h1>
              <p className="text-xs text-gray-500">Live vendor schedule</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshTimeline}
              disabled={isRefreshing}
              className="rounded-full"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {lastSyncTime && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Last synced: {format(lastSyncTime, "h:mm a")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6">
        {/* Event Selector */}
        {events.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  loadEventTimeline(event.id);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedEvent?.id === event.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}
              >
                {event.name}
              </button>
            ))}
          </div>
        )}

        {selectedEvent && (
          <>
            {/* Event Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedEvent.name}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedEvent.date && format(parseISO(selectedEvent.date), "EEEE, MMMM d, yyyy")}
                  </p>
                  {selectedEvent.location && (
                    <p className="text-sm text-gray-600 mt-1">{selectedEvent.location}</p>
                  )}
                </div>
                {timeline?.ai_optimized && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Optimized
                  </Badge>
                )}
              </div>
            </div>

            {/* Conflict Warnings */}
            {timeline?.conflict_warnings && timeline.conflict_warnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 mb-2">Schedule Conflicts Detected</h3>
                    {timeline.conflict_warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-red-700 mb-1">{warning.message}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Vendor Schedule</h3>
              
              {timeline?.timeline_items && timeline.timeline_items.length > 0 ? (
                timeline.timeline_items.map((item, idx) => {
                  const enabler = enablersData[item.enabler_id];
                  
                  return (
                    <motion.div
                      key={item.id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white rounded-xl p-5 border border-gray-100"
                    >
                      {/* Enabler Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            {enabler?.profile_image ? (
                              <img
                                src={enabler.profile_image}
                                alt={item.enabler_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.enabler_name}</h4>
                            <p className="text-xs text-gray-600 capitalize">{item.service_type?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Timeline Details */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {item.setup_start && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Setup</p>
                            <p className="font-medium text-gray-900">
                              {format(parseISO(item.setup_start), "h:mm a")}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Service Time</p>
                          <p className="font-medium text-gray-900">
                            {format(parseISO(item.scheduled_start), "h:mm a")} - {format(parseISO(item.scheduled_end), "h:mm a")}
                          </p>
                        </div>

                        {item.teardown_end && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Teardown</p>
                            <p className="font-medium text-gray-900">
                              {format(parseISO(item.teardown_end), "h:mm a")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Status Indicator */}
                      {item.status === 'confirmed' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmed and synced</span>
                        </div>
                      )}
                      
                      {item.status === 'in_setup' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span>Setting up now</span>
                        </div>
                      )}
                      
                      {item.status === 'in_progress' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                          <div className="w-4 h-4 rounded-full bg-purple-600 animate-pulse"></div>
                          <span>Service in progress</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No vendor schedule available yet</p>
                  <p className="text-sm text-gray-500 mt-1">Timeline will appear once bookings are confirmed</p>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            {timeline?.optimization_suggestions && timeline.optimization_suggestions.length > 0 && (
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-purple-900 mb-2">AI Scheduling Suggestions</h3>
                    {timeline.optimization_suggestions.map((suggestion, idx) => (
                      <p key={idx} className="text-sm text-purple-700 mb-1">{suggestion.message}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}