import { CalendarEvent, EventTimeline, Booking, Enabler, AISchedulingInsight, WorkloadAnalytics, CalendarPreferences, AvailabilityRule } from "@/api/entities";
import { addMinutes, addDays, parseISO, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export const AISchedulingEngine = {
  /**
   * Analyze enabler workload and generate insights
   */
  async analyzeEnablerWorkload(enablerId, period = "weekly") {
    const now = new Date();
    let periodStart, periodEnd;
    
    if (period === "weekly") {
      periodStart = startOfWeek(now);
      periodEnd = endOfWeek(now);
    } else if (period === "monthly") {
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
    } else {
      periodStart = now;
      periodEnd = addDays(now, 1);
    }
    
    // Get all calendar events in period
    const events = await CalendarEvent.filter({ 
      enabler_id: enablerId 
    });
    
    const periodEvents = events.filter(e => {
      const eventDate = parseISO(e.start_datetime);
      return eventDate >= periodStart && eventDate <= periodEnd;
    });
    
    // Calculate metrics
    let totalHours = 0;
    const dailyHours = {};
    const hourlyDistribution = Array(24).fill(0);
    
    for (const event of periodEvents) {
      const start = parseISO(event.start_datetime);
      const end = parseISO(event.end_datetime);
      const duration = differenceInMinutes(end, start) / 60;
      
      totalHours += duration;
      
      const day = start.toISOString().split('T')[0];
      dailyHours[day] = (dailyHours[day] || 0) + duration;
      
      hourlyDistribution[start.getHours()]++;
    }
    
    // Find busiest day
    const busiest = Object.entries(dailyHours).reduce((a, b) => 
      a[1] > b[1] ? a : b, ["", 0]
    );
    
    // Find peak performance hours
    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => `${h.hour}:00-${h.hour + 1}:00`);
    
    // Load preferences to check compliance
    const prefs = await CalendarPreferences.filter({ enabler_id: enablerId });
    const preferences = prefs[0];
    
    let workloadDensity = 0;
    let restCompliance = 1;
    let burnoutRisk = 0;
    const recommendations = [];
    
    if (preferences) {
      const maxHours = period === "weekly" ? preferences.max_hours_per_week : preferences.max_hours_per_day;
      workloadDensity = totalHours / maxHours;
      
      if (workloadDensity > 0.9) {
        burnoutRisk = 0.8;
        recommendations.push("You're approaching your maximum capacity. Consider blocking time for rest.");
      } else if (workloadDensity > 0.7) {
        burnoutRisk = 0.5;
        recommendations.push("Schedule is busy. Ensure adequate breaks between bookings.");
      }
      
      // Check for back-to-back bookings
      const sortedEvents = [...periodEvents].sort((a, b) => 
        parseISO(a.start_datetime) - parseISO(b.start_datetime)
      );
      
      let backToBackCount = 0;
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const end = parseISO(sortedEvents[i].end_datetime);
        const nextStart = parseISO(sortedEvents[i + 1].start_datetime);
        const gap = differenceInMinutes(nextStart, end);
        
        if (gap < preferences.minimum_break_between_bookings_minutes) {
          backToBackCount++;
        }
      }
      
      if (backToBackCount > 0) {
        restCompliance = Math.max(0, 1 - (backToBackCount / sortedEvents.length));
        recommendations.push(`${backToBackCount} bookings don't meet your minimum break time. Consider rescheduling.`);
      }
    }
    
    // Create or update analytics
    const analyticsData = {
      enabler_id: enablerId,
      analysis_period: period,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      total_hours_worked: totalHours,
      total_bookings: periodEvents.length,
      average_booking_duration: periodEvents.length > 0 ? totalHours / periodEvents.length : 0,
      busiest_day: busiest[0],
      busiest_time_range: peakHours.join(", "),
      workload_density: workloadDensity,
      rest_compliance: restCompliance,
      peak_performance_hours: peakHours,
      predicted_burnout_risk: burnoutRisk,
      recommendations
    };
    
    const existing = await WorkloadAnalytics.filter({ 
      enabler_id: enablerId,
      analysis_period: period,
      period_start: analyticsData.period_start
    });
    
    if (existing[0]) {
      await WorkloadAnalytics.update(existing[0].id, analyticsData);
    } else {
      await WorkloadAnalytics.create(analyticsData);
    }
    
    return analyticsData;
  },

  /**
   * Detect scheduling conflicts
   */
  async detectConflicts(enablerId, newEvent) {
    const conflicts = [];
    
    // Get all existing events
    const existingEvents = await CalendarEvent.filter({ 
      enabler_id: enablerId,
      status: ["confirmed", "in_setup", "in_progress"]
    });
    
    const newStart = parseISO(newEvent.start_datetime);
    const newEnd = parseISO(newEvent.end_datetime);
    
    for (const event of existingEvents) {
      const existingStart = parseISO(event.start_datetime);
      const existingEnd = parseISO(event.end_datetime);
      
      // Check for overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        conflicts.push({
          type: "overlap",
          event_id: event.id,
          event_title: event.title,
          message: `Overlaps with "${event.title}" (${existingStart.toLocaleTimeString()} - ${existingEnd.toLocaleTimeString()})`
        });
      }
    }
    
    // Check against availability rules
    const rules = await AvailabilityRule.filter({ enabler_id: enablerId });
    
    for (const rule of rules) {
      if (rule.rule_type === "blackout" && !rule.is_available) {
        const ruleStart = parseISO(rule.start_date);
        const ruleEnd = parseISO(rule.end_date);
        
        if (newStart >= ruleStart && newStart <= ruleEnd) {
          conflicts.push({
            type: "blackout",
            message: "This time falls within a blackout period"
          });
        }
      }
    }
    
    // Check preferences
    const prefs = await CalendarPreferences.filter({ enabler_id: enablerId });
    if (prefs[0]) {
      const dayOfWeek = newStart.toLocaleDateString('en-US', { weekday: 'lowercase' });
      if (!prefs[0].working_days.includes(dayOfWeek)) {
        conflicts.push({
          type: "non_working_day",
          message: "This falls on a non-working day according to your preferences"
        });
      }
    }
    
    return conflicts;
  },

  /**
   * Generate scheduling insights for enabler
   */
  async generateInsights(enablerId) {
    const insights = [];
    
    // Analyze workload
    const analytics = await this.analyzeEnablerWorkload(enablerId, "weekly");
    
    // Workload warning
    if (analytics.workload_density > 0.85) {
      insights.push({
        enabler_id: enablerId,
        insight_type: "workload_warning",
        title: "High Workload Alert",
        message: `You're at ${Math.round(analytics.workload_density * 100)}% capacity this week. Consider blocking time for recovery.`,
        confidence_score: 0.9,
        suggested_action: "Block next weekend for rest",
        priority: "high"
      });
    }
    
    // Rest suggestion
    if (analytics.rest_compliance < 0.7) {
      insights.push({
        enabler_id: enablerId,
        insight_type: "rest_suggestion",
        title: "Insufficient Break Time",
        message: "Several bookings don't meet your minimum break requirements. This may affect performance.",
        confidence_score: 0.85,
        suggested_action: "Add 30min buffer between bookings",
        priority: "medium"
      });
    }
    
    // Optimization opportunity
    if (analytics.peak_performance_hours.length > 0) {
      insights.push({
        enabler_id: enablerId,
        insight_type: "optimization_opportunity",
        title: "Peak Performance Pattern Detected",
        message: `You work best during ${analytics.peak_performance_hours[0]}. Consider prioritizing high-value bookings during this time.`,
        confidence_score: 0.75,
        suggested_action: "Adjust availability to favor peak hours",
        priority: "low"
      });
    }
    
    // Save insights
    for (const insight of insights) {
      const existing = await AISchedulingInsight.filter({
        enabler_id: enablerId,
        insight_type: insight.insight_type,
        status: "pending"
      });
      
      if (existing.length === 0) {
        await AISchedulingInsight.create({
          ...insight,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
      }
    }
    
    return insights;
  },

  /**
   * Optimize event timeline for host
   */
  async optimizeEventTimeline(eventId) {
    const timeline = await EventTimeline.filter({ event_id: eventId });
    if (!timeline[0] || !timeline[0].timeline_items) return null;
    
    const items = timeline[0].timeline_items;
    const conflicts = [];
    const suggestions = [];
    
    // Sort by scheduled start time
    const sortedItems = [...items].sort((a, b) => 
      parseISO(a.scheduled_start) - parseISO(b.scheduled_start)
    );
    
    // Check for overlaps
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const current = sortedItems[i];
      const next = sortedItems[i + 1];
      
      const currentEnd = parseISO(current.teardown_end || current.scheduled_end);
      const nextStart = parseISO(next.setup_start || next.scheduled_start);
      
      if (currentEnd > nextStart) {
        conflicts.push({
          type: "overlap",
          message: `${current.enabler_name} and ${next.enabler_name} have overlapping schedules`,
          affected_enablers: [current.enabler_id, next.enabler_id]
        });
        
        // Suggest adjustment
        const gap = differenceInMinutes(currentEnd, nextStart);
        suggestions.push({
          type: "reschedule",
          message: `Shift ${next.enabler_name} by ${gap + 15} minutes to avoid conflict`,
          action_data: {
            enabler_id: next.enabler_id,
            shift_minutes: gap + 15
          }
        });
      }
    }
    
    // Update timeline with AI analysis
    await EventTimeline.update(timeline[0].id, {
      ai_optimized: true,
      conflict_warnings: conflicts,
      optimization_suggestions: suggestions,
      last_synced: new Date().toISOString()
    });
    
    return { conflicts, suggestions };
  }
};

export default AISchedulingEngine;