import { base44 } from "@/api/base44Client";

/**
 * Escrow State Manager
 * Handles all escrow state transitions and business logic
 */

export class EscrowStateManager {
  /**
   * Create escrow on booking confirmation
   */
  static async createEscrow(bookingId, contractId, amount, enablerPayoutAmount) {
    try {
      const { EscrowAccount, Booking, Event } = await import("@/api/entities");

      const booking = await Booking.filter({ id: bookingId }).then(b => b[0]);
      const event = await Event.filter({ id: booking.event_id }).then(e => e[0]);

      // Calculate timeline
      const eventDate = new Date(event.date);
      const autoReleaseDeadline = new Date(eventDate);
      autoReleaseDeadline.setHours(autoReleaseDeadline.getHours() + 72); // 72h after event

      const disputeWindowExpires = new Date(eventDate);
      disputeWindowExpires.setDate(disputeWindowExpires.getDate() + 7); // 7 days after event

      const finalSettlementDate = new Date(eventDate);
      finalSettlementDate.setDate(finalSettlementDate.getDate() + 7); // Same as dispute window

      const commissionRate = 0.15; // 15% platform commission
      const commissionCents = Math.round(amount * commissionRate);
      const enablerPayoutCents = amount - commissionCents;

      const escrow = await EscrowAccount.create({
        booking_id: bookingId,
        contract_id: contractId,
        status: "HOLD",
        amount_cents: amount,
        currency: "USD",
        auto_release_deadline: autoReleaseDeadline.toISOString(),
        auto_release_enabled: true,
        dispute_window_expires: disputeWindowExpires.toISOString(),
        final_settlement_date: finalSettlementDate.toISOString(),
        commission_cents: commissionCents,
        commission_rate: commissionRate,
        enabler_payout_cents: enablerPayoutCents,
        state_history: [{
          from_state: null,
          to_state: "HOLD",
          timestamp: new Date().toISOString(),
          triggered_by: "SYSTEM",
          reason: "Booking confirmed - funds locked",
          notes: "Initial escrow creation on booking confirmation"
        }],
        release_rules: {
          auto_release_on_completion: true,
          require_host_confirmation: true,
          completion_criteria: [
            "Event completed",
            "Host validation received",
            "No disputes raised",
            "72-hour SLA met"
          ],
          sla_hours: 72,
          auto_release_buffer_hours: 168
        }
      });

      console.log("✅ Escrow created:", escrow.id);

      // Create ledger entry
      await this.createLedgerEntry(escrow.id, "HOLD", amount, "Initial escrow lock");

      return escrow;

    } catch (error) {
      console.error("Error creating escrow:", error);
      throw error;
    }
  }

  /**
   * Transition escrow to PROTECTED state (event ongoing)
   */
  static async transitionToProtected(escrowId) {
    return await this.transitionState(escrowId, "PROTECTED", "SYSTEM", "Event is ongoing - funds protected");
  }

  /**
   * Initiate release (host validated)
   */
  static async initiateRelease(escrowId, hostId) {
    try {
      const { EscrowAccount } = await import("@/api/entities");
      const escrow = await EscrowAccount.filter({ id: escrowId }).then(e => e[0]);

      if (escrow.status === "FROZEN") {
        throw new Error("Cannot release frozen escrow - dispute pending");
      }

      await this.transitionState(
        escrowId,
        "RELEASE_INITIATED",
        hostId,
        "Host validated service completion"
      );

      console.log("✅ Release initiated - awaiting final checks");

      // Trigger auto-release check after short delay
      setTimeout(() => this.checkAutoRelease(escrowId), 5000);

      return true;

    } catch (error) {
      console.error("Error initiating release:", error);
      throw error;
    }
  }

  /**
   * Check and execute auto-release
   */
  static async checkAutoRelease(escrowId) {
    try {
      const { EscrowAccount, Dispute } = await import("@/api/entities");
      const escrow = await EscrowAccount.filter({ id: escrowId }).then(e => e[0]);

      if (escrow.status !== "RELEASE_INITIATED") {
        console.log("Escrow not in RELEASE_INITIATED state, skipping auto-release");
        return;
      }

      // Check for active disputes
      const disputes = await Dispute.filter({
        escrow_id: escrowId,
        status: ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE"]
      });

      if (disputes.length > 0) {
        console.log("⚠️ Active disputes found - cannot auto-release");
        return;
      }

      // Check if auto-release deadline passed
      const now = new Date();
      const deadline = new Date(escrow.auto_release_deadline);

      if (now >= deadline) {
        await this.executeAutoRelease(escrowId);
      } else {
        console.log(`⏰ Auto-release scheduled for: ${deadline.toISOString()}`);
      }

    } catch (error) {
      console.error("Error checking auto-release:", error);
    }
  }

  /**
   * Execute automatic release
   */
  static async executeAutoRelease(escrowId) {
    try {
      await this.transitionState(
        escrowId,
        "RELEASE_AUTO",
        "SYSTEM",
        "Auto-release executed - no disputes within SLA window"
      );

      // Execute payout
      await this.executePayout(escrowId);

      console.log("✅ Auto-release completed successfully");

    } catch (error) {
      console.error("Error executing auto-release:", error);
      throw error;
    }
  }

