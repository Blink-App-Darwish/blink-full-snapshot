import { Event, Booking, Enabler, Contract, NegotiationFramework, CalendarEvent, Package } from "@/api/entities";
import { ConflictReport } from "@/api/entities";
import { checkEnablerCompatibility } from "./VenueLogic";

/**
 * Conflict Analyzer Service - Stage 5/5
 * Analyzes conflicts and generates detailed reports
 */

export const ConflictAnalyzer = {
  /**
   * Main analysis function
   */
  async analyzeConflict(eventId, triggerType, changeDetails = {}) {
    try {
      console.log(`🔍 Analyzing conflict for event: ${eventId}`);
      console.log(`📝 Trigger: ${triggerType}`);

      // Load current state
      const event = (await Event.filter({ id: eventId }))[0];
      if (!event) throw new Error("Event not found");

      const bookings = await Booking.filter({ event_id: eventId });
      const enablers = [];
      const contracts = [];
      const negotiationFrameworks = [];

      for (const booking of bookings) {
        const enabler = (await Enabler.filter({ id: booking.enabler_id }))[0];
        if (enabler) {
          enablers.push(enabler);

          // Load negotiation frameworks
          const frameworks = await NegotiationFramework.filter({ enabler_id: enabler.id, status: "active" });
          negotiationFrameworks.push(...frameworks);
        }

        // Load contracts
        const bookingContracts = await Contract.filter({ booking_id: booking.id });
        contracts.push(...bookingContracts);
      }

      // Initialize conflict flags
      const conflictFlags = {
        service_area_violation: false,
        availability_gap: false,
        negotiation_mismatch: false,
        resource_conflict: false,
        contract_violation: false
      };

      const affectedEnablers = [];
      let maxSeverity = 0;

      // Analyze each enabler
      for (const enabler of enablers) {
        const compatibility = await this.checkEnablerCompatibility(enabler, event, negotiationFrameworks);
        
        if (!compatibility.overall.compatible) {
          const enablerConflict = {
            enabler_id: enabler.id,
            conflict_type: compatibility.primary_issue,
            conflict_reason: compatibility.overall.reason,
            severity: this.getSeverityLevel(compatibility.overall.compatibilityRate)
          };

          affectedEnablers.push(enablerConflict);

          // Update conflict flags
          if (compatibility.serviceArea && !compatibility.serviceArea.compatible) {
            conflictFlags.service_area_violation = true;
          }
          if (compatibility.dateAvailability && !compatibility.dateAvailability.available) {
            conflictFlags.availability_gap = true;
          }
          if (compatibility.negotiation && !compatibility.negotiation.compatible) {
            conflictFlags.negotiation_mismatch = true;
          }

          // Calculate severity
          const severity = this.calculateSeverityScore(compatibility);
          maxSeverity = Math.max(maxSeverity, severity);
        }
      }

      // Check for multi-enabler dependencies
      if (affectedEnablers.length > 1) {
        conflictFlags.resource_conflict = true;
        maxSeverity = Math.min(maxSeverity + 20, 100); // Increase severity for multi-enabler conflicts
      }

      // Check contract violations
      for (const contract of contracts) {
        const violation = this.checkContractViolation(contract, event, changeDetails);
        if (violation) {
          conflictFlags.contract_violation = true;
          maxSeverity = Math.min(maxSeverity + 15, 100);
        }
      }

      // Create conflict report
      const report = await ConflictReport.create({
        event_id: eventId,
        trigger_type: triggerType,
        severity_score: maxSeverity,
        conflict_flags: conflictFlags,
        affected_enablers: affectedEnablers,
        event_snapshot: this.createEventSnapshot(event),
        enabler_snapshots: enablers.map(e => this.createEnablerSnapshot(e)),
        contract_snapshots: contracts.map(c => ({ id: c.id, status: c.status, terms: c.pricing })),
        analysis_metadata: {
          analyzer_version: "5.0.0",
          signals_considered: this.getSignalsConsidered(triggerType),
          confidence_score: this.calculateConfidenceScore(affectedEnablers.length, enablers.length)
        },
        status: "analyzed"
      });

      console.log(`✅ Conflict analysis complete. Severity: ${maxSeverity}, Affected: ${affectedEnablers.length}`);

      return report;

    } catch (error) {
      console.error("Error analyzing conflict:", error);
      throw error;
    }
  },

  /**
   * Check enabler compatibility with enhanced analysis
   */
  async checkEnablerCompatibility(enabler, event, frameworks) {
    // Get calendar events for availability check
    const calendarEvents = await CalendarEvent.filter({ enabler_id: enabler.id });

    // Run base compatibility check
    const compatibility = checkEnablerCompatibility(enabler, {
      location: event.location,
      event_date: event.date,
      guest_min: event.guest_count,
      guest_max: event.guest_count,
      budget_max: event.budget,
      venue_status: event.venue_status
    }, {
      calendarEvents,
      frameworks,
      selectedPackage: null
    });

    // Enhanced analysis
    const enhanced = {
      ...compatibility,
      primary_issue: this.identifyPrimaryIssue(compatibility),
      resolution_difficulty: this.assessResolutionDifficulty(compatibility),
      substitute_viability: this.assessSubstituteViability(enabler, event),
      financial_flexibility: this.assessFinancialFlexibility(enabler, frameworks)
    };

    return enhanced;
  },

  /**
   * Identify primary issue from compatibility check
   */
  identifyPrimaryIssue(compatibility) {
    if (compatibility.dateAvailability && !compatibility.dateAvailability.available) {
      return "availability";
    }
    if (compatibility.serviceArea && !compatibility.serviceArea.compatible) {
      return "service_area";
    }
    if (compatibility.budget && !compatibility.budget.compatible) {
      return "budget";
    }
    if (compatibility.negotiation && !compatibility.negotiation.compatible) {
      return "negotiation_terms";
    }
    return "unknown";
  },

  /**
   * Assess how difficult it will be to resolve
   */
  assessResolutionDifficulty(compatibility) {
    const issues = Object.values(compatibility.checks || {}).filter(c => !c.compatible).length;
    
    if (issues === 0) return "none";
    if (issues === 1 && compatibility.budget && !compatibility.budget.compatible) return "easy";
    if (issues === 1) return "moderate";
    if (issues >= 3) return "difficult";
    return "moderate";
  },

  /**
   * Assess if substitute enablers are viable
   */
  assessSubstituteViability(enabler, event) {
    // Simple heuristic - can be enhanced with actual substitute search
    const hasCommonCategory = true; // Most categories have multiple providers
    const isSpecialized = enabler.niche_specialty && enabler.years_experience > 5;
    
    if (!hasCommonCategory) return "low";
    if (isSpecialized) return "medium";
    return "high";
  },

  /**
   * Assess financial flexibility from frameworks
   */
  assessFinancialFlexibility(enabler, frameworks) {
    if (frameworks.length === 0) return "rigid";

    const hasFlexiblePricing = frameworks.some(f => 
      f.price_flexibility && f.price_flexibility.allow_discount
    );
    const hasFlexibleTerms = frameworks.some(f =>
      f.payment_terms_options && f.payment_terms_options.length > 1
    );

    if (hasFlexiblePricing && hasFlexibleTerms) return "high";
    if (hasFlexiblePricing || hasFlexibleTerms) return "medium";
    return "low";
  },

  /**
   * Check if contract would be violated by changes
   */
  checkContractViolation(contract, event, changeDetails) {
    if (!contract || contract.status === "draft") return false;

    // Check venue restrictions
    if (changeDetails.new_location && contract.event_details) {
      const contractLocation = contract.event_details.location_address;
      if (contractLocation && contractLocation !== changeDetails.new_location) {
        return true;
      }
    }

    // Check date restrictions
    if (changeDetails.new_date && contract.event_details) {
      const contractDate = contract.event_details.start_datetime;
      if (contractDate && contractDate !== changeDetails.new_date) {
        // Check if contract allows rescheduling
        if (!contract.rescheduling_policy || !contract.rescheduling_policy.allowed) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Calculate severity score (0-100)
   */
  calculateSeverityScore(compatibility) {
    let score = 0;

    // Base score from compatibility rate
    score = (1 - (compatibility.overall.compatibilityRate || 0)) * 50;

    // Add points for specific issues
    if (compatibility.dateAvailability && !compatibility.dateAvailability.available) {
      score += 30; // Availability is critical
    }
    if (compatibility.serviceArea && !compatibility.serviceArea.compatible) {
      score += 20; // Service area is important
    }
    if (compatibility.budget && !compatibility.budget.compatible) {
      score += 15; // Budget can often be negotiated
    }

    return Math.min(Math.round(score), 100);
  },

  /**
   * Get severity level from score
   */
  getSeverityLevel(compatibilityRate) {
    if (compatibilityRate >= 0.8) return "low";
    if (compatibilityRate >= 0.5) return "medium";
    if (compatibilityRate >= 0.3) return "high";
    return "critical";
  },

  /**
   * Get signals considered for this trigger type
   */
  getSignalsConsidered(triggerType) {
    const common = [
      "service_area_compatibility",
      "calendar_availability",
      "negotiation_framework_terms",
      "contract_constraints"
    ];

    const specific = {
      "venue_changed": ["travel_distance", "service_area_polygon", "venue_type_requirements"],
      "date_changed": ["calendar_conflicts", "blackout_dates", "surge_pricing_windows"],
      "enabler_cancelled": ["substitute_availability", "category_supply", "quality_match"],
      "contract_revision": ["contract_terms", "payment_schedule", "cancellation_policy"]
    };

    return [...common, ...(specific[triggerType] || [])];
  },

  /**
   * Calculate confidence score
   */
  calculateConfidenceScore(affectedCount, totalCount) {
    if (totalCount === 0) return 0.5;
    
    const impactRatio = affectedCount / totalCount;
    
    // Higher confidence when clear majority affected or unaffected
    if (impactRatio === 0 || impactRatio === 1) return 0.95;
    if (impactRatio < 0.3 || impactRatio > 0.7) return 0.85;
    return 0.7; // Lower confidence in ambiguous cases
  },

  /**
   * Create event snapshot
   */
  createEventSnapshot(event) {
    return {
      id: event.id,
      name: event.name,
      date: event.date,
      location: event.location,
      guest_count: event.guest_count,
      budget: event.budget,
      venue_status: event.venue_status,
      status: event.status,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Create enabler snapshot
   */
  createEnablerSnapshot(enabler) {
    return {
      id: enabler.id,
      business_name: enabler.business_name,
      category: enabler.category,
      service_area: enabler.service_area,
      base_price: enabler.base_price,
      average_rating: enabler.average_rating,
      timestamp: new Date().toISOString()
    };
  }
};

export default ConflictAnalyzer;