/**
 * SMS Service Integration (Twilio)
 * SERVER-SIDE ONLY - This is a reference implementation
 * Must be implemented as backend API endpoint
 */

export const SMSService = {
  /**
   * Send booking reminder SMS
   */
  async sendBookingReminder(phoneNumber, eventName, hoursUntil) {
    try {
      const response = await fetch('/api/sms/booking-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          event_name: eventName,
          hours_until: hoursUntil
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  },

  /**
   * Send OTP for verification
   */
  async sendOTP(phoneNumber, code) {
    try {
      const response = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          code: code
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  },

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(phoneNumber, amount, reference) {
    try {
      const response = await fetch('/api/sms/payment-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          amount: amount,
          reference: reference
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send SMS');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }
};

/**
 * SERVER-SIDE IMPLEMENTATION REFERENCE
 * ===========================================
 * 
 * // Node.js/Express example using Twilio
 * const twilio = require('twilio');
 * const client = twilio(
 *   process.env.TWILIO_ACCOUNT_SID,
 *   process.env.TWILIO_AUTH_TOKEN
 * );
 * 
 * app.post('/api/sms/booking-reminder', async (req, res) => {
 *   const { to, event_name, hours_until } = req.body;
 *   
 *   try {
 *     const message = await client.messages.create({
 *       body: `Reminder: Your event "${event_name}" is in ${hours_until} hours. See you soon!`,
 *       from: process.env.TWILIO_PHONE_NUMBER,
 *       to: to
 *     });
 *     
 *     res.json({ success: true, message_sid: message.sid });
 *   } catch (error) {
 *     console.error('Twilio error:', error);
 *     res.status(500).json({ success: false, error: error.message });
 *   }
 * });
 * 
 * app.post('/api/sms/send-otp', async (req, res) => {
 *   const { to, code } = req.body;
 *   
 *   try {
 *     const message = await client.messages.create({
 *       body: `Your Blink verification code is: ${code}. Valid for 10 minutes.`,
 *       from: process.env.TWILIO_PHONE_NUMBER,
 *       to: to
 *     });
 *     
 *     res.json({ success: true, message_sid: message.sid });
 *   } catch (error) {
 *     res.status(500).json({ success: false, error: error.message });
 *   }
 * });
 */

export default SMSService;