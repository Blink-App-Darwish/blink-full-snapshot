/**
 * Global Error Monitoring Service
 * Captures and logs errors across the application
 */

class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors in memory
    this.listeners = [];
    
    // Setup global error handlers
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          type: 'unhandled_promise_rejection',
          message: event.reason?.message || 'Unhandled Promise Rejection',
          stack: event.reason?.stack,
          timestamp: new Date().toISOString()
        });
      });

      // Catch global errors
      window.addEventListener('error', (event) => {
        this.logError({
          type: 'global_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  /**
   * Log an error
   */
  logError(error) {
    const errorEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...error,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };

    // Add to memory
    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Log to console in development
    console.error('[ERROR MONITOR]', errorEntry);

    // Notify listeners
    this.listeners.forEach(listener => listener(errorEntry));

    // In production, send to monitoring service
    this.sendToMonitoringService(errorEntry);
  }

  /**
   * Log API error
   */
  logApiError(endpoint, method, error, response = null) {
    this.logError({
      type: 'api_error',
      endpoint,
      method,
      message: error.message,
      statusCode: response?.status,
      responseData: response?.data,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log integration error
   */
  logIntegrationError(integration, action, error, details = null) {
    this.logError({
      type: 'integration_error',
      integration,
      action,
      message: error.message,
      details,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log user action error
   */
  logUserActionError(action, error, context = null) {
    this.logError({
      type: 'user_action_error',
      action,
      message: error.message,
      context,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error to monitoring service
   */
  sendToMonitoringService(error) {
    // In production, integrate with Sentry, LogRocket, or custom service
    // Example:
    // if (process.env.NODE_ENV === 'production') {
    //   fetch('/api/errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(error)
    //   }).catch(console.error);
    // }
  }

  /**
   * Add error listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(0, count);
  }

  /**
   * Clear error log
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      last24Hours: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // Count last 24 hours
      if (new Date(error.timestamp) > oneDayAgo) {
        stats.last24Hours++;
      }
    });

    return stats;
  }
}

// Singleton instance
const errorMonitor = new ErrorMonitor();

export default errorMonitor;