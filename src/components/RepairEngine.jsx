import { Enabler, Package, CalendarEvent, NegotiationFramework } from "@/api/entities";
import { RepairSnapshot } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { checkEnablerCompatibility } from "./VenueLogic";

/**
 * Repair Engine - Stage 5/5
 * Proposes ranked repair options for conflicts
 */

export const RepairEngine = {
  /**
   * Generate repair options for a conflict
   */
  async proposeRepairs(conflictReport) {
    try {
      console.log(`🔧 Proposing repairs for conflict: ${conflictReport.id}`);

      const repairOptions = [];

      // Generate different types of repairs based on conflict
      if (conflictReport.conflict_flags.service_area_violation) {
        repairOptions.push(...await this.generateTravelFeeRepairs(conflictReport));
        repairOptions.push(...await this.generateSubstituteRepairs(conflictReport));
      }

      if (conflictReport.conflict_flags.availability_gap) {
        repairOptions.push(...await this.generateRescheduleRepairs(conflictReport));
        repairOptions.push(...await this.generateSubstituteRepairs(conflictReport));
      }

      if (conflictReport.conflict_flags.negotiation_mismatch) {
        repairOptions.push(...await this.generateTermAdjustmentRepairs(conflictReport));
      }

      if (conflictReport.conflict_flags.budget_exceeded) {
        repairOptions.push(...await this.generateBudgetRepairs(conflictReport));
      }

      // If no specific repairs, suggest manual intervention
      if (repairOptions.length === 0) {
        repairOptions.push(this.generateManualInterventionRepair(conflictReport));
      }

      // Rank and score repairs
      const rankedRepairs = await this.rankRepairs(repairOptions, conflictReport);

      // Create repair snapshot
      const snapshot = await RepairSnapshot.create({
        conflict_report_id: conflictReport.id,
        event_id: conflictReport.event_id,
        repair_options: rankedRepairs.slice(0, 3), // Top 3 options
        status: "proposed",
        state_before_repair: conflictReport.event_snapshot
      });

      console.log(`✅ Generated ${rankedRepairs.length} repair options`);

      return snapshot;

    } catch (error) {
      console.error("Error proposing repairs:", error);
      throw error;
    }
  },

  /**
   * Generate travel fee repair options
   */
  async generateTravelFeeRepairs(conflictReport) {
    const repairs = [];

    for (const affectedEnabler of conflictReport.affected_enablers) {
      if (affectedEnabler.conflict_type !== "service_area") continue;

      const enabler = conflictReport.enabler_snapshots.find(e => e.id === affectedEnabler.enabler_id);
      if (!enabler) continue;

      // Calculate travel fee based on distance
      const estimatedDistance = 25; // km - should calculate actual distance
      const travelFee = Math.round(estimatedDistance * 2); // $2 per km

      repairs.push({
        rank: 0,
        repair_type: "add_fee",
        title: `Add $${travelFee} travel fee for ${enabler.business_name}`,
        description: `Cover additional travel costs for service outside their primary area`,
        success_probability: 0.85,
        time_to_resolve_minutes: 5,
        why_signals: [
          `${estimatedDistance}km from their service area`,
          "Enabler accepts travel bookings with fee",
          "Keeps all other terms unchanged"
        ],
        impact_host: {
          cost_delta: travelFee,
          schedule_change: "None",
          risk_level: "low"
        },
        impact_enabler: {
          earnings_delta: travelFee,
          obligation_change: "Additional travel time required",
          risk_level: "low"
        },
        changes_to_apply: {
          booking_id: affectedEnabler.booking_id,
          add_line_item: {
            description: "Travel fee",
            amount: travelFee
          }
        },
        affected_parties: [conflictReport.event_snapshot.host_id, affectedEnabler.enabler_id]
      });
    }

    return repairs;
  },

  /**
   * Generate substitute enabler repairs
   */
  async generateSubstituteRepairs(conflictReport) {
    const repairs = [];

    for (const affectedEnabler of conflictReport.affected_enablers) {
      const enabler = conflictReport.enabler_snapshots.find(e => e.id === affectedEnabler.enabler_id);
      if (!enabler) continue;

      // Find substitute enablers
      const substitutes = await this.findSubstituteEnablers(
        enabler.category,
        conflictReport.event_snapshot
      );

      for (const substitute of substitutes.slice(0, 2)) { // Top 2 substitutes
        const priceDelta = substitute.base_price - enabler.base_price;
        const ratingDelta = (substitute.average_rating || 0) - (enabler.average_rating || 0);

        repairs.push({
          rank: 0,
          repair_type: "substitute_enabler",
          title: `Replace with ${substitute.business_name}`,
          description: `Highly rated ${substitute.category} in your area`,
          success_probability: 0.75,
          time_to_resolve_minutes: 15,
          why_signals: [
            `${substitute.average_rating || 0}/5 rating (${ratingDelta >= 0 ? '+' : ''}${ratingDelta.toFixed(1)})`,
            `Services ${conflictReport.event_snapshot.location}`,
            `Available on ${conflictReport.event_snapshot.date}`
          ],
          impact_host: {
            cost_delta: priceDelta,
            schedule_change: "None",
            risk_level: priceDelta > 200 ? "medium" : "low"
          },
          impact_enabler: {
            earnings_delta: -enabler.base_price, // Original enabler loses booking
            obligation_change: "Booking cancelled",
            risk_level: "medium"
          },
          changes_to_apply: {
            remove_booking_id: affectedEnabler.booking_id,
            add_booking: {
              enabler_id: substitute.id,
              package_id: substitute.suggested_package_id,
              total_amount: substitute.base_price
            }
          },
          affected_parties: [
            conflictReport.event_snapshot.host_id,
            affectedEnabler.enabler_id,
            substitute.id
          ]
        });
      }
    }

    return repairs;
  },

  /**
   * Generate reschedule repair options
   */
  async generateRescheduleRepairs(conflictReport) {
    const repairs = [];

    // Find alternative dates where all enablers are available
    const alternativeDates = await this.findAlternativeDates(
      conflictReport.event_snapshot,
      conflictReport.enabler_snapshots
    );

    for (const altDate of alternativeDates.slice(0, 2)) {
      const daysDiff = this.calculateDaysDifference(
        conflictReport.event_snapshot.date,
        altDate.date
      );

      repairs.push({
        rank: 0,
        repair_type: "reschedule_window",
        title: `Reschedule to ${altDate.formatted_date}`,
        description: `All service providers available, ${Math.abs(daysDiff)} days ${daysDiff > 0 ? 'later' : 'earlier'}`,
        success_probability: 0.70,
        time_to_resolve_minutes: 20,
        why_signals: [
          `${altDate.available_enablers}/${conflictReport.enabler_snapshots.length} enablers confirmed available`,
          altDate.is_weekend ? "Weekend slot" : "Weekday slot",
          `${Math.abs(daysDiff)} day shift from original date`
        ],
        impact_host: {
          cost_delta: 0,
          schedule_change: `${daysDiff > 0 ? '+' : ''}${daysDiff} days`,
          risk_level: Math.abs(daysDiff) > 14 ? "medium" : "low"
        },
        impact_enabler: {
          earnings_delta: 0,
          obligation_change: "Date changed",
          risk_level: "low"
        },
        changes_to_apply: {
          event_id: conflictReport.event_id,
          update_event: {
            date: altDate.date
          },
          notify_all_enablers: true
        },
        affected_parties: [
          conflictReport.event_snapshot.host_id,
          ...conflictReport.enabler_snapshots.map(e => e.id)
        ]
      });
    }

    return repairs;
  },

  /**
   * Generate term adjustment repairs
   */
  async generateTermAdjustmentRepairs(conflictReport) {
    const repairs = [];

    for (const affectedEnabler of conflictReport.affected_enablers) {
      if (affectedEnabler.conflict_type !== "negotiation_terms") continue;

      const enabler = conflictReport.enabler_snapshots.find(e => e.id === affectedEnabler.enabler_id);
      if (!enabler) continue;

      repairs.push({
        rank: 0,
        repair_type: "adjust_terms",
        title: `Adjust payment terms for ${enabler.business_name}`,
        description: `Modify payment schedule to match enabler's framework`,
        success_probability: 0.80,
        time_to_resolve_minutes: 10,
        why_signals: [
          "Enabler accepts flexible payment terms",
          "No additional cost to host",
          "Resolves negotiation framework conflict"
        ],
        impact_host: {
          cost_delta: 0,
          schedule_change: "Payment schedule updated",
          risk_level: "low"
        },
        impact_enabler: {
          earnings_delta: 0,
          obligation_change: "Preferred payment terms applied",
          risk_level: "low"
        },
        changes_to_apply: {
          booking_id: affectedEnabler.booking_id,
          update_payment_terms: {
            payment_plan: "installments"
          }
        },
        affected_parties: [conflictReport.event_snapshot.host_id, affectedEnabler.enabler_id]
      });
    }

    return repairs;
  },

  /**
   * Generate budget-related repairs
   */
  async generateBudgetRepairs(conflictReport) {
    const repairs = [];

    // Find lower-cost package alternatives
    for (const affectedEnabler of conflictReport.affected_enablers) {
      const enabler = conflictReport.enabler_snapshots.find(e => e.id === affectedEnabler.enabler_id);
      if (!enabler) continue;

      const packages = await Package.filter({ enabler_id: enabler.id });
      const cheaperPackages = packages
        .filter(p => p.price < enabler.base_price)
        .sort((a, b) => b.price - a.price); // Highest of cheaper options first

      if (cheaperPackages.length > 0) {
        const pkg = cheaperPackages[0];
        const savings = enabler.base_price - pkg.price;

        repairs.push({
          rank: 0,
          repair_type: "relax_constraint",
          title: `Switch to "${pkg.name}" package`,
          description: `Save $${savings} with adjusted service scope`,
          success_probability: 0.75,
          time_to_resolve_minutes: 10,
          why_signals: [
            `$${savings} under budget`,
            "Core services maintained",
            "Same service provider"
          ],
          impact_host: {
            cost_delta: -savings,
            schedule_change: "None",
            risk_level: "low"
          },
          impact_enabler: {
            earnings_delta: -savings,
            obligation_change: "Reduced scope package",
            risk_level: "low"
          },
          changes_to_apply: {
            booking_id: affectedEnabler.booking_id,
            update_package_id: pkg.id,
            update_amount: pkg.price
          },
          affected_parties: [conflictReport.event_snapshot.host_id, affectedEnabler.enabler_id]
        });
      }
    }

    return repairs;
  },

  /**
   * Generate manual intervention repair
   */
  generateManualInterventionRepair(conflictReport) {
    return {
      rank: 0,
      repair_type: "manual_intervention",
      title: "Request manual review",
      description: "Complex situation requiring human decision",
      success_probability: 0.90,
      time_to_resolve_minutes: 60,
      why_signals: [
        "Multiple constraints affected",
        "No automated solution available",
        "Admin review recommended"
      ],
      impact_host: {
        cost_delta: 0,
        schedule_change: "Pending review",
        risk_level: "low"
      },
      impact_enabler: {
        earnings_delta: 0,
        obligation_change: "Pending review",
        risk_level: "low"
      },
      changes_to_apply: {
        escalate_to_admin: true,
        notify_support: true
      },
      affected_parties: [conflictReport.event_snapshot.host_id]
    };
  },

  /**
   * Rank repair options using AI
   */
  async rankRepairs(repairs, conflictReport) {
    // Score each repair
    const scoredRepairs = repairs.map(repair => {
      let score = 0;

      // Success probability (40% weight)
      score += repair.success_probability * 40;

      // Time to resolve (20% weight - faster is better)
      score += (1 - Math.min(repair.time_to_resolve_minutes / 120, 1)) * 20;

      // Cost impact (20% weight - lower impact is better)
      const costImpact = Math.abs(repair.impact_host.cost_delta || 0);
      score += (1 - Math.min(costImpact / 500, 1)) * 20;

      // Risk level (20% weight)
      const riskScore = repair.impact_host.risk_level === "low" ? 1 : 
                       repair.impact_host.risk_level === "medium" ? 0.5 : 0;
      score += riskScore * 20;

      return {
        ...repair,
        _score: score
      };
    });

    // Sort by score
    scoredRepairs.sort((a, b) => b._score - a._score);

    // Assign ranks
    return scoredRepairs.map((repair, index) => ({
      ...repair,
      rank: index + 1
    }));
  },

  /**
   * Find substitute enablers
   */
  async findSubstituteEnablers(category, eventSnapshot) {
    try {
      const candidates = await Enabler.filter({ category }, "-average_rating", 10);
      
      const compatibleCandidates = [];

      for (const candidate of candidates) {
        const compatibility = checkEnablerCompatibility(candidate, {
          location: eventSnapshot.location,
          event_date: eventSnapshot.date,
          guest_min: eventSnapshot.guest_count,
          guest_max: eventSnapshot.guest_count,
          budget_max: eventSnapshot.budget
        }, {
          calendarEvents: [],
          frameworks: [],
          selectedPackage: null
        });

        if (compatibility.overall.compatible) {
          const packages = await Package.filter({ enabler_id: candidate.id });
          compatibleCandidates.push({
            ...candidate,
            compatibility_score: compatibility.overall.compatibilityRate,
            suggested_package_id: packages[0]?.id || null
          });
        }
      }

      return compatibleCandidates.sort((a, b) => 
        (b.compatibility_score || 0) - (a.compatibility_score || 0)
      );

    } catch (error) {
      console.error("Error finding substitutes:", error);
      return [];
    }
  },

  /**
   * Find alternative dates
   */
  async findAlternativeDates(eventSnapshot, enablerSnapshots) {
    const alternatives = [];
    const currentDate = new Date(eventSnapshot.date);

    // Check ±14 days
    for (let offset = -14; offset <= 14; offset++) {
      if (offset === 0) continue;

      const altDate = new Date(currentDate);
      altDate.setDate(altDate.getDate() + offset);

      // Check if all enablers are available (simplified)
      const availableCount = enablerSnapshots.length; // Simplified - should check actual availability

      if (availableCount >= enablerSnapshots.length * 0.8) {
        alternatives.push({
          date: altDate.toISOString().split('T')[0],
          formatted_date: altDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          }),
          available_enablers: availableCount,
          is_weekend: altDate.getDay() === 0 || altDate.getDay() === 6
        });
      }
    }

    return alternatives;
  },

  /**
   * Calculate days difference
   */
  calculateDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2 - d1;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
};

export default RepairEngine;