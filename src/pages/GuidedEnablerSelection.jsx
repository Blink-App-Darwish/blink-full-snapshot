
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, Package, Event, User, BookingOffer, Contract, NegotiationFramework, Wishlist } from "@/api/entities";
import { ArrowLeft, ArrowRight, Star, Eye, DollarSign, Check, ChevronDown, ChevronUp, Image, X, ChevronLeft, ChevronRight, FileText, Sparkles, AlertCircle, CheckCircle2, Users, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import BlinkLogo from "../components/BlinkLogo";
import PackageDetailModal from "../components/PackageDetailModal";
import EnablerBrandModal from "../components/EnablerBrandModal";
import GalleryViewer from "../components/GalleryViewer";
import { motion } from "framer-motion";
import {
  checkEnablerCompatibility,
  generateUnavailabilityTooltip,
  getWithoutVenueMessage,
  getVenueStatusDisplay
} from "../components/VenueLogic";

const categoryLabels = {
  event_planner: "Event Planners",
  beauty_specialist: "Beauty & Style Specialists",
  photographer: "Photographers",
  videographer: "Videographers",
  musician: "Musicians",
  venue: "Venues",
  caterer: "Caterers",
  florist: "Florists",
  audio_visual: "Audio/Visual Specialists",
  speaker: "Speakers",
  influencer: "Influencers"
};

export default function GuidedEnablerSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [enablersByCategory, setEnablersByCategory] = useState({});
  const [selectedEnablers, setSelectedEnablers] = useState({});
  const [expandedEnabler, setExpandedEnabler] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState({});
  const [discountPercentage, setDiscountPercentage] = useState({});
  const [packages, setPackages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const [selectedPackageForModal, setSelectedPackageForModal] = useState(null);
  const [selectedEnablerForBrand, setSelectedEnablerForBrand] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState(null);

  const [eventDetails, setEventDetails] = useState(null);

  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiatingEnablerId, setNegotiatingEnablerId] = useState(null);
  const [frameworksForNegotiation, setFrameworksForNegotiation] = useState([]);
  const [expandedFramework, setExpandedFramework] = useState(null);
  const [confirmedFrameworks, setConfirmedFrameworks] = useState({});
  const [negotiationTerms, setNegotiationTerms] = useState({});
  const [favoriteEnablers, setFavoriteEnablers] = useState(new Set());

  const [compatibilityData, setCompatibilityData] = useState({});
  const [showCompatibilityTooltip, setShowCompatibilityTooltip] = useState(null);

  useEffect(() => {
    // Small delay to ensure storage is ready
    const timer = setTimeout(() => {
      loadCategories();
      loadFavorites();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadFavorites = async () => {
    try {
      const user = await User.me();
      if (!user?.id) {
        console.warn("User not logged in, cannot load favorites.");
        return;
      }
      const wishlist = await Wishlist.filter({ user_id: user.id });
      const favoriteIds = new Set(wishlist.map(w => w.enabler_id));
      setFavoriteEnablers(favoriteIds);
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const toggleFavorite = async (e, enabler) => {
    e.stopPropagation();

    try {
      const user = await User.me();
      if (!user?.id) {
        alert("Please log in to save favorites.");
        return;
      }

      const isFavorited = favoriteEnablers.has(enabler.id);

      if (isFavorited) {
        const existing = await Wishlist.filter({
          user_id: user.id,
          enabler_id: enabler.id
        });
        if (existing && existing.length > 0) {
          await Wishlist.delete(existing[0].id);
        }
        setFavoriteEnablers(prev => {
          const next = new Set(prev);
          next.delete(enabler.id);
          return next;
        });
      } else {
        await Wishlist.create({
          user_id: user.id,
          enabler_id: enabler.id,
          enabler_name: enabler.business_name,
          enabler_category: enabler.category,
          enabler_image: enabler.profile_image,
          base_price: enabler.base_price,
          location: enabler.location,
          average_rating: enabler.average_rating
        });
        setFavoriteEnablers(prev => new Set(prev).add(enabler.id));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Failed to update favorites. Please try again.");
    }
  };

  const loadCategories = async () => {
    try {
      console.log('👥 GuidedEnablerSelection: Loading categories...');
      console.log('📦 Current storage state:', {
        localStorage: localStorage.getItem('guidedEventCategories'),
        sessionStorage: sessionStorage.getItem('guidedEventCategories'),
        urlParams: Object.fromEntries(searchParams)
      });
      
      let data = null;
      let dataSource = null;
      
      // Try localStorage FIRST
      const localData = localStorage.getItem('guidedEventCategories');
      if (localData) {
        try {
          data = JSON.parse(localData);
          dataSource = 'localStorage';
          console.log('✅ Loaded from localStorage');
        } catch (e) {
          console.warn('Failed to parse localStorage:', e);
          // If parse fails, treat it as no data and continue to sessionStorage
          data = null; 
        }
      }
      
      // Try sessionStorage if localStorage failed or was empty
      if (!data) {
        const sessionData = sessionStorage.getItem('guidedEventCategories');
        if (sessionData) {
          try {
            data = JSON.parse(sessionData);
            dataSource = 'sessionStorage';
            console.log('✅ Loaded from sessionStorage');
          } catch (e) {
            console.warn('Failed to parse sessionStorage:', e);
            // If parse fails, treat it as no data
            data = null;
          }
        }
      }
      
      // All methods failed
      if (!data) {
        console.error('❌ No session data found');
        alert("Your event details were lost. Please start the event creation process again.");
        
        sessionStorage.clear(); // Clear all session storage as a precaution
        localStorage.removeItem('guidedEventCategories');
        localStorage.removeItem('event_flow_active'); // Ensure this is also cleared
        
        window.location.href = createPageUrl("GuidedEventCreation"); // Full page reload
        return;
      }
      
      console.log(`✅ Data loaded from: ${dataSource}`);
      await loadDataFromObject(data);
      
    } catch (error) {
      console.error("❌ Error loading data:", error);
      alert("Failed to load event data. Redirecting to start.");
      // Clear relevant storage and redirect on any error during loading or parsing
      sessionStorage.clear();
      localStorage.removeItem('guidedEventCategories');
      localStorage.removeItem('event_flow_active');
      window.location.href = createPageUrl("GuidedEventCreation");
    } finally {
      setIsLoading(false); // Ensure loading state is reset even if there's an error
    }
  };

  const loadDataFromObject = async (data) => {
    const categories = data.categories || [];
    
    if (!categories || categories.length === 0) {
      // This will be caught by the outer try-catch in loadCategories,
      // leading to the full reset and redirect.
      throw new Error("No categories found in loaded data."); 
    }

    setSelectedCategories(Array.isArray(categories) ? categories : [categories]);
    setEventDetails(data);

    console.log('👥 Loading enablers for categories:', categories);

    const enablersData = {};
    const packagesData = {};
    const compatibilityResults = {};

    for (const category of (Array.isArray(categories) ? categories : [categories])) {
      const enablers = await Enabler.filter({ category }, "-average_rating", 10);
      console.log(`Loaded ${enablers.length} enablers for category:`, category);
      enablersData[category] = enablers;

      for (const enabler of enablers) {
        const pkgs = await Package.filter({ enabler_id: enabler.id });
        packagesData[enabler.id] = pkgs;

        const compatibility = checkEnablerCompatibility(enabler, data, {
          calendarEvents: [],
          frameworks: [],
          selectedPackage: null
        });

        compatibilityResults[enabler.id] = compatibility;
      }
    }

    setEnablersByCategory(enablersData);
    setPackages(packagesData);
    setCompatibilityData(compatibilityResults);

    console.log('✅ Enablers loaded with compatibility data');
  };

  const handleSelectEnabler = (category, enabler) => {
    if (selectedEnablers[category]?.id === enabler.id) {
      setSelectedEnablers(prev => {
        const newState = { ...prev };
        delete newState[category];
        return newState;
      });
      setExpandedEnabler(null);
      setSelectedPackages(prev => {
        const newState = { ...prev };
        delete newState[enabler.id];
        return newState;
      });
      setDiscountPercentage(prev => {
        const newState = { ...prev };
        delete newState[enabler.id];
        return newState;
      });
      return;
    }

    setSelectedEnablers(prev => ({
      ...prev,
      [category]: enabler
    }));

    setExpandedEnabler(enabler.id);

    setSelectedPackages(prev => ({
      ...prev,
      [enabler.id]: null
    }));
    setDiscountPercentage(prev => ({
      ...prev,
      [enabler.id]: 0
    }));
  };

  const handleSelectPackage = (enablerId, pkg) => {
    setSelectedPackages(prev => ({
      ...prev,
      [enablerId]: pkg
    }));

    let foundEnabler = null;
    for (const categoryKey in enablersByCategory) {
      const enablerList = enablersByCategory[categoryKey];
      foundEnabler = enablerList.find(e => e.id === enablerId);
      if (foundEnabler) break;
    }

    setSelectedPackageForModal({
      ...pkg,
      enabler_id: enablerId,
      enabler_name: foundEnabler ? foundEnabler.business_name : 'Unknown Enabler'
    });

    setDiscountPercentage(prev => ({
      ...prev,
      [enablerId]: 0
    }));
  };

  const getOfferedAmount = (enabler) => {
    const pkg = selectedPackages[enabler.id];

    if (!pkg) {
      return 0;
    }

    const discount = discountPercentage[enabler.id] || 0;
    return pkg.price * (1 - discount / 100);
  };

  const handleViewPortfolio = async (enabler) => {
    try {
      const fullEnablerData = await Enabler.filter({ id: enabler.id });
      if (fullEnablerData && fullEnablerData[0]) {
        setSelectedEnablerForBrand(fullEnablerData[0]);
      } else {
        setSelectedEnablerForBrand(enabler);
      }
    } catch (error) {
      console.error("Error loading full enabler profile:", error);
      setSelectedEnablerForBrand(enabler);
    }
  };

  const getTotalCost = () => {
    let total = 0;
    Object.entries(selectedEnablers).forEach(([, enabler]) => {
      total += getOfferedAmount(enabler);
    });
    return total;
  };

  const handleContinueToReview = async () => {
    if (Object.keys(selectedEnablers).length === 0) {
      alert("Please select at least one service provider before proceeding to review.");
      return;
    }

    try {
      setIsNavigating(true);

      console.log('💾 SAVING TO SESSION STORAGE');
      console.log('Event Details:', eventDetails);
      console.log('Selected Enablers State:', selectedEnablers);
      console.log('Selected Packages State:', selectedPackages);
      console.log('Discount Percentage State:', discountPercentage);
      console.log('Compatibility Data:', compatibilityData);

      // Prepare data for review page
      const enablersForBooking = Object.entries(selectedEnablers).map(([category, enabler]) => {
        const pkg = selectedPackages[enabler.id];
        const suggestedPrice = getOfferedAmount(enabler); // This calculates price with discount

        return {
          id: enabler.id, // Primary key for Enabler entity
          enabler_id: enabler.id,
          business_name: enabler.business_name,
          profile_image: enabler.profile_image,
          category: enabler.category,
          base_price: enabler.base_price,
          suggested_price: suggestedPrice, // This now reflects potential negotiation
          selected_package_id: pkg?.id || null,
          selected_package_name: pkg?.name || null,
          role_description: `${categoryLabels[category] || category.replace(/_/g, ' ')} specialist for your event`,
          compatibility_status: compatibilityData[enabler.id]?.overall?.status || 'compatible',
          negotiation_discount_percentage: discountPercentage[enabler.id] || 0
        };
      });

      const totalCostCalculated = enablersForBooking.reduce((sum, e) => sum + (e.suggested_price || 0), 0);

      const bookingData = {
        eventDetails: eventDetails, // Full event details
        variation: { // Backward compatibility and general event info
          name: eventDetails?.event_name || "My Event",
          type: "other", // Or derive from eventDetails.event_type
          date: eventDetails?.event_date || new Date().toISOString().split('T')[0],
          location: eventDetails?.location || "",
          guest_count: eventDetails?.guest_min || 0,
          budget: eventDetails?.budget_max || 0,
          theme: "Custom event created through wizard",
          vibe: "Personalized"
        },
        enablers: enablersForBooking,
        eventImage: null, // Consistent with existing handleNext
        totalCost: totalCostCalculated,
        timestamp: Date.now()
      };

      console.log('📦 Booking data to save:', bookingData);

      // Save to sessionStorage with multiple keys for redundancy
      const dataString = JSON.stringify(bookingData);
      sessionStorage.setItem('pendingEventBooking', dataString);
      sessionStorage.setItem('blink_review_data', dataString); // Use this for review page to load data

      // Also save to localStorage as backup
      localStorage.setItem('pendingEventBooking', dataString);

      console.log('✅ Saved to sessionStorage successfully');
      console.log('✅ Session key exists (pendingEventBooking):', !!sessionStorage.getItem('pendingEventBooking'));
      console.log('✅ Session key exists (blink_review_data):', !!sessionStorage.getItem('blink_review_data'));

      // Mark event flow as active
      sessionStorage.setItem('event_flow_active', 'true');
      sessionStorage.setItem('event_flow_stage', 'review');

      // Clear the guided flow specific items (as per existing logic in handleNext)
      sessionStorage.removeItem('guidedEventCategories');
      localStorage.removeItem('guidedEventCategories');
      sessionStorage.removeItem('event_flow_active'); // Clear this as the guided flow ends here
      localStorage.removeItem('event_flow_active'); // Clear this as the guided flow ends here

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before navigation

      // Navigate to review page
      navigate(createPageUrl("ReviewEventBooking"), { replace: true }); // Using replace:true to avoid going back to selection on browser back button
      
    } catch (error) {
      console.error('❌ Error saving to sessionStorage or navigating:', error);
      alert('Failed to save booking data or navigate. Please try again.');
    } finally {
      setIsNavigating(false); // Reset navigation state regardless of success or failure
    }
  };

  const handleNext = async () => {
    if (isNavigating) return;

    const currentCategory = selectedCategories[currentCategoryIndex];
    const currentEnabler = selectedEnablers[currentCategory];

    if (!currentEnabler && enablersByCategory[currentCategory]?.length > 0) {
      alert("Please select a professional for this category.");
      return;
    }

    if (currentEnabler && !selectedPackages[currentEnabler.id]) {
      alert("Please select a package for the chosen professional.");
      return;
    }

    if (currentCategoryIndex < selectedCategories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    } else {
      // Last category, proceed to review using the new handling
      handleContinueToReview();
    }
  };

  const handleBack = () => {
    if (isNavigating) return;

    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    } else {
      navigate(createPageUrl("EventDetailsCollection"));
    }
  };

  const openNegotiationModal = async (enablerId) => {
    const pkg = selectedPackages[enablerId];
    if (!pkg || !pkg.negotiation_framework_ids || pkg.negotiation_framework_ids.length === 0) {
      return;
    }

    const frameworks = [];
    for (const fid of pkg.negotiation_framework_ids) {
      const fw = await NegotiationFramework.filter({ id: fid });
      if (fw && fw[0]) {
        frameworks.push(fw[0]);
      }
    }

    setFrameworksForNegotiation(frameworks);
    setNegotiatingEnablerId(enablerId);

    const initialTerms = {};
    const initialConfirmed = {};
    frameworks.forEach(fw => {
      initialConfirmed[fw.id] = false;
      initialTerms[fw.id] = {};

      if (fw.price_flexibility?.allow_discount) {
        initialTerms[fw.id].discount = 0;
      }
      if (fw.schedule_flexibility?.allow_date_changes) {
        initialTerms[fw.id].flexibleScheduling = true;
      }
      if (fw.payment_terms_options && fw.payment_terms_options.length > 0) {
        initialTerms[fw.id].paymentPlan = fw.payment_terms_options[0];
      }
    });

    setExpandedFramework(null);
    setConfirmedFrameworks(initialConfirmed);
    setNegotiationTerms(initialTerms);
    setShowNegotiationModal(true);
  };

  const toggleFrameworkExpand = (frameworkId) => {
    setExpandedFramework(expandedFramework === frameworkId ? null : frameworkId);
  };

  const confirmFramework = (frameworkId) => {
    setConfirmedFrameworks(prev => ({
      ...prev,
      [frameworkId]: true
    }));
    setExpandedFramework(null);
  };

  const updateNegotiationTerm = (frameworkId, key, value) => {
    setNegotiationTerms(prev => ({
      ...prev,
      [frameworkId]: {
        ...prev[frameworkId],
        [key]: value
      }
    }));
  };

  const handleApplyNegotiation = () => {
    const activeFrameworks = Object.keys(confirmedFrameworks).filter(id => confirmedFrameworks[id]);

    let effectiveDiscount = 0;
    activeFrameworks.forEach(fid => {
      const fw = frameworksForNegotiation.find(f => f.id === fid);
      if (fw?.price_flexibility?.allow_discount && negotiationTerms[fid]?.discount) {
        effectiveDiscount = Math.max(effectiveDiscount, negotiationTerms[fid].discount);
      }
    });

    if (negotiatingEnablerId) {
      setDiscountPercentage(prev => ({
        ...prev,
        [negotiatingEnablerId]: effectiveDiscount
      }));
    }

    setShowNegotiationModal(false);
  };

  const getNegotiationSummary = () => {
    const activeFrameworks = Object.keys(confirmedFrameworks).filter(id => confirmedFrameworks[id]);
    const summary = [];

    activeFrameworks.forEach(fid => {
      const fw = frameworksForNegotiation.find(f => f.id === fid);
      const terms = negotiationTerms[fid];

      if (fw?.price_flexibility?.allow_discount && terms?.discount > 0) {
        summary.push(`${terms.discount}% price discount`);
      }
      if (fw?.schedule_flexibility?.allow_date_changes && terms?.flexibleScheduling) {
        summary.push(`Flexible scheduling`);
      }
      if (fw?.payment_terms_options && terms?.paymentPlan) {
        summary.push(`${terms.paymentPlan.replace(/_/g, ' ')} payment`);
      }
      if (fw?.quick_accept_bonus?.enabled) {
        summary.push(`Quick accept bonus`);
      }
      if (fw?.package_customization?.allow_modifications) {
        summary.push(`Package customization`);
      }
    });

    return summary;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <BlinkLogo size="md" className="animate-breath" />
      </div>
    );
  }

  const currentCategory = selectedCategories[currentCategoryIndex];
  const enablers = enablersByCategory[currentCategory] || [];
  const selectedEnabler = selectedEnablers[currentCategory];
  const progress = ((currentCategoryIndex + 1) / selectedCategories.length) * 100;

  const venueStatusDisplay = getVenueStatusDisplay(eventDetails?.venue_status || 'pending_venue');

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 z-10">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full h-8 w-8"
            disabled={isNavigating}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-light text-gray-900">Build Your Dream Team</h1>
        </div>

        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: '#FCD9B8',
                filter: 'saturate(0.8)'
              }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">
            Step {currentCategoryIndex + 1} of {selectedCategories.length}: Choose your {categoryLabels[currentCategory] || currentCategory}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-24 pb-32">
        <div className="text-center mb-3">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-2 bg-transparent">
            <span className="text-3xl animate-bounce-gentle">
              {currentCategory === 'event_planner' ? '📋' :
                currentCategory === 'beauty_specialist' ? '💄' :
                  currentCategory === 'photographer' ? '📸' :
                    currentCategory === 'videographer' ? '🎥' :
                      currentCategory === 'musician' ? '🎵' :
                        currentCategory === 'venue' ? '🏛️' :
                          currentCategory === 'caterer' ? '🍽️' :
                            currentCategory === 'florist' ? '💐' :
                              currentCategory === 'audio_visual' ? '🎬' :
                                currentCategory === 'speaker' ? '🎤' :
                                  currentCategory === 'influencer' ? '⭐' : '✨'}
            </span>
          </div>
          <h2 className="text-2xl font-light text-gray-900">
            {categoryLabels[currentCategory] || currentCategory}
          </h2>
        </div>

        {eventDetails?.venue_status === 'without_venue' && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900">Heads up!</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  These pros work within their service areas. Pick your faves and coordinate the location details with them after booking!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {enablers.map((enabler) => {
            const isSelected = selectedEnablers[currentCategory]?.id === enabler.id;
            const isExpanded = expandedEnabler === enabler.id;
            const enablerPackages = packages[enabler.id] || [];
            const selectedPkg = selectedPackages[enabler.id];

            const compatibility = compatibilityData[enabler.id] || { overall: { compatible: true, status: 'good' }, badges: [], issues: [] };
            const tooltip = generateUnavailabilityTooltip(compatibility);
            const showTooltip = showCompatibilityTooltip === enabler.id;

            return (
              <Card
                key={enabler.id}
                className={`overflow-hidden transition-all duration-300 relative ${
                  isSelected
                    ? 'border-2 shadow-lg'
                    : 'border hover:border-[#FCD9B8]'
                }`}
                style={{
                  borderColor: isSelected ? '#FCD9B8' : '#E5E7EB',
                  opacity: compatibility.overall.compatible ? 1 : 0.6
                }}
              >
                {!compatibility.overall.compatible && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCompatibilityTooltip(showTooltip ? null : enabler.id);
                      }}
                      className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center hover:bg-amber-200 transition-colors"
                    >
                      <span className="text-xs">⚠️</span>
                    </button>

                    {showTooltip && tooltip && (
                      <div className="absolute top-8 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-20">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-gray-900">{tooltip.title}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCompatibilityTooltip(null);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </div>
                        <ul className="space-y-1 mb-2">
                          {tooltip.reasons.map((reason, idx) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                        {tooltip.suggestion && (
                          <p className="text-xs text-emerald-600 font-medium border-t border-gray-100 pt-2">
                            💡 {tooltip.suggestion}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="p-4 cursor-pointer"
                  onClick={() => handleSelectEnabler(currentCategory, enabler)}
                >
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0 gap-1">
                      <div className="w-16 h-16 rounded-lg overflow-hidden" style={{
                        backgroundColor: '#FFF5EB',
                        border: '1px solid #FCD9B8',
                        filter: 'saturate(0.8)'
                      }}>
                        {enabler.profile_image ? (
                          <img
                            src={enabler.profile_image}
                            alt={enabler.business_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            👤
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(e, enabler);
                        }}
                        className="p-1 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all border border-gray-100"
                        aria-label={favoriteEnablers.has(enabler.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-all ${
                            favoriteEnablers.has(enabler.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-gray-900 truncate">
                          {enabler.business_name}
                        </h3>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2" style={{
                            backgroundColor: '#155E63',
                            filter: 'saturate(0.8)'
                          }}>
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {enabler.tagline || enabler.description}
                      </p>

                      {compatibility.badges && compatibility.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {compatibility.badges.map((badge, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                                badge.type === 'positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  badge.type === 'negative' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    badge.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                      'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <span className="text-xs">{badge.icon}</span>
                              <span>{badge.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {enabler.niche_specialty && (
                        <p className="text-xs font-medium mb-2" style={{ color: '#155E63' }}>
                          {enabler.niche_specialty}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 text-sm font-semibold">{enabler.average_rating || 0}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({enabler.total_reviews || 0} reviews)
                        </span>
                        {enabler.base_price && (
                          <span className="ml-auto text-xs font-bold px-2 py-1 rounded-md border-2" style={{
                            color: '#155E63',
                            borderColor: '#4DB398',
                            backgroundColor: 'transparent'
                          }}>
                            From ${enabler.base_price}
                          </span>
                        )}
                      </div>

                      {eventDetails?.venue_status === 'without_venue' && compatibility.overall.compatible && (
                        <p className="text-[10px] text-blue-600 italic">
                          {getWithoutVenueMessage(enabler)}
                        </p>
                      )}

                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPortfolio(enabler);
                          }}
                          className="text-xs hover:opacity-70 font-medium hover:underline underline-offset-2 transition-colors"
                          style={{ color: '#155E63' }}
                        >
                          View Portfolio
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && isExpanded && (
                  <div className="border-t max-h-96 overflow-y-auto" style={{
                    borderColor: '#FCD9B8',
                    background: 'rgba(252, 217, 184, 0.03)',
                    filter: 'saturate(0.8)'
                  }}>
                    <div className="p-3 space-y-2">
                      {enablerPackages.length > 0 && (
                        <div>
                          <p className="text-xs font-medium tracking-wide mb-2" style={{ color: '#D4A574' }}>
                            PACKAGES & THEMES
                          </p>
                          <div className="space-y-2">
                            {enablerPackages.map((pkg) => {
                              const isPackageSelected = selectedPkg?.id === pkg.id;

                              return (
                                <div
                                  key={pkg.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectPackage(enabler.id, pkg);
                                  }}
                                  className="rounded-lg border-2 cursor-pointer transition-all overflow-hidden"
                                  style={{
                                    borderColor: isPackageSelected ? '#FCD9B8' : '#E5E7EB',
                                    backgroundColor: isPackageSelected ? 'rgba(252, 217, 184, 0.1)' : 'white',
                                    filter: 'saturate(0.8)'
                                  }}
                                >
                                  <div className="flex gap-2 p-2">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                      {pkg.thumbnail_image ? (
                                        <img
                                          src={pkg.thumbnail_image}
                                          alt={pkg.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Image className="w-6 h-6 text-gray-300" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-gray-900 truncate">{pkg.name}</p>
                                      <p className="text-xs text-gray-600 line-clamp-1 mb-1">{pkg.description}</p>

                                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-600">
                                        {pkg.max_guests && (
                                          <div className="flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded">
                                            <Users className="w-3 h-3" />
                                            <span>{pkg.max_guests}</span>
                                          </div>
                                        )}
                                        {pkg.crucial_details?.cuisine && (
                                          <div className="flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded">
                                            <span>🍽️</span>
                                            <span>{pkg.crucial_details.cuisine}</span>
                                          </div>
                                        )}
                                        {pkg.crucial_details?.allergens && pkg.crucial_details.allergens.length > 0 && (
                                          <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded">
                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                            <span className="text-amber-700">{pkg.crucial_details.allergens.length}</span>
                                          </div>
                                        )}
                                        {pkg.crucial_details?.duration && (
                                          <div className="flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded">
                                            <span>⏱️</span>
                                            <span>{pkg.crucial_details.duration}</span>
                                          </div>
                                        )}
                                      </div>

                                      {pkg.allow_negotiations && (
                                        <p className="text-[10px] mt-1 font-medium" style={{ color: '#D4A574' }}>
                                          Negotiable up to {pkg.max_discount_percentage}% off
                                        </p>
                                      )}
                                    </div>

                                    <span className="text-xs font-bold px-2 py-1 rounded-md border-2 self-start" style={{
                                      color: '#155E63',
                                      borderColor: '#4DB398',
                                      backgroundColor: 'transparent'
                                    }}>
                                      ${pkg.price}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedPkg && selectedPkg.package_images && selectedPkg.package_images.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium tracking-wide mb-2" style={{ color: '#D4A574' }}>
                            IDEAS
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedPkg.package_images.slice(0, 6).map((img, idx) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                                <img src={img} alt={`Idea ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                          {selectedPkg.package_images.length > 6 && (
                            <p className="text-xs mt-2" style={{ color: '#D4A574' }}>
                              +{selectedPkg.package_images.length - 6} more ideas
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {Object.keys(selectedEnablers).length > 0 && (
          <Card className="p-4 mb-6" style={{
            backgroundColor: 'rgba(252, 217, 184, 0.1)',
            border: '1px solid #FCD9B8',
            filter: 'saturate(0.8)'
          }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>
                Selected So Far ({Object.keys(selectedEnablers).length})
              </span>
              <span className="text-base font-bold px-2 py-1 rounded-md border-2" style={{
                color: '#155E63',
                borderColor: '#4DB398',
                backgroundColor: 'transparent'
              }}>
                ${getTotalCost().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(selectedEnablers).map(([category, enabler]) => {
                const pkg = selectedPackages[enabler.id];
                const amount = pkg ? getOfferedAmount(enabler) : 0;

                return (
                  <div key={category}>
                    <div className="flex justify-between items-center text-xs" style={{ color: '#D4A574' }}>
                      <div className="flex-1 min-w-0">
                        <span className="truncate">{enabler.business_name}</span>
                        {pkg && <span className="ml-1" style={{ color: '#155E63' }}>({pkg.name})</span>}
                      </div>
                      <span className="font-semibold ml-2">
                        {amount > 0 ? `$${amount.toFixed(2)}` : 'No package selected'}
                      </span>
                    </div>

                    {pkg && pkg.allow_negotiations && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNegotiationModal(enabler.id);
                        }}
                        className="mt-2 w-full text-left text-xs px-3 py-2 rounded-lg transition-all relative overflow-hidden group"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(132, 204, 22, 0.15) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(132, 204, 22, 0.25) 100%)',
                          }}
                        />

                        <div className="relative flex items-center justify-between">
                          <span style={{
                            background: 'linear-gradient(135deg, #3B82F6 0%, #84CC16 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontWeight: '600'
                          }}>
                            💡 Negotiations available on {pkg.name}
                          </span>
                          <ChevronRight className="w-3 h-3" style={{ color: '#3B82F6' }} />
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {(selectedEnablers[currentCategory] && selectedPackages[selectedEnablers[currentCategory]?.id]) || enablersByCategory[currentCategory]?.length === 0 ? (
        <div className="fixed right-4 z-50 pointer-events-none" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            onClick={handleNext}
            className="pointer-events-auto px-6 py-3 text-sm font-bold rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(75,158,158,0.6)] transition-all flex items-center justify-center gap-2 border-2 active:scale-95 hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: '#1FAB89',
              color: '#155E63',
              boxShadow: '0 0 25px rgba(27, 171, 137, 0.4), 0 8px 16px rgba(0, 0, 0, 0.15)'
            }}
            disabled={isNavigating}
          >
            {currentCategoryIndex < selectedCategories.length - 1 ? "Next" : "Review"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      {showNegotiationModal && negotiatingEnablerId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowNegotiationModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 100 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              duration: 0.5
            }}
            className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid #FCD9B8',
              maxHeight: '85vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b" style={{
              background: 'rgba(252, 217, 184, 0.1)',
              borderColor: '#FCD9B8',
              filter: 'saturate(0.8)'
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: '#155E63' }} />
                    Smart Negotiations
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {(() => {
                      const pkg = selectedPackages[negotiatingEnablerId];
                      const enabler = Object.values(enablersByCategory).flat().find(e => e.id === negotiatingEnablerId);
                      return `${pkg?.name} • ${enabler?.business_name}`;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => setShowNegotiationModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 240px)' }}>
              <div className="space-y-3">
                {frameworksForNegotiation.map((framework) => {
                  const isExpanded = expandedFramework === framework.id;
                  const isConfirmed = confirmedFrameworks[framework.id];
                  const terms = negotiationTerms[framework.id] || {};

                  return (
                    <div
                      key={framework.id}
                      className="rounded-lg border-2 overflow-hidden transition-all relative"
                      style={{
                        borderColor: isConfirmed ? '#4DB398' : isExpanded ? '#FCD9B8' : '#E5E7EB',
                        backgroundColor: isConfirmed ? 'rgba(77, 179, 152, 0.05)' : isExpanded ? 'rgba(252, 217, 184, 0.05)' : 'white',
                        filter: 'saturate(0.8)'
                      }}
                    >
                      <div
                        onClick={() => !isConfirmed && toggleFrameworkExpand(framework.id)}
                        className={`p-3 flex items-center justify-between ${!isConfirmed ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            {framework.framework_name}
                            {isConfirmed && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                            )}
                          </h4>
                          <p className="text-xs text-gray-600 capitalize mt-0.5">
                            {framework.framework_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {!isConfirmed && (
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>

                      {isExpanded && !isConfirmed && (
                        <div className="px-3 pb-3 space-y-2">
                          {framework.price_flexibility?.allow_discount && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                              <Label className="text-xs font-semibold text-gray-900 mb-2 block">
                                Price Discount (Max {framework.price_flexibility.max_discount_percentage}%)
                              </Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={framework.price_flexibility.max_discount_percentage}
                                  value={terms.discount || 0}
                                  onChange={(e) => updateNegotiationTerm(
                                    framework.id,
                                    'discount',
                                    Math.min(parseInt(e.target.value) || 0, framework.price_flexibility.max_discount_percentage)
                                  )}
                                  className="flex-1 text-sm h-8"
                                />
                                <span className="text-sm font-bold" style={{ color: '#155E63' }}>%</span>
                              </div>
                              <div className="flex gap-2 mt-2">
                                {[5, 10, 15, 20].filter(v => v <= framework.price_flexibility.max_discount_percentage).map(value => (
                                  <button
                                    key={value}
                                    onClick={() => updateNegotiationTerm(framework.id, 'discount', value)}
                                    className="flex-1 py-1 rounded text-xs font-medium transition-all"
                                    style={{
                                      backgroundColor: terms.discount === value ? '#FCD9B8' : '#F3F4F6',
                                      color: terms.discount === value ? '#155E63' : '#6B7280'
                                    }}
                                  >
                                    {value}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {framework.schedule_flexibility?.allow_date_changes && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                              <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                                Flexible Scheduling
                              </Label>
                              <p className="text-[10px] text-gray-600">
                                Minimum {framework.schedule_flexibility.lead_time_days} days notice required
                              </p>
                            </div>
                          )}

                          {framework.payment_terms_options && framework.payment_terms_options.length > 0 && (
                            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                              <Label className="text-xs font-semibold text-gray-900 mb-2 block">
                                Payment Plan
                              </Label>
                              <div className="space-y-1">
                                {framework.payment_terms_options.map(option => (
                                  <button
                                    key={option}
                                    onClick={() => updateNegotiationTerm(framework.id, 'paymentPlan', option)}
                                    className="w-full py-2 px-3 rounded text-xs font-medium text-left transition-all"
                                    style={{
                                      backgroundColor: terms.paymentPlan === option ? '#FCD9B8' : '#F9FAFB',
                                      color: terms.paymentPlan === option ? '#155E63' : '#6B7280',
                                      border: `1px solid ${terms.paymentPlan === option ? '#D4A574' : '#E5E7EB'}`
                                    }}
                                  >
                                    {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {framework.quick_accept_bonus?.enabled && (
                            <div className="bg-amber-50/60 backdrop-blur-sm rounded-lg p-2 border border-amber-200">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-600" />
                                <div>
                                  <p className="text-xs font-semibold text-amber-900">Quick Accept Bonus</p>
                                  <p className="text-[10px] text-amber-800">
                                    Accept within {framework.quick_accept_bonus.hours_window}h for extra {framework.quick_accept_bonus.discount_percentage}% off
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {framework.package_customization?.allow_modifications &&
                            framework.package_customization.optional_add_ons?.length > 0 && (
                              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                                <Label className="text-xs font-semibold text-gray-900 mb-2 block">
                                  Optional Add-Ons
                                </Label>
                                <div className="space-y-1">
                                  {framework.package_customization.optional_add_ons.map((addon, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[10px] p-2 bg-gray-50 rounded">
                                      <span className="text-gray-700">{addon.name}</span>
                                      <span className="font-bold" style={{ color: '#155E63' }}>${addon.price}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div className="flex justify-end pt-2">
                            <motion.button
                              onClick={() => confirmFramework(framework.id)}
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: 'linear-gradient(135deg, #4DB398, #155E63)',
                                boxShadow: '0 0 20px rgba(77, 179, 152, 0.6), 0 0 40px rgba(77, 179, 152, 0.4)'
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              animate={{
                                boxShadow: [
                                  '0 0 20px rgba(77, 179, 152, 0.6), 0 0 40px rgba(77, 179, 152, 0.5)',
                                  '0 0 30px rgba(77, 179, 152, 0.8), 0 0 60px rgba(77, 179, 152, 0.5)',
                                  '0 0 20px rgba(77, 179, 152, 0.6), 0 0 40px rgba(77, 179, 152, 0.4)'
                                ]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <Check className="w-6 h-6 text-white" strokeWidth={3} />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t" style={{ borderColor: '#FCD9B8' }}>
              {getNegotiationSummary().length > 0 && (
                <div className="mb-3 p-3 rounded-lg" style={{
                  background: 'rgba(252, 217, 184, 0.1)',
                  border: '1px solid #FCD9B8',
                  filter: 'saturate(0.8)'
                }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#155E63' }}>
                    ✓ Negotiation Summary
                  </p>
                  <div className="space-y-1">
                    {getNegotiationSummary().map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: '#155E63' }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" strokeWidth={2} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleApplyNegotiation}
                disabled={Object.values(confirmedFrameworks).every(v => !v)}
                className="w-full py-6 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                style={{
                  background: Object.values(confirmedFrameworks).some(v => v)
                    ? 'linear-gradient(135deg, #155E63, #4DB398)'
                    : '#E5E7EB',
                  color: Object.values(confirmedFrameworks).some(v => v) ? 'white' : '#9CA3AF',
                  boxShadow: Object.values(confirmedFrameworks).some(v => v)
                    ? '0 4px 12px rgba(21, 94, 99, 0.3)'
                    : 'none'
                }}
              >
                <span>Negotiate</span>
                <motion.span
                  animate={{
                    scale: Object.values(confirmedFrameworks).some(v => v) ? [1, 1.2, 1] : 1
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                >
                  ✓
                </motion.span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {selectedPackageForModal && (
        <PackageDetailModal
          package={selectedPackageForModal}
          enabler={Object.values(enablersByCategory).flat().find(e => e.id === selectedPackageForModal.enabler_id)}
          onClose={() => setSelectedPackageForModal(null)}
          onOpenGallery={(images) => {
            setSelectedPackageForModal(null);
            setSelectedGallery(images);
          }}
        />
      )}

      {selectedEnablerForBrand && (
        <EnablerBrandModal
          enabler={selectedEnablerForBrand}
          onClose={() => setSelectedEnablerForBrand(null)}
        />
      )}

      {selectedGallery && (
        <GalleryViewer
          images={selectedGallery}
          onClose={() => setSelectedGallery(null)}
        />
      )}

      <style>{`
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 2000px;
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
