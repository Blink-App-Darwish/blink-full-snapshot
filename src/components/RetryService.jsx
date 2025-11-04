/**
 * Retry Service with Exponential Backoff
 * Handles retries for failed operations
 */

class RetryService {
  constructor() {
    this.defaultMaxRetries = 3;
    this.defaultBaseDelay = 1000; // 1 second
    this.defaultMaxDelay = 30000; // 30 seconds
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation, options = {}) {
    const {
      maxRetries = this.defaultMaxRetries,
      baseDelay = this.defaultBaseDelay,
      maxDelay = this.defaultMaxDelay,
      retryCondition = this._defaultRetryCondition,
      onRetry = null,
      operationName = "Operation"
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded after ${attempt} retries`);
        }
        
        return { success: true, result, attempts: attempt + 1 };
        
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === maxRetries || !retryCondition(error)) {
          console.error(`❌ ${operationName} failed after ${attempt + 1} attempts:`, error.message);
          return { 
            success: false, 
            error: error.message, 
            attempts: attempt + 1,
            lastError: error
          };
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000, // Add jitter
          maxDelay
        );

        console.warn(
          `⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${Math.round(delay / 1000)}s...`,
          error.message
        );

        // Call retry callback
        if (onRetry) {
          onRetry(attempt + 1, delay, error);
        }

        // Wait before retry
        await this._delay(delay);
      }
    }

    return { 
      success: false, 
      error: lastError.message, 
      attempts: maxRetries + 1,
      lastError
    };
  }

  /**
   * Execute multiple operations with retry in parallel
   */
  async executeMultipleWithRetry(operations, options = {}) {
    const results = await Promise.allSettled(
      operations.map(op => this.executeWithRetry(op.fn, {
        ...options,
        operationName: op.name || "Operation"
      }))
    );

    return results.map((r, idx) => ({
      name: operations[idx].name,
      ...r.value
    }));
  }

  /**
   * Default retry condition - retry on network/timeout errors
   */
  _defaultRetryCondition(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network request failed',
      'timeout',
      'rate limit',
      '429',
      '503',
      '504'
    ];

    const errorString = error.message?.toLowerCase() || '';
    return retryableErrors.some(err => errorString.includes(err.toLowerCase()));
  }

  /**
   * Delay utility
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry specifically for API calls
   */
  async retryApiCall(apiCall, options = {}) {
    return this.executeWithRetry(apiCall, {
      ...options,
      retryCondition: (error) => {
        // Retry on 429 (rate limit), 503 (service unavailable), 504 (gateway timeout)
        const statusCode = error.response?.status || error.status;
        return [429, 503, 504].includes(statusCode) || this._defaultRetryCondition(error);
      }
    });
  }

  /**
   * Retry for payment operations (more cautious)
   */
  async retryPaymentOperation(operation, options = {}) {
    return this.executeWithRetry(operation, {
      maxRetries: 2, // Fewer retries for payments
      baseDelay: 2000, // Longer delays
      ...options,
      retryCondition: (error) => {
        // Only retry on network errors, not business logic errors
        const errorString = error.message?.toLowerCase() || '';
        return errorString.includes('network') || errorString.includes('timeout');
      }
    });
  }
}

export default new RetryService();