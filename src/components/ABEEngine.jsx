import { base44 } from "@/api/base44Client";

/**
 * After Booking Engine (ABE)
 * Core orchestration engine that executes on booking confirmation
 */

class AfterBookingEngine {
  constructor() {
    this.engineCode = "ABE";
    this.version = "1.0.0";
  }

  /**
   * Main execution entry point
   * Triggers on booking confirmation
   */
  async execute(bookingId, context = {}) {
    console.log(`🚀 ABE Engine executing for booking: ${bookingId}`);
    
    const executionLog = {
      booking_id: bookingId,
      started_at: new Date().toISOString(),
      steps: [],
      status: "running"
    };

    try {
      // Load entities
      const { 
        Booking, 
        Event, 
        Enabler, 
        User,
        SmartContract,
        EscrowAccount,
        BookingWorkflow,
        IntelligenceEngine
      } = await import("@/api/entities");

      // Load booking data
      const booking = await Booking.filter({ id: bookingId }).then(b => b[0]);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const event = await Event.filter({ id: booking.event_id }).then(e => e[0]);
      const enabler = await Enabler.filter({ id: booking.enabler_id }).then(e => e[0]);
      const host = await User.filter({ id: event.host_id }).then(u => u[0]);

      console.log("📦 Loaded booking context:", { booking, event, enabler, host });

      // STEP 1: Create Smart Contract
      const contractStep = await this.generateSmartContract(booking, event, enabler, host);
      executionLog.steps.push(contractStep);

      // STEP 2: Lock Escrow
      const escrowStep = await this.lockEscrow(booking, contractStep.contract_id);
      executionLog.steps.push(escrowStep);

      // STEP 3: Create Workflow Timeline
      const timelineStep = await this.createWorkflowTimeline(booking, event, enabler);
      executionLog.steps.push(timelineStep);

      // STEP 4: Generate AI Checklists
      const checklistStep = await this.generateChecklists(booking, event, enabler, host);
      executionLog.steps.push(checklistStep);

      // STEP 5: Send Notifications
      const notificationStep = await this.sendNotifications(booking, event, enabler, host, {
        contract_id: contractStep.contract_id,
        workflow_id: timelineStep.workflow_id
      });
      executionLog.steps.push(notificationStep);

      // STEP 6: Update engine metrics
      await this.updateEngineMetrics("success");

      executionLog.status = "success";
      executionLog.completed_at = new Date().toISOString();
      
      console.log("✅ ABE Engine execution completed successfully");
      return executionLog;

    } catch (error) {
      console.error("❌ ABE Engine execution failed:", error);
      
      executionLog.status = "failed";
      executionLog.error = error.message;
      executionLog.completed_at = new Date().toISOString();
      
      await this.updateEngineMetrics("failure");
      
      throw error;
    }
  }

