/**
 * BLINK LOCATION LOGIC - STAGE 1/5 (FOUNDATION) + STAGE 2/5 (COMPATIBILITY) + STAGE 3/5 (AI/DYNAMIC PENDING)
 *
 * Core utility functions for venue status management and enabler compatibility
 */

export const VENUE_STATUS = {
  WITH_VENUE: 'with_venue',
  WITHOUT_VENUE: 'without_venue',
  PENDING_VENUE: 'pending_venue'
};

// ============================================================================
// STAGE 1: FOUNDATION LAYER
// ============================================================================

export const isVenueCategory = (category) => {
  const venueCategories = ['venue'];
  return venueCategories.includes(category.toLowerCase());
};

export const determineVenueStatus = (selectedCategories) => {
  if (!selectedCategories || selectedCategories.length === 0) {
    return VENUE_STATUS.PENDING_VENUE;
  }

  const hasVenue = selectedCategories.some(cat => isVenueCategory(cat));

  if (hasVenue) {
    return VENUE_STATUS.WITH_VENUE;
  } else {
    return VENUE_STATUS.WITHOUT_VENUE;
  }
};

export const getVenueStatusDisplay = (venueStatus) => {
  const displays = {
    [VENUE_STATUS.WITH_VENUE]: {
      text: 'Venue Confirmed',
      icon: '📍',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    [VENUE_STATUS.WITHOUT_VENUE]: {
      text: 'No Venue Required',
      icon: '🏠',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    [VENUE_STATUS.PENDING_VENUE]: {
      text: 'Pending Venue Confirmation',
      icon: '⏳',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    }
  };

  return displays[venueStatus] || displays[VENUE_STATUS.PENDING_VENUE];
};

export const canProceedWithVenueStatus = (venueStatus, eventStage = 'planning') => {
  return {
    canProceed: true,
    requiresVenue: venueStatus === VENUE_STATUS.PENDING_VENUE,
    warning: venueStatus === VENUE_STATUS.PENDING_VENUE ? 'Venue selection pending' : null
  };
};

export const prepareVenueParameters = (venueStatus, eventData = {}) => {
  const baseParams = {
    venue_status: venueStatus,
    venue_confirmed: venueStatus === VENUE_STATUS.WITH_VENUE,
    selected_categories: eventData.selectedCategories || []
  };

  if (venueStatus === VENUE_STATUS.WITH_VENUE) {
    return {
      ...baseParams,
      venue_capacity: eventData.venue_capacity || null,
      venue_coordinates: eventData.venue_coordinates || null,
      service_area: eventData.service_area || eventData.location || null,
      venue_enabler_id: eventData.venue_enabler_id || null
    };
  } else {
    return {
      ...baseParams,
      venue_capacity: null,
      venue_coordinates: null,
      service_area: null,
      venue_enabler_id: null
    };
  }
};

export const getVenueNextSteps = (venueStatus) => {
  const nextSteps = {
    [VENUE_STATUS.WITH_VENUE]: [
      'Confirm venue details',
      'Check enabler availability in venue area',
      'Verify venue capacity matches guest count'
    ],
    [VENUE_STATUS.WITHOUT_VENUE]: [
      'Select enablers for your event',
      'Coordinate service delivery location',
      'Confirm date and time with enablers'
    ],
    [VENUE_STATUS.PENDING_VENUE]: [
      'Add venue to your event services',
      'Browse available venues in your area',
      'Or specify "No Venue" if not needed'
    ]
  };

  return nextSteps[venueStatus] || nextSteps[VENUE_STATUS.PENDING_VENUE];
};

// ============================================================================
// STAGE 2: SMART COMPATIBILITY LAYER
// ============================================================================

/**
 * Checks if enabler's service area matches event location
 */
export const checkServiceAreaCompatibility = (enabler, eventLocation) => {
  if (!enabler.service_area || !eventLocation) {
    return {
      compatible: true,
      confidence: 0.5,
      reason: 'Service area not specified'
    };
  }

  const enablerArea = enabler.service_area.toLowerCase();
  const eventLoc = eventLocation.toLowerCase();

  // Simple substring match - can be enhanced with geo-coordinates
  const isCompatible = enablerArea.includes(eventLoc) ||
                       eventLoc.includes(enablerArea) ||
                       enablerArea === eventLoc;

  return {
    compatible: isCompatible,
    confidence: isCompatible ? 1.0 : 0,
    reason: isCompatible
      ? `Services ${eventLocation}`
      : `Only services ${enabler.service_area}`
  };
};

/**
 * Checks if enabler has calendar availability for event date
 */
export const checkDateAvailability = (enabler, eventDate, calendarEvents = []) => {
  if (!eventDate) {
    return {
      available: true,
      confidence: 0.5,
      reason: 'Date not specified'
    };
  }

  // Check if enabler has booking on that date
  const hasConflict = calendarEvents.some(event => {
    if (event.enabler_id !== enabler.id) return false;

    const eventDateObj = new Date(eventDate);
    const bookingStart = new Date(event.start_datetime);
    const bookingEnd = new Date(event.end_datetime);

    return eventDateObj >= bookingStart && eventDateObj <= bookingEnd;
  });

  return {
    available: !hasConflict,
    confidence: 1.0,
    reason: hasConflict ? 'Already booked on this date' : 'Available on selected date'
  };
};

/**
 * Checks negotiation framework compatibility
 */
export const checkNegotiationCompatibility = (enabler, eventDetails, frameworks = []) => {
  const enablerFrameworks = frameworks.filter(f => f.enabler_id === enabler.id);

  if (enablerFrameworks.length === 0) {
    return {
      compatible: true,
      confidence: 0.8,
      reason: 'Standard terms apply',
      issues: []
    };
  }

  const issues = [];

  enablerFrameworks.forEach(framework => {
    // Check guest count compatibility
    if (framework.guest_count_pricing?.enabled) {
      const maxGuests = framework.guest_count_pricing.max_guests;
      if (eventDetails.guest_max && maxGuests && eventDetails.guest_max > maxGuests) {
        issues.push(`Max ${maxGuests} guests`);
      }
    }

    // Check schedule flexibility
    if (framework.schedule_flexibility?.blackout_dates) {
      const blackoutDates = framework.schedule_flexibility.blackout_dates;
      if (eventDetails.event_date && blackoutDates.includes(eventDetails.event_date)) {
        issues.push('Date unavailable');
      }
    }
  });

  return {
    compatible: issues.length === 0,
    confidence: issues.length === 0 ? 1.0 : 0.3,
    reason: issues.length === 0 ? 'All terms compatible' : issues.join(', '),
    issues
  };
};

/**
 * Checks venue type compatibility (indoor/outdoor, capacity, etc.)
 */
export const checkVenueTypeCompatibility = (enabler, eventDetails) => {
  const issues = [];

  // Check if enabler has venue-specific requirements
  if (enabler.crucial_details?.venue_requirements) {
    const reqs = enabler.crucial_details.venue_requirements;

    if (reqs.indoor_only && eventDetails.venue_type === 'outdoor') {
      issues.push('Indoor venue required');
    }

    if (reqs.outdoor_only && eventDetails.venue_type === 'indoor') {
      issues.push('Outdoor venue required');
    }

    if (reqs.min_space && eventDetails.venue_space < reqs.min_space) {
      issues.push(`Needs ${reqs.min_space}sqm min`);
    }
  }

  return {
    compatible: issues.length === 0,
    confidence: issues.length === 0 ? 1.0 : 0,
    reason: issues.length === 0 ? 'Venue compatible' : issues.join(', '),
    issues
  };
};

/**
 * Checks travel distance limits
 */
export const checkTravelDistanceCompatibility = (enabler, eventLocation) => {
  if (!enabler.crucial_details?.max_travel_distance) {
    return {
      compatible: true,
      confidence: 0.8,
      reason: 'No distance limit specified'
    };
  }

  // Simplified check - in production, calculate actual distance
  const maxDistance = enabler.crucial_details.max_travel_distance;

  return {
    compatible: true,
    confidence: 0.8,
    reason: `Travels up to ${maxDistance}km`,
    maxDistance
  };
};

/**
 * Checks pricing and budget compatibility
 */
export const checkBudgetCompatibility = (enabler, eventBudget, selectedPackage = null) => {
  if (!eventBudget) {
    return {
      compatible: true,
      confidence: 0.5,
      reason: 'Budget not specified'
    };
  }

  const price = selectedPackage?.price || enabler.base_price || 0;
  const withinBudget = price <= eventBudget;

  return {
    compatible: withinBudget,
    confidence: 1.0,
    reason: withinBudget
      ? 'Within your budget'
      : `Exceeds budget by $${(price - eventBudget).toFixed(0)}`,
    price,
    budget: eventBudget
  };
};

/**
 * MASTER COMPATIBILITY CHECK
 * Runs all compatibility checks and returns comprehensive result
 */
export const checkEnablerCompatibility = (enabler, eventDetails, additionalData = {}) => {
  const { calendarEvents = [], frameworks = [], selectedPackage = null } = additionalData;

  const checks = {
    serviceArea: checkServiceAreaCompatibility(enabler, eventDetails.location),
    dateAvailability: checkDateAvailability(enabler, eventDetails.event_date, calendarEvents),
    negotiation: checkNegotiationCompatibility(enabler, eventDetails, frameworks),
    venueType: checkVenueTypeCompatibility(enabler, eventDetails),
    travelDistance: checkTravelDistanceCompatibility(enabler, eventDetails.location),
    budget: checkBudgetCompatibility(enabler, eventDetails.budget_max, selectedPackage)
  };

  // Calculate overall compatibility
  const compatibilityScores = Object.values(checks)
    .filter(check => check.compatible !== undefined)
    .map(check => check.compatible ? 1 : 0);

  const allCompatible = compatibilityScores.every(score => score === 1);
  const compatibilityRate = compatibilityScores.reduce((a, b) => a + b, 0) / compatibilityScores.length;

  // Collect all issues
  const allIssues = Object.entries(checks)
    .filter(([_, check]) => !check.compatible || (check.issues && check.issues.length > 0))
    .map(([checkName, check]) => ({
      type: checkName,
      reason: check.reason,
      issues: check.issues || []
    }));

  return {
    overall: {
      compatible: allCompatible,
      compatibilityRate,
      status: compatibilityRate === 1 ? 'perfect' : compatibilityRate >= 0.7 ? 'good' : compatibilityRate >= 0.5 ? 'partial' : 'poor'
    },
    checks,
    issues: allIssues,
    badges: generateCompatibilityBadges(checks)
  };
};

/**
 * Generates visual badges based on compatibility checks
 */
export const generateCompatibilityBadges = (checks) => {
  const badges = [];

  if (checks.serviceArea.compatible) {
    badges.push({
      icon: '📍',
      text: 'Services your area',
      color: 'emerald',
      type: 'positive'
    });
  }

  if (checks.dateAvailability.available) {
    badges.push({
      icon: '✅',
      text: 'Available',
      color: 'emerald',
      type: 'positive'
    });
  } else {
    badges.push({
      icon: '❌',
      text: 'Unavailable',
      color: 'red',
      type: 'negative'
    });
  }

  if (checks.budget.compatible) {
    badges.push({
      icon: '💰',
      text: 'In budget',
      color: 'emerald',
      type: 'positive'
    });
  } else {
    badges.push({
      icon: '💸',
      text: 'Over budget',
      color: 'amber',
      type: 'warning'
    });
  }

  if (checks.travelDistance.compatible && checks.travelDistance.maxDistance) {
    badges.push({
      icon: '🚗',
      text: `${checks.travelDistance.maxDistance}km range`,
      color: 'blue',
      type: 'info'
    });
  }

  return badges;
};

/**
 * Gets casual message for "without venue" scenario
 */
export const getWithoutVenueMessage = (enabler) => {
  const messages = [
    `${enabler.business_name} works within their service area`,
    `This pro covers ${enabler.service_area || 'their local area'}`,
    `They'll bring their magic to your location`,
    `Services your area - just let them know where!`
  ];

  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Generates tooltip explaining why enabler isn't available
 */
export const generateUnavailabilityTooltip = (compatibilityResult) => {
  const { issues } = compatibilityResult;

  if (issues.length === 0) {
    return null;
  }

  const reasons = issues.map(issue => issue.reason).filter(Boolean);

  return {
    title: 'Why not available?',
    reasons,
    suggestion: getSuggestionForIssues(issues)
  };
};

/**
 * Provides suggestions based on compatibility issues
 */
const getSuggestionForIssues = (issues) => {
  if (issues.some(i => i.type === 'dateAvailability')) {
    return 'Try selecting a different date or check their availability calendar';
  }

  if (issues.some(i => i.type === 'serviceArea')) {
    return 'Look for professionals who service your area';
  }

  if (issues.some(i => i.type === 'budget')) {
    return 'Consider adjusting your budget or negotiate with the enabler';
  }

  if (issues.some(i => i.type === 'venueType')) {
    return 'Check venue requirements or find a different venue';
  }

  return 'Review event details and try adjusting your requirements';
};

// ============================================================================
// STAGE 3: AI EVENT GENERATION + DYNAMIC PENDING SYSTEM
// ============================================================================

/**
 * Validates AI-generated event for location consistency
 */
export const validateAIGeneratedEvent = (eventData, enablers) => {
  // Use eventData.required_categories for venue determination if available, otherwise assume no categories
  const selectedCategories = eventData.required_categories || [];
  const venueStatus = determineVenueStatus(selectedCategories);
  const issues = [];
  const warnings = [];

  // Check if all enablers are compatible with event location
  if (venueStatus === VENUE_STATUS.WITH_VENUE && eventData.location) {
    enablers.forEach(enabler => {
      const compatibility = checkServiceAreaCompatibility(enabler, eventData.location);
      if (!compatibility.compatible) {
        issues.push(`${enabler.business_name} doesn't service ${eventData.location}`);
      }
    });
  }

  // Check date conflicts
  if (eventData.date) {
    enablers.forEach(enabler => {
      // Would check calendar here in production
      // const availability = checkDateAvailability(enabler, eventData.date);
    });
  }

  // Auto-set pending if no venue
  if (venueStatus === VENUE_STATUS.WITHOUT_VENUE || venueStatus === VENUE_STATUS.PENDING_VENUE) {
    warnings.push('Event will be marked as "Pending Venue Confirmation"');
  }

  return {
    valid: issues.length === 0,
    venueStatus,
    issues,
    warnings,
    requiresVenueConfirmation: venueStatus !== VENUE_STATUS.WITH_VENUE
  };
};

/**
 * Suggests optimal venues based on enabler service areas
 */
export const suggestOptimalVenues = (enablers, hostLocation = null) => {
  // Find overlapping service areas
  const serviceAreas = enablers
    .map(e => e.service_area)
    .filter(Boolean);

  if (serviceAreas.length === 0) {
    return {
      suggestions: [],
      reason: 'No service area information available'
    };
  }

  // Simple overlap detection - in production, use geocoding
  const areaFrequency = {};
  serviceAreas.forEach(area => {
    const normalizedArea = area.toLowerCase();
    areaFrequency[normalizedArea] = (areaFrequency[normalizedArea] || 0) + 1;
  });

  const suggestions = Object.entries(areaFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([area, count]) => ({
      location: area,
      coverage: `${count}/${enablers.length} enablers service this area`,
      confidence: count / enablers.length
    }));

  return {
    suggestions,
    reason: suggestions.length > 0
      ? "Based on your selected professionals' service areas"
      : 'Consider selecting enablers with overlapping service areas'
  };
};

/**
 * Learns from host venue replacement patterns
 */
export const analyzeVenuePreferences = (eventHistory = []) => {
  const preferences = {
    preferred_locations: {},
    venue_types: {},
    capacity_range: { min: null, max: null },
    patterns: []
  };

  eventHistory.forEach(event => {
    if (event.location) {
      const loc = event.location.toLowerCase();
      preferences.preferred_locations[loc] = (preferences.preferred_locations[loc] || 0) + 1;
    }

    if (event.venue_type) {
      preferences.venue_types[event.venue_type] = (preferences.venue_types[event.venue_type] || 0) + 1;
    }

    if (event.venue_capacity) {
      if (preferences.capacity_range.min === null || event.venue_capacity < preferences.capacity_range.min) {
        preferences.capacity_range.min = event.venue_capacity;
      }
      if (preferences.capacity_range.max === null || event.venue_capacity > preferences.capacity_range.max) {
        preferences.capacity_range.max = event.venue_capacity;
      }
    }
  });

  // Identify patterns
  const topLocations = Object.entries(preferences.preferred_locations)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([loc]) => loc);

  if (topLocations.length > 0) {
    preferences.patterns.push(`Prefers ${topLocations.join(', ')}`);
  }

  return preferences;
};

/**
 * Triggers venue confirmation workflow
 */
export const triggerVenueConfirmationWorkflow = async (eventId, venueData, enablers) => {
  console.log('🎯 STAGE 3: Triggering venue confirmation workflow...');

  const workflow = {
    eventId,
    venueData,
    steps: []
  };

  // Step 1: Update event status (e.g., from 'pending_venue' to 'planning' or 'venue_confirmed')
  workflow.steps.push({
    action: 'update_event_status',
    status: 'completed', // Assuming this step means the status update is conceptually done for the workflow init
    timestamp: new Date().toISOString()
  });

  // Step 2: Revalidate compatibility of enablers with the newly confirmed venue details
  workflow.steps.push({
    action: 'revalidate_compatibility',
    status: 'pending', // This action needs to be executed later
    enablersToCheck: enablers.map(e => e.id)
  });

  // Step 3: Notify enablers about the venue confirmation
  workflow.steps.push({
    action: 'notify_enablers',
    status: 'pending', // This action needs to be executed later
    notifications: enablers.map(e => ({
      enabler_id: e.id,
      type: 'venue_confirmed',
      venue_details: { location: venueData.location, coordinates: venueData.coordinates }
    }))
  });

  // Step 4: Update analytics for tracking
  workflow.steps.push({
    action: 'update_analytics',
    status: 'pending', // This action needs to be executed later
    metrics: ['venue_confirmation_time', 'enabler_response_rate']
  });

  console.log('📋 Workflow created:', workflow);

  // In a real application, you would now trigger a backend process
  // that executes these steps. For this utility file, we just define the workflow.
  return workflow;
};

export default {
  // Stage 1
  VENUE_STATUS,
  isVenueCategory,
  determineVenueStatus,
  getVenueStatusDisplay,
  canProceedWithVenueStatus,
  prepareVenueParameters,
  getVenueNextSteps,

  // Stage 2
  checkServiceAreaCompatibility,
  checkDateAvailability,
  checkNegotiationCompatibility,
  checkVenueTypeCompatibility,
  checkTravelDistanceCompatibility,
  checkBudgetCompatibility,
  checkEnablerCompatibility,
  generateCompatibilityBadges,
  getWithoutVenueMessage,
  generateUnavailabilityTooltip,

  // Stage 3
  validateAIGeneratedEvent,
  suggestOptimalVenues,
  analyzeVenuePreferences,
  triggerVenueConfirmationWorkflow
};