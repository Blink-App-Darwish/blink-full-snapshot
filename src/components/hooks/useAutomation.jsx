/**
 * React Hook for Automation Engine
 * Provides easy access to automation functions
 */

import { useCallback } from "react";
import AutomationEngine from "../AutomationEngine";

export function useAutomation() {
  const generateTimeline = useCallback(async (eventId, hostId, bookings) => {
    return await AutomationEngine.generateEventTimeline(eventId, hostId, bookings);
  }, []);

  const logReservationChange = useCallback(async (reservationId, action, statusBefore, statusAfter, actor, details) => {
    return await AutomationEngine.logReservationStateChange(reservationId, action, statusBefore, statusAfter, actor, details);
  }, []);

  const createFinanceEntry = useCallback(async (bookingId) => {
    return await AutomationEngine.createFinanceEntryFromBooking(bookingId);
  }, []);

  const sendWelcomeNotifications = useCallback(async (enablerId, userId) => {
    return await AutomationEngine.triggerWelcomeNotifications(enablerId, userId);
  }, []);

  const syncCalendar = useCallback(async (bookingId) => {
    return await AutomationEngine.syncCalendarFromBooking(bookingId);
  }, []);

  const sendBookingConfirmations = useCallback(async (bookingId) => {
    return await AutomationEngine.sendBookingConfirmationNotifications(bookingId);
  }, []);

  return {
    generateTimeline,
    logReservationChange,
    createFinanceEntry,
    sendWelcomeNotifications,
    syncCalendar,
    sendBookingConfirmations
  };
}