  /**
   * STEP 1: Generate Smart Contract
   */
  async generateSmartContract(booking, event, enabler, host) {
    console.log("📝 Generating smart contract...");
    
    try {
      const { SmartContract } = await import("@/api/entities");

      // Build contract terms
      const contractData = {
        enabler_id: enabler.id,
        package_id: booking.package_id,
        version: "1.0.0",
        status: "ACTIVE",
        pre_signed_by_enabler: true,
        contract_json: JSON.stringify({
          parties: {
            vendor: {
              name: enabler.business_name,
              contact_email: enabler.user_id,
              enabler_id: enabler.id
            },
            host: {
              name: host.full_name,
              contact_email: host.email,
              user_id: host.id
            }
          },
          event_details: {
            event_name: event.display_name || event.name,
            event_id: event.id,
            event_type: event.type,
            event_date: event.date,
            location: event.location,
            expected_attendees: event.guest_count
          },
          pricing: {
            total_payment: booking.total_amount,
            currency: "USD",
            payment_schedule: "split_50_50",
            deposit_percentage: 50
          },
          service_scope: {
            booking_id: booking.id,
            package_id: booking.package_id,
            services: booking.services || []
          },
          performance_terms: {
            quality_standards: "Professional service delivery as per package specifications",
            kpis: [
              { metric: "On-time arrival", target: "100%" },
              { metric: "Setup completion", target: "30 minutes before event" },
              { metric: "Service quality", target: "4+ star rating" }
            ]
          },
          cancellation_policy: {
            host_cancellation_windows: [
              { days_before: 30, refund_percentage: 100 },
              { days_before: 14, refund_percentage: 50 },
              { days_before: 7, refund_percentage: 25 },
              { days_before: 0, refund_percentage: 0 }
            ],
            vendor_cancellation_penalty: booking.total_amount * 0.2
          },
          dispute_resolution: {
            method: "arbitration",
            arbitrator: "Blink Platform",
            jurisdiction: "Platform Terms"
          }
        }),
        human_readable_summary: `Service agreement between ${enabler.business_name} and ${host.full_name} for ${event.display_name || event.name} on ${event.date}`
      };

      // Generate canonical hash
      const contractString = JSON.stringify(contractData.contract_json);
      contractData.canonical_hash = await this.generateHash(contractString);
      contractData.terms_hash = await this.generateHash(contractString);

      const contract = await SmartContract.create(contractData);

      console.log("✅ Smart contract generated:", contract.id);

      return {
        step: "smart_contract_generation",
        status: "success",
        contract_id: contract.id,
        contract_hash: contract.canonical_hash,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error generating smart contract:", error);
      return {
        step: "smart_contract_generation",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * STEP 2: Lock Escrow
   */
  async lockEscrow(booking, contractId) {
    console.log("🔒 Locking escrow...");
    
    try {
      const { EscrowAccount } = await import("@/api/entities");

      // Calculate escrow amounts
      const totalAmount = booking.total_amount;
      const commissionRate = 0.10; // 10% platform commission
      const commissionCents = Math.round(totalAmount * commissionRate * 100);
      const enablerPayoutCents = Math.round(totalAmount * 100) - commissionCents;

      // Calculate auto-release date (72 hours after event)
      const { Event } = await import("@/api/entities");
      const event = await Event.filter({ id: booking.event_id }).then(e => e[0]);
      const holdUntil = new Date(event.date);
      holdUntil.setHours(holdUntil.getHours() + 72);

      const escrow = await EscrowAccount.create({
        booking_id: booking.id,
        contract_id: contractId,
        status: "HOLD",
        amount_cents: Math.round(totalAmount * 100),
        currency: "USD",
        hold_until: holdUntil.toISOString(),
        commission_cents: commissionCents,
        commission_rate: commissionRate,
        enabler_payout_cents: enablerPayoutCents,
        release_rules: {
          auto_release_on_completion: true,
          require_host_confirmation: true,
          completion_criteria: [
            "event_completed",
            "no_disputes_filed",
            "host_validation_received"
          ],
          sla_hours: 72
        },
        reconciliation_status: "PENDING"
      });

      console.log("✅ Escrow locked:", escrow.id);

      return {
        step: "escrow_lock",
        status: "success",
        escrow_id: escrow.id,
        amount_cents: escrow.amount_cents,
        hold_until: escrow.hold_until,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error locking escrow:", error);
      return {
        step: "escrow_lock",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * STEP 3: Create Workflow Timeline
   */
  async createWorkflowTimeline(booking, event, enabler) {
    console.log("📅 Creating workflow timeline...");
    
    try {
      const { BookingWorkflow } = await import("@/api/entities");

      const eventDate = new Date(event.date);
      const now = new Date();

      // Generate dynamic milestones
      const milestones = [];

      // T+1: Host prep tasks due (1 day after booking)
      const hostPrepDue = new Date(now);
      hostPrepDue.setDate(hostPrepDue.getDate() + 1);
      milestones.push({
        milestone: "Host Preparation Confirmation",
        due_date: hostPrepDue.toISOString(),
        status: "pending",
        description: "Host confirms venue access, power, and requirements"
      });

      // T+2: Enabler readiness confirmation (2 days before event)
      const enablerReadinessDue = new Date(eventDate);
      enablerReadinessDue.setDate(enablerReadinessDue.getDate() - 2);
      milestones.push({
        milestone: "Enabler Readiness Confirmation",
        due_date: enablerReadinessDue.toISOString(),
        status: "pending",
        description: "Enabler confirms equipment, staff, and readiness"
      });

      // Event Day: Service execution
      milestones.push({
        milestone: "Event Service Execution",
        due_date: eventDate.toISOString(),
        status: "pending",
        description: "Live service delivery and tracking"
      });

      // T+1 day: Post-event review
      const reviewDue = new Date(eventDate);
      reviewDue.setDate(reviewDue.getDate() + 1);
      milestones.push({
        milestone: "Post-Event Review & Validation",
        due_date: reviewDue.toISOString(),
        status: "pending",
        description: "Host validates completion, ratings exchanged"
      });

      const workflow = await BookingWorkflow.create({
        booking_id: booking.id,
        workflow_stage: "CONFIRMED",
        timeline: milestones,
        enabler_checklist: [],
        host_checklist: [],
        live_status: {
          enabler_status: "pending",
          last_update: new Date().toISOString(),
          host_acknowledged: false
        },
        performance_score: {
          timeliness: 0,
          quality: 0,
          communication: 0,
          professionalism: 0,
          overall: 0
        },
        risk_flags: [],
        incidents: [],
        escrow_release_status: "held"
      });

      console.log("✅ Workflow timeline created:", workflow.id);

      return {
        step: "timeline_creation",
        status: "success",
        workflow_id: workflow.id,
        milestones_count: milestones.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error creating workflow timeline:", error);
      return {
        step: "timeline_creation",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * STEP 4: Generate AI Checklists
   */
  async generateChecklists(booking, event, enabler, host) {
    console.log("📋 Generating AI checklists...");
    
    try {
      // Generate enabler checklist using AI
      const enablerPrompt = `Generate a professional checklist for an enabler (${enabler.category}) preparing for this event:

Event: ${event.display_name || event.name}
Type: ${event.type}
Date: ${event.date}
Location: ${event.location}
Guest Count: ${event.guest_count}

Return a JSON array of checklist items. Each item should have:
- task: string (the task description)
- required: boolean (is it mandatory)
- category: string (preparation, equipment, staffing, communication, or logistics)

Limit to 8-12 most important tasks.`;

      const enablerChecklist = await base44.integrations.Core.InvokeLLM({
        prompt: enablerPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  required: { type: "boolean" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Generate host checklist
      const hostPrompt = `Generate a host preparation checklist for this event:

Event: ${event.display_name || event.name}
Type: ${event.type}
Date: ${event.date}
Location: ${event.location}
Service Provider: ${enabler.business_name} (${enabler.category})

Return a JSON array of checklist items. Each item should have:
- task: string (the task description)
- required: boolean (is it mandatory)
- category: string (venue_access, materials, coordination, or permissions)

Limit to 6-10 most important host responsibilities.`;

      const hostChecklist = await base44.integrations.Core.InvokeLLM({
        prompt: hostPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  required: { type: "boolean" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Update workflow with checklists
      const { BookingWorkflow } = await import("@/api/entities");
      const workflows = await BookingWorkflow.filter({ booking_id: booking.id });
      
      if (workflows[0]) {
        await BookingWorkflow.update(workflows[0].id, {
          enabler_checklist: enablerChecklist.tasks.map(t => ({
            ...t,
            completed: false,
            completed_at: null,
            proof_url: null,
            notes: null
          })),
          host_checklist: hostChecklist.tasks.map(t => ({
            ...t,
            completed: false,
            completed_at: null,
            notes: null
          }))
        });
      }

      console.log("✅ AI checklists generated");

      return {
        step: "checklist_generation",
        status: "success",
        enabler_tasks: enablerChecklist.tasks.length,
        host_tasks: hostChecklist.tasks.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error generating checklists:", error);
      return {
        step: "checklist_generation",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * STEP 5: Send Notifications
   */
  async sendNotifications(booking, event, enabler, host, context) {
    console.log("📧 Sending notifications...");
    
    try {
      const { SystemNotification } = await import("@/api/entities");

      // Notification to Host
      await SystemNotification.create({
        user_id: host.id,
        notification_type: "booking_confirmed",
        title: "🎉 Booking Confirmed!",
        message: `Your booking with ${enabler.business_name} for ${event.display_name || event.name} is confirmed! Check your preparation checklist.`,
        related_event_id: event.id,
        related_booking_id: booking.id,
        action_required: true,
        action_url: `/EventDetail?id=${event.id}`,
        priority: "high",
        read: false
      });

      // Notification to Enabler
      await SystemNotification.create({
        user_id: enabler.user_id,
        notification_type: "booking_confirmed",
        title: "🎊 New Booking Confirmed!",
        message: `You have a confirmed booking for ${event.display_name || event.name} on ${event.date}. Complete your readiness checklist.`,
        related_event_id: event.id,
        related_booking_id: booking.id,
        related_enabler_id: enabler.id,
        action_required: true,
        action_url: `/EnablerBookings`,
        priority: "high",
        read: false
      });

      // Admin notification
      const adminUsers = await base44.entities.User.filter({ role: "admin" });
      if (adminUsers[0]) {
        const { AdminNotification } = await import("@/api/entities");
        await AdminNotification.create({
          type: "booking_confirmed",
          severity: "INFO",
          title: "New Booking Confirmed",
          message: `Booking confirmed: ${enabler.business_name} → ${event.display_name || event.name}`,
          entity_type: "Booking",
          entity_id: booking.id,
          action_required: false,
          read: false
        });
      }

      console.log("✅ Notifications sent");

      return {
        step: "notifications",
        status: "success",
        notifications_sent: 3,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error sending notifications:", error);
      return {
        step: "notifications",
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update engine metrics
   */
  async updateEngineMetrics(result) {
    try {
      const { IntelligenceEngine } = await import("@/api/entities");
      const engines = await IntelligenceEngine.filter({ engine_code: "ABE" });
      
      if (engines[0]) {
        const engine = engines[0];
        const metrics = engine.metrics || {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0
        };

        metrics.total_executions = (metrics.total_executions || 0) + 1;
        if (result === "success") {
          metrics.successful_executions = (metrics.successful_executions || 0) + 1;
        } else {
          metrics.failed_executions = (metrics.failed_executions || 0) + 1;
        }
        metrics.last_execution = new Date().toISOString();

        await IntelligenceEngine.update(engine.id, { metrics });
      }
    } catch (error) {
      console.error("Error updating engine metrics:", error);
    }
  }

  /**
   * Generate SHA-256 hash
   */
  async generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export singleton instance
export const ABE = new AfterBookingEngine();
export default ABE;