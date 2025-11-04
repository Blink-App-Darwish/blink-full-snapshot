/**
 * Automation Engine
 * Handles automatic entity linking and business logic triggers
 */

import { 
  Event, 
  EventTimeline, 
  Reservation, 
  ReservationAuditLog, 
  Booking,
  FinancialEntry,
  Enabler,
  SystemNotification,
  User,
  CalendarEvent,
  EnablerFinance
} from "@/api/entities";
import { addMinutes, addHours } from "date-fns";

class AutomationEngine {
  /**
   * AUTO-GENERATE EVENT TIMELINE
   * Creates initial timeline structure when event is created
   */
  async generateEventTimeline(eventId, hostId, bookings = []) {
    try {
      // Check if timeline already exists
      const existing = await EventTimeline.filter({ event_id: eventId });
      if (existing.length > 0) {
        console.log("Timeline already exists for event:", eventId);
        return existing[0];
      }

      const event = await Event.filter({ id: eventId });
      if (!event[0]) {
        throw new Error("Event not found");
      }

      const eventData = event[0];
      const eventStart = eventData.date ? new Date(eventData.date) : new Date();
      
      // Create timeline items from bookings
      const timelineItems = [];
      let currentTime = new Date(eventStart);
      
      for (const booking of bookings) {
        try {
          const enabler = await Enabler.filter({ id: booking.enabler_id });
          if (!enabler[0]) continue;

          const serviceStart = new Date(currentTime);
          const serviceEnd = addHours(serviceStart, 2); // Default 2 hour service
          const setupStart = addMinutes(serviceStart, -30);
          const teardownEnd = addMinutes(serviceEnd, 30);

          timelineItems.push({
            id: `timeline_${booking.id}`,
            enabler_id: booking.enabler_id,
            enabler_name: enabler[0].business_name,
            service_type: enabler[0].category,
            scheduled_start: serviceStart.toISOString(),
            scheduled_end: serviceEnd.toISOString(),
            setup_start: setupStart.toISOString(),
            setup_end: serviceStart.toISOString(),
            teardown_start: serviceEnd.toISOString(),
            teardown_end: teardownEnd.toISOString(),
            status: "scheduled",
            color: this._getCategoryColor(enabler[0].category),
            dependencies: []
          });

          // Move time forward for next service
          currentTime = teardownEnd;
        } catch (error) {
          console.error("Error adding timeline item:", error);
        }
      }

      // Create timeline record
      const timeline = await EventTimeline.create({
        event_id: eventId,
        host_id: hostId,
        timeline_items: timelineItems,
        ai_optimized: false,
        conflict_warnings: [],
        optimization_suggestions: []
      });

      console.log("✅ Event timeline generated:", timeline.id);
      return timeline;

    } catch (error) {
      console.error("Error generating event timeline:", error);
      throw error;
    }
  }

  /**
   * LOG RESERVATION STATE CHANGES
   * Automatically logs all reservation state transitions
   */
  async logReservationStateChange(reservationId, action, statusBefore, statusAfter, actor, details = {}) {
    try {
      await ReservationAuditLog.create({
        reservation_id: reservationId,
        timestamp: new Date().toISOString(),
        action,
        status_before: statusBefore,
        status_after: statusAfter,
        actor: actor || "SYSTEM",
        details,
        ip_address: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });

      console.log(`📝 Logged reservation action: ${action} for ${reservationId}`);
    } catch (error) {
      console.error("Error logging reservation state change:", error);
    }
  }

  /**
   * CREATE FINANCE ENTRY ON CONFIRMED BOOKING
   * Automatically creates financial records when booking is confirmed
   */
  async createFinanceEntryFromBooking(bookingId) {
    try {
      const booking = await Booking.filter({ id: bookingId });
      if (!booking[0]) {
        throw new Error("Booking not found");
      }

      const bookingData = booking[0];
      const event = await Event.filter({ id: bookingData.event_id });
      const eventData = event[0];

      // Create entry for host (expense)
      await FinancialEntry.create({
        user_id: eventData.host_id,
        event_id: bookingData.event_id,
        event_name: eventData.name,
        entry_type: "expense",
        category: this._getCategoryFromBooking(bookingData),
        vendor_name: await this._getEnablerName(bookingData.enabler_id),
        description: `Booking confirmed for ${eventData.name}`,
        amount: bookingData.total_amount,
        currency: "USD",
        payment_method: "credit_card",
        payment_status: bookingData.payment_status === "paid" ? "paid" : "pending",
        due_date: eventData.date,
        tags: ["booking", bookingData.status]
      });

      // Create entry for enabler (income)
      const enabler = await Enabler.filter({ id: bookingData.enabler_id });
      if (enabler[0]) {
        await EnablerFinance.create({
          enabler_id: bookingData.enabler_id,
          booking_id: bookingId,
          transaction_type: "income",
          amount: bookingData.total_amount,
          description: `Booking confirmed: ${eventData.name}`,
          payment_status: bookingData.payment_status === "paid" ? "received" : "pending",
          payment_date: bookingData.payment_status === "paid" ? new Date().toISOString() : null
        });
      }

      console.log("💰 Finance entries created for booking:", bookingId);
    } catch (error) {
      console.error("Error creating finance entry:", error);
    }
  }

