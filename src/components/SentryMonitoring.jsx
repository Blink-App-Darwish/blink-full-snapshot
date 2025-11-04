import React from "react";

/**
 * Sentry Error Monitoring Integration
 * Captures errors and performance metrics
 */

// This file provides initialization and helpers for Sentry
// Actual Sentry SDK should be imported and configured at app entry point

export const SentryMonitoring = {
  /**
   * Initialize Sentry (call this in your app's entry point)
   */
  init() {
    // Check if Sentry is available (loaded from CDN or npm)
    if (typeof window !== 'undefined' && window.Sentry) {
      // Configuration loaded from server endpoint (keeps DSN secure)
      fetch('/api/monitoring/config')
        .then(res => res.json())
        .then(config => {
          if (config.sentry_enabled) {
            window.Sentry.init({
              dsn: config.sentry_dsn,
              environment: config.environment,
              release: config.release_version,
              tracesSampleRate: 0.1, // 10% of transactions
              replaysSessionSampleRate: 0.1,
              replaysOnErrorSampleRate: 1.0,
              integrations: [
                new window.Sentry.BrowserTracing(),
                new window.Sentry.Replay()
              ]
            });
          }
        })
        .catch(err => console.warn('Could not initialize Sentry:', err));
    }
  },

  /**
   * Capture exception with context
   */
  captureException(error, context = {}) {
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags: context.tags || {},
        extra: context.extra || {},
        level: context.level || 'error'
      });
    } else {
      console.error('Sentry not initialized:', error);
    }
  },

  /**
   * Capture message (for logging)
   */
  captureMessage(message, level = 'info', context = {}) {
    if (window.Sentry) {
      window.Sentry.captureMessage(message, {
        level: level,
        tags: context.tags || {},
        extra: context.extra || {}
      });
    }
  },

  /**
   * Set user context
   */
  setUser(user) {
    if (window.Sentry && user) {
      window.Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.full_name
      });
    }
  },

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message, category = 'custom', data = {}) {
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        message: message,
        category: category,
        data: data,
        level: 'info'
      });
    }
  },

  /**
   * Start a performance transaction
   */
  startTransaction(name, operation = 'custom') {
    if (window.Sentry) {
      return window.Sentry.startTransaction({
        name: name,
        op: operation
      });
    }
    return null;
  }
};

/**
 * Error Boundary Integration
 * Use this to wrap your React components
 */
export class SentryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    SentryMonitoring.captureException(error, {
      extra: { errorInfo }
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

/**
 * SERVER-SIDE SETUP
 * ===========================================
 * 
 * // Install: npm install @sentry/node
 * const Sentry = require('@sentry/node');
 * 
 * Sentry.init({
 *   dsn: process.env.SENTRY_DSN,
 *   environment: process.env.NODE_ENV,
 *   tracesSampleRate: 1.0
 * });
 * 
 * // Express middleware
 * app.use(Sentry.Handlers.requestHandler());
 * app.use(Sentry.Handlers.tracingHandler());
 * 
 * // ... your routes ...
 * 
 * // Error handler (must be after routes)
 * app.use(Sentry.Handlers.errorHandler());
 * 
 * // Config endpoint for client
 * app.get('/api/monitoring/config', (req, res) => {
 *   res.json({
 *     sentry_enabled: !!process.env.SENTRY_DSN_PUBLIC,
 *     sentry_dsn: process.env.SENTRY_DSN_PUBLIC, // Public DSN only
 *     environment: process.env.NODE_ENV,
 *     release_version: process.env.RELEASE_VERSION || '1.0.0'
 *   });
 * });
 */

export default SentryMonitoring;