import { CalendarEvent, Booking, Reservation, BookingOffer, Enabler, Event } from "@/api/entities";
import { parseISO, addMinutes } from "date-fns";

/**
 * Calendar Sync Service
 * Ensures all bookings are properly reflected on the calendar
 */

export const CalendarSyncService = {
  /**
   * Sync all bookings to calendar events for an enabler
   * This ensures nothing is missed
   */
  async syncAllBookingsToCalendar(enablerId) {
    const results = {
      synced: 0,
      errors: [],
      skipped: 0
    };

    try {
      // 1. Sync confirmed bookings
      const bookings = await Booking.filter({ 
        enabler_id: enablerId,
        status: "confirmed"
      });

      for (const booking of bookings) {
        try {
          await this.ensureBookingHasCalendarEvent(booking);
          results.synced++;
        } catch (error) {
          results.errors.push({
            type: "booking",
            id: booking.id,
            error: error.message
          });
        }
      }

      // 2. Sync active reservations (HOLD status)
      const reservations = await Reservation.filter({
        enabler_id: enablerId,
        status: "HOLD"
      });

      for (const reservation of reservations) {
        try {
          await this.ensureReservationHasCalendarEvent(reservation);
          results.synced++;
        } catch (error) {
          results.errors.push({
            type: "reservation",
            id: reservation.id,
            error: error.message
          });
        }
      }

      // 3. Sync accepted offers (that don't have bookings yet)
      const acceptedOffers = await BookingOffer.filter({
        enabler_id: enablerId,
        status: "accepted"
      });

      for (const offer of acceptedOffers) {
        // Check if booking exists
        const bookingExists = await Booking.filter({
          event_id: offer.event_id,
          enabler_id: offer.enabler_id
        });

        if (bookingExists.length === 0) {
          try {
            await this.createBookingFromOffer(offer);
            results.synced++;
          } catch (error) {
            results.errors.push({
              type: "offer",
              id: offer.id,
              error: error.message
            });
          }
        } else {
          results.skipped++;
        }
      }

      // 4. Clean up orphaned calendar events (events without bookings)
      await this.cleanupOrphanedEvents(enablerId);

      return results;

    } catch (error) {
      console.error("Error in syncAllBookingsToCalendar:", error);
      throw error;
    }
  },

  /**
   * Ensure a booking has a corresponding calendar event
   */
  async ensureBookingHasCalendarEvent(booking) {
    // Check if calendar event already exists
    const existingEvents = await CalendarEvent.filter({
      enabler_id: booking.enabler_id,
      booking_id: booking.id
    });

    if (existingEvents.length > 0) {
      // Update existing event status
      const event = existingEvents[0];
      if (event.status !== this.getCalendarStatus(booking.status)) {
        await CalendarEvent.update(event.id, {
          status: this.getCalendarStatus(booking.status)
        });
      }
      return event;
    }

    // Get event details
    let eventData = null;
    let eventDate = new Date();
    let eventName = "Booking";

    if (booking.event_id) {
      try {
        const events = await Event.filter({ id: booking.event_id });
        if (events[0]) {
          eventData = events[0];
          eventDate = parseISO(eventData.date);
          eventName = eventData.name;
        }
      } catch (error) {
        console.warn("Could not load event data:", error);
      }
    }

    // Create calendar event
    const calendarEvent = await CalendarEvent.create({
      enabler_id: booking.enabler_id,
      booking_id: booking.id,
      event_id: booking.event_id,
      event_type: "booking",
      title: eventName,
      description: `Confirmed booking - ${booking.payment_status}`,
      start_datetime: eventDate.toISOString(),
      end_datetime: addMinutes(eventDate, 240).toISOString(), // Default 4 hours
      status: this.getCalendarStatus(booking.status),
      color: this.getColorForStatus(booking.status),
      is_all_day: false
    });

    return calendarEvent;
  },

  /**
   * Ensure a reservation has a calendar event
   */
  async ensureReservationHasCalendarEvent(reservation) {
    // Check if calendar event already exists
    if (reservation.enabler_calendar_event_id) {
      const events = await CalendarEvent.filter({ id: reservation.enabler_calendar_event_id });
      if (events.length > 0) {
        return events[0];
      }
    }

    // Create calendar event for reservation
    const calendarEvent = await CalendarEvent.create({
      enabler_id: reservation.enabler_id,
      booking_id: reservation.id,
      event_id: reservation.event_id,
      event_type: "booking",
      title: "Tentative Hold",
      description: `Hold expires at ${new Date(reservation.expires_at).toLocaleString()}`,
      start_datetime: reservation.slot_start,
      end_datetime: reservation.slot_end,
      status: "pending",
      color: "#fbbf24", // Yellow
      is_all_day: false
    });

    // Update reservation with calendar event ID
    await Reservation.update(reservation.id, {
      enabler_calendar_event_id: calendarEvent.id
    });

    return calendarEvent;
  },

  /**
   * Create a booking from an accepted offer
   */
  async createBookingFromOffer(offer) {
    // Create the booking
    const booking = await Booking.create({
      event_id: offer.event_id,
      enabler_id: offer.enabler_id,
      package_id: offer.package_id,
      total_amount: offer.counter_offer_amount || offer.offered_amount,
      status: "confirmed",
      payment_status: "pending"
    });

    // Create calendar event
    await this.ensureBookingHasCalendarEvent(booking);

    // Update offer with booking reference
    await BookingOffer.update(offer.id, {
      booking_id: booking.id
    });

    return booking;
  },

  /**
   * Clean up calendar events that don't have corresponding bookings
   */
  async cleanupOrphanedEvents(enablerId) {
    const calendarEvents = await CalendarEvent.filter({ enabler_id: enablerId });
    let cleaned = 0;

    for (const event of calendarEvents) {
      if (!event.booking_id) continue;

      // Check if booking exists
      const bookings = await Booking.filter({ id: event.booking_id });
      const reservations = await Reservation.filter({ id: event.booking_id });

      if (bookings.length === 0 && reservations.length === 0) {
        // Orphaned event - mark as cancelled instead of deleting
        await CalendarEvent.update(event.id, {
          status: "cancelled",
          description: (event.description || "") + " [Booking not found]"
        });
        cleaned++;
      }
    }

    return cleaned;
  },

  /**
   * Get calendar status from booking status
   */
  getCalendarStatus(bookingStatus) {
    const statusMap = {
      pending: "pending",
      confirmed: "confirmed",
      completed: "completed",
      cancelled: "cancelled",
      in_progress: "in_progress"
    };

    return statusMap[bookingStatus] || "pending";
  },

  /**
   * Get color for booking status
   */
  getColorForStatus(status) {
    const colorMap = {
      pending: "#fbbf24",      // Yellow
      confirmed: "#10b981",    // Green
      completed: "#6b7280",    // Gray
      cancelled: "#ef4444",    // Red
      in_progress: "#8b5cf6"   // Purple
    };

    return colorMap[status] || "#3b82f6"; // Default blue
  },

  /**
   * Full calendar refresh for an enabler
   */
  async refreshCalendar(enablerId) {
    console.log(`[CalendarSync] Starting full refresh for enabler: ${enablerId}`);
    
    const result = await this.syncAllBookingsToCalendar(enablerId);
    
    console.log(`[CalendarSync] Refresh complete:`, result);
    
    return result;
  },

  /**
   * Sync calendar when a booking is created/updated
   */
  async onBookingChange(booking) {
    try {
      await this.ensureBookingHasCalendarEvent(booking);
      return { success: true };
    } catch (error) {
      console.error("Error syncing booking to calendar:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync calendar when a reservation is created/updated
   */
  async onReservationChange(reservation) {
    try {
      await this.ensureReservationHasCalendarEvent(reservation);
      return { success: true };
    } catch (error) {
      console.error("Error syncing reservation to calendar:", error);
      return { success: false, error: error.message };
    }
  }
};

export default CalendarSyncService;