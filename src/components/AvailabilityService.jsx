import { CalendarEvent, AvailabilityRule, Booking, Reservation } from "@/api/entities";
import { parseISO, addDays, isWithinInterval, format, startOfDay, endOfDay, isSameDay } from "date-fns";

/**
 * AVAILABILITY SERVICE
 * Centralized service for checking enabler availability
 * Handles caching, aggregation, and privacy
 */

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const availabilityCache = new Map();

export const AvailabilityService = {
  /**
   * Get next available date for an enabler
   * Used for quick badges on cards
   */
  async getNextAvailableDate(enablerId, daysToCheck = 90) {
    const cacheKey = `next_${enablerId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const today = startOfDay(new Date());
      const endDate = addDays(today, daysToCheck);
      
      // Get all blocked dates
      const blockedDates = await this.getBlockedDates(enablerId, today, endDate);
      
      // Find first available date
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        
        if (!blockedDates.has(dateStr)) {
          const result = { date: checkDate, dateString: dateStr };
          this.setCache(cacheKey, result);
          return result;
        }
      }
      
      return null; // No availability in next 90 days
    } catch (error) {
      console.error("Error getting next available date:", error);
      return null;
    }
  },

  /**
   * Get 90-day availability summary
   * Used for full calendar views
   */
  async getAvailabilitySummary(enablerId, startDate = new Date(), days = 90) {
    const cacheKey = `summary_${enablerId}_${format(startDate, 'yyyy-MM-dd')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const start = startOfDay(startDate);
      const end = addDays(start, days);
      
      // Get all events, bookings, and blocks
      const [calendarEvents, bookings, reservations, availabilityRules] = await Promise.all([
        CalendarEvent.filter({ 
          enabler_id: enablerId,
          status: ['confirmed', 'pending', 'in_progress']
        }),
        Booking.filter({ 
          enabler_id: enablerId,
          status: ['confirmed', 'in_progress']
        }),
        Reservation.filter({ 
          enabler_id: enablerId,
          status: ['HOLD', 'CONFIRMED']
        }),
        AvailabilityRule.filter({ enabler_id: enablerId })
      ]);

      // Build availability map
      const availabilityMap = new Map();
      
      for (let i = 0; i < days; i++) {
        const currentDate = addDays(start, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        const dayStatus = this.getDayStatus(
          currentDate,
          calendarEvents,
          bookings,
          reservations,
          availabilityRules
        );
        
        availabilityMap.set(dateStr, dayStatus);
      }

      const result = {
        enablerId,
        startDate: start,
        endDate: end,
        availability: Object.fromEntries(availabilityMap),
        summary: {
          availableDays: Array.from(availabilityMap.values()).filter(s => s.status === 'available').length,
          bookedDays: Array.from(availabilityMap.values()).filter(s => s.status === 'booked').length,
          blockedDays: Array.from(availabilityMap.values()).filter(s => s.status === 'blocked').length
        }
      };

      this.setCache(cacheKey, result, CACHE_DURATION);
      return result;

    } catch (error) {
      console.error("Error getting availability summary:", error);
      return null;
    }
  },

  /**
   * Get blocked dates (booked or unavailable)
   */
  async getBlockedDates(enablerId, startDate, endDate) {
    const blockedDates = new Set();

    try {
      // Get confirmed bookings
      const bookings = await Booking.filter({ 
        enabler_id: enablerId,
        status: ['confirmed', 'in_progress']
      });

      // Get calendar events
      const calendarEvents = await CalendarEvent.filter({ 
        enabler_id: enablerId,
        status: ['confirmed', 'pending']
      });

      // Get active holds
      const reservations = await Reservation.filter({ 
        enabler_id: enablerId,
        status: ['HOLD', 'CONFIRMED']
      });

      // Add booking dates
      for (const booking of bookings) {
        // Try to get event date if linked
        if (booking.event_id) {
          try {
            const { Event } = await import("@/api/entities");
            const events = await Event.filter({ id: booking.event_id });
            if (events[0] && events[0].date) {
              const bookingDate = format(parseISO(events[0].date), 'yyyy-MM-dd');
              if (isWithinInterval(parseISO(events[0].date), { start: startDate, end: endDate })) {
                blockedDates.add(bookingDate);
              }
            }
          } catch (error) {
            console.warn("Could not load event for booking:", error);
          }
        }
      }

      // Add calendar event dates
      for (const event of calendarEvents) {
        const eventStart = parseISO(event.start_datetime);
        if (isWithinInterval(eventStart, { start: startDate, end: endDate })) {
          const eventDate = format(eventStart, 'yyyy-MM-dd');
          blockedDates.add(eventDate);
        }
      }

      // Add reservation dates
      for (const reservation of reservations) {
        const resStart = parseISO(reservation.slot_start);
        if (isWithinInterval(resStart, { start: startDate, end: endDate })) {
          const resDate = format(resStart, 'yyyy-MM-dd');
          blockedDates.add(resDate);
        }
      }

      return blockedDates;

    } catch (error) {
      console.error("Error getting blocked dates:", error);
      return blockedDates;
    }
  },

  /**
   * Determine status for a specific day
   */
  getDayStatus(date, calendarEvents, bookings, reservations, availabilityRules) {
    // Check if date has any bookings
    const hasBooking = calendarEvents.some(event => {
      const eventDate = parseISO(event.start_datetime);
      return isSameDay(eventDate, date) && 
             ['confirmed', 'in_progress'].includes(event.status);
    });

    if (hasBooking) {
      return { 
        status: 'booked',
        reason: 'Confirmed booking',
        canBook: false
      };
    }

    // Check if date has active hold
    const hasHold = reservations.some(res => {
      const resDate = parseISO(res.slot_start);
      return isSameDay(resDate, date) && 
             ['HOLD', 'CONFIRMED'].includes(res.status);
    });

    if (hasHold) {
      return { 
        status: 'booked',
        reason: 'Time slot held',
        canBook: false
      };
    }

    // Check if date is blocked by calendar event
    const isBlocked = calendarEvents.some(event => {
      const eventDate = parseISO(event.start_datetime);
      return isSameDay(eventDate, date) && 
             event.event_type === 'unavailable';
    });

    if (isBlocked) {
      return { 
        status: 'blocked',
        reason: 'Unavailable',
        canBook: false
      };
    }

    // Check availability rules (basic check - can be enhanced)
    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const hasWorkingHours = availabilityRules.some(rule => 
      rule.is_available && 
      rule.day_of_week && 
      rule.day_of_week.includes(dayOfWeek)
    );

    // If no specific rules, assume available
    return { 
      status: 'available',
      reason: hasWorkingHours ? 'Available' : 'Available (check with provider)',
      canBook: true
    };
  },

  /**
   * Check if specific date/time is available
   */
  async isDateAvailable(enablerId, date) {
    try {
      const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
      const start = startOfDay(date);
      const end = endOfDay(date);

      const blockedDates = await this.getBlockedDates(enablerId, start, end);
      return !blockedDates.has(dateStr);

    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    }
  },

  /**
   * Invalidate cache for enabler (call after booking)
   */
  invalidateCache(enablerId) {
    const keysToDelete = [];
    for (const key of availabilityCache.keys()) {
      if (key.includes(enablerId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => availabilityCache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for ${enablerId}`);
  },

  /**
   * Cache helpers
   */
  getFromCache(key) {
    const cached = availabilityCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      availabilityCache.delete(key);
      return null;
    }

    console.log(`✅ Cache hit: ${key} (${Math.round(age / 1000)}s old)`);
    return cached.data;
  },

  setCache(key, data, duration = CACHE_DURATION) {
    availabilityCache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
    console.log(`💾 Cached: ${key}`);
  },

  clearCache() {
    availabilityCache.clear();
    console.log('🗑️ Cleared all availability cache');
  }
};

export default AvailabilityService;