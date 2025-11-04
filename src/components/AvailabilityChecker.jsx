import { Booking, Reservation, CalendarEvent, Event } from "@/api/entities";
import { parseISO, isWithinInterval, addHours, addMinutes } from "date-fns";

export const AvailabilityChecker = {
  /**
   * Check if enabler is available for a specific date/time
   */
  async checkAvailability(enablerId, eventDate, durationHours = 4) {
    try {
      const startDate = parseISO(eventDate);
      const endDate = addHours(startDate, durationHours);

      // 1. Check confirmed bookings
      const confirmedBookings = await Booking.filter({
        enabler_id: enablerId,
        status: ["confirmed", "in_progress"]
      });

      for (const booking of confirmedBookings) {
        if (booking.event_id) {
          const events = await Event.filter({ id: booking.event_id });
          if (events[0] && events[0].date) {
            const bookingDate = parseISO(events[0].date);
            const bookingEnd = addHours(bookingDate, 4); // Default 4 hours

            if (this.datesOverlap(startDate, endDate, bookingDate, bookingEnd)) {
              return {
                available: false,
                reason: "Already booked for this time",
                conflict: {
                  type: "booking",
                  id: booking.id,
                  date: events[0].date
                }
              };
            }
          }
        }
      }

      // 2. Check active reservation holds
      const activeHolds = await Reservation.filter({
        enabler_id: enablerId,
        status: ["HOLD", "CONFIRMED"]
      });

      for (const hold of activeHolds) {
        const holdStart = parseISO(hold.slot_start);
        const holdEnd = parseISO(hold.slot_end);

        if (this.datesOverlap(startDate, endDate, holdStart, holdEnd)) {
          return {
            available: false,
            reason: "Time slot temporarily held by another booking",
            conflict: {
              type: "reservation",
              id: hold.id,
              expires_at: hold.expires_at
            }
          };
        }
      }

      // 3. Check calendar events (blocked time)
      const calendarEvents = await CalendarEvent.filter({
        enabler_id: enablerId,
        status: ["confirmed", "pending"]
      });

      for (const event of calendarEvents) {
        const eventStart = parseISO(event.start_datetime);
        const eventEnd = parseISO(event.end_datetime);

        if (this.datesOverlap(startDate, endDate, eventStart, eventEnd)) {
          return {
            available: false,
            reason: "Enabler has another commitment at this time",
            conflict: {
              type: "calendar_event",
              id: event.id,
              title: event.title
            }
          };
        }
      }

      return {
        available: true,
        reason: "Time slot is available"
      };

    } catch (error) {
      console.error("Error checking availability:", error);
      return {
        available: false,
        reason: "Unable to verify availability",
        error: error.message
      };
    }
  },

  /**
   * Check if two date ranges overlap
   */
  datesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  },

  /**
   * Get all unavailable dates for an enabler
   */
  async getUnavailableDates(enablerId, startDate, endDate) {
    const unavailableDates = [];

    // Check bookings
    const bookings = await Booking.filter({
      enabler_id: enablerId,
      status: ["confirmed", "in_progress"]
    });

    for (const booking of bookings) {
      if (booking.event_id) {
        const events = await Event.filter({ id: booking.event_id });
        if (events[0] && events[0].date) {
          const bookingDate = parseISO(events[0].date);
          if (isWithinInterval(bookingDate, { start: parseISO(startDate), end: parseISO(endDate) })) {
            unavailableDates.push({
              date: events[0].date,
              type: "booking",
              reason: "Booked"
            });
          }
        }
      }
    }

    return unavailableDates;
  }
};

export default AvailabilityChecker;