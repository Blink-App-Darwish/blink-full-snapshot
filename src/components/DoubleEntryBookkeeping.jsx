import { LedgerEntry, FinancialTransaction } from "@/api/entities";

/**
 * Double-Entry Bookkeeping Service
 * Automatically creates corresponding ledger entries for every transaction
 */

export const DoubleEntryBookkeeping = {
  /**
   * Create ledger entries for a financial transaction
   * Implements double-entry accounting principles
   */
  async recordTransaction(transaction) {
    const entries = [];

    try {
      switch (transaction.transaction_type) {
        case "income":
          // Debit: Cash (increase asset)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "cash",
            entry_type: "debit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Income from ${transaction.source}: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));

          // Credit: Revenue (increase revenue)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "revenue",
            entry_type: "credit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Revenue from ${transaction.source}: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));
          break;

        case "expense":
          // Debit: Expenses (increase expense)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "expenses",
            entry_type: "debit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `${transaction.category || 'Expense'}: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));

          // Credit: Cash (decrease asset)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "cash",
            entry_type: "credit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Payment for ${transaction.category || 'expense'}`,
            posting_date: new Date().toISOString()
          }));
          break;

        case "refund":
          // Debit: Revenue (decrease revenue)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "revenue",
            entry_type: "debit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Refund issued: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));

          // Credit: Cash (decrease asset)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "cash",
            entry_type: "credit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Cash refunded: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));
          break;

        case "payout":
          // Debit: Equity (decrease owner's equity - money leaving business)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "equity",
            entry_type: "debit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Payout to owner: ${transaction.description}`,
            posting_date: new Date().toISOString()
          }));

          // Credit: Cash (decrease asset)
          entries.push(await LedgerEntry.create({
            transaction_id: transaction.id,
            enabler_id: transaction.enabler_id,
            account: "cash",
            entry_type: "credit",
            amount: transaction.amount,
            currency: transaction.currency,
            description: `Cash payout processed`,
            posting_date: new Date().toISOString()
          }));
          break;
      }

      // Mark transaction as having ledger entries
      await FinancialTransaction.update(transaction.id, {
        ledger_entries_created: true,
        reconciled: true
      });

      return { success: true, entries };

    } catch (error) {
      console.error("Error creating ledger entries:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get account balance
   */
  async getAccountBalance(enablerId, account) {
    const entries = await LedgerEntry.filter({
      enabler_id: enablerId,
      account: account
    });

    let balance = 0;
    entries.forEach(entry => {
      if (entry.entry_type === "debit") {
        // For asset and expense accounts, debits increase balance
        if (["cash", "accounts_receivable", "expenses"].includes(account)) {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
      } else {
        // Credits
        if (["cash", "accounts_receivable", "expenses"].includes(account)) {
          balance -= entry.amount;
        } else {
          balance += entry.amount;
        }
      }
    });

    return balance;
  },

  /**
   * Get trial balance (all accounts)
   */
  async getTrialBalance(enablerId) {
    const accounts = ["cash", "accounts_receivable", "accounts_payable", "revenue", "expenses", "equity"];
    const balances = {};

    for (const account of accounts) {
      balances[account] = await this.getAccountBalance(enablerId, account);
    }

    return balances;
  },

  /**
   * Verify double-entry integrity
   */
  async verifyIntegrity(transactionId) {
    const entries = await LedgerEntry.filter({ transaction_id: transactionId });

    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach(entry => {
      if (entry.entry_type === "debit") {
        totalDebits += entry.amount;
      } else {
        totalCredits += entry.amount;
      }
    });

    const balanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for rounding

    return {
      balanced,
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: totalDebits - totalCredits
    };
  }
};

export default DoubleEntryBookkeeping;