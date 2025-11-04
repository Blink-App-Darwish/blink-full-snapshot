import { base44 } from "@/api/base44Client";
import ABE from "./ABEEngine";

/**
 * Booking Confirmation Handler
 * Orchestrates the booking confirmation process and triggers ABE
 */

export class BookingConfirmationHandler {
  /**
   * Main entry point for booking confirmation
   * Called after payment success or booking acceptance
   */
  static async confirmBooking(bookingId, paymentData = null) {
    console.log(`🎯 Starting booking confirmation for: ${bookingId}`);
    
    try {
      const { Booking, Reservation } = await import("@/api/entities");

      // Step 1: Validate booking exists
      const booking = await Booking.filter({ id: bookingId }).then(b => b[0]);
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Step 2: Check if already confirmed
      if (booking.status === "confirmed") {
        console.log("⚠️ Booking already confirmed, skipping ABE execution");
        return {
          success: true,
          already_confirmed: true,
          booking_id: bookingId
        };
      }

      // Step 3: Update booking status
      await Booking.update(bookingId, {
        status: "confirmed",
        payment_status: paymentData ? "paid" : "partial"
      });

      console.log("✅ Booking status updated to confirmed");

      // Step 4: Update reservation if exists
      const reservations = await Reservation.filter({ booking_id: bookingId });
      if (reservations[0]) {
        await Reservation.update(reservations[0].id, {
          status: "CONFIRMED",
          confirmed_at: new Date().toISOString(),
          payment_captured: !!paymentData
        });
        console.log("✅ Reservation status updated");
      }

      // Step 5: Execute ABE Engine
      console.log("🚀 Triggering After Booking Engine (ABE)...");
      
      const abeResult = await ABE.execute(bookingId, {
        payment_data: paymentData,
        confirmation_timestamp: new Date().toISOString()
      });

      console.log("✅ ABE execution completed:", abeResult);

      // Step 6: Log execution
      await this.logConfirmation(bookingId, abeResult, paymentData);

      return {
        success: true,
        booking_id: bookingId,
        abe_result: abeResult,
        workflow_created: true
      };

    } catch (error) {
      console.error("❌ Booking confirmation failed:", error);

      // Rollback booking status if ABE failed
      try {
        const { Booking } = await import("@/api/entities");
        await Booking.update(bookingId, {
          status: "pending",
          payment_status: "pending"
        });
        console.log("🔄 Booking status rolled back to pending");
      } catch (rollbackError) {
        console.error("Failed to rollback booking:", rollbackError);
      }

      // Log error
      await this.logError(bookingId, error);

      throw error;
    }
  }

  /**
   * Handle payment success webhook/callback
   */
  static async handlePaymentSuccess(paymentIntentId, bookingId) {
    console.log(`💳 Payment success for booking: ${bookingId}`);

    try {
      const paymentData = {
        payment_intent_id: paymentIntentId,
        payment_method: "stripe",
        paid_at: new Date().toISOString()
      };

      return await this.confirmBooking(bookingId, paymentData);

    } catch (error) {
      console.error("Error handling payment success:", error);
      throw error;
    }
  }

  /**
   * Handle direct booking confirmation (no payment yet)
   */
  static async handleDirectConfirmation(bookingId) {
    console.log(`✅ Direct confirmation for booking: ${bookingId}`);

    try {
      return await this.confirmBooking(bookingId, null);
    } catch (error) {
      console.error("Error handling direct confirmation:", error);
      throw error;
    }
  }

  /**
   * Log successful confirmation
   */
  static async logConfirmation(bookingId, abeResult, paymentData) {
    try {
      const { AuditLog } = await import("@/api/entities");
      
      await AuditLog.create({
        action: "booking_confirmed",
        entity_type: "Booking",
        entity_id: bookingId,
        actor_id: "SYSTEM",
        actor_role: "system",
        severity: "INFO",
        changes: {
          status: "confirmed",
          abe_executed: true,
          abe_result: abeResult.status,
          payment_processed: !!paymentData
        }
      });
    } catch (error) {
      console.error("Error logging confirmation:", error);
    }
  }

  /**
   * Log errors
   */
  static async logError(bookingId, error) {
    try {
      const { AuditLog } = await import("@/api/entities");
      
      await AuditLog.create({
        action: "booking_confirmation_failed",
        entity_type: "Booking",
        entity_id: bookingId,
        actor_id: "SYSTEM",
        actor_role: "system",
        severity: "CRITICAL",
        changes: {
          error_message: error.message,
          error_stack: error.stack
        }
      });
    } catch (logError) {
      console.error("Error logging error:", logError);
    }
  }

  /**
   * Retry failed confirmation
   */
  static async retryConfirmation(bookingId) {
    console.log(`🔄 Retrying confirmation for booking: ${bookingId}`);

    try {
      // Check if ABE already executed
      const { BookingWorkflow } = await import("@/api/entities");
      const workflows = await BookingWorkflow.filter({ booking_id: bookingId });

      if (workflows.length > 0) {
        console.log("⚠️ Workflow already exists, skipping retry");
        return {
          success: true,
          already_processed: true
        };
      }

      // Retry confirmation
      return await this.confirmBooking(bookingId, null);

    } catch (error) {
      console.error("Error retrying confirmation:", error);
      throw error;
    }
  }
}

export default BookingConfirmationHandler;