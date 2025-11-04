/**
 * Real-Time Sync Service
 * Handles polling for availability updates between hosts and enablers
 */

import { CalendarEvent, AvailabilityRule, Booking } from "@/api/entities";

class RealTimeSyncService {
  constructor() {
    this.subscribers = new Map();
    this.pollingIntervals = new Map();
    this.lastSyncTimestamps = new Map();
    this.defaultPollingInterval = 30000; // 30 seconds
  }

  /**
   * Subscribe to real-time updates for an enabler's availability
   */
  subscribeToEnablerAvailability(enablerId, callback, pollingInterval = this.defaultPollingInterval) {
    const subscriptionId = `enabler_${enablerId}_${Date.now()}`;
    
    this.subscribers.set(subscriptionId, {
      type: 'enabler_availability',
      enablerId,
      callback,
      lastData: null
    });

    // Start polling if not already polling for this enabler
    const pollingKey = `enabler_${enablerId}`;
    if (!this.pollingIntervals.has(pollingKey)) {
      this._startPolling(pollingKey, async () => {
        return await this._fetchEnablerAvailability(enablerId);
      }, pollingInterval);
    }

    return subscriptionId;
  }

  /**
   * Subscribe to real-time updates for event bookings
   */
  subscribeToEventBookings(eventId, callback, pollingInterval = this.defaultPollingInterval) {
    const subscriptionId = `event_${eventId}_${Date.now()}`;
    
    this.subscribers.set(subscriptionId, {
      type: 'event_bookings',
      eventId,
      callback,
      lastData: null
    });

    const pollingKey = `event_${eventId}`;
    if (!this.pollingIntervals.has(pollingKey)) {
      this._startPolling(pollingKey, async () => {
        return await this._fetchEventBookings(eventId);
      }, pollingInterval);
    }

    return subscriptionId;
  }

  /**
   * Subscribe to calendar events for an enabler
   */
  subscribeToCalendarEvents(enablerId, callback, pollingInterval = this.defaultPollingInterval) {
    const subscriptionId = `calendar_${enablerId}_${Date.now()}`;
    
    this.subscribers.set(subscriptionId, {
      type: 'calendar_events',
      enablerId,
      callback,
      lastData: null
    });

    const pollingKey = `calendar_${enablerId}`;
    if (!this.pollingIntervals.has(pollingKey)) {
      this._startPolling(pollingKey, async () => {
        return await this._fetchCalendarEvents(enablerId);
      }, pollingInterval);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscribers.get(subscriptionId);
    if (!subscription) return;

    this.subscribers.delete(subscriptionId);

    // Stop polling if no more subscribers for this resource
    const pollingKey = this._getPollingKey(subscription);
    const hasOtherSubscribers = Array.from(this.subscribers.values()).some(
      sub => this._getPollingKey(sub) === pollingKey
    );

    if (!hasOtherSubscribers) {
      this._stopPolling(pollingKey);
    }
  }

  /**
   * Force immediate sync for a subscription
   */
  async forceSync(subscriptionId) {
    const subscription = this.subscribers.get(subscriptionId);
    if (!subscription) return;

    const pollingKey = this._getPollingKey(subscription);
    await this._poll(pollingKey);
  }

  /**
   * Internal: Start polling for a resource
   */
  _startPolling(pollingKey, fetchFunction, interval) {
    const intervalId = setInterval(async () => {
      await this._poll(pollingKey, fetchFunction);
    }, interval);

    this.pollingIntervals.set(pollingKey, { intervalId, fetchFunction });
    
    // Immediate first poll
    this._poll(pollingKey, fetchFunction);
  }

  /**
   * Internal: Stop polling
   */
  _stopPolling(pollingKey) {
    const polling = this.pollingIntervals.get(pollingKey);
    if (polling) {
      clearInterval(polling.intervalId);
      this.pollingIntervals.delete(pollingKey);
      this.lastSyncTimestamps.delete(pollingKey);
    }
  }

  /**
   * Internal: Execute a poll
   */
  async _poll(pollingKey, fetchFunction = null) {
    const polling = this.pollingIntervals.get(pollingKey);
    if (!polling && !fetchFunction) return;

    const fn = fetchFunction || polling.fetchFunction;

    try {
      const newData = await fn();
      const lastSync = this.lastSyncTimestamps.get(pollingKey);

      // Notify relevant subscribers if data changed
      const hasChanged = !lastSync || JSON.stringify(newData) !== JSON.stringify(lastSync.data);
      
      if (hasChanged) {
        this.lastSyncTimestamps.set(pollingKey, { data: newData, timestamp: Date.now() });
        
        // Notify all subscribers for this resource
        Array.from(this.subscribers.entries()).forEach(([subId, sub]) => {
          if (this._getPollingKey(sub) === pollingKey) {
            sub.callback({
              data: newData,
              changed: true,
              timestamp: Date.now()
            });
            sub.lastData = newData;
          }
        });
      }
    } catch (error) {
      console.error(`Polling error for ${pollingKey}:`, error);
      
      // Notify subscribers of error
      Array.from(this.subscribers.entries()).forEach(([subId, sub]) => {
        if (this._getPollingKey(sub) === pollingKey) {
          sub.callback({
            error: error.message,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  /**
   * Internal: Fetch enabler availability
   */
  async _fetchEnablerAvailability(enablerId) {
    const [events, rules] = await Promise.all([
      CalendarEvent.filter({ enabler_id: enablerId }, "-start_datetime", 50),
      AvailabilityRule.filter({ enabler_id: enablerId })
    ]);

    return { events, rules };
  }

  /**
   * Internal: Fetch event bookings
   */
  async _fetchEventBookings(eventId) {
    return await Booking.filter({ event_id: eventId });
  }

  /**
   * Internal: Fetch calendar events
   */
  async _fetchCalendarEvents(enablerId) {
    return await CalendarEvent.filter({ enabler_id: enablerId }, "-start_datetime", 100);
  }

  /**
   * Internal: Get polling key from subscription
   */
  _getPollingKey(subscription) {
    if (subscription.type === 'enabler_availability') return `enabler_${subscription.enablerId}`;
    if (subscription.type === 'event_bookings') return `event_${subscription.eventId}`;
    if (subscription.type === 'calendar_events') return `calendar_${subscription.enablerId}`;
    return null;
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.pollingIntervals.forEach((polling, key) => {
      clearInterval(polling.intervalId);
    });
    
    this.subscribers.clear();
    this.pollingIntervals.clear();
    this.lastSyncTimestamps.clear();
  }
}

// Singleton instance
const syncService = new RealTimeSyncService();

export default syncService;