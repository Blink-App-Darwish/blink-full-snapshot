
import { Reservation, ReservationAuditLog, ReservationWaitlist, ReservationMetrics, CalendarEvent, Booking, User, Enabler, SystemNotification } from "@/api/entities";
import { addMinutes, addSeconds, isPast, parseISO } from "date-fns";

// Generate unique tokens
const generateToken = () => {
  return `hold_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

const generateLockKey = (enablerId, slotStart) => {
  return `enabler:${enablerId}:slot:${new Date(slotStart).getTime()}`;
};

export const ReservationService = {
  /**
   * Create a tentative hold with pre-authorization
   */
  async createHold(data) {
    const {
      enabler_id,
      host_id,
      event_id,
      package_id,
      slot_start,
      slot_end,
      require_payment = true,
      amount = 0,
      card_token = null,
      auto_extend = false,
      idempotency_key = null
    } = data;

    // Check for idempotency
    if (idempotency_key) {
      const existing = await Reservation.filter({ idempotency_key });
      if (existing[0]) {
        return { success: true, reservation: existing[0], duplicate: true };
      }
    }

    const hold_token = generateToken();
    const lock_key = generateLockKey(enabler_id, slot_start);
    const expires_at = addMinutes(new Date(), 20).toISOString();

    try {
      // Check for conflicts
      const conflicts = await this.checkSlotConflicts(enabler_id, slot_start, slot_end);
      if (conflicts.length > 0) {
        await this.logAction({
          reservation_id: "N/A",
          action: "ERROR",
          details: { error: "Slot conflict detected", conflicts }
        });
        return { success: false, error: "SLOT_CONFLICT", conflicts };
      }

      // Create reservation in HOLD status
      const reservationData = {
        enabler_id,
        host_id,
        event_id,
        package_id,
        status: "HOLD",
        hold_token,
        lock_key,
        expires_at,
        slot_start,
        slot_end,
        preauth_status: require_payment ? "PENDING" : "NOT_REQUIRED",
        preauth_amount: amount,
        auto_extend_enabled: auto_extend,
        extensions_used: 0,
        max_extensions: 1,
        idempotency_key
      };

      const reservation = await Reservation.create(reservationData);

      // Log hold creation
      await this.logAction({
        reservation_id: reservation.id,
        action: "HOLD_CREATED",
        status_after: "HOLD",
        actor: host_id,
        details: { slot_start, slot_end, amount, require_payment }
      });

      // Attempt pre-authorization if payment required
      let preauthResult = { success: true };
      if (require_payment && card_token) {
        preauthResult = await this.attemptPreAuthorization(reservation.id, amount, card_token);
      }

      // Create tentative calendar events
      await this.createTentativeCalendarEvents(reservation);

      // Update metrics
      await this.updateMetrics("total_holds_created");

      return {
        success: true,
        reservation,
        preauth_success: preauthResult.success,
        preauth_message: preauthResult.message
      };

    } catch (error) {
      console.error("Error creating hold:", error);
      await this.logAction({
        reservation_id: "N/A",
        action: "ERROR",
        details: { error: error.message, stack: error.stack }
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Update reservation data
   */
  async updateReservation(reservationId, updates) {
    try {
      await Reservation.update(reservationId, updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating reservation:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check for slot conflicts
   */
  async checkSlotConflicts(enablerId, slotStart, slotEnd) {
    const conflicts = [];

    // Check existing reservations
    const existingReservations = await Reservation.filter({
      enabler_id: enablerId,
      status: ["HOLD", "CONFIRMED"]
    });

    for (const res of existingReservations) {
      const resStart = new Date(res.slot_start);
      const resEnd = new Date(res.slot_end);
      const newStart = new Date(slotStart);
      const newEnd = new Date(slotEnd);

      // Check overlap
      if (newStart < resEnd && newEnd > resStart) {
        conflicts.push({
          reservation_id: res.id,
          status: res.status,
          slot_start: res.slot_start,
          slot_end: res.slot_end
        });
      }
    }

    return conflicts;
  },

  /**
   * Attempt payment pre-authorization
   */
  async attemptPreAuthorization(reservationId, amount, cardToken) {
    try {
      await this.logAction({
        reservation_id: reservationId,
        action: "PREAUTH_ATTEMPTED",
        details: { amount, card_token_last4: cardToken?.slice(-4) }
      });

      // Simulate pre-auth (integrate with Stripe/payment provider)
      const preauth_id = `preauth_${Date.now()}`;
      
      // In real implementation, call payment API here
      // const result = await stripe.paymentIntents.create({...})
      
      await Reservation.update(reservationId, {
        preauth_id,
        preauth_status: "AUTHORIZED"
      });

      await this.logAction({
        reservation_id: reservationId,
        action: "PREAUTH_SUCCESS",
        details: { preauth_id, amount }
      });

      await this.updateMetrics("preauth_success_rate");

      return { success: true, preauth_id };

    } catch (error) {
      await Reservation.update(reservationId, {
        preauth_status: "FAILED"
      });

      await this.logAction({
        reservation_id: reservationId,
        action: "PREAUTH_FAILED",
        error_message: error.message,
        details: { amount }
      });

      await this.updateMetrics("failed_preauths");

      return { success: false, message: error.message };
    }
  },

  /**
   * Create tentative calendar events
   */
  async createTentativeCalendarEvents(reservation) {
    try {
      // Create enabler calendar event
      const enablerEvent = await CalendarEvent.create({
        enabler_id: reservation.enabler_id,
        booking_id: reservation.id,
        event_type: "booking",
        title: "Tentative Hold",
        description: `Temporary hold - expires at ${new Date(reservation.expires_at).toLocaleString()}`,
        start_datetime: reservation.slot_start,
        end_datetime: reservation.slot_end,
        status: "pending",
        color: "#fbbf24", // Yellow for tentative
        is_all_day: false
      });

      await Reservation.update(reservation.id, {
        enabler_calendar_event_id: enablerEvent.id
      });

      await this.logAction({
        reservation_id: reservation.id,
        action: "CALENDAR_SYNCED",
        details: { calendar_event_id: enablerEvent.id }
      });

      return { success: true, event_id: enablerEvent.id };

    } catch (error) {
      await this.logAction({
        reservation_id: reservation.id,
        action: "CALENDAR_SYNC_FAILED",
        error_message: error.message
      });

      await this.updateMetrics("calendar_sync_failures");

      return { success: false, error: error.message };
    }
  },

  /**
   * Handle contract signing webhook (idempotent)
   */
  async handleContractSigned(webhookData) {
    const {
      reservation_id,
      hold_token,
      signature_id,
      idempotency_key
    } = webhookData;

    try {
      // Check idempotency
      const existingLog = await ReservationAuditLog.filter({
        reservation_id,
        action: "CONTRACT_SIGNED",
        details: { signature_id }
      });

      if (existingLog[0]) {
        return { success: true, duplicate: true, message: "Webhook already processed" };
      }

      // Get reservation
      const reservations = await Reservation.filter({ id: reservation_id });
      const reservation = reservations[0];

      if (!reservation) {
        return { success: false, error: "Reservation not found" };
      }

      // Verify hold token
      if (reservation.hold_token !== hold_token) {
        return { success: false, error: "Invalid hold token" };
      }

      // Check expiry
      if (isPast(parseISO(reservation.expires_at))) {
        await this.expireHold(reservation_id);
        return { success: false, error: "Hold expired" };
      }

      // Verify pre-auth if required
      if (reservation.preauth_amount > 0 && reservation.preauth_status !== "AUTHORIZED") {
        return { success: false, error: "Pre-authorization not completed" };
      }

      // Capture payment
      if (reservation.preauth_id && !reservation.payment_captured) {
        const captureResult = await this.capturePayment(reservation_id);
        if (!captureResult.success) {
          return { success: false, error: "Payment capture failed" };
        }
      }

      // Confirm reservation
      await Reservation.update(reservation_id, {
        status: "CONFIRMED",
        confirmed_at: new Date().toISOString(),
        signature_id
      });

      // Create actual booking
      const booking = await Booking.create({
        event_id: reservation.event_id,
        enabler_id: reservation.enabler_id,
        package_id: reservation.package_id,
        status: "confirmed",
        total_amount: reservation.preauth_amount || 0,
        payment_status: reservation.payment_captured ? "paid" : "pending"
      });

      await Reservation.update(reservation_id, {
        booking_id: booking.id
      });

      // Update calendar events to confirmed
      await this.confirmCalendarEvents(reservation_id);

      // Log contract signing
      await this.logAction({
        reservation_id,
        action: "CONTRACT_SIGNED",
        status_before: "HOLD",
        status_after: "CONFIRMED",
        actor: reservation.host_id,
        details: { signature_id, booking_id: booking.id }
      });

      await this.logAction({
        reservation_id,
        action: "CONFIRMED",
        status_before: "HOLD",
        status_after: "CONFIRMED",
        actor: "SYSTEM",
        details: { signature_id, booking_id: booking.id }
      });

      // Send notifications
      await this.sendConfirmationNotifications(reservation_id);

      // Update metrics
      await this.updateMetrics("holds_confirmed");

      return { success: true, reservation_id, booking_id: booking.id };

    } catch (error) {
      console.error("Error handling contract signature:", error);
      await this.logAction({
        reservation_id,
        action: "ERROR",
        error_message: error.message,
        details: { webhook_data: webhookData }
      });

      await this.updateMetrics("webhook_failures");

      return { success: false, error: error.message };
    }
  },

  /**
   * Capture payment
   */
  async capturePayment(reservationId) {
    try {
      const reservations = await Reservation.filter({ id: reservationId });
      const reservation = reservations[0];

      if (!reservation.preauth_id) {
        return { success: false, error: "No pre-authorization found" };
      }

      // Simulate payment capture (integrate with payment provider)
      const payment_id = `payment_${Date.now()}`;

      await Reservation.update(reservationId, {
        payment_id,
        payment_captured: true,
        preauth_status: "CAPTURED"
      });

      await this.logAction({
        reservation_id: reservationId,
        action: "PAYMENT_CAPTURED",
        details: { payment_id, amount: reservation.preauth_amount }
      });

      return { success: true, payment_id };

    } catch (error) {
      await this.logAction({
        reservation_id: reservationId,
        action: "ERROR",
        error_message: `Payment capture failed: ${error.message}`
      });

      return { success: false, error: error.message };
    }
  },

  /**
   * Confirm calendar events
   */
  async confirmCalendarEvents(reservationId) {
    try {
      const reservations = await Reservation.filter({ id: reservationId });
      const reservation = reservations[0];

      if (reservation.enabler_calendar_event_id) {
        await CalendarEvent.update(reservation.enabler_calendar_event_id, {
          status: "confirmed",
          title: "Confirmed Booking",
          color: "#10b981" // Green for confirmed
        });
      }

      return { success: true };

    } catch (error) {
      console.error("Error confirming calendar events:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send confirmation notifications
   */
  async sendConfirmationNotifications(reservationId) {
    try {
      const reservations = await Reservation.filter({ id: reservationId });
      const reservation = reservations[0];

      // Notify enabler
      await SystemNotification.create({
        user_id: reservation.enabler_id,
        notification_type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking for ${new Date(reservation.slot_start).toLocaleString()} has been confirmed`,
        read: false,
        priority: "high"
      });

      // Notify host
      await SystemNotification.create({
        user_id: reservation.host_id,
        notification_type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking is confirmed for ${new Date(reservation.slot_start).toLocaleString()}`,
        read: false,
        priority: "high"
      });

      return { success: true };

    } catch (error) {
      console.error("Error sending notifications:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Extend hold (if allowed)
   */
  async extendHold(reservationId, userId) {
    try {
      const reservations = await Reservation.filter({ id: reservationId });
      const reservation = reservations[0];

      if (!reservation) {
        return { success: false, error: "Reservation not found" };
      }

      // Check permissions
      if (reservation.host_id !== userId) {
        return { success: false, error: "Unauthorized" };
      }

      // Check if already confirmed or expired
      if (reservation.status !== "HOLD") {
        return { success: false, error: "Cannot extend non-HOLD reservation" };
      }

      // Check extension limit
      if (reservation.extensions_used >= reservation.max_extensions) {
        return { success: false, error: "Maximum extensions reached" };
      }

      // Check pre-auth
      if (reservation.preauth_status !== "AUTHORIZED" && reservation.preauth_amount > 0) {
        return { success: false, error: "Pre-authorization required for extension" };
      }

      // Extend by 10 minutes
      const new_expires_at = addMinutes(new Date(reservation.expires_at), 10).toISOString();

      await Reservation.update(reservationId, {
        expires_at: new_expires_at,
        extensions_used: reservation.extensions_used + 1
      });

      await this.logAction({
        reservation_id: reservationId,
        action: "HOLD_EXTENDED",
        actor: userId,
        details: { 
          new_expires_at,
          extensions_used: reservation.extensions_used + 1
        }
      });

      return { success: true, new_expires_at };

    } catch (error) {
      console.error("Error extending hold:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Expire hold and handle cleanup
   */
  async expireHold(reservationId) {
    try {
      const reservations = await Reservation.filter({ id: reservationId });
      const reservation = reservations[0];

      if (reservation.status !== "HOLD") {
        return { success: false, error: "Already processed" };
      }

      // Update status
      await Reservation.update(reservationId, {
        status: "EXPIRED"
      });

      // Cancel calendar events
      if (reservation.enabler_calendar_event_id) {
        try {
          await CalendarEvent.update(reservation.enabler_calendar_event_id, {
            status: "cancelled"
          });
        } catch (error) {
          console.warn("Failed to cancel calendar event:", error);
        }
      }

      // Release pre-authorization
      if (reservation.preauth_id && reservation.preauth_status === "AUTHORIZED") {
        await Reservation.update(reservationId, {
          preauth_status: "RELEASED"
        });
      }

      await this.logAction({
        reservation_id: reservationId,
        action: "EXPIRED",
        status_before: "HOLD",
        status_after: "EXPIRED",
        actor: "SYSTEM"
      });

      // Offer to waitlist
      await this.offerToWaitlist(reservation);

      // Update metrics
      await this.updateMetrics("holds_expired");

      return { success: true };

    } catch (error) {
      console.error("Error expiring hold:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Offer slot to waitlist
   */
  async offerToWaitlist(reservation) {
    try {
      const waitlistEntries = await ReservationWaitlist.filter({
        enabler_id: reservation.enabler_id,
        desired_slot_start: reservation.slot_start,
        status: "WAITING"
      }, "position");

      if (waitlistEntries[0]) {
        const entry = waitlistEntries[0];
        const offer_expires_at = addMinutes(new Date(), 10).toISOString();

        await ReservationWaitlist.update(entry.id, {
          status: "OFFERED",
          offered_at: new Date().toISOString(),
          offer_expires_at
        });

        // Send notification
        await SystemNotification.create({
          user_id: entry.host_id,
          notification_type: "booking_request",
          title: "Slot Available!",
          message: `Your requested time slot is now available. Confirm within 10 minutes!`,
          action_url: `/book?waitlist_id=${entry.id}`,
          read: false,
          priority: "urgent"
        });

        return { success: true, offered_to: entry.host_id };
      }

      return { success: true, no_waitlist: true };

    } catch (error) {
      console.error("Error offering to waitlist:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Scan and cleanup expired holds (background worker)
   */
  async cleanupExpiredHolds() {
    try {
      const now = new Date().toISOString();
      const expiredHolds = await Reservation.filter({
        status: "HOLD"
      });

      const expired = expiredHolds.filter(h => isPast(parseISO(h.expires_at)));

      for (const hold of expired) {
        await this.expireHold(hold.id);
      }

      return { success: true, expired_count: expired.length };

    } catch (error) {
      console.error("Error in cleanup worker:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Log action to audit trail
   */
  async logAction(data) {
    try {
      await ReservationAuditLog.create({
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log action:", error);
    }
  },

  /**
   * Update metrics
   */
  async updateMetrics(metricName) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();

      const existing = await ReservationMetrics.filter({
        metric_date: today,
        metric_hour: hour
      });

      if (existing[0]) {
        const updates = {};
        updates[metricName] = (existing[0][metricName] || 0) + 1;
        await ReservationMetrics.update(existing[0].id, updates);
      } else {
        const data = {
          metric_date: today,
          metric_hour: hour
        };
        data[metricName] = 1;
        await ReservationMetrics.create(data);
      }
    } catch (error) {
      console.error("Failed to update metrics:", error);
    }
  }
};

export default ReservationService;
