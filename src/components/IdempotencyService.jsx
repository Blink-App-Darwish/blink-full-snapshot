/**
 * Idempotency Service
 * Ensures operations are executed only once even if retried
 */

class IdempotencyService {
  constructor() {
    this.cache = new Map(); // In-memory cache for client-side
    this.expiryMs = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Generate idempotency key
   */
  generateKey(operation, userId, data) {
    const timestamp = Date.now();
    const dataHash = this._hashData(data);
    return `${operation}_${userId}_${dataHash}_${timestamp}`;
  }

  /**
   * Check if operation was already executed
   */
  async checkExecution(key) {
    // Check in-memory cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.expiryMs) {
        return { executed: true, result: cached.result };
      }
      this.cache.delete(key);
    }

    // In production, check database for idempotency records
    try {
      const { IdempotencyRecord } = await import("@/api/entities");
      const records = await IdempotencyRecord.filter({ idempotency_key: key });
      
      if (records.length > 0) {
        const record = records[0];
        const expiresAt = new Date(record.created_date);
        expiresAt.setTime(expiresAt.getTime() + this.expiryMs);
        
        if (new Date() < expiresAt) {
          return { 
            executed: true, 
            result: record.result ? JSON.parse(record.result) : null 
          };
        }
      }
    } catch (error) {
      console.warn("IdempotencyRecord entity not found, using in-memory only");
    }

    return { executed: false };
  }

  /**
   * Store execution result
   */
  async storeExecution(key, result) {
    // Store in memory
    this.cache.set(key, {
      timestamp: Date.now(),
      result
    });

    // Store in database if available
    try {
      const { IdempotencyRecord } = await import("@/api/entities");
      await IdempotencyRecord.create({
        idempotency_key: key,
        result: JSON.stringify(result),
        expires_at: new Date(Date.now() + this.expiryMs).toISOString()
      });
    } catch (error) {
      console.warn("Could not store idempotency record in database");
    }
  }

  /**
   * Execute operation with idempotency
   */
  async executeIdempotent(key, operation) {
    // Check if already executed
    const check = await this.checkExecution(key);
    if (check.executed) {
      console.log("Operation already executed, returning cached result");
      return check.result;
    }

    // Execute operation
    const result = await operation();

    // Store result
    await this.storeExecution(key, result);

    return result;
  }

  /**
   * Hash data for key generation
   */
  _hashData(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.expiryMs) {
        this.cache.delete(key);
      }
    }
  }
}

export default new IdempotencyService();