/**
 * Email Service Integration (SendGrid)
 * SERVER-SIDE ONLY - This is a reference implementation
 * Must be implemented as backend API endpoint
 */

// This file provides the client-side interface to email endpoints
// Actual SendGrid calls must be made server-side

export const EmailService = {
  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(bookingId, recipientEmail) {
    try {
      const response = await fetch('/api/emails/booking-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          recipient_email: recipientEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send booking confirmation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }
  },

  /**
   * Send contract ready notification
   */
  async sendContractReady(contractId, recipientEmail, recipientName, signingUrl) {
    try {
      const response = await fetch('/api/emails/contract-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contractId,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          signing_url: signingUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send contract notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending contract notification:', error);
      throw error;
    }
  },

  /**
   * Send event reminder
   */
  async sendEventReminder(eventId, recipientEmail, hoursBeforeEvent) {
    try {
      const response = await fetch('/api/emails/event-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          recipient_email: recipientEmail,
          hours_before: hoursBeforeEvent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  },

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(paymentId, recipientEmail) {
    try {
      const response = await fetch('/api/emails/payment-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId,
          recipient_email: recipientEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send receipt');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending receipt:', error);
      throw error;
    }
  },

  /**
   * Send generic notification email
   */
  async sendNotification(recipientEmail, subject, templateName, templateData) {
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          template_name: templateName,
          template_data: templateData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
};

/**
 * SERVER-SIDE IMPLEMENTATION REFERENCE
 * ===========================================
 * 
 * // Node.js/Express example using SendGrid
 * const sgMail = require('@sendgrid/mail');
 * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 * 
 * app.post('/api/emails/booking-confirmation', async (req, res) => {
 *   const { booking_id, recipient_email } = req.body;
 *   
 *   try {
 *     // Fetch booking details from database
 *     const booking = await Booking.findById(booking_id);
 *     const event = await Event.findById(booking.event_id);
 *     const enabler = await Enabler.findById(booking.enabler_id);
 *     
 *     // Send email using SendGrid template
 *     await sgMail.send({
 *       to: recipient_email,
 *       from: process.env.SENDGRID_FROM_EMAIL,
 *       templateId: 'd-xxxxxxxxxxxxx', // Your SendGrid template ID
 *       dynamicTemplateData: {
 *         event_name: event.name,
 *         event_date: event.date,
 *         enabler_name: enabler.business_name,
 *         booking_reference: booking.id,
 *         total_amount: booking.total_amount
 *       }
 *     });
 *     
 *     res.json({ success: true, message: 'Email sent' });
 *   } catch (error) {
 *     console.error('SendGrid error:', error);
 *     res.status(500).json({ success: false, error: error.message });
 *   }
 * });
 * 
 * // Email templates (create in SendGrid dashboard):
 * // - booking-confirmation: Confirms successful booking
 * // - contract-ready: Notifies user contract is ready to sign
 * // - event-reminder: Reminds user of upcoming event (24h before)
 * // - payment-receipt: Provides payment confirmation
 * // - payment-failed: Notifies of payment failure
 * // - booking-cancelled: Confirms cancellation
 */

export default EmailService;