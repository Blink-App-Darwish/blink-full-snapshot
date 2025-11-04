import { Event, Booking, Contract, Invoice, EventDependency, EventAuditLog, EventLock, Notification, Enabler } from "@/api/entities";
import { checkEnablerCompatibility } from "./VenueLogic";

/**
 * Dependency Tracker Service - Stage 4/5
 * Tracks and synchronizes all event dependencies
 */

export const DependencyTracker = {
  /**
   * Initialize dependencies for a new event
   */
  async initializeEventDependencies(eventId) {
    try {
      console.log(`📊 Initializing dependencies for event: ${eventId}`);
      
      const event = (await Event.filter({ id: eventId }))[0];
      if (!event) throw new Error("Event not found");

      const dependencies = [];

      // Track venue dependency
      if (event.venue_enabler_id) {
        dependencies.push(await this.createDependency(eventId, {
          type: "venue",
          id: event.venue_enabler_id,
          name: "Event Venue"
        }));
      }

      // Track enabler dependencies
      const bookings = await Booking.filter({ event_id: eventId });
      for (const booking of bookings) {
        if (booking.enabler_id) {
          const enabler = (await Enabler.filter({ id: booking.enabler_id }))[0];
          dependencies.push(await this.createDependency(eventId, {
            type: "enabler",
            id: booking.enabler_id,
            name: enabler?.business_name || "Enabler"
          }));

          // Track booking dependency
          dependencies.push(await this.createDependency(eventId, {
            type: "booking",
            id: booking.id,
            name: `Booking with ${enabler?.business_name || "Enabler"}`
          }));
        }
      }

      // Track contract dependencies
      const contracts = await Contract.filter({ event_id: eventId });
      for (const contract of contracts) {
        dependencies.push(await this.createDependency(eventId, {
          type: "contract",
          id: contract.id,
          name: `Contract ${contract.contract_type}`
        }));
      }

      // Track invoice dependencies
      const invoices = await Invoice.filter({ event_id: eventId });
      for (const invoice of invoices) {
        dependencies.push(await this.createDependency(eventId, {
          type: "invoice",
          id: invoice.id,
          name: `Invoice ${invoice.invoice_number}`
        }));
      }

      console.log(`✅ Initialized ${dependencies.length} dependencies`);
      return dependencies;

    } catch (error) {
      console.error("Error initializing dependencies:", error);
      throw error;
    }
  },

  /**
   * Create a dependency record
   */
  async createDependency(eventId, { type, id, name }) {
    try {
      const dependency = await EventDependency.create({
        event_id: eventId,
        dependency_type: type,
        dependency_id: id,
        dependency_name: name,
        status: "active",
        last_validated: new Date().toISOString(),
        validation_status: {
          is_valid: true,
          conflicts: [],
          warnings: []
        }
      });

      return dependency;
    } catch (error) {
      console.error("Error creating dependency:", error);
      throw error;
    }
  },

  /**
   * Trigger revalidation chain when event changes
   */
  async triggerDependencyRevalidation(eventId, changeType, changeDetails, userId) {
    try {
      console.log(`🔄 Triggering dependency revalidation for event: ${eventId}`);
      console.log(`📝 Change type: ${changeType}`);
      console.log(`📋 Change details:`, changeDetails);

      // Place event lock
      const lock = await this.lockEvent(eventId, {
        lockType: "dependency_change",
        lockedBy: userId,
        reason: `Revalidating dependencies after ${changeType}`,
        operations: ["booking", "payment", "contract_signing", "enabler_changes"]
      });

      console.log(`🔒 Event locked: ${lock.id}`);

      // Get all dependencies
      const dependencies = await EventDependency.filter({ event_id: eventId, status: "active" });
      console.log(`📦 Found ${dependencies.length} active dependencies`);

      const results = {
        validated: [],
        conflicts: [],
        warnings: [],
        notifications: []
      };

      // Revalidate each dependency
      for (const dependency of dependencies) {
        const validationResult = await this.validateDependency(dependency, changeType, changeDetails);
        
        if (validationResult.has_conflict) {
          results.conflicts.push({
            dependency,
            conflict: validationResult
          });

          // Update dependency status
          await EventDependency.update(dependency.id, {
            status: "conflict",
            validation_status: {
              is_valid: false,
              conflicts: validationResult.conflicts,
              warnings: validationResult.warnings
            }
          });
        } else if (validationResult.warnings.length > 0) {
          results.warnings.push({
            dependency,
            warnings: validationResult.warnings
          });

          // Update with warnings
          await EventDependency.update(dependency.id, {
            status: "pending_revalidation",
            validation_status: {
              is_valid: true,
              conflicts: [],
              warnings: validationResult.warnings
            }
          });
        } else {
          results.validated.push(dependency);

          // Update as validated
          await EventDependency.update(dependency.id, {
            last_validated: new Date().toISOString(),
            validation_status: {
              is_valid: true,
              conflicts: [],
              warnings: []
            }
          });
        }
      }

      // Send notifications
      const notifications = await this.sendDependencyNotifications(
        eventId,
        changeType,
        changeDetails,
        results
      );
      results.notifications = notifications;

      // Log the audit trail
      await this.logDependencyChange(eventId, userId, changeType, changeDetails, results);

      // Release lock if no conflicts, otherwise keep locked
      if (results.conflicts.length === 0) {
        await this.releaseEventLock(lock.id);
        console.log(`🔓 Event lock released`);
      } else {
        console.log(`⚠️ Event remains locked due to conflicts`);
      }

      console.log(`✅ Revalidation complete:`, {
        validated: results.validated.length,
        conflicts: results.conflicts.length,
        warnings: results.warnings.length,
        notifications: results.notifications.length
      });

      return results;

    } catch (error) {
      console.error("Error in dependency revalidation:", error);
      throw error;
    }
  },

  /**
   * Validate a single dependency
   */
  async validateDependency(dependency, changeType, changeDetails) {
    try {
      const result = {
        has_conflict: false,
        conflicts: [],
        warnings: [],
        suggestions: []
      };

      // Get event details
      const event = (await Event.filter({ id: dependency.event_id }))[0];
      if (!event) return result;

      // Validate based on dependency type
      switch (dependency.dependency_type) {
        case "enabler":
        case "booking":
          const enabler = (await Enabler.filter({ id: dependency.dependency_id }))[0];
          if (!enabler) {
            result.has_conflict = true;
            result.conflicts.push("Enabler not found");
            break;
          }

          // Check compatibility with new event details
          const compatibility = checkEnablerCompatibility(enabler, {
            location: changeDetails.new_location || event.location,
            event_date: changeDetails.new_date || event.date,
            guest_min: event.guest_count,
            guest_max: event.guest_count,
            budget_max: event.budget,
            venue_status: event.venue_status
          }, {
            calendarEvents: [],
            frameworks: [],
            selectedPackage: null
          });

          if (!compatibility.overall.compatible) {
            result.has_conflict = true;
            result.conflicts.push(`Enabler incompatible: ${compatibility.overall.reason}`);
          }

          if (compatibility.location && !compatibility.location.compatible) {
            result.warnings.push(`Location outside service area`);
          }

          break;

        case "contract":
          // Check if contract needs updates
          const contract = (await Contract.filter({ id: dependency.dependency_id }))[0];
          if (contract) {
            if (changeType === "venue_changed" || changeType === "date_changed") {
              result.warnings.push("Contract requires review and potential amendment");
            }
          }
          break;

        case "invoice":
          // Check if invoice needs updates
          const invoice = (await Invoice.filter({ id: dependency.dependency_id }))[0];
          if (invoice && invoice.status !== "draft") {
            result.warnings.push("Issued invoice may require adjustment");
          }
          break;
      }

      return result;

    } catch (error) {
      console.error("Error validating dependency:", error);
      return {
        has_conflict: true,
        conflicts: ["Validation error: " + error.message],
        warnings: [],
        suggestions: []
      };
    }
  },

  /**
   * Send notifications to affected parties
   */
  async sendDependencyNotifications(eventId, changeType, changeDetails, validationResults) {
    try {
      const notifications = [];
      const event = (await Event.filter({ id: eventId }))[0];
      if (!event) return notifications;

      // Notify host
      const hostNotification = await Notification.create({
        user_id: event.host_id,
        enabler_id: null,
        type: "compatibility_update",
        title: this.getChangeTitle(changeType),
        message: this.getHostMessage(changeType, changeDetails, validationResults),
        link: `/event/${eventId}`,
        metadata: {
          change_type: changeType,
          conflicts: validationResults.conflicts.length,
          warnings: validationResults.warnings.length
        }
      });
      notifications.push(hostNotification);

      // Notify affected enablers
      const bookings = await Booking.filter({ event_id: eventId });
      for (const booking of bookings) {
        const enabler = (await Enabler.filter({ id: booking.enabler_id }))[0];
        if (!enabler || !enabler.user_id) continue;

        const enablerNotification = await Notification.create({
          user_id: enabler.user_id,
          enabler_id: enabler.id,
          type: "compatibility_update",
          title: "Event Update – Review Required",
          message: this.getEnablerMessage(changeType, changeDetails, event),
          link: `/enabler-bookings?event_id=${eventId}`,
          metadata: {
            change_type: changeType,
            event_name: event.name
          }
        });
        notifications.push(enablerNotification);
      }

      return notifications;

    } catch (error) {
      console.error("Error sending notifications:", error);
      return [];
    }
  },

  /**
   * Log dependency change to audit trail
   */
  async logDependencyChange(eventId, userId, changeType, changeDetails, validationResults) {
    try {
      const affectedDeps = [
        ...validationResults.validated.map(d => d.id),
        ...validationResults.conflicts.map(c => c.dependency.id),
        ...validationResults.warnings.map(w => w.dependency.id)
      ];

      const log = await EventAuditLog.create({
        event_id: eventId,
        user_id: userId,
        action_type: changeType,
        field_name: changeDetails.field_name || changeType,
        old_value: changeDetails.old_value || "",
        new_value: changeDetails.new_value || "",
        impact_summary: this.generateImpactSummary(validationResults),
        affected_dependencies: affectedDeps,
        notifications_sent: validationResults.notifications.map(n => ({
          user_id: n.user_id,
          notification_type: n.type,
          sent_at: n.created_date
        })),
        outcome: validationResults.conflicts.length > 0 ? "conflict" : "success"
      });

      return log;

    } catch (error) {
      console.error("Error logging dependency change:", error);
      throw error;
    }
  },

  /**
   * Lock event during dependency changes
   */
  async lockEvent(eventId, { lockType, lockedBy, reason, operations }) {
    try {
      const lock = await EventLock.create({
        event_id: eventId,
        lock_type: lockType,
        locked_by: lockedBy,
        locked_at: new Date().toISOString(),
        lock_reason: reason,
        locked_operations: operations,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        status: "active"
      });

      return lock;

    } catch (error) {
      console.error("Error locking event:", error);
      throw error;
    }
  },

  /**
   * Release event lock
   */
  async releaseEventLock(lockId) {
    try {
      await EventLock.update(lockId, {
        status: "released"
      });
    } catch (error) {
      console.error("Error releasing lock:", error);
      throw error;
    }
  },

  /**
   * Check if event is locked
   */
  async isEventLocked(eventId) {
    try {
      const locks = await EventLock.filter({
        event_id: eventId,
        status: "active"
      });

      return locks.length > 0 ? locks[0] : null;

    } catch (error) {
      console.error("Error checking event lock:", error);
      return null;
    }
  },

  // Helper functions for message generation
  getChangeTitle(changeType) {
    const titles = {
      "venue_changed": "Venue Changed",
      "date_changed": "Date Changed",
      "enabler_added": "Service Provider Added",
      "enabler_removed": "Service Provider Removed"
    };
    return titles[changeType] || "Event Updated";
  },

  getHostMessage(changeType, changeDetails, validationResults) {
    if (validationResults.conflicts.length > 0) {
      return `Change processed but ${validationResults.conflicts.length} service provider(s) have compatibility issues. Please review and take action.`;
    }
    if (validationResults.warnings.length > 0) {
      return `Change processed successfully. ${validationResults.warnings.length} item(s) require review from service providers.`;
    }
    return "Change processed successfully. All service providers have been notified.";
  },

  getEnablerMessage(changeType, changeDetails, event) {
    const messages = {
      "venue_changed": `Event "${event.name}" venue has been updated. Please review compatibility with the new location.`,
      "date_changed": `Event "${event.name}" date has been changed. Please confirm your availability.`
    };
    return messages[changeType] || `Event "${event.name}" has been updated. Please review the changes.`;
  },

  generateImpactSummary(validationResults) {
    const parts = [];
    
    if (validationResults.validated.length > 0) {
      parts.push(`${validationResults.validated.length} validated`);
    }
    if (validationResults.conflicts.length > 0) {
      parts.push(`${validationResults.conflicts.length} conflicts`);
    }
    if (validationResults.warnings.length > 0) {
      parts.push(`${validationResults.warnings.length} warnings`);
    }

    return parts.join(", ");
  }
};

export default DependencyTracker;