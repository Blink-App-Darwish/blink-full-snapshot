/**
 * Webhook Verification
 * HMAC signature verification for webhook security
 */

class WebhookVerifier {
  constructor() {
    // In production, these should come from secure environment variables
    this.secrets = {
      stripe: 'whsec_stripe_secret',
      docusign: 'docusign_webhook_secret',
      google_calendar: 'google_webhook_secret'
    };
  }

  /**
   * Configure webhook secrets
   */
  configure(secrets) {
    this.secrets = { ...this.secrets, ...secrets };
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  async verifySignature(payload, signature, provider) {
    const secret = this.secrets[provider];
    
    if (!secret) {
      console.warn(`No secret configured for provider: ${provider}`);
      return false;
    }

    // In browser environment, crypto.subtle is available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(payload);

        const key = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
        const expectedSignature = this._bufferToHex(signatureBuffer);

        return signature === expectedSignature;
      } catch (error) {
        console.error("Error verifying signature:", error);
        return false;
      }
    }

    // Fallback for environments without crypto.subtle
    console.warn("Crypto API not available, skipping signature verification");
    return true;
  }

  /**
   * Verify Stripe webhook signature
   */
  async verifyStripeWebhook(payload, signatureHeader) {
    const secret = this.secrets.stripe;
    
    // Parse signature header
    const signatures = this._parseStripeSignature(signatureHeader);
    if (!signatures || !signatures.t || !signatures.v1) {
      return { valid: false, error: "Invalid signature format" };
    }

    // Check timestamp to prevent replay attacks (5 minutes tolerance)
    const timestamp = parseInt(signatures.t);
    const now = Math.floor(Date.now() / 1000);
    
    if (Math.abs(now - timestamp) > 300) {
      return { valid: false, error: "Signature timestamp too old" };
    }

    // Construct signed payload
    const signedPayload = `${signatures.t}.${payload}`;
    
    // Verify signature
    const isValid = await this.verifySignature(signedPayload, signatures.v1, 'stripe');
    
    return { valid: isValid, timestamp };
  }

  /**
   * Verify DocuSign webhook signature
   */
  async verifyDocuSignWebhook(payload, signatureHeader) {
    return await this.verifySignature(payload, signatureHeader, 'docusign');
  }

  /**
   * Parse Stripe signature header
   */
  _parseStripeSignature(header) {
    const parts = header.split(',');
    const result = {};
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Convert buffer to hex string
   */
  _bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verify webhook with rate limiting
   */
  async verifyWithRateLimit(payload, signature, provider, identifier) {
    // Simple in-memory rate limiting
    const key = `${provider}_${identifier}`;
    const now = Date.now();
    
    if (!this.rateLimitCache) {
      this.rateLimitCache = new Map();
    }

    const limits = this.rateLimitCache.get(key) || { count: 0, resetAt: now + 60000 };
    
    if (now > limits.resetAt) {
      limits.count = 0;
      limits.resetAt = now + 60000;
    }

    limits.count++;
    this.rateLimitCache.set(key, limits);

    if (limits.count > 100) { // Max 100 requests per minute
      return { valid: false, error: "Rate limit exceeded" };
    }

    return await this.verifySignature(payload, signature, provider);
  }
}

export default new WebhookVerifier();