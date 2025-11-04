
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event, Booking, Enabler, Package, BookingOffer, Notification } from "@/api/entities"; // Added Notification
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Trash2, Sparkles, Pencil, CheckCircle2, Loader2 } from "lucide-react"; // Added CheckCircle2, Loader2
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BlinkLogo from "../components/BlinkLogo";
import PackageDetailModal from "../components/PackageDetailModal";
import EnablerBrandModal from "../components/EnablerBrandModal";
import { getVenueStatusDisplay, determineVenueStatus, checkEnablerCompatibility } from "../components/VenueLogic"; // Added VenueLogic imports

export default function EventDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  // eventId and openVenueDialog are now passed via location.state
  const { eventId, openVenueDialog } = location.state || {};
  
  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [enablers, setEnablers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerData, setOfferData] = useState({ offered_amount: "", custom_requirements: "" });
  const [showRemoveDialog, setShowRemoveDialog] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // New state variables for modals
  const [selectedPackageForModal, setSelectedPackageForModal] = useState(null);
  const [selectedEnablerForBrand, setSelectedEnablerForBrand] = useState(null);

  // New state variables for venue system
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [showVenueDialog, setShowVenueDialog] = useState(openVenueDialog || false);
  const [venueLocation, setVenueLocation] = useState("");
  const [isUpdatingVenue, setIsUpdatingVenue] = useState(false);
  const [showVenueConfirmation, setShowVenueConfirmation] = useState(false);
  
  // New state variable for booking confirmation
  const [confirmingBooking, setConfirmingBooking] = useState(null);

  const loadEventDetails = async () => { // Renamed from loadData
    setIsLoading(true); // Set loading true
    // Strict validation
    if (!eventId || 
        eventId === "null" || 
        eventId === "undefined" || 
        eventId === "-" || 
        eventId === "" ||
        eventId.trim() === "") {
      console.error("Invalid event ID in EventDetail:", eventId);
      navigate(createPageUrl("MyEvents"), { replace: true });
      setIsLoading(false); // Ensure loading is false on early exit
      return;
    }
    
    try {
      console.log("Loading event detail data for event:", eventId);
      
      const eventData = await Event.filter({ id: eventId });
      
      if (!eventData || eventData.length === 0) {
        console.error("Event not found:", eventId);
        navigate(createPageUrl("MyEvents"), { replace: true });
        setIsLoading(false); // Ensure loading is false on early exit
        return;
      }
      
      if (eventData[0]) {
        setEvent(eventData[0]);
        setNewTitle(eventData[0].name);
        // Initialize venueLocation if event already has one
        if (eventData[0].location) {
          setVenueLocation(eventData[0].location);
        }
        
        const bookingsData = await Booking.filter({ event_id: eventId });
        setBookings(bookingsData);
        
        const offersData = await BookingOffer.filter({ event_id: eventId }, "-created_date");
        setOffers(offersData);
        
        const enablerIds = [
          ...bookingsData.map(b => b.enabler_id),
          ...offersData.map(o => o.enabler_id)
        ];
        const uniqueEnablerIds = [...new Set(enablerIds)];
        
        const enablerPromises = uniqueEnablerIds.map(async (id) => {
          const enabler = await Enabler.filter({ id });
          return enabler[0];
        });
        const fetchedEnablers = await Promise.all(enablerPromises);
        setEnablers(fetchedEnablers.filter(Boolean)); // Filter out any null/undefined enablers
      }
    } catch (error) {
      console.error("Error loading event data:", error);
      navigate(createPageUrl("MyEvents"), { replace: true });
    } finally {
      setIsLoading(false); // Set loading false after data is loaded or error occurs
    }
  };

  useEffect(() => {
    // Validate event ID exists and is valid
    if (!eventId || 
        eventId === "null" || 
        eventId === "undefined" || 
        eventId === "-" || 
        eventId === "" ||
        eventId.trim() === "") {
      console.error("Invalid event ID in useEffect:", eventId);
      navigate(createPageUrl("MyEvents"), { replace: true });
      return;
    }
    
    loadEventDetails();
  }, [eventId, navigate, location.state]); // Added location.state to dependencies

  const deleteEvent = async () => {
    await Event.delete(eventId);
    navigate(createPageUrl("MyEvents"));
  };

  const handleTitleUpdate = async () => {
    if (!newTitle.trim() || newTitle === event.name) {
      setEditingTitle(false);
      setNewTitle(event.name);
      return;
    }
    await Event.update(eventId, { name: newTitle.trim() });
    setEvent({...event, name: newTitle.trim()});
    setEditingTitle(false);
  };

  const handleOfferUpdate = async (offerId) => {
    await BookingOffer.update(offerId, {
      offered_amount: parseFloat(offerData.offered_amount),
      custom_requirements: offerData.custom_requirements
    });
    
    setEditingOffer(null);
    setOfferData({ offered_amount: "", custom_requirements: "" });
    
    const offersData = await BookingOffer.filter({ event_id: eventId }, "-created_date");
    setOffers(offersData);
  };

  const handleAcceptCounterOffer = async (offerId) => {
    const offer = offers.find(o => o.id === offerId);
    
    if (!offer) return;

    await Booking.create({
      event_id: eventId,
      enabler_id: offer.enabler_id,
      total_amount: offer.counter_offer_amount,
      status: "confirmed",
      payment_status: "pending"
    });
    
    await BookingOffer.update(offerId, { status: "accepted" });
    
    const bookingsData = await Booking.filter({ event_id: eventId });
    setBookings(bookingsData);
    const offersData = await BookingOffer.filter({ event_id: eventId }, "-created_date");
    setOffers(offersData);
  };

  const handleRemoveOffer = async (offerId) => {
    await BookingOffer.delete(offerId);
    
    const offersData = await BookingOffer.filter({ event_id: eventId }, "-created_date");
    setOffers(offersData);
    setShowRemoveDialog(null);
  };

  const handleReplaceEnabler = (currentEnablerId) => {
    navigate(`${createPageUrl("Browse")}?event_id=${eventId}&replace_enabler=${currentEnablerId}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "planning": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return "Date not set";
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (isValid(date)) {
        return format(date, "EEEE, MMMM d, yyyy");
      }
      return "Invalid date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // New handler for clicking on offer/booking cards to open modals
  const handleItemCardClick = async (item, enabler) => {
    if (item.package_id) {
      const [pkg] = await Package.filter({ id: item.package_id });
      if (pkg) {
        setSelectedPackageForModal(pkg);
      } else {
        // Fallback to enabler brand modal if package not found
        if (enabler) {
          setSelectedEnablerForBrand(enabler);
        }
      }
    } else {
      // If no package_id, open enabler brand modal directly
      if (enabler) {
        setSelectedEnablerForBrand(enabler);
      }
    }
  };

  const handleAddVenue = async () => {
    if (!venueLocation.trim()) {
      alert("Please enter a venue location");
      return;
    }

    try {
      setIsUpdatingVenue(true);
      
      console.log('🎯 STAGE 3: Adding venue to event...');
      
      // Update event with venue
      await Event.update(eventId, {
        location: venueLocation,
        venue_status: 'with_venue',
        venue_confirmed: true,
        service_area: venueLocation
      });
      
      console.log('✅ Venue added successfully');
      
      // LOCATION LOGIC Stage 3: Re-run compatibility checks for all linked enablers
      const eventBookings = await Booking.filter({ event_id: eventId });
      
      for (const booking of eventBookings) {
        const enabler = enablers.find(e => e.id === booking.enabler_id); // Use already fetched enablers
        if (enabler) {
          const compatibility = checkEnablerCompatibility(enabler, {
            location: venueLocation,
            event_date: event.date,
            guest_min: event.guest_count,
            guest_max: event.guest_count,
            venue_status: 'with_venue'
          }, {
            calendarEvents: [], // Placeholder, full logic for calendar/frameworks not implemented yet
            frameworks: [],
            selectedPackage: null
          });
          
          console.log(`🔍 Compatibility for ${enabler.business_name}:`, compatibility.overall.status);
          
          // LOCATION LOGIC Stage 3: Send notification to enabler
          await Notification.create({
            user_id: enabler.user_id,
            enabler_id: enabler.id,
            profile_name: enabler.business_name,
            type: 'venue_confirmed',
            title: 'Venue Confirmed',
            message: `The venue for "${event.name}" has been confirmed at ${venueLocation}. Please review the updated event details.`,
            link: createPageUrl("EnablerBookings")
          });
        }
      }
      
      // Show animated confirmation
      setShowVenueDialog(false);
      setShowVenueConfirmation(true);
      
      setTimeout(() => {
        setShowVenueConfirmation(false);
        loadEventDetails(); // Reload to show updated status
      }, 2000);
      
    } catch (error) {
      console.error("Error adding venue:", error);
      alert("Failed to add venue. Please try again.");
    } finally {
      setIsUpdatingVenue(false);
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      setConfirmingBooking(bookingId);
      
      console.log("🎯 Confirming booking:", bookingId);
      
      // Import confirmation handler
      const { default: BookingConfirmationHandler } = await import("../components/BookingConfirmationHandler");
      
      // Execute confirmation + ABE
      // Pass the entire event object and the specific booking for more context if needed by ABE
      const bookingToConfirm = bookings.find(b => b.id === bookingId);
      const enablerOfBooking = enablers.find(e => e.id === bookingToConfirm.enabler_id);

      const result = await BookingConfirmationHandler.confirmBooking({
        eventId: event.id,
        eventTitle: event.name,
        bookingId: bookingToConfirm.id,
        enablerId: enablerOfBooking.id,
        enablerName: enablerOfBooking.business_name,
        totalAmount: bookingToConfirm.total_amount,
        eventDate: event.date, // Pass event date
        eventLocation: event.location, // Pass event location
        guestCount: event.guest_count // Pass guest count
        // You might pass other relevant event or booking details here
      });
      
      console.log("✅ Booking confirmed with ABE:", result);
      
      alert("✅ Booking confirmed! Your workflow has been set up.");
      
      // Reload event data
      await loadEventDetails();
      
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("Failed to confirm booking: " + (error.message || "Unknown error"));
    } finally {
      setConfirmingBooking(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col">
        <p className="text-gray-600 mb-4">Event not found or invalid ID</p>
        <Button onClick={() => navigate(createPageUrl("MyEvents"))}>
          Go to My Events
        </Button>
      </div>
    );
  }

  const totalCost = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const pendingOffers = offers.filter(o => o.status === "pending" || o.status === "counter_offered");
  const allEnablers = [...bookings.map(b => b.enabler_id), ...pendingOffers.map(o => o.enabler_id)];
  const hasEnablers = allEnablers.length > 0;
  
  const venueStatus = getVenueStatusDisplay(event.venue_status || 'pending_venue'); // Venue status display

  // NEW: Check if event has confirmed bookings with workflows
  const hasWorkflows = bookings.some(b => b.status === 'confirmed');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Modern Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full flex-shrink-0 h-8 w-8"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {editingTitle ? (
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-7 text-base flex-1"
                autoFocus
                onBlur={handleTitleUpdate}
                onKeyPress={(e) => e.key === 'Enter' && handleTitleUpdate()}
              />
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{event.name}</h1>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                >
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-500 hover:bg-red-50 flex-shrink-0 h-8 w-8"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-16 space-y-6"> {/* max-w-md for event details section */}
        {/* Event Header */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                  
                  {/* LOCATION LOGIC Stage 3: Venue Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${venueStatus.bgColor} ${venueStatus.color} border ${venueStatus.borderColor}`}>
                    <span className="text-sm">{venueStatus.icon}</span>
                    <span>{venueStatus.text}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 gap-4 mb-6"> {/* Adjusted to 1 column for smaller screen, could be md:grid-cols-2 */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{formatEventDate(event.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{event.location || 'Not specified'}</span>
              </div>

              {event.guest_count > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>{event.guest_count} guests</span>
                </div>
              )}
              {event.budget > 0 && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>Budget: ${event.budget.toLocaleString()}</span>
                </div>
              )}
            </div>

            {event.theme && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">Theme/Vision</p>
                <p className="text-sm text-gray-600 break-words">{event.theme}</p>
              </div>
            )}

            {/* LOCATION LOGIC Stage 3: Add Venue Button */}
            {event.venue_status === 'pending_venue' && (
              <button
                onClick={() => setShowVenueDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] mt-4"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #d946ef 100%)',
                  color: 'white'
                }}
              >
                <MapPin className="w-4 h-4" />
                <span>Add Venue Location</span>
              </button>
            )}

            <Button
              onClick={() => navigate(`${createPageUrl("EditEventDetails")}?id=${eventId}`)}
              variant="outline"
              className="w-full mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Event Details
            </Button>
          </div>
        </Card>

        {/* NEW: Preparation Dashboard Button */}
        {hasWorkflows && (
          <Link to={`${createPageUrl("HostPreparationView")}?event_id=${eventId}`}>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Open Preparation Dashboard
            </Button>
          </Link>
        )}

        {hasEnablers && (
          <Link to={`${createPageUrl("EventBooking")}?event_id=${eventId}`}>
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <BlinkLogo size="xs" />
              Book This Event
            </Button>
          </Link>
        )}

        {pendingOffers.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              Pending Offers ({pendingOffers.length})
            </h3>

            <div className="space-y-3">
              {pendingOffers.map((offer) => {
                const enabler = enablers.find(e => e.id === offer.enabler_id);
                if (!enabler) return null;
                
                const isEditing = editingOffer === offer.id;

                return (
                  <Card 
                    key={offer.id} 
                    className="p-4 border border-gray-100 hover:border-emerald-200 transition-all overflow-hidden cursor-pointer"
                    onClick={(e) => {
                        // Only open modal if not editing and click is not on an interactive element inside the card
                        if (!isEditing && !e.target.closest('button, a, input, textarea')) {
                            handleItemCardClick(offer, enabler);
                        }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {enabler.profile_image ? (
                          <img
                            src={enabler.profile_image}
                            alt={enabler.business_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            👤
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate text-base">
                              {enabler.business_name}
                            </h4>
                            <p className="text-xs text-gray-600 capitalize mb-1 truncate">
                              {enabler.category.replace(/_/g, ' ')}
                            </p>
                            <Link 
                              to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline underline-offset-2 transition-colors"
                              onClick={(e) => e.stopPropagation()} // Prevent card click from firing
                            >
                              View Profile
                            </Link>
                          </div>
                          <Badge className={`flex-shrink-0 ${
                            offer.status === "counter_offered" ? "bg-yellow-500 text-white" :
                            "bg-blue-500 text-white"
                          }`}>
                            {offer.status === "counter_offered" ? "Counter" : "Pending"}
                          </Badge>
                        </div>

                        {offer.status === "counter_offered" && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                            <p className="text-sm font-semibold text-yellow-900 mb-1">
                              Counter: ${offer.counter_offer_amount}
                            </p>
                            <p className="text-xs text-yellow-800 break-words">{offer.counter_offer_message}</p>
                            <button
                              onClick={(e) => {e.stopPropagation(); handleAcceptCounterOffer(offer.id);}}
                              className="w-full mt-2 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={offerData.offered_amount}
                              onChange={(e) => setOfferData({...offerData, offered_amount: e.target.value})}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()} // Prevent card click from firing
                            />
                            <Textarea
                              placeholder="Requirements..."
                              value={offerData.custom_requirements}
                              onChange={(e) => setOfferData({...offerData, custom_requirements: e.target.value})}
                              rows={2}
                              className="text-sm"
                              onClick={(e) => e.stopPropagation()} // Prevent card click from firing
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {e.stopPropagation(); handleOfferUpdate(offer.id);}}
                                className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Update
                              </button>
                              <button
                                onClick={(e) => {e.stopPropagation(); setEditingOffer(null);}}
                                className="flex-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm mb-2 bg-gray-50 rounded-lg p-2">
                              <p className="font-semibold text-emerald-600 text-sm">
                                Your Offer: ${offer.offered_amount}
                              </p>
                              {offer.custom_requirements && (
                                <p className="text-xs text-gray-600 mt-1 break-words">{offer.custom_requirements}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click from firing
                                  setEditingOffer(offer.id);
                                  setOfferData({
                                    offered_amount: offer.offered_amount.toString(),
                                    custom_requirements: offer.custom_requirements || ""
                                  });
                                }}
                                className="flex-1 py-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg transition-colors"
                              >
                                Modify
                              </button>
                              <button
                                onClick={(e) => {e.stopPropagation(); handleReplaceEnabler(offer.enabler_id);}}
                                className="flex-1 py-1.5 border border-blue-200 hover:bg-blue-50 text-blue-600 text-xs font-medium rounded-lg transition-colors"
                              >
                                Replace
                              </button>
                            </div>
                            <button
                              onClick={(e) => {e.stopPropagation(); setShowRemoveDialog(offer.id);}}
                              className="w-full mt-2 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Booked Services ({bookings.length})
            </h3>
            <Link to={`${createPageUrl("Browse")}?event_id=${eventId}`}>
              <button className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors">
                Add Services
              </button>
            </Link>
          </div>

          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 mb-3">No services booked yet</p>
              <Link to={createPageUrl("Browse")}>
                <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors">
                  Browse Enablers
                </button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const enabler = enablers.find(e => e.id === booking.enabler_id);
                if (!enabler) return null;

                return (
                  <Card 
                    key={booking.id} 
                    className="p-4 border border-gray-100 hover:border-emerald-200 transition-all overflow-hidden cursor-pointer"
                    onClick={(e) => {
                        // Prevent card click from firing if clicking on an interactive element like a link or button
                        if (!e.target.closest('a') && !e.target.closest('button')) {
                            handleItemCardClick(booking, enabler);
                        }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {enabler.profile_image ? (
                          <img
                            src={enabler.profile_image}
                            alt={enabler.business_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            👤
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate text-base">
                          {enabler.business_name}
                        </h4>
                        <p className="text-xs text-gray-600 capitalize mb-1 truncate">
                          {enabler.category.replace(/_/g, ' ')}
                        </p>
                        <Link 
                          to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline underline-offset-2 transition-colors"
                          onClick={(e) => e.stopPropagation()} // Prevent card click from firing
                        >
                          View Profile
                        </Link>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <Badge variant="secondary" className={`text-xs ${
                            booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                            booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {booking.status}
                          </Badge>
                          <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                            ${booking.total_amount}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* In bookings section, add confirm button for pending bookings */}
                    {booking.status === "pending" && (
                      <Button
                        onClick={(e) => {e.stopPropagation(); handleConfirmBooking(booking.id);}} // Stop propagation to prevent card click
                        disabled={confirmingBooking === booking.id}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                      >
                        {confirmingBooking === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm Booking (Trigger ABE)
                          </>
                        )}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {bookings.length > 0 && (
          <>
            <Card className="p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-emerald-700 font-medium">Total Cost</p>
                  <p className="text-3xl font-bold text-emerald-900">${totalCost.toLocaleString()}</p>
                </div>
                {event.budget > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-emerald-700">Budget</p>
                    <p className="text-lg font-semibold text-emerald-800">
                      ${event.budget.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {totalCost <= event.budget ? "Within budget ✓" : "Over budget"}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Payment Terms</h3>
              <p className="text-sm text-gray-700 break-words">
                A 25% deposit is required upon booking confirmation. The remaining balance is due 7 days prior to the event date. Payments can be made via credit card or bank transfer.
              </p>
              <p className="text-xs text-gray-500 mt-2 break-words">
                Specific payment schedules and cancellation policies may vary per enabler and will be detailed in individual booking agreements.
              </p>
            </Card>
          </>
        )}

        {hasEnablers && (
          <Link to={`${createPageUrl("EventBooking")}?event_id=${eventId}`}>
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <BlinkLogo size="xs" />
              Finalize Booking
            </Button>
          </Link>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{event.name}" and all associated bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEvent} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showRemoveDialog} onOpenChange={() => setShowRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Enabler?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this enabler from your event. You can always add them back later or find a replacement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRemoveOffer(showRemoveDialog)} 
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Package Detail Modal */}
      {selectedPackageForModal && (
        <PackageDetailModal
          package={selectedPackageForModal}
          onClose={() => setSelectedPackageForModal(null)}
          onOpenGallery={() => setSelectedPackageForModal(null)} // Placeholder: closes package modal
          onViewPortfolio={() => {
            const enabler = enablers.find(e => e.id === selectedPackageForModal.enabler_id);
            setSelectedPackageForModal(null);
            if (enabler) { 
              setSelectedEnablerForBrand(enabler);
            }
          }}
        />
      )}

      {/* Enabler Brand Modal */}
      {selectedEnablerForBrand && (
        <EnablerBrandModal
          enabler={selectedEnablerForBrand}
          onClose={() => setSelectedEnablerForBrand(null)}
        />
      )}

      {/* LOCATION LOGIC Stage 3: Add Venue Dialog */}
      {showVenueDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowVenueDialog(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Venue Location</h3>
                <p className="text-xs text-gray-500">Help your team know where to go</p>
              </div>
            </div>

            <Input
              placeholder="Enter venue address or location..."
              value={venueLocation}
              onChange={(e) => setVenueLocation(e.target.value)}
              className="mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowVenueDialog(false)}
                className="flex-1"
                disabled={isUpdatingVenue}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddVenue}
                disabled={isUpdatingVenue || !venueLocation.trim()}
                className="flex-1"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #d946ef 100%)',
                  color: 'white'
                }}
              >
                {isUpdatingVenue ? 'Adding...' : 'Confirm Venue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION LOGIC Stage 3: Venue Confirmation Animation */}
      {showVenueConfirmation && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <div className="text-center">
            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
              }}
            >
              <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Venue Confirmed! 🎉</h3>
            <p className="text-sm text-white/80">Your team has been notified</p>
          </div>
        </div>
      )}
    </div>
  );
}
