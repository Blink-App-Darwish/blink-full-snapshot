import { base44 } from "@/api/base44Client";
import EscrowStateManager from "./EscrowStateManager";

/**
 * Background Job: Auto-Release Escrow
 * Runs periodically to check and execute auto-releases
 */

export class EscrowAutoReleaseJob {
  /**
   * Execute job - check all escrows ready for auto-release
   */
  static async execute() {
    console.log("🤖 Starting Escrow Auto-Release Job...");

    try {
      const { EscrowAccount, Dispute } = await import("@/api/entities");

      // Find escrows in RELEASE_INITIATED state
      const escrows = await EscrowAccount.filter({
        status: "RELEASE_INITIATED",
        auto_release_enabled: true
      });

      console.log(`Found ${escrows.length} escrows pending auto-release`);

      let processed = 0;
      let released = 0;
      let skipped = 0;

      for (const escrow of escrows) {
        try {
          processed++;

          // Check if deadline passed
          const now = new Date();
          const deadline = new Date(escrow.auto_release_deadline);

          if (now < deadline) {
            console.log(`⏰ Escrow ${escrow.id} - deadline not reached yet`);
            skipped++;
            continue;
          }

          // Check for active disputes
          const disputes = await Dispute.filter({
            escrow_id: escrow.id,
            status: ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE"]
          });

          if (disputes.length > 0) {
            console.log(`⚠️ Escrow ${escrow.id} - has active disputes, skipping`);
            skipped++;
            continue;
          }

          // Execute auto-release
          await EscrowStateManager.executeAutoRelease(escrow.id);
          released++;

          console.log(`✅ Auto-released escrow: ${escrow.id}`);

        } catch (error) {
          console.error(`Error processing escrow ${escrow.id}:`, error);
        }
      }

      const result = {
        job_name: "escrow-auto-release",
        executed_at: new Date().toISOString(),
        status: "success",
        result: {
          total_checked: escrows.length,
          processed: processed,
          released: released,
          skipped: skipped
        }
      };

      // Log job execution
      await this.logJobExecution(result);

      console.log("✅ Escrow Auto-Release Job completed:", result);

      return result;

    } catch (error) {
      console.error("❌ Escrow Auto-Release Job failed:", error);

      const result = {
        job_name: "escrow-auto-release",
        executed_at: new Date().toISOString(),
        status: "error",
        error: error.message
      };

      await this.logJobExecution(result);

      throw error;
    }
  }

  /**
   * Close escrows after 7-day settlement period
   */
  static async executeFinalSettlement() {
    console.log("🤖 Starting Final Settlement Job...");

    try {
      const { EscrowAccount } = await import("@/api/entities");

      // Find escrows ready for final settlement
      const now = new Date();
      const escrows = await EscrowAccount.filter({
        status: "RELEASED"
      });

      const readyForSettlement = escrows.filter(e => {
        const settlementDate = new Date(e.final_settlement_date);
        return now >= settlementDate && !e.archived_for_audit;
      });

      console.log(`Found ${readyForSettlement.length} escrows ready for final settlement`);

      for (const escrow of readyForSettlement) {
        try {
          await EscrowStateManager.closeEscrow(escrow.id);
          console.log(`✅ Closed escrow: ${escrow.id}`);
        } catch (error) {
          console.error(`Error closing escrow ${escrow.id}:`, error);
        }
      }

      console.log("✅ Final Settlement Job completed");

    } catch (error) {
      console.error("❌ Final Settlement Job failed:", error);
    }
  }

  /**
   * Log job execution
   */
  static async logJobExecution(result) {
    try {
      const { JobExecutionLog } = await import("@/api/entities");

      await JobExecutionLog.create({
        job_name: result.job_name,
        job_id: `${result.job_name}-${Date.now()}`,
        executed_at: result.executed_at,
        status: result.status,
        duration_ms: 0,
        result: JSON.stringify(result.result || {}),
        error: result.error || null
      });

    } catch (error) {
      console.error("Error logging job execution:", error);
    }
  }
}

export default EscrowAutoReleaseJob;