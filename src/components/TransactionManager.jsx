/**
 * Transaction Manager
 * Handles multi-step database transactions with rollback
 */

import IdempotencyService from "./IdempotencyService";

class TransactionManager {
  constructor() {
    this.activeTransactions = new Map();
  }

  /**
   * Execute multi-step transaction
   */
  async executeTransaction(transactionId, steps, options = {}) {
    const {
      onStepComplete = null,
      onRollback = null,
      rollbackOnError = true
    } = options;

    const transaction = {
      id: transactionId,
      steps: [],
      completedSteps: [],
      status: 'IN_PROGRESS'
    };

    this.activeTransactions.set(transactionId, transaction);

    try {
      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`📝 Transaction ${transactionId}: Executing step ${i + 1}/${steps.length} - ${step.name}`);

        try {
          // Execute step with idempotency
          const idempotencyKey = IdempotencyService.generateKey(
            `transaction_${transactionId}_step_${i}`,
            transactionId,
            step.data
          );

          const result = await IdempotencyService.executeIdempotent(
            idempotencyKey,
            step.execute
          );

          transaction.completedSteps.push({
            name: step.name,
            result,
            rollback: step.rollback
          });

          if (onStepComplete) {
            onStepComplete(i + 1, steps.length, step.name, result);
          }

        } catch (stepError) {
          console.error(`❌ Transaction ${transactionId}: Step ${step.name} failed:`, stepError);

          if (rollbackOnError) {
            await this.rollbackTransaction(transaction, onRollback);
          }

          throw new Error(`Transaction failed at step: ${step.name}. ${stepError.message}`);
        }
      }

      transaction.status = 'COMPLETED';
      console.log(`✅ Transaction ${transactionId}: Completed successfully`);

      return {
        success: true,
        results: transaction.completedSteps.map(s => s.result)
      };

    } catch (error) {
      transaction.status = 'FAILED';
      console.error(`❌ Transaction ${transactionId}: Failed:`, error);

      return {
        success: false,
        error: error.message,
        completedSteps: transaction.completedSteps.length
      };

    } finally {
      // Clean up after some time
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transaction, onRollback) {
    console.log(`🔄 Rolling back transaction ${transaction.id}...`);

    // Rollback in reverse order
    const stepsToRollback = [...transaction.completedSteps].reverse();

    for (const step of stepsToRollback) {
      if (step.rollback) {
        try {
          console.log(`  ↩️ Rolling back: ${step.name}`);
          await step.rollback(step.result);
          
          if (onRollback) {
            onRollback(step.name);
          }
        } catch (rollbackError) {
          console.error(`Failed to rollback step ${step.name}:`, rollbackError);
          // Continue rolling back other steps
        }
      }
    }

    console.log(`✅ Rollback completed for transaction ${transaction.id}`);
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    return this.activeTransactions.get(transactionId) || null;
  }

  /**
   * Example: Booking transaction with rollback
   */
  async executeBookingTransaction(bookingData) {
    const transactionId = `booking_${Date.now()}`;

    const steps = [
      {
        name: 'Create Reservation',
        execute: async () => {
          const { Reservation } = await import("@/api/entities");
          return await Reservation.create(bookingData.reservation);
        },
        rollback: async (result) => {
          const { Reservation } = await import("@/api/entities");
          await Reservation.delete(result.id);
        },
        data: bookingData.reservation
      },
      {
        name: 'Create Contract',
        execute: async () => {
          const { Contract } = await import("@/api/entities");
          return await Contract.create(bookingData.contract);
        },
        rollback: async (result) => {
          const { Contract } = await import("@/api/entities");
          await Contract.delete(result.id);
        },
        data: bookingData.contract
      },
      {
        name: 'Create Booking',
        execute: async () => {
          const { Booking } = await import("@/api/entities");
          return await Booking.create(bookingData.booking);
        },
        rollback: async (result) => {
          const { Booking } = await import("@/api/entities");
          await Booking.delete(result.id);
        },
        data: bookingData.booking
      },
      {
        name: 'Update Event Timeline',
        execute: async () => {
          const { EventTimeline } = await import("@/api/entities");
          const { default: AutomationEngine } = await import("./AutomationEngine");
          return await AutomationEngine.generateEventTimeline(
            bookingData.event_id,
            bookingData.host_id,
            [bookingData.booking]
          );
        },
        rollback: async (result) => {
          const { EventTimeline } = await import("@/api/entities");
          if (result?.id) {
            await EventTimeline.delete(result.id);
          }
        },
        data: { event_id: bookingData.event_id }
      }
    ];

    return await this.executeTransaction(transactionId, steps, {
      onStepComplete: (current, total, stepName) => {
        console.log(`Progress: ${current}/${total} - ${stepName} completed`);
      },
      onRollback: (stepName) => {
        console.log(`Rolled back: ${stepName}`);
      }
    });
  }
}

export default new TransactionManager();