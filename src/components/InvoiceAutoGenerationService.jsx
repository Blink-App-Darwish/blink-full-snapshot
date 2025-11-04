/**
 * Smart Invoice Auto-Generation Service
 * Automatically generates invoices when bookings are confirmed
 * NO EXTERNAL INTEGRATIONS - Pure internal logic
 */

import { Invoice, Booking, Event, User, Enabler } from "@/api/entities";
import { addDays, format } from "date-fns";

class InvoiceAutoGenerationService {
  /**
   * Generate a unique invoice number
   * Format: INV-YYYYMMDD-XXXX
   */
  static async generateInvoiceNumber() {
    const date = format(new Date(), "yyyyMMdd");
    const existingInvoices = await Invoice.filter({}, "-created_date", 1);
    
    let sequence = 1;
    if (existingInvoices.length > 0) {
      const lastInvoice = existingInvoices[0];
      if (lastInvoice.invoice_number) {
        const parts = lastInvoice.invoice_number.split("-");
        if (parts.length === 3 && parts[1] === date) {
          sequence = parseInt(parts[2]) + 1;
        }
      }
    }
    
    const paddedSequence = String(sequence).padStart(4, "0");
    return `INV-${date}-${paddedSequence}`;
  }

  /**
   * Calculate invoice totals
   */
  static calculateTotals(lineItems, taxRate = 0, discountAmount = 0) {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      tax_amount: taxAmount,
      total_amount: total
    };
  }

  /**
   * Main auto-generation logic
   * Triggered when booking status changes to "confirmed"
   */
  static async autoGenerateInvoice(bookingId) {
    try {
      // 1. Fetch booking details
      const bookings = await Booking.filter({ id: bookingId });
      if (!bookings || bookings.length === 0) {
        throw new Error("Booking not found");
      }

      const booking = bookings[0];

      // 2. Check if invoice already exists
      if (booking.invoice_id) {
        const existingInvoices = await Invoice.filter({ id: booking.invoice_id });
        if (existingInvoices.length > 0) {
          console.log("Invoice already exists for this booking");
          return existingInvoices[0];
        }
      }

      // 3. Fetch related data
      const [events, enablers] = await Promise.all([
        Event.filter({ id: booking.event_id }),
        Enabler.filter({ id: booking.enabler_id })
      ]);

      if (!events || events.length === 0) {
        throw new Error("Event not found");
      }

      const event = events[0];
      const enabler = enablers[0];

      // 4. Build line items from booking services
      let lineItems = [];
      if (booking.services && booking.services.length > 0) {
        lineItems = booking.services.map(service => ({
          description: service.name || service.description || "Service",
          quantity: service.quantity || 1,
          unit_price: service.unit_price || service.total || 0,
          total: service.total || service.unit_price || 0
        }));
      } else {
        // Fallback: create single line item from total
        lineItems = [{
          description: "Event Services",
          quantity: 1,
          unit_price: booking.total_amount,
          total: booking.total_amount
        }];
      }

      // 5. Calculate totals (default tax rate from enabler settings)
      const taxRate = enabler?.tax_rate || 0;
      const totals = this.calculateTotals(lineItems, taxRate);

      // 6. Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // 7. Create invoice record
      const invoiceData = {
        invoice_number: invoiceNumber,
        enabler_id: booking.enabler_id,
        host_id: event.host_id,
        booking_id: booking.id,
        event_id: event.id,
        event_name: event.name,
        event_date: event.date,
        event_location: event.location || "",
        status: "draft", // Start as draft, can be auto-issued based on settings
        issue_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"), // Default: 7 days
        line_items: lineItems,
        subtotal: totals.subtotal,
        tax_rate: taxRate,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        currency: "USD",
        notes: `Auto-generated invoice for ${event.name}`,
        payment_instructions: "Payment details will be provided upon request.",
        auto_generated: true,
        booking_data_synced: true
      };

      const newInvoice = await Invoice.create(invoiceData);

      // 8. Link invoice back to booking
      await Booking.update(booking.id, { invoice_id: newInvoice.id });

      console.log(`✅ Auto-generated invoice ${invoiceNumber} for booking ${booking.id}`);

      return newInvoice;
    } catch (error) {
      console.error("Error auto-generating invoice:", error);
      throw error;
    }
  }

  /**
   * Auto-issue invoice (if enabler has auto-issue enabled)
   */
  static async autoIssueInvoice(invoiceId, enablerSettings) {
    if (!enablerSettings?.auto_issue_invoices) {
      return false;
    }

    try {
      await Invoice.update(invoiceId, {
        status: "issued",
        issue_date: format(new Date(), "yyyy-MM-dd")
      });

      console.log(`✅ Auto-issued invoice ${invoiceId}`);
      return true;
    } catch (error) {
      console.error("Error auto-issuing invoice:", error);
      return false;
    }
  }

  /**
   * Check for booking-invoice data mismatches
   */
  static async checkDataSync(invoiceId, bookingId) {
    try {
      const [invoices, bookings] = await Promise.all([
        Invoice.filter({ id: invoiceId }),
        Booking.filter({ id: bookingId })
      ]);

      if (!invoices || invoices.length === 0 || !bookings || bookings.length === 0) {
        return null;
      }

      const invoice = invoices[0];
      const booking = bookings[0];

      // Compare totals
      if (Math.abs(invoice.total_amount - booking.total_amount) > 0.01) {
        return {
          synced: false,
          warning: `Invoice total ($${invoice.total_amount}) doesn't match booking total ($${booking.total_amount})`
        };
      }

      return { synced: true };
    } catch (error) {
      console.error("Error checking data sync:", error);
      return null;
    }
  }

  /**
   * Update invoice from modified booking data
   */
  static async syncInvoiceWithBooking(invoiceId, bookingId) {
    try {
      const [invoices, bookings] = await Promise.all([
        Invoice.filter({ id: invoiceId }),
        Booking.filter({ id: bookingId })
      ]);

      if (!invoices || invoices.length === 0 || !bookings || bookings.length === 0) {
        throw new Error("Invoice or Booking not found");
      }

      const invoice = invoices[0];
      const booking = bookings[0];

      // Rebuild line items
      let lineItems = [];
      if (booking.services && booking.services.length > 0) {
        lineItems = booking.services.map(service => ({
          description: service.name || service.description || "Service",
          quantity: service.quantity || 1,
          unit_price: service.unit_price || service.total || 0,
          total: service.total || service.unit_price || 0
        }));
      } else {
        lineItems = [{
          description: "Event Services",
          quantity: 1,
          unit_price: booking.total_amount,
          total: booking.total_amount
        }];
      }

      // Recalculate totals
      const totals = this.calculateTotals(lineItems, invoice.tax_rate || 0);

      // Update invoice
      await Invoice.update(invoiceId, {
        line_items: lineItems,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
        booking_data_synced: true,
        mismatch_warning: null
      });

      console.log(`✅ Synced invoice ${invoiceId} with booking ${bookingId}`);
      return true;
    } catch (error) {
      console.error("Error syncing invoice with booking:", error);
      return false;
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(invoiceId) {
    try {
      await Invoice.update(invoiceId, {
        status: "paid",
        paid_date: format(new Date(), "yyyy-MM-dd")
      });

      // Also update linked booking payment status
      const invoices = await Invoice.filter({ id: invoiceId });
      if (invoices[0] && invoices[0].booking_id) {
        await Booking.update(invoices[0].booking_id, {
          payment_status: "paid"
        });
      }

      return true;
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      return false;
    }
  }

  /**
   * Check for overdue invoices and update status
   */
  static async checkOverdueInvoices() {
    try {
      const issuedInvoices = await Invoice.filter({ status: "issued" });
      const today = new Date();

      for (const invoice of issuedInvoices) {
        if (invoice.due_date && new Date(invoice.due_date) < today) {
          await Invoice.update(invoice.id, { status: "overdue" });
          console.log(`⚠️ Invoice ${invoice.invoice_number} is now overdue`);
        }
      }
    } catch (error) {
      console.error("Error checking overdue invoices:", error);
    }
  }
}

export default InvoiceAutoGenerationService;