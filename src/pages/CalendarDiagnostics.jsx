import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Enabler, CalendarEvent, Booking, Reservation, BookingOffer } from "@/api/entities";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CalendarSyncService from "../components/CalendarSyncService";

export default function CalendarDiagnostics() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
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
      
      if (!enablerData) {
        setDiagnostics({ error: "No enabler profile found" });
        setIsLoading(false);
        return;
      }

      setEnabler(enablerData);

      // Get all booking types
      const bookings = await Booking.filter({ enabler_id: enablerData.id });
      const reservations = await Reservation.filter({ enabler_id: enablerData.id });
      const offers = await BookingOffer.filter({ enabler_id: enablerData.id });
      const calendarEvents = await CalendarEvent.filter({ enabler_id: enablerData.id });

      // Check which bookings have calendar events
      const bookingsWithEvents = [];
      const bookingsWithoutEvents = [];

      for (const booking of bookings) {
        const hasEvent = calendarEvents.some(e => e.booking_id === booking.id);
        if (hasEvent) {
          bookingsWithEvents.push(booking);
        } else {
          bookingsWithoutEvents.push(booking);
        }
      }

      // Check reservations
      const reservationsWithEvents = [];
      const reservationsWithoutEvents = [];

      for (const reservation of reservations) {
        const hasEvent = calendarEvents.some(e => e.booking_id === reservation.id);
        if (hasEvent) {
          reservationsWithEvents.push(reservation);
        } else {
          reservationsWithoutEvents.push(reservation);
        }
      }

      // Check accepted offers
      const acceptedOffers = offers.filter(o => o.status === "accepted");
      const offersWithBookings = [];
      const offersWithoutBookings = [];

      for (const offer of acceptedOffers) {
        const hasBooking = bookings.some(b => b.event_id === offer.event_id && b.enabler_id === offer.enabler_id);
        if (hasBooking) {
          offersWithBookings.push(offer);
        } else {
          offersWithoutBookings.push(offer);
        }
      }

      // Check for orphaned calendar events
      const orphanedEvents = [];
      for (const event of calendarEvents) {
        if (!event.booking_id) continue;
        
        const bookingExists = bookings.some(b => b.id === event.booking_id);
        const reservationExists = reservations.some(r => r.id === event.booking_id);
        
        if (!bookingExists && !reservationExists) {
          orphanedEvents.push(event);
        }
      }

      setDiagnostics({
        total_bookings: bookings.length,
        total_reservations: reservations.length,
        total_offers: offers.length,
        total_calendar_events: calendarEvents.length,
        bookings_with_events: bookingsWithEvents.length,
        bookings_without_events: bookingsWithoutEvents.length,
        reservations_with_events: reservationsWithEvents.length,
        reservations_without_events: reservationsWithoutEvents.length,
        accepted_offers: acceptedOffers.length,
        offers_with_bookings: offersWithBookings.length,
        offers_without_bookings: offersWithoutBookings.length,
        orphaned_events: orphanedEvents.length,
        missing_events_list: bookingsWithoutEvents,
        missing_reservations_list: reservationsWithoutEvents,
        missing_bookings_list: offersWithoutBookings,
        orphaned_events_list: orphanedEvents
      });

    } catch (error) {
      console.error("Error running diagnostics:", error);
      setDiagnostics({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!enabler) return;

    setIsSyncing(true);
    try {
      await CalendarSyncService.syncAllBookingsToCalendar(enabler.id);
      await runDiagnostics();
      alert("Calendar synced successfully!");
    } catch (error) {
      console.error("Error syncing:", error);
      alert("Sync failed: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  if (!diagnostics || diagnostics.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{diagnostics?.error || "Unknown error"}</p>
        </Card>
      </div>
    );
  }

  const hasIssues = diagnostics.bookings_without_events > 0 || 
                    diagnostics.reservations_without_events > 0 ||
                    diagnostics.offers_without_bookings > 0 ||
                    diagnostics.orphaned_events > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Calendar Diagnostics</h1>
            <p className="text-sm text-gray-600">{enabler?.business_name}</p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Overview */}
        <Card className={`p-6 ${hasIssues ? 'border-yellow-200 bg-yellow-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-3 mb-4">
            {hasIssues ? (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {hasIssues ? "Issues Detected" : "All Good!"}
              </h2>
              <p className="text-sm text-gray-600">
                {hasIssues 
                  ? "Some bookings are missing from your calendar" 
                  : "All bookings are properly synced"}
              </p>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-gray-900">{diagnostics.total_bookings}</p>
            <p className="text-xs text-gray-600 mt-1">Total Bookings</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-gray-900">{diagnostics.total_reservations}</p>
            <p className="text-xs text-gray-600 mt-1">Active Reservations</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-gray-900">{diagnostics.accepted_offers}</p>
            <p className="text-xs text-gray-600 mt-1">Accepted Offers</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-gray-900">{diagnostics.total_calendar_events}</p>
            <p className="text-xs text-gray-600 mt-1">Calendar Events</p>
          </Card>
        </div>

        {/* Issues Details */}
        {diagnostics.bookings_without_events > 0 && (
          <Card className="p-6 border-yellow-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Bookings Missing Calendar Events</h3>
              <Badge className="bg-yellow-500 text-white">{diagnostics.bookings_without_events}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              These bookings don't have calendar events. Click "Sync Now" to fix.
            </p>
            <div className="space-y-2">
              {diagnostics.missing_events_list.slice(0, 5).map((booking) => (
                <div key={booking.id} className="bg-yellow-50 p-2 rounded text-xs">
                  Booking #{booking.id.slice(0, 8)} - {booking.status}
                </div>
              ))}
              {diagnostics.missing_events_list.length > 5 && (
                <p className="text-xs text-gray-500">
                  +{diagnostics.missing_events_list.length - 5} more
                </p>
              )}
            </div>
          </Card>
        )}

        {diagnostics.offers_without_bookings > 0 && (
          <Card className="p-6 border-yellow-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Accepted Offers Without Bookings</h3>
              <Badge className="bg-yellow-500 text-white">{diagnostics.offers_without_bookings}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              These offers were accepted but don't have booking records. Click "Sync Now" to create them.
            </p>
          </Card>
        )}

        {diagnostics.orphaned_events > 0 && (
          <Card className="p-6 border-yellow-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-900">Orphaned Calendar Events</h3>
              <Badge className="bg-yellow-500 text-white">{diagnostics.orphaned_events}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              These calendar events don't have corresponding bookings. They will be marked as cancelled during sync.
            </p>
          </Card>
        )}

        {!hasIssues && (
          <Card className="p-6 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Perfect Sync!</h3>
            <p className="text-sm text-gray-600">
              All your bookings, reservations, and offers are properly reflected on your calendar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}