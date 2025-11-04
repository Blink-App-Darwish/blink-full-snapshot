
import React, { useState, useEffect } from "react";
import { Enabler, Booking, User, Event, Contract } from "@/api/entities";
import { Calendar, MapPin, Users, DollarSign, Mail, Phone, ChevronRight, Clock, ChevronDown, FileText, MessageCircle, AlertTriangle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, parseISO } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EnablerBookings() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState({});
  const [hosts, setHosts] = useState({});
  const [allEnablers, setAllEnablers] = useState({});
  const [contracts, setContracts] = useState({});
  const [activeView, setActiveView] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [stats, setStats] = useState({ ongoing: 0, upcoming: 0 });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const user = await User.me();
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      let enablerData;
      
      if (selectedProfileId) {
        const profileData = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
        enablerData = profileData[0];
      } else {
        const profiles = await Enabler.filter({ user_id: user.id }, "-created_date");
        enablerData = profiles[0];
        if (enablerData) {
          localStorage.setItem("selected_enabler_profile", enablerData.id);
        }
      }
      
      if (enablerData) {
        setEnabler(enablerData);
        
        const bookingsData = await Booking.filter(
          { enabler_id: enablerData.id, status: "confirmed" },
          "-created_date"
        );
        setBookings(bookingsData);
        
        const eventsMap = {};
        const hostsMap = {};
        const enablersMap = {};
        const contractsMap = {};
        let ongoingCount = 0;
        let upcomingCount = 0;
        
        for (const booking of bookingsData) {
          if (booking.event_id && !eventsMap[booking.event_id]) {
            const eventData = await Event.filter({ id: booking.event_id });
            if (eventData[0]) {
              eventsMap[booking.event_id] = eventData[0];
              
              const daysAway = differenceInDays(parseISO(eventData[0].date), new Date());
              if (daysAway <= 31) {
                ongoingCount++;
              } else {
                upcomingCount++;
              }
              
              if (eventData[0].host_id && !hostsMap[eventData[0].host_id]) {
                const hostData = await User.filter({ id: eventData[0].host_id });
                if (hostData[0]) hostsMap[eventData[0].host_id] = hostData[0];
              }
              
              const eventBookings = await Booking.filter({ event_id: booking.event_id, status: "confirmed" });
              for (const eb of eventBookings) {
                if (eb.enabler_id !== enablerData.id && !enablersMap[eb.enabler_id]) {
                  const otherEnabler = await Enabler.filter({ id: eb.enabler_id });
                  if (otherEnabler[0]) enablersMap[eb.enabler_id] = otherEnabler[0];
                }
              }
            }
          }
          
          // Load contract for booking
          if (booking.id) {
            const contractData = await Contract.filter({ booking_id: booking.id });
            if (contractData[0]) {
              contractsMap[booking.id] = contractData[0];
            }
          }
        }
        
        setEvents(eventsMap);
        setHosts(hostsMap);
        setAllEnablers(enablersMap);
        setContracts(contractsMap);
        setStats({ ongoing: ongoingCount, upcoming: upcomingCount });
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const toggleCardExpansion = (eventId) => {
    setExpandedCards(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const getEventBookings = (eventId) => {
    return bookings.filter(b => b.event_id === eventId);
  };

  const filterBookings = (type) => {
    return bookings.filter(booking => {
      const event = events[booking.event_id];
      if (!event) return false;
      
      const daysAway = differenceInDays(parseISO(event.date), new Date());
      return type === 'ongoing' ? daysAway <= 31 : daysAway > 31;
    });
  };

  const ongoingBookings = filterBookings('ongoing');
  const upcomingBookings = filterBookings('upcoming');

  const getUniqueEvents = (bookingsArray) => {
    const eventIds = [...new Set(bookingsArray.map(b => b.event_id))];
    return eventIds.map(id => events[id]).filter(Boolean);
  };

  const getPaymentStatus = (booking) => {
    if (booking.payment_status === 'paid') return { label: 'PAID', color: 'bg-green-50 text-green-700 border-green-200' };
    if (booking.payment_status === 'partial') return { label: 'PARTIAL', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'DUE', color: 'bg-red-50 text-red-700 border-red-200' };
  };

  const EventCard = ({ event, isOngoing }) => {
    const host = hosts[event.host_id];
    const eventBookings = getEventBookings(event.id);
    const myBooking = eventBookings.find(b => b.enabler_id === enabler.id);
    const daysAway = differenceInDays(parseISO(event.date), new Date());
    const isExpanded = expandedCards[event.id];
    const contract = myBooking ? contracts[myBooking.id] : null;
    const paymentStatus = myBooking ? getPaymentStatus(myBooking) : null;
    const hasEditRequest = false; // TODO: Check for edit requests
    
    // NEW: Check if workflow exists
    const hasWorkflow = myBooking?.status === 'confirmed';
    
    const themeColors = isOngoing ? {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700'
    } : {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700'
    };

    return (
      <Card className={`border-2 ${themeColors.border} overflow-hidden transition-all duration-300 hover:shadow-lg`}>
        {/* Card Header - Always Visible */}
        <div className="p-5">
          {/* Event Name & Time Countdown */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
                {hasEditRequest && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] px-2 py-0.5">
                    <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={2} />
                    EDIT REQUEST
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-1 ${themeColors.badge} rounded-full font-semibold flex items-center gap-1.5`}>
                  <Clock className="w-3 h-3" strokeWidth={2} />
                  {daysAway} days away
                </span>
                <span className="text-gray-500 capitalize">{event.type.replace(/_/g, ' ')}</span>
              </div>
            </div>
            
            <button
              onClick={() => toggleCardExpansion(event.id)}
              className={`p-2 rounded-full transition-all ${themeColors.bg} hover:scale-110`}
            >
              <ChevronDown 
                className={`w-5 h-5 ${themeColors.icon} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Date Display */}
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
            <span className="text-sm font-medium text-gray-700">
              {format(parseISO(event.date), "EEEE, MMMM d, yyyy")}
            </span>
          </div>

          {/* Host Info + Contact */}
          {host && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${isOngoing ? 'from-emerald-400 to-cyan-500' : 'from-blue-400 to-purple-500'} flex items-center justify-center text-white font-bold text-sm`}>
                  {host.full_name?.[0] || 'H'}
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 tracking-wide font-semibold">HOST</p>
                  <p className="text-sm font-semibold text-gray-900">{host.full_name}</p>
                </div>
              </div>
              
              <Button
                size="sm"
                className={`${themeColors.bg} ${themeColors.text} hover:opacity-80 border-0`}
                onClick={() => {/* TODO: Open chat */}}
              >
                <MessageCircle className="w-4 h-4 mr-1.5" strokeWidth={2} />
                Contact
              </Button>
            </div>
          )}

          {/* Payment Status */}
          {paymentStatus && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-400 tracking-wide font-semibold">PAYMENT STATUS</span>
              <Badge className={`${paymentStatus.color} border text-[9px] px-3 py-1 font-bold`}>
                {paymentStatus.label}
              </Badge>
            </div>
          )}
        </div>

        {/* NEW: Workflow Manager Button */}
        {hasWorkflow && myBooking && (
          <div className="p-5 border-t border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50">
            <Link to={`${createPageUrl("EnablerWorkflowView")}?booking_id=${myBooking.id}`}>
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Open Workflow Manager
              </Button>
            </Link>
          </div>
        )}

        {/* Expanded Details - Dropdown */}
        {isExpanded && (
          <div className={`${themeColors.bg} border-t-2 ${themeColors.border} p-5 space-y-4`}>
            {/* Event Details */}
            <div>
              <p className="text-[9px] text-gray-500 tracking-wide font-semibold mb-3">EVENT DETAILS</p>
              <div className="space-y-2">
                {event.location && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                    {event.location}
                  </div>
                )}
                {event.guest_count && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <Users className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                    {event.guest_count} guests
                  </div>
                )}
              </div>
            </div>

            {/* Package Summary */}
            {myBooking && myBooking.package_id && (
              <div>
                <p className="text-[9px] text-gray-500 tracking-wide font-semibold mb-2">YOUR PACKAGE</p>
                <div className={`p-3 bg-white rounded-lg border ${themeColors.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Package Service</span>
                    <span className={`text-sm font-bold ${themeColors.text}`}>${myBooking.total_amount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Contract Button */}
            {contract && (
              <Button
                onClick={() => navigate(`${createPageUrl("ContractDetail")}?id=${contract.id}`)}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200"
              >
                <FileText className="w-4 h-4 mr-2" strokeWidth={2} />
                View Smart Contract
                <ChevronRight className="w-4 h-4 ml-auto" strokeWidth={2} />
              </Button>
            )}

            {/* Other Enablers */}
            {eventBookings.length > 1 && (
              <div>
                <p className="text-[9px] text-gray-500 tracking-wide font-semibold mb-3">
                  OTHER PROS ({eventBookings.length - 1})
                </p>
                <div className="space-y-2">
                  {eventBookings
                    .filter(b => b.enabler_id !== enabler.id)
                    .map((booking) => {
                      const otherEnabler = allEnablers[booking.enabler_id];
                      if (!otherEnabler) return null;
                      
                      return (
                        <div key={booking.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold">
                            {otherEnabler.business_name?.[0] || 'E'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{otherEnabler.business_name}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{otherEnabler.category.replace(/_/g, ' ')}</p>
                          </div>
                          {booking.total_amount && (
                            <p className={`text-xs font-bold ${themeColors.text}`}>${booking.total_amount}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-md mx-auto px-6 py-4">
          {/* Removed Bookings text */}
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        {/* Bookings Section with Two Cards */}
        {!activeView && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 tracking-tight">EVENTS</h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-200 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* On Going Card */}
              <button
                onClick={() => setActiveView('ongoing')}
                className="relative group w-full border-2 border-emerald-100 p-6 rounded-2xl transition-all text-left overflow-hidden hover:border-emerald-300 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                  
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.ongoing}</p>
                  <p className="text-xs font-semibold text-emerald-700 tracking-wide">ON GOING</p>
                  <p className="text-[10px] text-gray-500 mt-1">≤ 31 days away</p>
                </div>
              </button>

              {/* Up Coming Card */}
              <button
                onClick={() => setActiveView('upcoming')}
                className="relative group w-full border-2 border-blue-100 p-6 rounded-2xl transition-all text-left overflow-hidden hover:border-blue-300 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-blue-600" strokeWidth={2} />
                  </div>
                  
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.upcoming}</p>
                  <p className="text-xs font-semibold text-blue-700 tracking-wide">UP COMING</p>
                  <p className="text-[10px] text-gray-500 mt-1">&gt; 31 days away</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* On Going Events Section */}
        {activeView === 'ongoing' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveView(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
            >
              ← Back to Overview
            </button>

            {ongoingBookings.length === 0 ? (
              <div className="border border-gray-100 p-12 text-center rounded-2xl">
                <Clock className="w-12 h-12 mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No ongoing events</p>
              </div>
            ) : (
              getUniqueEvents(ongoingBookings).map((event) => (
                <EventCard key={event.id} event={event} isOngoing={true} />
              ))
            )}
          </div>
        )}

        {/* Up Coming Events Section */}
        {activeView === 'upcoming' && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveView(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
            >
              ← Back to Overview
            </button>

            {upcomingBookings.length === 0 ? (
              <div className="border border-gray-100 p-12 text-center rounded-2xl">
                <Calendar className="w-12 h-12 mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No upcoming events</p>
              </div>
            ) : (
              getUniqueEvents(upcomingBookings).map((event) => (
                <EventCard key={event.id} event={event} isOngoing={false} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
