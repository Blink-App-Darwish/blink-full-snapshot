
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event, Enabler, User, Package, Wishlist } from "@/api/entities";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, AlertCircle, ChevronUp, ChevronDown, Navigation, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BlinkLogo from "../components/BlinkLogo";
import { InvokeLLM } from "@/api/integrations";
import { format, parseISO } from "date-fns";

export default function EditEventDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = searchParams.get("id");
  
  const [event, setEvent] = useState(null);
  const [offers, setOffers] = useState([]);
  const [enablers, setEnablers] = useState([]);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    guest_count: "",
    budget: ""
  });
  const [isValidating, setIsValidating] = useState(false);
  const [replacements, setReplacements] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedEnabler, setExpandedEnabler] = useState(null);
  const [packages, setPackages] = useState({});
  const [replacementPackages, setReplacementPackages] = useState({});
  const [wishlistedEnablers, setWishlistedEnablers] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Validate event ID exists and is valid
    if (!eventId || eventId === "null" || eventId === "undefined" || eventId === "-" || eventId.trim() === "") {
      console.error("Invalid event ID in EditEventDetails:", eventId);
      navigate(createPageUrl("MyEvents"), { replace: true });
      return;
    }
    
    loadEvent();
  }, [eventId, navigate]); // Added navigate to dependencies

  const loadEvent = async () => { // Renamed from loadEventData
    if (!eventId || eventId === "null" || eventId === "undefined" || eventId === "-" || eventId.trim() === "") {
      // This check is already in useEffect, but good for direct calls if any.
      console.error("Attempted to load event with invalid ID:", eventId);
      return;
    }
    
    try {
      const { BookingOffer } = await import("@/api/entities");
      const user = await User.me();
      setCurrentUser(user);
      
      const eventData = await Event.filter({ id: eventId });
      if (eventData && eventData[0]) { // Check for eventData existence and its first element
        setEvent(eventData[0]);
        setFormData({
          date: eventData[0].date || "",
          location: eventData[0].location || "",
          guest_count: eventData[0].guest_count?.toString() || "",
          budget: eventData[0].budget?.toString() || ""
        });
        
        const offersData = await BookingOffer.filter({ event_id: eventId });
        setOffers(offersData);
        
        const enablerIds = offersData.map(o => o.enabler_id);
        const enablersData = [];
        const packagesData = {};
        for (const id of enablerIds) {
          const enabler = await Enabler.filter({ id });
          if (enabler[0]) {
            enablersData.push(enabler[0]);
            const pkgs = await Package.filter({ enabler_id: id });
            packagesData[id] = pkgs;
          }
        }
        setEnablers(enablersData);
        setPackages(packagesData);
        
        const wishlistData = await Wishlist.filter({ user_id: user.id });
        const wishlistedIds = new Set(wishlistData.map(w => w.enabler_id));
        setWishlistedEnablers(wishlistedIds);
      } else {
        console.error("Event not found with ID:", eventId);
        navigate(createPageUrl("MyEvents"), { replace: true });
      }
    } catch (error) {
      console.error("Error loading event data:", error);
      navigate(createPageUrl("MyEvents"), { replace: true }); // Navigate to MyEvents on error
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange("location", "Near Me");
        },
        (error) => {
          alert("Unable to get your location. Please enter manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const toggleWishlist = async (e, enablerId) => {
    e.stopPropagation();
    
    if (!currentUser) return;
    
    const isWishlisted = wishlistedEnablers.has(enablerId);
    
    try {
      if (isWishlisted) {
        const items = await Wishlist.filter({
          user_id: currentUser.id,
          enabler_id: enablerId
        });
        if (items[0]) {
          await Wishlist.delete(items[0].id);
        }
        setWishlistedEnablers(prev => {
          const next = new Set(prev);
          next.delete(enablerId);
          return next;
        });
      } else {
        await Wishlist.create({
          user_id: currentUser.id,
          enabler_id: enablerId
        });
        setWishlistedEnablers(prev => new Set(prev).add(enablerId));
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const toggleEnablerExpand = (enablerId) => {
    setExpandedEnabler(expandedEnabler === enablerId ? null : enablerId);
  };

  const validateAndReplaceEnablers = async () => {
    if (!hasChanges) {
      alert("No changes detected. Please update at least one field.");
      return;
    }

    setIsValidating(true);
    try {
      const allEnablers = await Enabler.list("-average_rating", 100);
      
      const currentDate = formData.date || event.date;
      const currentGuestCount = parseInt(formData.guest_count) || event.guest_count || 0;
      const currentBudget = parseFloat(formData.budget) || event.budget || 0;
      const currentLocation = formData.location || event.location || "";
      
      const replacementResults = {};
      const packagesData = {};
      
      // Calculate reasonable budget per enabler
      const averageBudgetPerEnabler = offers.length > 0 ? Math.floor(currentBudget / offers.length) : currentBudget;
      
      for (const offer of offers) {
        const enabler = enablers.find(e => e.id === offer.enabler_id);
        if (!enabler) continue;
        
        // FIRST: Check if current enabler meets the new criteria
        let shouldReplace = false;
        let reason = "";
        
        // Check if enabler is WAY too expensive for the budget (more than 80% of total budget)
        // This is more lenient than before
        if (currentBudget > 0 && enabler.base_price) {
          const maxReasonablePrice = currentBudget * 0.8; // Increased from 60% to 80%
          if (enabler.base_price > maxReasonablePrice) {
            shouldReplace = true;
            reason = `Base price $${enabler.base_price} exceeds 80% of your total budget ($${currentBudget}).`;
          }
        }
        
        // Check location
        if (!shouldReplace && currentLocation && currentLocation !== "Near Me" && currentLocation !== "") {
          if (!enabler.location || !enabler.location.toLowerCase().includes(currentLocation.toLowerCase())) {
            shouldReplace = true;
            reason = `Location (${enabler.location || 'Not specified'}) doesn't match required location "${currentLocation}".`;
          }
        }
        
        // ONLY filter and find replacements if current enabler doesn't meet criteria
        if (shouldReplace) {
          // Filter enablers by category first
          let filteredEnablers = allEnablers.filter(e => e.category === enabler.category && e.id !== enabler.id);
          
          // Filter by location if specified
          if (currentLocation && currentLocation !== "Near Me" && currentLocation !== "") {
            const locationFiltered = filteredEnablers.filter(e => 
              e.location && e.location.toLowerCase().includes(currentLocation.toLowerCase())
            );
            
            // Only apply location filter if we have results, otherwise keep all to find alternatives
            if (locationFiltered.length > 0) {
              filteredEnablers = locationFiltered;
            }
          }
          
          // Filter by budget: Only exclude enablers that are way too expensive (more than 80% of total budget)
          if (currentBudget > 0) {
            const maxReasonablePrice = currentBudget * 0.8;
            const budgetFiltered = filteredEnablers.filter(e => 
              !e.base_price || e.base_price <= maxReasonablePrice
            );
            
            // Only apply budget filter if we have results
            if (budgetFiltered.length > 0) {
              filteredEnablers = budgetFiltered;
            }
          }
          
          // If no suitable replacements found, keep the current enabler (don't force replacement)
          if (filteredEnablers.length === 0) {
            console.warn(`No better alternatives found for ${enabler.category}, keeping current enabler: ${enabler.business_name}`);
            continue; // Skip to next enabler, don't show error
          }
          
          const replacementResult = await InvokeLLM({
            prompt: `Find the BEST replacement enabler from this pre-filtered list:
            
            Original Enabler: ${enabler.business_name} (${enabler.category})
            Reason for replacement: ${reason}
            
            REQUIREMENTS:
            - Total Event Budget: $${currentBudget}
            - Number of Enablers: ${offers.length}
            - Target Budget per Enabler: ~$${averageBudgetPerEnabler} (flexible)
            - Location: ${currentLocation || 'Any'}
            - Guest Count: ${currentGuestCount}
            
            Available Enablers (all within reasonable budget range):
            ${filteredEnablers
              .slice(0, 15)
              .map(e => `ID: ${e.id} | ${e.business_name} | Rating: ${e.average_rating || 0} | Base Price: $${e.base_price || 'N/A'} | Location: ${e.location || 'N/A'}`)
              .join('\n')}
            
            Select the enabler with:
            1. Best value for money (good price relative to quality)
            2. HIGHEST rating (prioritize quality)
            3. Best location match if specified
            4. Price that helps keep total event cost within budget
            
            Choose wisely to balance quality and budget constraints.`,
            response_json_schema: {
              type: "object",
              properties: {
                replacement_enabler_id: { type: "string" },
                replacement_reason: { type: "string" }
              },
              required: ["replacement_enabler_id", "replacement_reason"]
            }
          });
          
          const replacementEnabler = filteredEnablers.find(e => e.id === replacementResult.replacement_enabler_id);
          if (replacementEnabler) {
            replacementResults[offer.id] = {
              originalEnabler: enabler,
              newEnabler: replacementEnabler,
              reason: reason,
              replacementReason: replacementResult.replacement_reason
            };
            
            const pkgs = await Package.filter({ enabler_id: replacementEnabler.id });
            packagesData[replacementEnabler.id] = pkgs;
          }
        }
      }
      
      setReplacements(replacementResults);
      setReplacementPackages(packagesData);
      
      if (Object.keys(replacementResults).length === 0) {
        alert("All current enablers meet your new criteria! No replacements needed.");
      } else {
        const totalNewCost = Object.values(replacementResults).reduce((sum, r) => sum + (r.newEnabler.base_price || 0), 0);
        const remainingEnablersCost = enablers
          .filter(e => !Object.values(replacementResults).some(r => r.originalEnabler.id === e.id))
          .reduce((sum, e) => sum + (e.base_price || 0), 0);
        const estimatedTotalCost = totalNewCost + remainingEnablersCost;
        
        const message = `Found ${Object.keys(replacementResults).length} better match(es) for your budget of $${currentBudget}.\n\nEstimated total cost: $${estimatedTotalCost}`;
        alert(message);
      }
    } catch (error) {
      console.error("Error validating enablers:", error);
      alert("Failed to validate enablers. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirm = async () => {
    try {
      await Event.update(eventId, {
        date: formData.date,
        location: formData.location,
        guest_count: parseInt(formData.guest_count) || 0,
        budget: parseFloat(formData.budget) || 0
      });
      
      if (Object.keys(replacements).length > 0) {
        const { BookingOffer } = await import("@/api/entities");
        
        for (const [offerId, replacement] of Object.entries(replacements)) {
          await BookingOffer.update(offerId, {
            enabler_id: replacement.newEnabler.id,
            offered_amount: replacement.newEnabler.base_price || 0,
            custom_requirements: `Replacement for ${replacement.originalEnabler.business_name}. ${replacement.replacementReason}`
          });
        }
      }
      
      navigate(`${createPageUrl("EventDetail")}?id=${eventId}`);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  if (!eventId || eventId === "null" || eventId === "undefined" || eventId === "-" || eventId.trim() === "") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invalid event ID</p>
          <Button onClick={() => navigate(createPageUrl("MyEvents"))}>
            Go to My Events
          </Button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BlinkLogo size="sm" />
            <h1 className="text-xl font-light text-gray-900">Edit Event Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{event.name}</h2>
          <p className="text-sm text-gray-600 mb-6">
            Review and update your event details. We'll check if your enablers still match.
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="date" className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Event Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Location
              </Label>
              <div className="flex gap-2">
                <Input
                  id="location"
                  placeholder="City or venue"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="flex-1 border-emerald-200 focus:border-emerald-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNearMe}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Near Me
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guest_count" className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Guests
                </Label>
                <Input
                  id="guest_count"
                  type="number"
                  placeholder="100"
                  value={formData.guest_count}
                  onChange={(e) => handleChange("guest_count", e.target.value)}
                  className="border-emerald-200 focus:border-emerald-500"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="budget" className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Budget
                </Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="10000"
                  value={formData.budget}
                  onChange={(e) => handleChange("budget", e.target.value)}
                  className="border-emerald-200 focus:border-emerald-500"
                  min="0"
                  step="100"
                />
              </div>
            </div>
          </div>

          {hasChanges && (
            <Button
              onClick={validateAndReplaceEnablers}
              disabled={isValidating}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600"
            >
              {isValidating ? "Validating Enablers..." : "Check Enablers Availability"}
            </Button>
          )}
        </Card>

        {enablers.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Your Event Team</h3>
            <div className="space-y-3">
              {offers.map((offer) => {
                const enabler = enablers.find(e => e.id === offer.enabler_id);
                const replacement = replacements[offer.id];
                
                if (!enabler) return null;
                
                const displayEnabler = replacement ? replacement.newEnabler : enabler;
                const isReplaced = !!replacement;
                const isExpanded = expandedEnabler === displayEnabler.id;
                const currentPackages = isReplaced ? (replacementPackages[displayEnabler.id] || []) : (packages[displayEnabler.id] || []);
                const isWishlisted = wishlistedEnablers.has(displayEnabler.id);
                
                return (
                  <div key={offer.id}>
                    {isReplaced && (
                      <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>{replacement.originalEnabler.business_name}</strong> doesn't meet new criteria. 
                            <strong className="text-emerald-700"> {replacement.newEnabler.business_name}</strong> is a better match.
                          </span>
                        </p>
                      </div>
                    )}
                    
                    <Card 
                      className={`${isReplaced ? 'border-2 border-yellow-300' : 'border border-gray-200'} transition-all relative overflow-hidden`}
                    >
                      <button
                        onClick={(e) => toggleWishlist(e, displayEnabler.id)}
                        className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-all ${
                            isWishlisted 
                              ? "fill-red-500 text-red-500" 
                              : "text-gray-400"
                          }`}
                        />
                      </button>

                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleEnablerExpand(displayEnabler.id)}
                      >
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {displayEnabler.profile_image ? (
                              <img
                                src={displayEnabler.profile_image}
                                alt={displayEnabler.business_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                👤
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{displayEnabler.business_name}</h4>
                                <p className="text-sm text-gray-600 capitalize mb-1 truncate">
                                  {displayEnabler.category.replace(/_/g, ' ')}
                                </p>
                                <Link 
                                  to={`${createPageUrl("EnablerProfile")}?id=${displayEnabler.id}`}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline-offset-2 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Profile
                                </Link>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="ml-1 text-xs font-semibold">
                                      {displayEnabler.average_rating || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {isReplaced && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-2">
                                  Replaced
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2">
                              <span className="text-sm font-semibold text-emerald-600">
                                ${displayEnabler.base_price || offer.offered_amount}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center text-sm text-gray-600">
                          <span>{isExpanded ? "Hide" : "View"} Details</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                        </div>
                      </div>
                      
                      {isExpanded && currentPackages.length > 0 && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <h5 className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">AVAILABLE PACKAGES</h5>
                          {currentPackages.map((pkg) => (
                            <div key={pkg.id} className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm text-gray-900">{pkg.name}</p>
                                  <p className="text-xs text-gray-600 mt-1">{pkg.description}</p>
                                  {pkg.max_guests && (
                                    <p className="text-xs text-gray-500 mt-1">Up to {pkg.max_guests} guests</p>
                                  )}
                                </div>
                                <Badge className="bg-emerald-500 text-white ml-2">${pkg.price}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
          >
            Confirm Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
