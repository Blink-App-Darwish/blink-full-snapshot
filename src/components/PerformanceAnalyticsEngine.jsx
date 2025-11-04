import { base44 } from "@/api/base44Client";

/**
 * Performance Analytics Engine
 * Calculates and tracks performance metrics for enablers and hosts
 */

export class PerformanceAnalyticsEngine {
  /**
   * Calculate enabler performance metrics
   */
  static async calculateEnablerMetrics(enablerId, periodStart, periodEnd) {
    console.log(`📊 Calculating metrics for enabler: ${enablerId}`);

    try {
      const { 
        Booking, 
        BookingWorkflow, 
        Review, 
        Dispute,
        Payout,
        EnablerPerformanceMetrics 
      } = await import("@/api/entities");

      // Get all bookings in period
      const allBookings = await Booking.filter({ enabler_id: enablerId });
      const periodBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.created_date);
        return bookingDate >= new Date(periodStart) && bookingDate <= new Date(periodEnd);
      });

      // Calculate metrics
      const totalBookings = periodBookings.length;
      const completedBookings = periodBookings.filter(b => b.status === "completed").length;
      const cancelledBookings = periodBookings.filter(b => b.status === "cancelled").length;
      
      const cancellationRate = totalBookings > 0 
        ? (cancelledBookings / totalBookings * 100).toFixed(2)
        : 0;

      // Get reviews
      const reviews = await Review.filter({ enabler_id: enablerId });
      const periodReviews = reviews.filter(r => {
        const reviewDate = new Date(r.created_date);
        return reviewDate >= new Date(periodStart) && reviewDate <= new Date(periodEnd);
      });

      const avgRating = periodReviews.length > 0
        ? (periodReviews.reduce((sum, r) => sum + r.rating, 0) / periodReviews.length).toFixed(2)
        : 0;

      // Get workflows for performance tracking
      const workflows = await BookingWorkflow.filter({ enabler_id: enablerId });
      const periodWorkflows = workflows.filter(w => {
        const workflowDate = new Date(w.created_date);
        return workflowDate >= new Date(periodStart) && workflowDate <= new Date(periodEnd);
      });

      // Calculate on-time rate
      const onTimeCount = periodWorkflows.filter(w => {
        return w.performance_score?.timeliness >= 80;
      }).length;

      const onTimeFulfillmentRate = periodWorkflows.length > 0
        ? (onTimeCount / periodWorkflows.length * 100).toFixed(2)
        : 100;

      // Calculate quality score
      const qualityScores = periodWorkflows
        .filter(w => w.performance_score?.overall)
        .map(w => w.performance_score.overall);
      
      const qualityScore = qualityScores.length > 0
        ? (qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length).toFixed(2)
        : 0;

      // Get disputes
      const disputes = await Dispute.filter({ enabler_id: enablerId });
      const periodDisputes = disputes.filter(d => {
        const disputeDate = new Date(d.created_date);
        return disputeDate >= new Date(periodStart) && disputeDate <= new Date(periodEnd);
      });

      const disputesWon = periodDisputes.filter(d => 
        d.resolution?.type === "enabler_payout" || d.resolution?.type === "no_refund"
      ).length;

      // Calculate revenue
      const revenueCents = periodBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      // Calculate badges
      const badges = [];
      if (avgRating >= 4.8) badges.push("⭐ Top Rated");
      if (onTimeFulfillmentRate >= 95) badges.push("⏰ Always On Time");
      if (completedBookings >= 50) badges.push("🏆 Power Professional");
      if (periodDisputes.length === 0) badges.push("✅ Zero Disputes");

      // Create/update metrics
      const metrics = {
        enabler_id: enablerId,
        period_start: periodStart,
        period_end: periodEnd,
        on_time_fulfillment_rate: parseFloat(onTimeFulfillmentRate),
        cancellation_rate: parseFloat(cancellationRate),
        average_rating: parseFloat(avgRating),
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        revenue_cents: revenueCents,
        disputes_count: periodDisputes.length,
        disputes_won: disputesWon,
        quality_score: parseFloat(qualityScore),
        badges_earned: badges,
        financial_metrics: {
          total_earnings: revenueCents / 100,
          average_booking_value: totalBookings > 0 ? revenueCents / totalBookings / 100 : 0,
          refund_ratio: disputesWon / (periodDisputes.length || 1)
        },
        performance_metrics: {
          quality_score: parseFloat(qualityScore),
          sla_adherence: parseFloat(onTimeFulfillmentRate)
        },
        engagement_metrics: {
          client_retention_rate: this.calculateRetentionRate(periodBookings)
        }
      };

      // Save metrics
      const existing = await EnablerPerformanceMetrics.filter({
        enabler_id: enablerId,
        period_start: periodStart
      });

      if (existing[0]) {
        await EnablerPerformanceMetrics.update(existing[0].id, metrics);
      } else {
        await EnablerPerformanceMetrics.create(metrics);
      }

      console.log("✅ Enabler metrics calculated successfully");

      return metrics;

    } catch (error) {
      console.error("Error calculating enabler metrics:", error);
      throw error;
    }
  }

  /**
   * Calculate host performance metrics
   */
  static async calculateHostMetrics(hostId, periodStart, periodEnd) {
    console.log(`📊 Calculating metrics for host: ${hostId}`);

    try {
      const { Event, Booking, Dispute, HostPerformanceMetrics } = await import("@/api/entities");

      // Get events
      const allEvents = await Event.filter({ host_id: hostId });
      const periodEvents = allEvents.filter(e => {
        const eventDate = new Date(e.created_date);
        return eventDate >= new Date(periodStart) && eventDate <= new Date(periodEnd);
      });

      const totalEvents = periodEvents.length;
      const completedEvents = periodEvents.filter(e => e.status === "completed").length;
      const cancelledEvents = periodEvents.filter(e => e.status === "cancelled").length;

      const cancellationRate = totalEvents > 0
        ? (cancelledEvents / totalEvents * 100).toFixed(2)
        : 0;

      // Get bookings for spend calculation
      const allBookings = [];
      for (const event of periodEvents) {
        const eventBookings = await Booking.filter({ event_id: event.id });
        allBookings.push(...eventBookings);
      }

      const totalSpent = allBookings
        .filter(b => b.status === "completed")
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const avgEventValue = totalEvents > 0 ? totalSpent / totalEvents : 0;

      // Get disputes
      const disputes = await Dispute.filter({ opened_by: hostId });
      const periodDisputes = disputes.filter(d => {
        const disputeDate = new Date(d.created_date);
        return disputeDate >= new Date(periodStart) && disputeDate <= new Date(periodEnd);
      });

      const disputesWon = periodDisputes.filter(d =>
        d.resolution?.type === "full_refund" || d.resolution?.type === "partial_refund"
      ).length;

      // Calculate trust score (composite)
      const trustScore = this.calculateTrustScore({
        cancellationRate: parseFloat(cancellationRate),
        disputeRate: periodDisputes.length / (totalEvents || 1),
        completionRate: completedEvents / (totalEvents || 1)
      });

      // Create/update metrics
      const metrics = {
        host_id: hostId,
        period_start: periodStart,
        period_end: periodEnd,
        total_events_created: totalEvents,
        events_completed: completedEvents,
        events_cancelled: cancelledEvents,
        cancellation_rate: parseFloat(cancellationRate),
        average_event_value_cents: Math.round(avgEventValue),
        total_spent_cents: totalSpent,
        disputes_initiated: periodDisputes.length,
        disputes_won: disputesWon,
        trust_score: trustScore,
        financial_metrics: {
          spend_per_event: avgEventValue / 100,
          escrow_volume: totalSpent / 100,
          refund_ratio: disputesWon / (periodDisputes.length || 1)
        },
        performance_metrics: {
          event_satisfaction: 0, // Will be calculated from reviews
          delivery_reliability: (completedEvents / (totalEvents || 1)) * 100
        }
      };

      // Save metrics
      const existing = await HostPerformanceMetrics.filter({
        host_id: hostId,
        period_start: periodStart
      });

      if (existing[0]) {
        await HostPerformanceMetrics.update(existing[0].id, metrics);
      } else {
        await HostPerformanceMetrics.create(metrics);
      }

      console.log("✅ Host metrics calculated successfully");

      return metrics;

    } catch (error) {
      console.error("Error calculating host metrics:", error);
      throw error;
    }
  }

  /**
   * Update global leaderboard
   */
  static async updateLeaderboard(leagueType = "global", category = null, region = null) {
    console.log(`🏆 Updating ${leagueType} leaderboard...`);

    try {
      const { EnablerPerformanceMetrics, Enabler, PerformanceLeague } = await import("@/api/entities");

      // Get current month's metrics
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Get all metrics for period
      let metrics = await EnablerPerformanceMetrics.filter({
        period_start: periodStart
      });

      // Filter by category/region if specified
      if (category || region) {
        const enablers = await Enabler.list();
        const filteredEnablerIds = enablers
          .filter(e => {
            if (category && e.category !== category) return false;
            if (region && e.location !== region) return false;
            return true;
          })
          .map(e => e.id);

        metrics = metrics.filter(m => filteredEnablerIds.includes(m.enabler_id));
      }

      // Calculate composite scores and rank
      const rankings = metrics
        .map(m => ({
          enabler_id: m.enabler_id,
          score: this.calculateCompositeScore(m),
          total_bookings: m.total_bookings,
          average_rating: m.average_rating,
          revenue: m.revenue_cents / 100,
          badges: m.badges_earned || []
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          percentile: ((metrics.length - index) / metrics.length * 100).toFixed(1)
        }));

      // Get enabler names
      for (const ranking of rankings) {
        const enabler = await Enabler.filter({ id: ranking.enabler_id }).then(e => e[0]);
        if (enabler) {
          ranking.enabler_name = enabler.business_name;
        }
      }

      // Create league record
      const league = {
        league_type: leagueType,
        category: category,
        region: region,
        period_start: periodStart,
        period_end: periodEnd,
        rankings: rankings,
        top_performer: rankings[0] || null,
        total_participants: rankings.length,
        last_updated: new Date().toISOString()
      };

      // Save league
      const existing = await PerformanceLeague.filter({
        league_type: leagueType,
        category: category,
        region: region,
        period_start: periodStart
      });

      if (existing[0]) {
        await PerformanceLeague.update(existing[0].id, league);
      } else {
        await PerformanceLeague.create(league);
      }

      console.log(`✅ ${leagueType} leaderboard updated - ${rankings.length} participants`);

      return league;

    } catch (error) {
      console.error("Error updating leaderboard:", error);
      throw error;
    }
  }

  /**
   * Calculate composite performance score
   */
  static calculateCompositeScore(metrics) {
    const weights = {
      quality: 0.30,
      onTime: 0.25,
      volume: 0.20,
      rating: 0.15,
      disputes: 0.10
    };

    const qualityScore = metrics.quality_score || 0;
    const onTimeScore = metrics.on_time_fulfillment_rate || 0;
    const volumeScore = Math.min(metrics.completed_bookings / 100 * 100, 100);
    const ratingScore = (metrics.average_rating / 5) * 100;
    const disputeScore = Math.max(100 - (metrics.disputes_count * 10), 0);

    return (
      qualityScore * weights.quality +
      onTimeScore * weights.onTime +
      volumeScore * weights.volume +
      ratingScore * weights.rating +
      disputeScore * weights.disputes
    ).toFixed(2);
  }

  /**
   * Calculate trust score for hosts
   */
  static calculateTrustScore({ cancellationRate, disputeRate, completionRate }) {
    const cancellationPenalty = cancellationRate * 2;
    const disputePenalty = disputeRate * 50;
    const completionBonus = completionRate * 40;

    const score = 100 - cancellationPenalty - disputePenalty + completionBonus;

    return Math.max(0, Math.min(100, score)).toFixed(2);
  }

  /**
   * Calculate retention rate
   */
  static calculateRetentionRate(bookings) {
    // Simple logic: hosts who rebook within 90 days
    // For now, return estimated value
    return 75; // 75% retention rate (placeholder)
  }
}

export default PerformanceAnalyticsEngine;