  /**
   * TRIGGER WELCOME NOTIFICATIONS ON NEW ENABLER PROFILE
   * Sends welcome notifications and setup guidance to new enablers
   */
  async triggerWelcomeNotifications(enablerId, userId) {
    try {
      const enabler = await Enabler.filter({ id: enablerId });
      if (!enabler[0]) return;

      const enablerData = enabler[0];

      // Welcome notification
      await SystemNotification.create({
        user_id: userId,
        notification_type: "profile_update",
        title: `Welcome to Blink, ${enablerData.business_name}! 🎉`,
        message: "Your profile has been created successfully. Complete the next steps to start receiving bookings.",
        related_enabler_id: enablerId,
        action_required: true,
        action_url: "/EnablerShop",
        priority: "high"
      });

      // Setup guidance notifications
      const setupSteps = [
        {
          title: "📦 Create Your First Package",
          message: "Add service packages to let clients know what you offer and at what price.",
          action_url: "/SmartPackageCreator"
        },
        {
          title: "📸 Build Your Portfolio",
          message: "Upload photos of your previous work to showcase your expertise.",
          action_url: "/PortfolioCreator"
        },
        {
          title: "📅 Set Up Your Calendar",
          message: "Configure your availability so clients can book you at the right times.",
          action_url: "/CalendarSetupWizard"
        }
      ];

      for (let i = 0; i < setupSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Stagger notifications
        await SystemNotification.create({
          user_id: userId,
          notification_type: "profile_update",
          title: setupSteps[i].title,
          message: setupSteps[i].message,
          related_enabler_id: enablerId,
          action_required: true,
          action_url: setupSteps[i].action_url,
          priority: "medium"
        });
      }

      console.log("✅ Welcome notifications sent to enabler:", enablerId);
    } catch (error) {
      console.error("Error sending welcome notifications:", error);
    }
  }

  /**
   * SYNC CALENDAR EVENTS FROM BOOKINGS
   * Creates calendar events when bookings are confirmed
   */
  async syncCalendarFromBooking(bookingId) {
    try {
      const booking = await Booking.filter({ id: bookingId });
      if (!booking[0] || booking[0].status !== "confirmed") return;

      const bookingData = booking[0];
      const event = await Event.filter({ id: bookingData.event_id });
      if (!event[0]) return;

      const eventData = event[0];
      const eventStart = eventData.date ? new Date(eventData.date) : new Date();
      const eventEnd = addHours(eventStart, 4); // Default 4 hour event

      // Create calendar event for enabler
      const calendarEvent = await CalendarEvent.create({
        enabler_id: bookingData.enabler_id,
        event_id: bookingData.event_id,
        booking_id: bookingId,
        event_type: "booking",
        title: `${eventData.name} - ${eventData.type}`,
        description: `Booking confirmed for ${eventData.name}`,
        start_datetime: eventStart.toISOString(),
        end_datetime: eventEnd.toISOString(),
        setup_duration_minutes: 30,
        teardown_duration_minutes: 30,
        location: eventData.location || "",
        status: "confirmed",
        color: "#10b981",
        timezone: "UTC"
      });

      // Update booking with calendar event ID
      await Booking.update(bookingId, {
        calendar_event_id: calendarEvent.id
      });

      console.log("📅 Calendar event synced for booking:", bookingId);
    } catch (error) {
      console.error("Error syncing calendar:", error);
    }
  }

  /**
   * SEND BOOKING CONFIRMATION NOTIFICATIONS
   * Notifies both host and enabler when booking is confirmed
   */
  async sendBookingConfirmationNotifications(bookingId) {
    try {
      const booking = await Booking.filter({ id: bookingId });
      if (!booking[0]) return;

      const bookingData = booking[0];
      const event = await Event.filter({ id: bookingData.event_id });
      const eventData = event[0];
      const enabler = await Enabler.filter({ id: bookingData.enabler_id });
      const enablerData = enabler[0];

      // Notify host
      await SystemNotification.create({
        user_id: eventData.host_id,
        notification_type: "booking_confirmed",
        title: "Booking Confirmed! 🎉",
        message: `${enablerData.business_name} is now confirmed for ${eventData.name}`,
        related_event_id: bookingData.event_id,
        related_booking_id: bookingId,
        related_enabler_id: bookingData.enabler_id,
        action_required: false,
        action_url: `/EventDetail?id=${bookingData.event_id}`,
        priority: "high"
      });

      // Notify enabler
      await SystemNotification.create({
        user_id: enablerData.user_id,
        notification_type: "booking_confirmed",
        title: "New Booking Confirmed! 💼",
        message: `You're booked for ${eventData.name} on ${eventData.date ? new Date(eventData.date).toLocaleDateString() : 'TBD'}`,
        related_event_id: bookingData.event_id,
        related_booking_id: bookingId,
        related_enabler_id: bookingData.enabler_id,
        action_required: true,
        action_url: "/EnablerBookings",
        priority: "high"
      });

      console.log("📧 Confirmation notifications sent for booking:", bookingId);
    } catch (error) {
      console.error("Error sending confirmation notifications:", error);
    }
  }

  // Helper methods
  _getCategoryColor(category) {
    const colors = {
      event_planner: "#8B5CF6",
      beauty_specialist: "#EC4899",
      photographer: "#3B82F6",
      videographer: "#6366F1",
      musician: "#F59E0B",
      dj: "#EF4444",
      venue: "#10B981",
      caterer: "#F97316",
      florist: "#EC4899",
      decorator: "#A855F7",
      audio_visual: "#06B6D4",
      speaker: "#14B8A6",
      influencer: "#F43F5E"
    };
    return colors[category] || "#6B7280";
  }

  _getCategoryFromBooking(booking) {
    return "event_services"; // Simplified, could map enabler category
  }

  async _getEnablerName(enablerId) {
    try {
      const enabler = await Enabler.filter({ id: enablerId });
      return enabler[0]?.business_name || "Unknown Vendor";
    } catch {
      return "Unknown Vendor";
    }
  }
}

// Export singleton instance
const automationEngine = new AutomationEngine();
export default automationEngine;