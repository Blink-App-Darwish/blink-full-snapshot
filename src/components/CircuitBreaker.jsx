/**
 * Circuit Breaker Pattern
 * Prevents cascading failures when external services fail
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    
    this.services = new Map(); // Track per-service circuits
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(serviceName, operation, fallback = null) {
    const circuit = this._getCircuit(serviceName);
    
    // Check circuit state
    if (circuit.state === 'OPEN') {
      if (Date.now() < circuit.nextAttempt) {
        console.warn(`🔴 Circuit OPEN for ${serviceName}, using fallback`);
        if (fallback) {
          return { success: false, fallback: true, result: await fallback() };
        }
        throw new Error(`Service ${serviceName} is currently unavailable`);
      }
      
      // Try half-open
      circuit.state = 'HALF_OPEN';
      console.log(`🟡 Circuit HALF_OPEN for ${serviceName}, testing...`);
    }

    try {
      const result = await operation();
      
      this._onSuccess(circuit, serviceName);
      return { success: true, result };
      
    } catch (error) {
      this._onFailure(circuit, serviceName, error);
      
      if (fallback) {
        console.warn(`Using fallback for ${serviceName}`);
        return { success: false, fallback: true, result: await fallback() };
      }
      
      throw error;
    }
  }

  /**
   * Get or create circuit for service
   */
  _getCircuit(serviceName) {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        nextAttempt: Date.now()
      });
    }
    return this.services.get(serviceName);
  }

  /**
   * Handle successful operation
   */
  _onSuccess(circuit, serviceName) {
    circuit.failures = 0;
    circuit.successes++;
    
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'CLOSED';
      console.log(`✅ Circuit CLOSED for ${serviceName} - service recovered`);
    }
  }

  /**
   * Handle failed operation
   */
  _onFailure(circuit, serviceName, error) {
    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    
    console.error(`Circuit breaker failure for ${serviceName}:`, error.message);
    
    if (circuit.failures >= this.failureThreshold) {
      circuit.state = 'OPEN';
      circuit.nextAttempt = Date.now() + this.resetTimeout;
      
      console.error(
        `🔴 Circuit OPEN for ${serviceName} - ` +
        `${circuit.failures} failures, cooling down for ${this.resetTimeout/1000}s`
      );
    }
  }

  /**
   * Get circuit status
   */
  getStatus(serviceName) {
    const circuit = this.services.get(serviceName);
    if (!circuit) {
      return { state: 'CLOSED', failures: 0 };
    }
    
    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailureTime: circuit.lastFailureTime
    };
  }

  /**
   * Manually reset circuit
   */
  reset(serviceName) {
    const circuit = this._getCircuit(serviceName);
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.lastFailureTime = null;
    console.log(`🔄 Circuit manually reset for ${serviceName}`);
  }

  /**
   * Reset all circuits
   */
  resetAll() {
    for (const [serviceName, circuit] of this.services.entries()) {
      this.reset(serviceName);
    }
  }
}

export default new CircuitBreaker();