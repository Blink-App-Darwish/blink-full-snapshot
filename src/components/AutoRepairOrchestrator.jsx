
import { RepairSnapshot, AutoRepairSettings, EventLock, Notification, ConflictReport } from "@/api/entities";
import { Event, Booking } from "@/api/entities";
import ConflictAnalyzer from "./ConflictAnalyzer";
import RepairEngine from "./RepairEngine";
import DependencyTracker from "./DependencyTracker";

/**
 * Auto-Repair Orchestrator - Stage 5/5
 * Orchestrates automatic repair application and rollback
 */

export const AutoRepairOrchestrator = {
  /**
   * Main orchestration function
   */
  async orchestrateRepair(conflictReportId, userId) {
    try {
      console.log(`🤖 Starting auto-repair orchestration for conflict: ${conflictReportId}`);

      // Load conflict report
      const conflictReport = (await ConflictReport.filter({ id: conflictReportId }))[0];
      if (!conflictReport) throw new Error("Conflict report not found");

      // Generate repair options
      const repairSnapshot = await RepairEngine.proposeRepairs(conflictReport);

      // Get user's auto-repair settings
      const settings = await this.loadAutoRepairSettings(userId);

      // Decide on action based on settings
      if (settings.auto_repair_mode === "none") {
        console.log("⏸️ Auto-repair disabled - only notify user");
        await this.notifyUserOfConflict(conflictReport, repairSnapshot, userId);
        return { action: "notify_only", snapshot: repairSnapshot };
      }

      if (settings.auto_repair_mode === "suggest_only") {
        console.log("💡 Suggest-only mode - present options to user");
        await this.notifyUserOfConflict(conflictReport, repairSnapshot, userId);
        return { action: "suggested", snapshot: repairSnapshot };
      }

      // Auto-apply-minor mode - check if top option qualifies
      const topOption = repairSnapshot.repair_options[0];
      
      if (await this.qualifiesForAutoApply(topOption, settings)) {
        console.log("⚡ Top option qualifies for auto-apply");
        const result = await this.autoApplyRepair(repairSnapshot, topOption, userId, settings);
        return result;
      } else {
        console.log("⚠️ Top option doesn't qualify for auto-apply - suggesting instead");
        await this.notifyUserOfConflict(conflictReport, repairSnapshot, userId);
        return { action: "suggested_threshold_not_met", snapshot: repairSnapshot };
      }

    } catch (error) {
      console.error("Error in auto-repair orchestration:", error);
      throw error;
    }
  },

  /**
   * Load user's auto-repair settings
   */
  async loadAutoRepairSettings(userId) {
    try {
      const settings = await AutoRepairSettings.filter({ user_id: userId });
      
      if (settings.length === 0) {
        // Create default settings
        return await AutoRepairSettings.create({
          user_id: userId,
          auto_repair_mode: "suggest_only",
          auto_apply_thresholds: {
            min_success_probability: 0.85,
            max_cost_increase: 100,
            max_schedule_shift_minutes: 30
          },
          rollback_window_minutes: 15,
          notification_preferences: {
            notify_on_detection: true,
            notify_on_auto_apply: true,
            notify_on_resolution: true
          },
          opt_in_auto_substitute: false,
          opt_in_auto_reschedule: false
        });
      }

      return settings[0];
    } catch (error) {
      console.error("Error loading auto-repair settings:", error);
      // Return safe defaults
      return {
        auto_repair_mode: "suggest_only",
        auto_apply_thresholds: {
          min_success_probability: 0.85,
          max_cost_increase: 100,
          max_schedule_shift_minutes: 30
        }
      };
    }
  },

  /**
   * Check if repair qualifies for auto-apply
   */
  async qualifiesForAutoApply(repairOption, settings) {
    const thresholds = settings.auto_apply_thresholds;

    // Check success probability
    if (repairOption.success_probability < thresholds.min_success_probability) {
      console.log(`❌ Success probability too low: ${repairOption.success_probability} < ${thresholds.min_success_probability}`);
      return false;
    }

    // Check cost increase
    const costIncrease = Math.max(0, repairOption.impact_host.cost_delta || 0);
    if (costIncrease > thresholds.max_cost_increase) {
      console.log(`❌ Cost increase too high: $${costIncrease} > $${thresholds.max_cost_increase}`);
      return false;
    }

    // Check schedule shift
    if (repairOption.repair_type === "reschedule_window") {
      const scheduleShift = this.extractScheduleShiftMinutes(repairOption.impact_host.schedule_change);
      if (scheduleShift > thresholds.max_schedule_shift_minutes) {
        console.log(`❌ Schedule shift too large: ${scheduleShift}min > ${thresholds.max_schedule_shift_minutes}min`);
        return false;
      }
    }

    // Check user opt-ins for specific repair types
    if (repairOption.repair_type === "substitute_enabler" && !settings.opt_in_auto_substitute) {
      console.log("❌ Substitute repair but user hasn't opted in");
      return false;
    }

    if (repairOption.repair_type === "reschedule_window" && !settings.opt_in_auto_reschedule) {
      console.log("❌ Reschedule repair but user hasn't opted in");
      return false;
    }

    console.log("✅ Repair qualifies for auto-apply");
    return true;
  },

  /**
   * Automatically apply a repair
   */
  async autoApplyRepair(repairSnapshot, repairOption, userId, settings) {
    try {
      console.log(`⚡ Auto-applying repair: ${repairOption.title}`);

      // Generate rollback token
      const rollbackToken = this.generateRollbackToken();
      const rollbackExpiresAt = new Date(Date.now() + settings.rollback_window_minutes * 60 * 1000);

      // Capture state before repair
      const stateBefore = await this.captureCurrentState(repairSnapshot.event_id);

      // Apply the changes
      const changesApplied = await this.applyRepairChanges(repairOption.changes_to_apply, repairSnapshot.event_id);

      // Capture state after repair
      const stateAfter = await this.captureCurrentState(repairSnapshot.event_id);

      // Update repair snapshot
      await RepairSnapshot.update(repairSnapshot.id, {
        applied_option_rank: repairOption.rank,
        applied_at: new Date().toISOString(),
        applied_by: "SYSTEM",
        application_mode: "auto_apply_minor",
        rollback_token: rollbackToken,
        rollback_expires_at: rollbackExpiresAt.toISOString(),
        status: "applied",
        state_before_repair: stateBefore,
        state_after_repair: stateAfter
      });

      // Notify affected parties
      await this.notifyAutoApplied(repairSnapshot, repairOption, rollbackToken, rollbackExpiresAt);

      console.log(`✅ Repair auto-applied with rollback token: ${rollbackToken}`);

      return {
        action: "auto_applied",
        snapshot: repairSnapshot,
        rollback_token: rollbackToken,
        rollback_expires_at: rollbackExpiresAt,
        changes_applied: changesApplied
      };

    } catch (error) {
      console.error("Error auto-applying repair:", error);
      
      // Rollback if possible
      try {
        await this.rollbackRepair(repairSnapshot.id);
      } catch (rollbackError) {
        console.error("Failed to rollback after error:", rollbackError);
      }

      throw error;
    }
  },

  /**
   * Apply repair changes to database
   */
  async applyRepairChanges(changes, eventId) {
    const appliedChanges = [];

    try {
      // Update event if needed
      if (changes.update_event) {
        await Event.update(eventId, changes.update_event);
        appliedChanges.push({ type: "event_updated", data: changes.update_event });
      }

      // Add line items
      if (changes.add_line_item) {
        const booking = (await Booking.filter({ id: changes.booking_id }))[0];
        if (booking) {
          const currentAmount = booking.total_amount || 0;
          await Booking.update(changes.booking_id, {
            total_amount: currentAmount + changes.add_line_item.amount
          });
          appliedChanges.push({ type: "line_item_added", data: changes.add_line_item });
        }
      }

      // Update booking
      if (changes.booking_id && (changes.update_package_id || changes.update_amount || changes.update_payment_terms)) {
        const updates = {};
        if (changes.update_package_id) updates.package_id = changes.update_package_id;
        if (changes.update_amount) updates.total_amount = changes.update_amount;
        if (changes.update_payment_terms) updates.payment_plan = changes.update_payment_terms.payment_plan;
        
        await Booking.update(changes.booking_id, updates);
        appliedChanges.push({ type: "booking_updated", data: updates });
      }

      // Remove and add bookings (for substitution)
      if (changes.remove_booking_id) {
        await Booking.update(changes.remove_booking_id, { status: "cancelled" });
        appliedChanges.push({ type: "booking_cancelled", booking_id: changes.remove_booking_id });
      }

      if (changes.add_booking) {
        const newBooking = await Booking.create({
          event_id: eventId,
          ...changes.add_booking,
          status: "confirmed"
        });
        appliedChanges.push({ type: "booking_created", booking_id: newBooking.id });
      }

      return appliedChanges;

    } catch (error) {
      console.error("Error applying repair changes:", error);
      throw error;
    }
  },

  /**
   * Rollback a repair
   */
  async rollbackRepair(repairSnapshotId) {
    try {
      console.log(`🔄 Rolling back repair: ${repairSnapshotId}`);

      const snapshot = (await RepairSnapshot.filter({ id: repairSnapshotId }))[0];
      if (!snapshot) throw new Error("Repair snapshot not found");

      if (snapshot.rollback_completed) {
        console.log("⚠️ Repair already rolled back");
        return;
      }

      // Check if rollback window expired
      if (new Date() > new Date(snapshot.rollback_expires_at)) {
        throw new Error("Rollback window expired");
      }

      // Restore state
      await this.restoreState(snapshot.event_id, snapshot.state_before_repair);

      // Update snapshot
      await RepairSnapshot.update(repairSnapshotId, {
        rollback_completed: true,
        rollback_completed_at: new Date().toISOString(),
        status: "rolled_back"
      });

      // Notify parties
      await this.notifyRollback(snapshot);

      console.log("✅ Repair rolled back successfully");

    } catch (error) {
      console.error("Error rolling back repair:", error);
      throw error;
    }
  },

  /**
   * Capture current state for rollback
   */
  async captureCurrentState(eventId) {
    try {
      const event = (await Event.filter({ id: eventId }))[0];
      const bookings = await Booking.filter({ event_id: eventId });

      return {
        event: event,
        bookings: bookings,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error capturing state:", error);
      return null;
    }
  },

  /**
   * Restore previous state
   */
  async restoreState(eventId, previousState) {
    if (!previousState) return;

    try {
      // Restore event
      if (previousState.event) {
        await Event.update(eventId, {
          date: previousState.event.date,
          location: previousState.event.location,
          guest_count: previousState.event.guest_count,
          budget: previousState.event.budget
        });
      }

      // Restore bookings
      if (previousState.bookings) {
        for (const booking of previousState.bookings) {
          await Booking.update(booking.id, {
            total_amount: booking.total_amount,
            package_id: booking.package_id,
            status: booking.status
          });
        }
      }

    } catch (error) {
      console.error("Error restoring state:", error);
      throw error;
    }
  },

  /**
   * Notify user of conflict with repair options
   */
  async notifyUserOfConflict(conflictReport, repairSnapshot, userId) {
    try {
      await Notification.create({
        user_id: userId,
        type: "compatibility_update",
        title: "⚠️ Event Issue Detected",
        message: `We found ${conflictReport.affected_enablers.length} compatibility issue(s) with your event. Review suggested fixes.`,
        link: `/conflict-inbox?report=${conflictReport.id}`,
        metadata: {
          conflict_report_id: conflictReport.id,
          repair_snapshot_id: repairSnapshot.id,
          severity: conflictReport.severity_score,
          repair_count: repairSnapshot.repair_options.length
        }
      });
    } catch (error) {
      console.error("Error sending conflict notification:", error);
    }
  },

  /**
   * Notify parties of auto-applied repair
   */
  async notifyAutoApplied(repairSnapshot, repairOption, rollbackToken, rollbackExpiresAt) {
    try {
      const event = (await Event.filter({ id: repairSnapshot.event_id }))[0];
      if (!event) return;

      const minutesRemaining = Math.round((new Date(rollbackExpiresAt) - new Date()) / 60000);

      // Notify host
      await Notification.create({
        user_id: event.host_id,
        type: "compatibility_update",
        title: "🤖 Auto-Fix Applied",
        message: `We applied a small fix to prevent cancellation: "${repairOption.title}". You have ${minutesRemaining} minutes to undo.`,
        link: `/conflict-inbox?snapshot=${repairSnapshot.id}`,
        metadata: {
          repair_snapshot_id: repairSnapshot.id,
          rollback_token: rollbackToken,
          rollback_expires_at: rollbackExpiresAt.toISOString(),
          repair_title: repairOption.title,
          cost_delta: repairOption.impact_host.cost_delta
        }
      });

      // Notify affected enablers
      for (const partyId of repairOption.affected_parties) {
        if (partyId !== event.host_id) {
          await Notification.create({
            user_id: partyId,
            type: "compatibility_update",
            title: "Event Updated",
            message: `Event "${event.name}" was automatically adjusted: ${repairOption.description}`,
            link: `/enabler-bookings?event=${event.id}`,
            metadata: {
              event_id: event.id,
              repair_type: repairOption.repair_type
            }
          });
        }
      }

    } catch (error) {
      console.error("Error sending auto-apply notifications:", error);
    }
  },

  /**
   * Notify parties of rollback
   */
  async notifyRollback(snapshot) {
    try {
      const event = (await Event.filter({ id: snapshot.event_id }))[0];
      if (!event) return;

      await Notification.create({
        user_id: event.host_id,
        type: "compatibility_update",
        title: "Fix Rolled Back",
        message: `The automated fix has been undone. Your event is back to its previous state.`,
        link: `/conflict-inbox?snapshot=${snapshot.id}`,
        metadata: {
          repair_snapshot_id: snapshot.id
        }
      });

    } catch (error) {
      console.error("Error sending rollback notification:", error);
    }
  },

  /**
   * Helper: Generate rollback token
   */
  generateRollbackToken() {
    return `rb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Helper: Extract schedule shift in minutes
   */
  extractScheduleShiftMinutes(scheduleChange) {
    if (!scheduleChange) return 0;
    
    const match = scheduleChange.match(/([+-]?\d+)\s*(day|hour|minute)/i);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('day')) return Math.abs(value * 24 * 60);
    if (unit.startsWith('hour')) return Math.abs(value * 60);
    return Math.abs(value);
  }
};

export default AutoRepairOrchestrator;