  /**
   * Freeze escrow due to dispute
   */
  static async freezeEscrow(escrowId, disputeId, reason) {
    try {
      const { EscrowAccount } = await import("@/api/entities");

      await this.transitionState(
        escrowId,
        "FROZEN",
        "SYSTEM",
        `Dispute raised: ${reason}`
      );

      await EscrowAccount.update(escrowId, {
        dispute_id: disputeId,
        frozen_at: new Date().toISOString(),
        disputed_at: new Date().toISOString()
      });

      console.log("🔒 Escrow frozen - awaiting Blink Ops arbitration");

    } catch (error) {
      console.error("Error freezing escrow:", error);
      throw error;
    }
  }

  /**
   * Adjust escrow based on dispute resolution
   */
  static async adjustEscrow(escrowId, adjustment, arbitrationNotes, resolvedBy) {
    try {
      const { EscrowAccount } = await import("@/api/entities");

      await this.transitionState(
        escrowId,
        "ADJUSTED",
        resolvedBy,
        `Dispute resolved - adjustment applied`
      );

      await EscrowAccount.update(escrowId, {
        enabler_payout_cents: adjustment.enabler_amount,
        arbitration_notes: arbitrationNotes,
        manual_action_by: resolvedBy,
        manual_action_reason: "Dispute resolution adjustment"
      });

      // Execute adjusted payout
      await this.executePayout(escrowId);

      console.log("✅ Escrow adjusted and released");

    } catch (error) {
      console.error("Error adjusting escrow:", error);
      throw error;
    }
  }

  /**
   * Close escrow (final settlement)
   */
  static async closeEscrow(escrowId) {
    try {
      const { EscrowAccount } = await import("@/api/entities");

      await this.transitionState(
        escrowId,
        "CLOSED",
        "SYSTEM",
        "Final settlement - 7 days post-event completed"
      );

      await EscrowAccount.update(escrowId, {
        archived_for_audit: true,
        reconciliation_status: "RECONCILED",
        reconciled_at: new Date().toISOString()
      });

      console.log("📦 Escrow closed and archived for audit");

    } catch (error) {
      console.error("Error closing escrow:", error);
      throw error;
    }
  }

  /**
   * Execute payout to enabler
   */
  static async executePayout(escrowId) {
    try {
      const { EscrowAccount, Payout } = await import("@/api/entities");
      const escrow = await EscrowAccount.filter({ id: escrowId }).then(e => e[0]);

      // Create payout record
      const payout = await Payout.create({
        enabler_id: escrow.booking_id, // Will need to get from booking
        amount: escrow.enabler_payout_cents / 100,
        currency: escrow.currency,
        status: "processing",
        scheduled_date: new Date().toISOString(),
        payment_method: "stripe",
        related_bookings: [escrow.booking_id],
        fees: escrow.commission_cents / 100,
        net_amount: escrow.enabler_payout_cents / 100
      });

      await EscrowAccount.update(escrowId, {
        status: "RELEASED",
        released_at: new Date().toISOString()
      });

      // Create ledger entry
      await this.createLedgerEntry(
        escrowId,
        "RELEASE",
        escrow.enabler_payout_cents,
        `Payout to enabler - Payout ID: ${payout.id}`
      );

      console.log("💰 Payout executed:", payout.id);

      return payout;

    } catch (error) {
      console.error("Error executing payout:", error);
      throw error;
    }
  }

  /**
   * Transition state helper
   */
  static async transitionState(escrowId, newState, triggeredBy, reason) {
    try {
      const { EscrowAccount } = await import("@/api/entities");
      const escrow = await EscrowAccount.filter({ id: escrowId }).then(e => e[0]);

      const stateHistory = [
        ...(escrow.state_history || []),
        {
          from_state: escrow.status,
          to_state: newState,
          timestamp: new Date().toISOString(),
          triggered_by: triggeredBy,
          reason: reason,
          notes: `Transition from ${escrow.status} to ${newState}`
        }
      ];

      await EscrowAccount.update(escrowId, {
        status: newState,
        state_history: stateHistory
      });

      console.log(`🔄 Escrow state: ${escrow.status} → ${newState}`);

      return true;

    } catch (error) {
      console.error("Error transitioning state:", error);
      throw error;
    }
  }

  /**
   * Create ledger entry
   */
  static async createLedgerEntry(escrowId, type, amountCents, description) {
    try {
      const { EscrowLedgerEntry, EscrowAccount } = await import("@/api/entities");
      const escrow = await EscrowAccount.filter({ id: escrowId }).then(e => e[0]);

      // Calculate running balance
      const entries = await EscrowLedgerEntry.filter({ escrow_id: escrowId }, "-created_date");
      const lastBalance = entries[0]?.balance_after_cents || 0;
      
      const newBalance = type === "HOLD" || type === "FEE"
        ? lastBalance + amountCents
        : lastBalance - amountCents;

      await EscrowLedgerEntry.create({
        escrow_id: escrowId,
        type: type,
        amount_cents: amountCents,
        currency: escrow.currency,
        balance_after_cents: newBalance,
        description: description,
        processed_at: new Date().toISOString(),
        created_by: "SYSTEM"
      });

      console.log(`📒 Ledger entry created: ${type} - ${amountCents} cents`);

    } catch (error) {
      console.error("Error creating ledger entry:", error);
    }
  }
}

export default EscrowStateManager;