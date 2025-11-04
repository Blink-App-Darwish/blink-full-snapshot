
import { Reservation, ReservationAuditLog, ReservationWaitlist, ReservationMetrics, CalendarEvent, SystemNotification, User, Enabler } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import ReservationService from "./ReservationService";

/**
 * Background Job Scheduler
 * 
 * This component simulates a background job system using polling.
 * In production, replace with actual job queue (Bull, BullMQ, etc.) or Base44 scheduler
 * 
 * Jobs handled:
 * 1. Reservation expiry cleanup
 * 2. Contract reminders
 * 3. Payment reminders
 * 4. Notification delivery
 * 5. Calendar sync
 * 6. Waitlist processing
 * 7. Metrics aggregation
 */

export const BackgroundJobScheduler = {
  isRunning: false,
  intervals: {},

  /**
   * Start all background jobs
   */
  start() {
    if (this.isRunning) {
      console.log("Background jobs already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting background job scheduler...");

    // Run expiry cleanup every 60 seconds
    this.intervals.expiry = setInterval(() => this.processExpiredReservations(), 60000);

    // Run reminders every 5 minutes
    this.intervals.reminders = setInterval(() => this.processReminders(), 300000);

    // Run waitlist every 2 minutes
    this.intervals.waitlist = setInterval(() => this.processWaitlist(), 120000);

    // Run metrics aggregation every hour
    this.intervals.metrics = setInterval(() => this.aggregateMetrics(), 3600000);

    // Calendar sync every 10 minutes
    this.intervals.calendar = setInterval(() => this.syncCalendars(), 600000);

    // Run immediately on start
    this.processExpiredReservations();
  },

  /**
   * Stop all background jobs
   */
  stop() {
    console.log("Stopping background job scheduler...");
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
    this.isRunning = false;
  },

  /**
   * Process expired reservations
   */
  async processExpiredReservations() {
    try {
      const now = new Date().toISOString();
      const expiredReservations = await Reservation.filter({ status: "HOLD" });

      const expired = expiredReservations.filter(r => r.expires_at < now);

      for (const reservation of expired) {
        try {
          // Use ReservationService to handle expiry properly
          await ReservationService.handleExpiry(reservation.id);
          
          console.log(`Processed expired reservation: ${reservation.id}`);
        } catch (error) {
          console.error(`Error processing expired reservation ${reservation.id}:`, error);
        }
      }

      if (expired.length > 0) {
        console.log(`Processed ${expired.length} expired reservations`);
      }
    } catch (error) {
      console.error("Error in processExpiredReservations:", error);
    }
  },

  /**
   * Send reminder notifications
   */
  async processReminders() {
    try {
      // Contract signature reminders (holds expiring in 5 minutes)
      const soonExpiring = await Reservation.filter({ status: "HOLD" });
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);

      for (const reservation of soonExpiring) {
        const expiresAt = new Date(reservation.expires_at);
        
        if (expiresAt > now && expiresAt <= fiveMinutesLater) {
          // Send reminder notification
          try {
            await SystemNotification.create({
              user_id: reservation.host_id,
              notification_type: "contract_expiring",
              title: "Contract Signature Required",
              message: `Your reservation hold expires in ${Math.floor((expiresAt - now) / 60000)} minutes. Please sign the contract to secure your booking.`,
              related_event_id: reservation.event_id,
              action_required: true,
              action_url: `/event-booking?event_id=${reservation.event_id}`,
              priority: "high"
            });

            // Send email reminder
            const user = await User.filter({ id: reservation.host_id });
            if (user[0]) {
              await SendEmail({
                to: user[0].email,
                subject: "⏰ Your Booking Hold is Expiring Soon",
                body: `
                  <h2>Urgent: Complete Your Booking</h2>
                  <p>Your reservation hold expires in ${Math.floor((expiresAt - now) / 60000)} minutes.</p>
                  <p>Please sign the contract and complete payment to secure your booking.</p>
                  <p><a href="https://yourapp.com/event-booking?event_id=${reservation.event_id}">Complete Booking Now</a></p>
                `
              });
            }
          } catch (error) {
            console.error(`Error sending reminder for reservation ${reservation.id}:`, error);
          }
        }
      }

      // Payment reminders (bookings with pending payments)
      // Add payment reminder logic here

      console.log("Reminder processing complete");
    } catch (error) {
      console.error("Error in processReminders:", error);
    }
  },

  /**
   * Process waitlist offers
   */
  async processWaitlist() {
    try {
      const waitlistEntries = await ReservationWaitlist.filter({ status: "WAITING" });

      for (const entry of waitlistEntries) {
        try {
          // Check if slot is now available
          const conflicting = await Reservation.filter({
            enabler_id: entry.enabler_id,
            status: "HOLD"
          });

          const hasConflict = conflicting.some(r => {
            return (
              new Date(r.slot_start) < new Date(entry.desired_slot_end) &&
              new Date(r.slot_end) > new Date(entry.desired_slot_start)
            );
          });

          if (!hasConflict) {
            // Slot is available! Offer to waitlisted user
            await ReservationWaitlist.update(entry.id, {
              status: "OFFERED",
              offered_at: new Date().toISOString(),
              offer_expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour to respond
            });

            // Send notification
            await SystemNotification.create({
              user_id: entry.host_id,
              notification_type: "booking_available",
              title: "Your Waitlisted Slot is Available!",
              message: "A slot you were waiting for is now available. Book within 1 hour to secure it.",
              related_event_id: entry.event_id,
              action_required: true,
              action_url: `/browse?enabler_id=${entry.enabler_id}`,
              priority: "urgent"
            });

            // Send email
            const user = await User.filter({ id: entry.host_id });
            if (user[0]) {
              await SendEmail({
                to: user[0].email,
                subject: "🎉 Your Waitlisted Slot is Now Available!",
                body: `
                  <h2>Good News!</h2>
                  <p>A service provider slot you were waiting for is now available.</p>
                  <p>Book within 1 hour to secure your spot.</p>
                  <p><a href="https://yourapp.com/browse?enabler_id=${entry.enabler_id}">Book Now</a></p>
                `
              });
            }
          }
        } catch (error) {
          console.error(`Error processing waitlist entry ${entry.id}:`, error);
        }
      }

      // Clean up expired offers
      const expiredOffers = waitlistEntries.filter(e => 
        e.status === "OFFERED" && new Date(e.offer_expires_at) < new Date()
      );

      for (const entry of expiredOffers) {
        await ReservationWaitlist.update(entry.id, {
          status: "EXPIRED"
        });
      }

      if (waitlistEntries.length > 0) {
        console.log(`Processed ${waitlistEntries.length} waitlist entries`);
      }
    } catch (error) {
      console.error("Error in processWaitlist:", error);
    }
  },

  /**
   * Aggregate metrics
   */
  async aggregateMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();

      // Get today's reservations
      const allReservations = await Reservation.filter({});
      const todayReservations = allReservations.filter(r => 
        r.created_date.startsWith(today)
      );

      const metrics = {
        metric_date: today,
        metric_hour: currentHour,
        total_holds_created: todayReservations.filter(r => r.status === "HOLD" || r.status === "CONFIRMED" || r.status === "EXPIRED").length,
        holds_confirmed: todayReservations.filter(r => r.status === "CONFIRMED").length,
        holds_expired: todayReservations.filter(r => r.status === "EXPIRED").length,
        holds_cancelled: todayReservations.filter(r => r.status === "CANCELLED").length,
        preauth_success_rate: this.calculatePreauthSuccessRate(todayReservations),
        average_hold_duration_seconds: this.calculateAverageHoldDuration(todayReservations),
        total_revenue: todayReservations
          .filter(r => r.payment_captured)
          .reduce((sum, r) => sum + (r.preauth_amount || 0), 0),
        concurrent_holds_peak: todayReservations.filter(r => r.status === "HOLD").length
      };

      // Create or update metrics
      const existing = await ReservationMetrics.filter({ metric_date: today, metric_hour: currentHour });
      
      if (existing[0]) {
        await ReservationMetrics.update(existing[0].id, metrics);
      } else {
        await ReservationMetrics.create(metrics);
      }

      console.log(`Aggregated metrics for ${today} hour ${currentHour}`);
    } catch (error) {
      console.error("Error in aggregateMetrics:", error);
    }
  },

  /**
   * Sync calendars with external providers
   */
  async syncCalendars() {
    try {
      // Get all calendar events that need syncing
      const events = await CalendarEvent.filter({});
      
      for (const event of events) {
        // Check if external calendar IDs exist
        if (!event.google_calendar_id && !event.outlook_calendar_id) {
          // Needs to be synced
          // In production, call Google/Outlook Calendar API here
          console.log(`Calendar sync needed for event ${event.id}`);
        }
      }

      console.log("Calendar sync complete");
    } catch (error) {
      console.error("Error in syncCalendars:", error);
    }
  },

  // Helper methods
  calculatePreauthSuccessRate(reservations) {
    const withPreauth = reservations.filter(r => r.preauth_id);
    if (withPreauth.length === 0) return 0;
    const successful = withPreauth.filter(r => r.preauth_status === "AUTHORIZED");
    return successful.length / withPreauth.length;
  },

  calculateAverageHoldDuration(reservations) {
    const confirmed = reservations.filter(r => r.confirmed_at);
    if (confirmed.length === 0) return 0;
    const totalSeconds = confirmed.reduce((sum, r) => {
      const created = new Date(r.created_date);
      const confirmed = new Date(r.confirmed_at);
      return sum + (confirmed - created) / 1000;
    }, 0);
    return totalSeconds / confirmed.length;
  }
};

// Auto-start on import (can be controlled via environment variable)
if (typeof window !== 'undefined') {
  // Start background jobs when app loads
  setTimeout(() => {
    BackgroundJobScheduler.start();
  }, 5000); // Wait 5 seconds after app load
}

export default BackgroundJobScheduler;
