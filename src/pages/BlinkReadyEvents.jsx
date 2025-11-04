
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event, Enabler, User, EventWishlist, BlinkEventHistory, Wishlist } from "@/api/entities"; // Added Wishlist import
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Star, Check, Calendar, Users, DollarSign, MapPin, Mic, Heart, SlidersHorizontal, X, AlertCircle, Image, ArrowRight, Eye, RefreshCw, Plus, CheckCircle2 } from "lucide-react"; // Added CheckCircle2
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BlinkLogo from "../components/BlinkLogo";
import { InvokeLLM, GenerateImage } from "@/api/integrations";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider"; // Added Slider import

import PackageDetailModal from "../components/PackageDetailModal";
import EnablerBrandModal from "../components/EnablerBrandModal";
import GalleryViewer from "../components/GalleryViewer";

import {
  determineVenueStatus,
  prepareVenueParameters,
  checkEnablerCompatibility
} from "../components/VenueLogic";

export default function BlinkReadyEvents() {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [filteredEventData, setFilteredEventData] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventEnablers, setEventEnablers] = useState({});
  const [eventImages, setEventImages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [wishlistedEvents, setWishlistedEvents] = useState(new Set());
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Filter states - styled like EventDetailsCollection
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterApplying, setIsFilterApplying] = useState(false);
  const [filters, setFilters] = useState({
    budgetRange: [5000, 50000], // Changed from minBudget, maxBudget
    eventDate: "", // Changed from date
    dateBuffer: 7, // New
    location: "",
    subLocation: "", // New
    guestRange: [50, 200] // New
  });

  // New state for enabler replacement
  const [replacingEnabler, setReplacingEnabler] = useState(null); // { variationIndex, enabler }
  const [replacementOptions, setReplacementOptions] = useState([]);
  const [isLoadingReplacements, setIsLoadingReplacements] = useState(false);

  const [expandedEnablerInTeam, setExpandedEnablerInTeam] = useState(null);
  const [enablerPackages, setEnablerPackages] = useState({});
  const [loadingPackages, setLoadingPackages] = useState({});
  const [selectedPackagesInTeam, setSelectedPackagesInTeam] = useState({}); // New state for selected packages within an event team

  const [selectedPackageForModal, setSelectedPackageForModal] = useState(null);
  const [selectedEnablerForBrand, setSelectedEnablerForBrand] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [favoriteEnablers, setFavoriteEnablers] = new useState(new Set()); // New state for favorited enablers

  // NEW: Tooltip state
  const [showFilterTooltip, setShowFilterTooltip] = useState(false);

  // NEW: State for booking
  const [isBooking, setIsBooking] = useState(false);

  // Define categoryLabels as a map for display purposes
  const categoryLabels = {
    'live_music': 'Live Music',
    'catering': 'Catering',
    'photography': 'Photography',
    'decorations': 'Decorations',
    'venue': 'Venue',
    'lighting_and_sound': 'Lighting & Sound',
    'event_planning': 'Event Planning',
    'rentals': 'Rentals',
    'entertainment': 'Entertainment',
    'videography': 'Videography',
    'florist': 'Florist',
    'transportation': 'Transportation',
    'security': 'Security',
    'staffing': 'Staffing',
    'invitations_and_stationery': 'Invitations & Stationery',
    'favors_and_gifts': 'Favors & Gifts',
    'cake_and_desserts': 'Cake & Desserts',
    'hair_and_makeup': 'Hair & Makeup',
    'officiant': 'Officiant',
    'photo_booth': 'Photo Booth',
    'special_effects': 'Special Effects',
    'valet_parking': 'Valet Parking',
    'cleaning_services': 'Cleaning Services',
    'dj': 'DJ',
    'mc': 'MC'
    // Add more as needed
  };

  useEffect(() => {
    loadEventVariations();
    loadFavoriteEnablers(); // Load favorite enablers on mount
  }, []);

  // NEW: Show tooltip after events load
  useEffect(() => {
    if (!isLoading && eventData) {
      // Show tooltip after a brief delay
      setTimeout(() => {
        setShowFilterTooltip(true);

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowFilterTooltip(false);
        }, 5000);
      }, 500);
    }
  }, [isLoading, eventData]);

  const loadFavoriteEnablers = async () => {
    try {
      const user = await User.me();
      // Filter for Wishlist entries that have an enabler_id (distinguishing from event wishlists if Wishlist handles both)
      const wishlistEntries = await Wishlist.filter({ user_id: user.id });
      const favoriteIds = new Set(
        wishlistEntries
          .filter(w => w.enabler_id) // Ensure it's an enabler favorite
          .map(w => w.enabler_id)
      );
      setFavoriteEnablers(favoriteIds);
    } catch (error) {
      console.error("Error loading favorite enablers:", error);
    }
  };

  const toggleEnablerFavorite = async (e, enabler) => {
    e.stopPropagation();

    try {
      const user = await User.me();
      const isFavorited = favoriteEnablers.has(enabler.id);

      if (isFavorited) {
        // Remove from favorites
        const existing = await Wishlist.filter({
          user_id: user.id,
          enabler_id: enabler.id
        });
        if (existing[0]) {
          await Wishlist.delete(existing[0].id);
        }
        setFavoriteEnablers(prev => {
          const next = new Set(prev);
          next.delete(enabler.id);
          return next;
        });
      } else {
        // Add to favorites
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
      console.error("Error toggling enabler favorite:", error);
      alert("Failed to update enabler favorite. Please try again.");
    }
  };

  const loadEnablerPackages = async (enablerId) => {
    if (enablerPackages[enablerId]) return; // Already loaded

    setLoadingPackages(prev => ({ ...prev, [enablerId]: true }));
    try {
      const { Package } = await import("@/api/entities");
      const packages = await Package.filter({ enabler_id: enablerId });
      setEnablerPackages(prev => ({ ...prev, [enablerId]: packages }));
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setLoadingPackages(prev => ({ ...prev, [enablerId]: false }));
    }
  };

  const handleEnablerCardClick = (e, enablerId) => {
    e.stopPropagation();
    if (expandedEnablerInTeam === enablerId) {
      setExpandedEnablerInTeam(null);
    } else {
      setExpandedEnablerInTeam(enablerId);
      loadEnablerPackages(enablerId);
    }
  };

  const handlePackageClick = (pkg, enabler, e) => {
    e.stopPropagation();

    // Ensure we have a valid enabler ID
    if (!enabler || !enabler.id || enabler.id === "-" || enabler.id === "null") {
      console.error("Invalid enabler data:", enabler);
      return;
    }

    // Open modal with full package details
    setSelectedPackageForModal({
      ...pkg,
      enabler_id: enabler.id,
      enabler_name: enabler.business_name || enabler.brand_name || "Unknown"
    });
  };

  const handleSelectPackageInTeam = (enablerId, pkg, variationIndex, e) => {
    if (e) e.stopPropagation();

    // Validate enabler ID
    if (!enablerId || enablerId === "-" || enablerId === "null") {
      console.error("Invalid enabler ID:", enablerId);
      return;
    }

    const key = `${variationIndex}-${enablerId}`;
    const currentSelection = selectedPackagesInTeam[key];

    // Find the current enabler object directly from state
    const enablerList = eventEnablers[variationIndex] || [];
    const currentEnablerInVariation = enablerList.find(e => e.id === enablerId);

    if (!currentEnablerInVariation) {
      console.error("Enabler not found in variation for package selection:", enablerId, variationIndex);
      return;
    }

    // Toggle selection - deselect if same package is clicked
    if (currentSelection && currentSelection.id === pkg.id) {
      // Deselect
      const newSelections = { ...selectedPackagesInTeam };
      delete newSelections[key];
      setSelectedPackagesInTeam(newSelections);

      // Reset enabler's suggested price to original LLM suggested price
      setEventEnablers(prevEnablers => {
        const newEnablers = { ...prevEnablers };
        const enablerList = newEnablers[variationIndex] || [];
        const enablerIdx = enablerList.findIndex(e => e.id === enablerId);

        if (enablerIdx !== -1) {
          const updatedEnablersList = [...enablerList];
          updatedEnablersList[enablerIdx] = {
            ...updatedEnablersList[enablerIdx],
            suggested_price: currentEnablerInVariation.original_suggested_price || updatedEnablersList[enablerIdx].base_price || 0,
            selected_package_id: null,
            selected_package_name: null
          };
          newEnablers[variationIndex] = updatedEnablersList;
        }
        return newEnablers;
      });
    } else {
      // Select new package
      setSelectedPackagesInTeam(prev => ({
        ...prev,
        [key]: pkg
      }));

      // Update the enabler's suggested price based on selected package
      setEventEnablers(prevEnablers => {
        const newEnablers = { ...prevEnablers };
        const enablerList = newEnablers[variationIndex] || [];
        const enablerIdx = enablerList.findIndex(e => e.id === enablerId);

        if (enablerIdx !== -1) {
          const updatedEnablersList = [...enablerList];
          updatedEnablersList[enablerIdx] = {
            ...updatedEnablersList[enablerIdx],
            suggested_price: pkg.price,
            selected_package_id: pkg.id,
            selected_package_name: pkg.name
          };
          newEnablers[variationIndex] = updatedEnablersList;
        }
        return newEnablers;
      });

      // CRITICAL: Auto-minimize the enabler card after package selection
      setExpandedEnablerInTeam(null);
      console.log('✅ Package selected, card minimized:', pkg.name);
    }
  };

  const loadEventVariations = async () => {
    const stored = sessionStorage.getItem('blinkReadyEvents');
    if (!stored) {
      navigate(createPageUrl("Home"));
      return;
    }

    const data = JSON.parse(stored);
    setEventData(data);
    setFilteredEventData(data);
    setSearchQuery(data.searchQuery || "");

    // Check if we already have enabler matches and images cached
    if (data.cachedEnablerMatches && data.cachedEventImages) {
      setEventEnablers(data.cachedEnablerMatches);
      setEventImages(data.cachedEventImages);
      setIsLoading(false);
      await saveToHistory(data, data.cachedEnablerMatches, data.cachedEventImages);
    } else {
      // Generate matches and images
      const { enablerMatches, images } = await matchEnablersAndGenerateImages(data);
      setEventEnablers(enablerMatches);
      setEventImages(images);
      setIsLoading(false);

      // Cache the results for future loads (until new search)
      sessionStorage.setItem('blinkReadyEvents', JSON.stringify({
        ...data,
        cachedEnablerMatches: enablerMatches,
        cachedEventImages: images
      }));

      await saveToHistory(data, enablerMatches, images);
    }
  };

  const saveToHistory = async (data, currentEnablerMatches, currentEventImages) => {
    try {
      const user = await User.me();

      await BlinkEventHistory.create({
        user_id: user.id,
        search_query: data.searchQuery,
        variations: JSON.stringify(data.variations),
        event_images: JSON.stringify(currentEventImages),
        enabler_matches: JSON.stringify(currentEnablerMatches)
      });
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const matchEnablersAndGenerateImages = async (data) => {
    const enablerMatches = {};
    const images = {};
    const totalVariations = data.variations.length;
    let currentStep = 0; // Tracks progress for both enabler matching and image generation

    // Phase 1: Match all enablers
    setLoadingProgress(10); // Initial progress
    for (const [index, variation] of data.variations.entries()) {
      const matchResult = await InvokeLLM({
        prompt: `Match enablers for this UNIQUE event variation:

        Event: ${variation.name}
        Theme: ${variation.theme}
        Vibe: ${variation.vibe}
        Type: ${variation.type}
        Guest count: ${variation.guest_count || 'not specified'}
        Budget: ${variation.budget ? '$' + variation.budget : 'not specified'}
        Required categories: ${variation.required_categories.join(', ')}

        Available enablers:
        ${data.allEnablers.map((e) => `ID: ${e.id} | ${e.business_name} | Category: ${e.category} | Industry: ${e.industry || 'N/A'} | Rating: ${e.average_rating || 0} | Description: ${e.tagline || e.description} | Base price: $${e.base_price || 'N/A'}`).join('\n')}

        STRICT RULES:
        1. Select EXACTLY ONE enabler per required category, matching the category closely.
        2. NEVER select multiple enablers from the same industry or the same primary category
        3. Prioritize HIGH-RATED enablers (4.5+ rating) but ensure variety across all selections.
        4. Mix different business types
        5. For this event variation, select DIFFERENT enablers than any other variation
        6. Ensure OVERALL VARIETY

        Return enabler_matches array with:
        - enabler_id: The ID of the selected enabler
        - suggested_price: Fair price based on event scale and enabler's base price. This should be a numerical value.
        - role_description: Specific role this enabler will play in THIS unique event.`
        ,
        response_json_schema: {
          type: "object",
          properties: {
            enabler_matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  enabler_id: { type: "string" },
                  suggested_price: { type: "number" },
                  role_description: { type: "string" }
                },
                required: ["enabler_id", "suggested_price", "role_description"]
              }
            }
          },
          required: ["enabler_matches"]
        }
      });

      const uniqueEnablers = [];
      const usedIndustries = new Set();
      const usedCategories = new Set();

      for (const match of matchResult.enabler_matches) {
        const enabler = data.allEnablers.find(e => e.id === match.enabler_id);
        if (enabler) {
          const industry = enabler.industry || enabler.category;
          if (!usedIndustries.has(industry) && !usedCategories.has(enabler.category)) {
            uniqueEnablers.push({
                ...enabler,
                ...match,
                original_suggested_price: match.suggested_price // Store the initial LLM suggested price
            });
            usedIndustries.add(industry);
            usedCategories.add(enabler.category);
          }
        }
      }

      enablerMatches[index] = uniqueEnablers;
      currentStep++;
      // Progress for enabler matching (10% to 60%)
      setLoadingProgress(Math.floor((currentStep / totalVariations) * 50) + 10);
    }

    // Set enabler matches immediately so UI can show event cards with enablers
    setEventEnablers(enablerMatches);
    // Allow user to see events while images load in the background
    setIsLoading(false);

    // Phase 2: Generate images asynchronously in the background
    // Update progress bar to reflect start of image generation (from 60%)
    setLoadingProgress(60);

    const imageGenerationPromises = data.variations.map(async (variation, index) => {
      try {
        const illustrationPrompt = variation.illustration_prompt ||
          `Minimal, calming ${variation.type} event illustration. ${variation.name}. ${variation.theme}. ${variation.vibe} atmosphere. Soft colors: ${variation.color_palette?.join(', ') || 'pastel tones'}. Clean, modern, professional style. No text. Vector art.`;

        const imageResult = await Promise.race([
          GenerateImage({ prompt: illustrationPrompt }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 15000) // Timeout for image generation
          )
        ]);

        images[index] = imageResult.url;
        // Update images state immediately as each image is generated
        setEventImages(prev => ({...prev, [index]: imageResult.url}));
      } catch (error) {
        console.warn(`Failed to generate image for event ${index + 1}:`, error.message);
        images[index] = null;
        setEventImages(prev => ({...prev, [index]: null})); // Set to null if failed
      }
      currentStep++;
      // Progress for image generation (60% to 100%)
      // currentStep now goes from totalVariations + 1 to totalVariations * 2
      setLoadingProgress(Math.floor(((currentStep - totalVariations) / totalVariations) * 40) + 60);
    });

    await Promise.allSettled(imageGenerationPromises);
    setLoadingProgress(100); // Ensure progress reaches 100% when all is done

    return { enablerMatches, images };
  };

  const handleReplaceEnabler = async (variationIndex, enablerToReplace) => {
    setReplacingEnabler({ variationIndex, enabler: enablerToReplace });
    setIsLoadingReplacements(true);

    try {
      // Find replacement enablers from same industry/category
      const allEnablers = eventData.allEnablers;

      const replacements = allEnablers.filter(e => {
        // Must be different enabler
        if (e.id === enablerToReplace.id) return false;

        // Must match category
        if (e.category !== enablerToReplace.category) return false;

        // Must match industry if exists
        if (enablerToReplace.industry && e.industry && e.industry !== enablerToReplace.industry) return false;
        // If enablerToReplace has no industry, match by category
        if (!enablerToReplace.industry && e.category !== enablerToReplace.category) return false;

        // Must not already be in this variation
        const currentEnablers = eventEnablers[variationIndex] || [];
        if (currentEnablers.find(ce => ce.id === e.id)) return false;

        return true;
      });

      // Sort by rating
      replacements.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

      setReplacementOptions(replacements.slice(0, 10)); // Top 10
    } catch (error) {
      console.error("Error finding replacements:", error);
      alert("Failed to find replacement options");
    } finally {
      setIsLoadingReplacements(false);
    }
  };

  const confirmReplacement = (newEnabler) => {
    const { variationIndex, enabler: oldEnabler } = replacingEnabler;

    const updatedEnablers = [...(eventEnablers[variationIndex] || [])];
    const oldIndex = updatedEnablers.findIndex(e => e.id === oldEnabler.id);

    if (oldIndex !== -1) {
      updatedEnablers[oldIndex] = {
        ...newEnabler, // Corrected: use the `newEnabler` parameter
        suggested_price: oldEnabler.suggested_price, // Keep suggested price from the old enabler
        original_suggested_price: newEnabler.base_price || 0, // Set the original suggested price for the new enabler as its base price
        role_description: oldEnabler.role_description, // Keep role
        selected_package_id: oldEnabler.selected_package_id || null, // Corrected: use `oldEnabler`
        selected_package_name: oldEnabler.selected_package_name || null // Corrected: use `oldEnabler`
      };

      setEventEnablers({
        ...eventEnablers,
        [variationIndex]: updatedEnablers
      });
    }

    setReplacingEnabler(null);
    setReplacementOptions([]);
  };

  const handleCardClick = (variationIndex, e) => {
    e.stopPropagation();
    setExpandedEvent(expandedEvent === variationIndex ? null : variationIndex);
  };

  const hasSelectedPackages = (variationIndex) => {
    const enablers = eventEnablers[variationIndex] || [];
    return enablers.some(enabler =>
      selectedPackagesInTeam[`${variationIndex}-${enabler.id}`]
    );
  };

  const handleProceedToReview = async (variation, originalIndex) => {
    try {
      setIsBooking(true);

      console.log('🎯 STAGE 3: Processing AI event with location logic...');
      console.log('📦 Variation data:', variation);

      // LOCATION LOGIC Stage 3: Determine venue status from AI-generated categories
      const venueStatus = determineVenueStatus(variation.required_categories);
      console.log('📍 Venue Status:', venueStatus);

      // LOCATION LOGIC Stage 3: Prepare venue parameters
      const venueParams = prepareVenueParameters(venueStatus, {
        location: variation.location,
        selectedCategories: variation.required_categories,
        guest_min: variation.guest_count,
        guest_max: variation.guest_count
      });

      console.log('📋 Venue Parameters:', venueParams);

      // Get matched enablers from state using originalIndex (as populated by matchEnablersAndGenerateImages)
      const matchedEnablers = eventEnablers[originalIndex] || [];
      console.log('👥 Matched enablers from state:', matchedEnablers.length);

      if (matchedEnablers.length === 0) {
        console.error('❌ No enablers matched for this variation');
        alert('No service providers available for this event. Please try another option.');
        setIsBooking(false);
        return;
      }

      // LOCATION LOGIC Stage 3: Run compatibility checks on enablers
      const compatibleEnablers = [];
      
      for (const enabler of matchedEnablers) {
        const compatibility = checkEnablerCompatibility(enabler, {
          location: variation.location,
          event_date: variation.date,
          guest_min: variation.guest_count,
          guest_max: variation.guest_count,
          budget_max: variation.budget,
          venue_status: venueStatus
        }, {
          calendarEvents: [],
          frameworks: [],
          selectedPackage: enabler.selected_package_id ? selectedPackagesInTeam[`${originalIndex}-${enabler.id}`] : null // Pass selected package if exists
        });

        // Include all enablers but mark compatibility status
        compatibleEnablers.push({
          id: enabler.id,
          enabler_id: enabler.id,
          business_name: enabler.business_name,
          category: enabler.category,
          profile_image: enabler.profile_image,
          average_rating: enabler.average_rating || 0,
          base_price: enabler.base_price || 0,
          suggested_price: enabler.suggested_price || enabler.base_price || 0,
          role_description: enabler.role_description || `${categoryLabels[enabler.category] || enabler.category} specialist for your event`,
          compatibility_status: compatibility.overall.status,
          compatibility_compatible: compatibility.overall.compatible,
          selected_package_id: enabler.selected_package_id || null,
          selected_package_name: enabler.selected_package_name || null,
          user_id: enabler.user_id // Assuming enabler object has user_id
        });
      }

      console.log(`✅ ${compatibleEnablers.length} enablers prepared for review`);
      console.log('📦 Enablers data:', compatibleEnablers);

      // CRITICAL: Create event data with ALL required fields
      const eventBookingData = {
        variation: {
          name: variation.name,
          type: variation.type || 'other',
          date: variation.date || new Date().toISOString().split('T')[0],
          location: variation.location || '',
          guest_count: variation.guest_count || 0,
          budget: variation.budget || 0,
          theme: variation.theme || '',
          vibe: variation.vibe || '',
          venue_status: venueStatus,
          venue_confirmed: venueStatus === 'with_venue',
          ...venueParams,
          required_categories: variation.required_categories || [],
          selected_categories: variation.required_categories || []
        },
        enablers: compatibleEnablers,
        eventImage: eventImages[originalIndex] || null // Corrected to use originalIndex
      };

      console.log('💾 Saving to session:', eventBookingData);
      console.log('💾 Enablers count in session data:', eventBookingData.enablers.length);
      console.log('💾 First enabler sample:', eventBookingData.enablers[0]);

      // CRITICAL: Save to sessionStorage BEFORE navigation
      sessionStorage.setItem('pendingEventBooking', JSON.stringify(eventBookingData));
      
      // Verify save
      const verifyData = sessionStorage.getItem('pendingEventBooking');
      if (!verifyData) {
        console.error('❌ Failed to save to sessionStorage!');
        alert('Failed to save event data. Please try again.');
        setIsBooking(false);
        return;
      }
      
      const verifyParsed = JSON.parse(verifyData);
      console.log('✅ Verified session save - enablers count:', verifyParsed.enablers?.length);

      // Small delay to ensure state is saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to review
      console.log('🚀 Navigating to ReviewEventBooking...');
      navigate(createPageUrl("ReviewEventBooking"), { replace: false });

    } catch (error) {
      console.error('❌ Error in handleProceedToReview:', error);
      alert('Failed to process event. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };


  const applyFilters = async () => {
    if (!eventData) return;

    setIsFilterApplying(true);

    try {
      // Filter events based on criteria
      let tempFilteredVariations = eventData.variations.filter((variation) => {
        // Date filter
        if (filters.eventDate && variation.date) {
          const eventDate = new Date(variation.date);
          const filterDate = new Date(filters.eventDate);
          const daysDiff = Math.abs((eventDate - filterDate) / (1000 * 60 * 60 * 24));

          if (daysDiff > filters.dateBuffer) {
            return false;
          }
        }

        // Location filter
        if (filters.location) {
          const fullLocation = variation.location ? variation.location.toLowerCase() : "";
          const filterLocation = filters.location.toLowerCase();
          const filterSubLocation = filters.subLocation.toLowerCase();

          if (!fullLocation.includes(filterLocation)) {
            return false;
          }
          if (filterSubLocation && !fullLocation.includes(filterSubLocation)) {
            return false;
          }
        }

        // Budget filter
        const budget = variation.budget || 0;
        if (budget < filters.budgetRange[0] || budget > filters.budgetRange[1]) {
          return false;
        }

        // Guest count filter
        const guestCount = variation.guest_count || 0;
        if (guestCount < filters.guestRange[0] || guestCount > filters.guestRange[1]) {
          return false;
        }

        return true;
      });

      setFilteredEventData({ ...eventData, variations: tempFilteredVariations });
      setShowFilters(false);
    } catch (error) {
      console.error("Error applying filters:", error);
      alert("Failed to apply filters. Please try again.");
    } finally {
      setIsFilterApplying(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      budgetRange: [5000, 50000],
      eventDate: "",
      dateBuffer: 7,
      location: "",
      subLocation: "",
      guestRange: [50, 200]
    });
    setFilteredEventData(eventData);
    setShowFilters(false);
  };

  const handleAISearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isRegenerating) return;

    setIsRegenerating(true);
    setLoadingProgress(0); // Reset progress for new search
    try {
      const user = User.me();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      setLoadingProgress(20); // User authenticated
      const allEnablers = Enabler.list("-average_rating", 100);

      setLoadingProgress(40); // Enablers fetched
      const eventVariations = InvokeLLM({
        prompt: `Based on this event description: "${searchQuery}"

        Create 4 DRAMATICALLY DIFFERENT event variations. Each should feel like a completely different event:
        - name: Generate REALISTIC, clear, descriptive event names that clearly communicate the event type and style
        - type: Choose from: wedding, birthday, corporate, conference, product_launch, baby_shower, dinner, other
        - date: Extract date if mentioned, otherwise leave empty
        - location: Extract location if mentioned
        - guest_count: Extract number of guests if mentioned
        - budget: Extract budget if mentioned (as number only)
        - theme: Create UNIQUE, detailed theme/vision for each. Make them VERY DIFFERENT from each other
        - vibe: Describe the mood (e.g., "Elegant & Timeless", "Vibrant & Energetic", "Intimate & Cozy", "Modern & Sleek")
        - required_categories: Array of DIFFERENT enabler categories needed. Each event should require DIFFERENT combinations.
        - color_palette: Suggest 3 hex colors that match the theme (for illustrations)
        - illustration_prompt: Create a detailed prompt for a minimal, calming illustration that represents this event

        CRITICAL RULES:
        1. Each variation MUST have a COMPLETELY DIFFERENT style, theme, vibe, and color palette
        2. Variation 1: Traditional/Classic style
        3. Variation 2: Modern/Contemporary style
        4. Variation 3: Bohemian/Artistic style
        5. Variation 4: Luxe/High-end style
        6. NO two variations should feel similar!`,
        response_json_schema: {
          type: "object",
          properties: {
            variations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  date: { type: "string" },
                  location: { type: "string" },
                  guest_count: { type: "number" },
                  budget: { type: "number" },
                  theme: { type: "string" },
                  vibe: { type: "string" },
                  required_categories: { type: "array", items: { type: "string" } },
                  color_palette: { type: "array", items: { type: "string" } },
                  illustration_prompt: { type: "string" }
                },
                required: ["name", "type", "theme", "vibe", "required_categories", "color_palette", "illustration_prompt"]
              }
            }
          },
          required: ["variations"]
        }
      });

      setLoadingProgress(60); // Variations generated
      // Save without cached data - it will be generated on load of the new page
      sessionStorage.setItem('blinkReadyEvents', JSON.stringify({
        searchQuery,
        variations: eventVariations.variations,
        allEnablers
      }));

      setLoadingProgress(100); // Ready to reload
      window.location.reload();
    } catch (error) {
      console.error("Error regenerating events:", error);
      alert("Couldn't process your request. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const getTotalCost = (index) => {
    const enablers = eventEnablers[index] || [];
    return enablers.reduce((sum, e) => sum + (e.suggested_price || 0), 0);
  };

  const getAveragePricePerEnabler = (index) => {
    const enablers = eventEnablers[index] || [];
    if (enablers.length === 0) return 0;
    const total = getTotalCost(index);
    return Math.round(total / enablers.length);
  };

  const toggleWishlist = async (e, variation, index) => {
    e.stopPropagation();

    const eventKey = `${variation.name}-${index}`;
    const isWishlisted = wishlistedEvents.has(eventKey);

    try {
      const user = await User.me();
      const enablers = eventEnablers[index] || [];
      const totalCost = getTotalCost(index);
      const eventImage = eventImages[index];

      if (isWishlisted) {
        const existing = await EventWishlist.filter({
          user_id: user.id,
          event_name: variation.name
        });
        if (existing[0]) {
          await EventWishlist.delete(existing[0].id);
        }
        setWishlistedEvents(prev => {
          const next = new Set(prev);
          next.delete(eventKey);
          return next;
        });
      } else {
        await EventWishlist.create({
          user_id: user.id,
          event_name: variation.name,
          event_type: variation.type,
          event_theme: variation.theme,
          event_vibe: variation.vibe,
          date: variation.date || "",
          location: variation.location || "",
          guest_count: variation.guest_count || 0,
          budget: variation.budget || 0,
          total_cost: totalCost,
          enabler_count: enablers.length,
          event_image: eventImage || "",
          event_data: JSON.stringify({
            variation,
            enablers: enablers.map((e) => ({
              enabler_id: e.id, // Map 'id' to 'enabler_id' for Wishlist
              business_name: e.business_name,
              category: e.category,
              suggested_price: e.suggested_price,
              role_description: e.role_description,
              profile_image: e.profile_image,
              average_rating: e.average_rating,
              selected_package_id: e.selected_package_id || null, // Add new field
              selected_package_name: e.selected_package_name || null // Add new field
            }))
          })
        });
        setWishlistedEvents(prev => new Set(prev).add(eventKey));
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      alert("Failed to update wishlist. Please try again.");
    }
  };

  useEffect(() => {
    const loadWishlistStatus = async () => {
      if (!eventData || !eventData.variations || eventData.variations.length === 0) return;

      try {
        const user = await User.me();
        const wishlisted = await EventWishlist.filter({ user_id: user.id });

        const wishlistedNames = new Set(wishlisted.map(w => w.event_name));

        const keysToSet = new Set(
          eventData.variations
            .map((v, idx) => `${v.name}-${idx}`)
            .filter((key, idx) => wishlistedNames.has(eventData.variations[idx].name))
        );
        setWishlistedEvents(keysToSet);
      } catch (error) {
        console.error("Error loading wishlist:", error);
      }
    };

    if (eventData) {
      loadWishlistStatus();
    }
  }, [eventData]);

  if (isLoading || !eventData || !filteredEventData || isBooking) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="mb-8 flex justify-center">
            <BlinkLogo
              size="xl"
              className="animate-float"
              style={{ width: '120px', height: '120px' }}
            />
          </div>
          <p className="text-gray-600 text-lg font-medium mb-4">
            {isBooking ? "Finalizing your event details..." : "Creating your perfect event..."}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">{loadingProgress}%</p>

          <div className="flex justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(createPageUrl("Home"))}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Blink Created Events</h1>
                <p className="text-xs text-gray-500 mt-0.5">AI-curated just for you</p>
              </div>
            </div>

            {/* Create Event Button - Frameless with Blinking Text */}
            <button
              onClick={() => navigate(createPageUrl("GuidedEventCreation"))}
              className="group relative transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px 12px'
              }}
            >
              <div className="flex items-center gap-1.5">
                <Plus
                  className="w-3.5 h-3.5"
                  strokeWidth={2.5}
                  style={{ color: '#10b981' }}
                />
                <span
                  className="text-xs font-semibold tracking-tight animate-blink-minimal"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Create
                </span>
              </div>
            </button>
          </div>

          {/* Search Bar with AI Generate Button */}
          <form onSubmit={handleAISearch} className="relative">
            <Input
              placeholder="Regenerate with new prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-24 h-9"
            />
            <Button
              type="submit"
              disabled={isRegenerating}
              size="sm"
              className="absolute right-1 top-1 h-7 px-3 transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '999px',
                color: 'transparent'
              }}
            >
              <span
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #d946ef 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                <Sparkles className="w-3 h-3" style={{ color: '#3b82f6' }} strokeWidth={2.5} />
                {isRegenerating ? "..." : "Go"}
              </span>
            </Button>
          </form>
        </div>
      </div>

      {/* Floating Filter Button with Tooltip */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20">
        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(true)}
          className="group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 rounded-full"
          aria-label="Filters"
        >
          <div className="relative">
            {/* Animated Tooltip - Pops out from button */}
            <AnimatePresence>
              {showFilterTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0, x: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    duration: 0.5
                  }}
                  className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
                  style={{ transformOrigin: 'right center' }}
                >
                  <div className="relative">
                    {/* Transparent tooltip content */}
                    <div
                      className="px-4 py-2.5 rounded-2xl backdrop-blur-md border"
                      style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <p
                        className="text-sm font-semibold tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        💡 Refine for personalized events
                      </p>
                    </div>

                    {/* Arrow pointing to button - transparent */}
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-30 -z-10"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%)',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-emerald-400 opacity-10 blur-xl group-hover:opacity-20 transition-opacity rounded-full"></div>
            <div className="relative bg-white/60 backdrop-blur-md border border-emerald-200 rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
            </div>
          </div>
        </button>
      </div>

      {/* Filter Popup - Styled like EventDetailsCollection */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowFilters(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-emerald-200 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 px-6 py-4 border-b border-emerald-100/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-light text-gray-900">Refine Your Events</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Filter events and enablers by your preferences</p>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-white/30 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {/* Budget Range */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <Label className="text-sm font-semibold text-gray-900">Budget Range</Label>
                </div>
                <div className="space-y-4">
                  <Slider
                    value={filters.budgetRange}
                    onValueChange={(val) => setFilters({...filters, budgetRange: val})}
                    min={1000}
                    max={100000}
                    step={1000}
                    className="w-full"
                    disabled={isFilterApplying}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Minimum</p>
                      <p className="text-lg font-bold text-emerald-600">${filters.budgetRange[0].toLocaleString()}</p>
                    </div>
                    <div className="text-xs text-gray-400">to</div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">${filters.budgetRange[1].toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Date Selection */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <Label className="text-sm font-semibold text-gray-900">Event Date</Label>
                </div>
                <Input
                  type="date"
                  value={filters.eventDate}
                  onChange={(e) => setFilters({...filters, eventDate: e.target.value})}
                  className="mb-4 border-emerald-200 focus:border-emerald-400"
                  min={new Date().toISOString().split('T')[0]} // Added min date
                  disabled={isFilterApplying}
                />

                <div className="mt-4">
                  <Label className="text-xs text-gray-700 mb-2 block">Date Flexibility (±{filters.dateBuffer} days)</Label>
                  <Slider
                    value={[filters.dateBuffer]}
                    onValueChange={(val) => setFilters({...filters, dateBuffer: val[0]})}
                    min={0}
                    max={30}
                    step={1}
                    className="w-full"
                    disabled={isFilterApplying}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {filters.dateBuffer > 0 ? `${filters.dateBuffer} days before to ${filters.dateBuffer} days after` : 'exact date only'}
                  </p>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <Label className="text-sm font-semibold text-gray-900">Event Location</Label>
                </div>
                <Input
                  placeholder="City or area..."
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  className="mb-4 border-emerald-200 focus:border-emerald-400"
                  disabled={isFilterApplying}
                />

                {filters.location && (
                  <div className="mt-4">
                    <Label className="text-xs text-gray-700 mb-2 block">Specific Area (Optional)</Label>
                    <Input
                      placeholder="e.g., Downtown, Marina..."
                      value={filters.subLocation}
                      onChange={(e) => setFilters({...filters, subLocation: e.target.value})}
                      className="border-emerald-200 focus:border-emerald-400"
                      disabled={isFilterApplying}
                    />
                  </div>
                )}
              </motion.div>

              {/* Guest Count */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <Label className="text-sm font-semibold text-gray-900">Expected Guests</Label>
                </div>
                <div className="space-y-4">
                  <Slider
                    value={filters.guestRange}
                    onValueChange={(val) => setFilters({...filters, guestRange: val})}
                    min={10}
                    max={1000}
                    step={10}
                    className="w-full"
                    disabled={isFilterApplying}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Minimum</p>
                      <p className="text-lg font-bold text-emerald-600">{filters.guestRange[0]}</p>
                    </div>
                    <div className="text-xs text-gray-400">to</div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{filters.guestRange[1]}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-gradient-to-br from-emerald-50/30 to-cyan-50/30 border-t border-emerald-100/50">
              <div className="flex gap-3">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium rounded-xl py-5"
                  disabled={isFilterApplying}
                >
                  Clear All
                </Button>
                <Button
                  onClick={applyFilters}
                  disabled={isFilterApplying}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl py-5 shadow-md hover:shadow-lg"
                >
                  {isFilterApplying ? "Applying..." : "Apply Filters"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Event Cards */}
      <div className="max-w-md mx-auto px-4 pt-36 pb-32 space-y-4">
        {filteredEventData.variations.length === 0 ? (
          <p className="text-center text-gray-500">No events found matching your criteria.</p>
        ) : (
          filteredEventData.variations.map((variation) => {
            const originalIndex = eventData.variations.findIndex(v => v.name === variation.name);
            const currentEnablers = eventEnablers[originalIndex] || [];
            const eventImage = eventImages[originalIndex];
            const isExpanded = expandedEvent === originalIndex;
            const totalCost = getTotalCost(originalIndex);
            const averagePrice = getAveragePricePerEnabler(originalIndex);
            const eventKey = `${variation.name}-${originalIndex}`;
            const isWishlisted = wishlistedEvents.has(eventKey);
            const hasPackagesSelected = hasSelectedPackages(originalIndex);

            return (
              <Card
                key={originalIndex}
                className="overflow-hidden border transition-all hover:shadow-2xl cursor-pointer group relative"
                style={{
                  borderColor: '#E5E7EB',
                  boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(6, 182, 212, 0.2), 0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onClick={(e) => handleCardClick(originalIndex, e)}
              >
                {/* Event Image */}
                <div className="relative h-48" style={{
                  background: eventImage ? 'transparent' :
                    `linear-gradient(135deg, ${variation.color_palette?.[0] || '#e0f2f7'}20, ${variation.color_palette?.[1] || '#e0f7e9'}20, ${variation.color_palette?.[2] || '#f3e8ff'}20)`
                }}>
                  {eventImage ? (
                    <img
                      src={eventImage}
                      alt={variation.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-6xl">
                        {variation.type === 'wedding' ? '💍' :
                        variation.type === 'birthday' ? '🎂' :
                        variation.type === 'corporate' ? '🏢' :
                        variation.type === 'conference' ? '🎤' :
                        variation.type === 'product_launch' ? '🚀' :
                        variation.type === 'baby_shower' ? '👶' :
                        variation.type === 'dinner' ? '🍽️' :
                        '✨'}
                      </div>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <Badge className="bg-white/90 text-gray-900 backdrop-blur-sm border-0 shadow-sm">
                      {variation.vibe}
                    </Badge>
                    <button
                      onClick={(e) => toggleWishlist(e, variation, originalIndex)}
                      className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          isWishlisted
                            ? "fill-red-500 text-red-500"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {variation.name}
                  </h3>

                  {/* Icon-Based Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {variation.date && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Date</p>
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {new Date(variation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}

                    {variation.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-blue-600" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Location</p>
                          <p className="text-xs font-medium text-gray-900 truncate">{variation.location}</p>
                        </div>
                      </div>
                    )}

                    {variation.guest_count > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-purple-600" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Guests</p>
                          <p className="text-xs font-medium text-gray-900">{variation.guest_count}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                        backgroundColor: '#FCD9B8',
                        filter: 'saturate(0.8)'
                      }}>
                        <DollarSign className="w-4 h-4" strokeWidth={2} style={{ color: '#155E63' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg/Pro</p>
                        <p className="text-xs font-bold" style={{ color: '#155E63' }}>${averagePrice.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Theme Badge */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Theme</p>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{variation.theme}</p>
                  </div>

                  {/* Enabler Team Preview */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {currentEnablers.slice(0, 4).map((enabler, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                          >
                            {enabler.profile_image ? (
                              <img
                                src={enabler.profile_image}
                                alt={enabler.business_name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                👤
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {currentEnablers.length} {currentEnablers.length === 1 ? 'Pro' : 'Pros'}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold" style={{ color: '#155E63' }}>
                        ${totalCost.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(originalIndex, e);
                    }}
                    className="w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    <span>{isExpanded ? "Hide" : "View"} Team Details</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Enabler Details - Enhanced with Selectable Packages */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 space-y-3">
                      {currentEnablers.map((enabler) => {
                        const isEnablerExpanded = expandedEnablerInTeam === enabler.id;
                        const packages = enablerPackages[enabler.id] || [];
                        const isLoadingPkgs = loadingPackages[enabler.id];
                        const selectedPkg = selectedPackagesInTeam[`${originalIndex}-${enabler.id}`];

                        return (
                          <motion.div
                            key={enabler.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-xl overflow-hidden hover:border-emerald-200 transition-all"
                          >
                            {/* MINIMIZED VIEW when package is selected AND card is NOT expanded */}
                            {selectedPkg && !isEnablerExpanded && (
                              <div
                                className="p-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={(e) => handleEnablerCardClick(e, enabler.id)}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Profile Image */}
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    {enabler.profile_image ? (
                                      <img
                                        src={enabler.profile_image}
                                        alt={enabler.business_name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        👤
                                      </div>
                                    )}
                                  </div>

                                  {/* Minimized Info */}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-gray-900 text-sm truncate">
                                      {enabler.business_name}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      <p className="text-xs text-emerald-700 font-medium truncate">
                                        {selectedPkg.name}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Price */}
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold" style={{ color: '#155E63' }}>
                                      ${selectedPkg.price}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEnablerCardClick(e, enabler.id);
                                      }}
                                      className="text-[10px] text-emerald-600 hover:underline mt-0.5"
                                    >
                                      Change
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* FULL VIEW when no package selected OR card is explicitly expanded */}
                            {(!selectedPkg || isEnablerExpanded) && (
                              <>
                                {/* Enabler Card Header - Fully Clickable */}
                                <div
                                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors flex items-center justify-between"
                                  onClick={(e) => handleEnablerCardClick(e, enabler.id)}
                                >
                                  <div className="flex gap-3 flex-1">
                                    {/* Profile Image with Heart Icon Below */}
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                        {enabler.profile_image ? (
                                          <img
                                            src={enabler.profile_image}
                                            alt={enabler.business_name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-2xl">
                                            👤
                                          </div>
                                        )}
                                      </div>

                                      {/* Heart Icon */}
                                      <button
                                        onClick={(e) => toggleEnablerFavorite(e, enabler)}
                                        className="p-0.5 hover:scale-110 transition-transform"
                                      >
                                        <Heart
                                          className={`w-4 h-4 transition-all ${
                                            favoriteEnablers.has(enabler.id)
                                              ? "fill-red-500 text-red-500"
                                              : "text-gray-400"
                                          }`}
                                        />
                                      </button>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-gray-900 text-sm truncate mb-0.5">
                                        {enabler.business_name}
                                      </h5>
                                      <p className="text-xs text-gray-500 capitalize mb-1">
                                        {enabler.category?.replace(/_/g, ' ')}
                                        {enabler.industry && ` • ${enabler.industry}`}
                                      </p>

                                      {/* Role Description */}
                                      {enabler.role_description && (
                                        <p className="text-xs text-gray-600 italic mb-2 line-clamp-2 bg-emerald-50/50 px-2 py-1 rounded">
                                          "{enabler.role_description}"
                                        </p>
                                      )}

                                      {/* Show selected package if any */}
                                      {selectedPkg && (
                                        <div className="mb-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                          <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide mb-0.5">Selected Package</p>
                                          <p className="text-xs font-medium text-gray-900">{selectedPkg.name}</p>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-1 mb-2">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        <span className="text-xs font-semibold">
                                          {enabler.average_rating || 0}
                                        </span>
                                      </div>

                                      {/* Replace Action Button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReplaceEnabler(originalIndex, enabler);
                                        }}
                                        className="px-3 py-1.5 border border-gray-200/60 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-50/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Replace
                                      </button>
                                    </div>

                                    <ChevronDown
                                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 self-start ${
                                        isEnablerExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* Packages Dropdown */}
                                <AnimatePresence>
                                  {isEnablerExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="border-t border-emerald-100"
                                    >
                                      <div className="p-3 bg-emerald-50/30">
                                        {/* View Portfolio Link - Subtle */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEnablerForBrand(enabler);
                                          }}
                                          className="w-full mb-3 text-xs font-medium text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 group"
                                        >
                                          <span className="tracking-wide">View Full Portfolio</span>
                                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                        </button>

                                        {isLoadingPkgs ? (
                                          <div className="py-4 text-center">
                                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <p className="text-xs text-gray-500">Loading packages...</p>
                                          </div>
                                        ) : packages.length > 0 ? (
                                          <div>
                                            <p className="text-xs font-medium tracking-wide mb-2 text-emerald-700 uppercase">
                                              Available Packages
                                            </p>
                                            <div className="space-y-2">
                                              {packages.map((pkg) => {
                                                const isPackageSelected = selectedPkg?.id === pkg.id;

                                                return (
                                                  <div
                                                    key={pkg.id}
                                                    className={`rounded-lg border-2 transition-all overflow-hidden ${
                                                      isPackageSelected
                                                        ? 'border-emerald-400 bg-emerald-50/50 shadow-md'
                                                        : 'border-gray-200 bg-white hover:border-emerald-300'
                                                    }`}
                                                  >
                                                    {/* Package Details - Clickable */}
                                                    <div
                                                      className="flex gap-2 p-2 cursor-pointer"
                                                      onClick={(e) => handlePackageClick(pkg, enabler, e)}
                                                    >
                                                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        {pkg.thumbnail_image ? (
                                                          <img
                                                            src={pkg.thumbnail_image}
                                                            alt={pkg.name}
                                                            className="w-full h-full object-cover"
                                                          />
                                                        ) : (
                                                          <div className="w-full h-full flex items-center justify-center">
                                                            <Image className="w-5 h-5 text-gray-300" />
                                                          </div>
                                                        )}
                                                      </div>

                                                      <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                          <p className="font-semibold text-sm text-gray-900 truncate flex-1">
                                                            {pkg.name}
                                                          </p>
                                                          {isPackageSelected && (
                                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                            </div>
                                                          )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 line-clamp-1 mb-1">{pkg.description}</p>

                                                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-600 mb-1">
                                                          {pkg.max_guests && (
                                                            <div className="flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded">
                                                              <Users className="w-3 h-3" />
                                                              <span>{pkg.max_guests}</span>
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
                                                          <p className="text-[10px] font-medium text-emerald-600">
                                                            Negotiable up to {pkg.max_discount_percentage}% off
                                                          </p>
                                                        )}
                                                      </div>

                                                      <span className={`text-xs font-bold self-start px-2 py-1 rounded ${
                                                        isPackageSelected
                                                          ? 'text-white'
                                                          : ''
                                                      }`} style={{
                                                        backgroundColor: isPackageSelected ? '#155E63' : 'transparent',
                                                        color: isPackageSelected ? 'white' : '#155E63',
                                                        filter: 'saturate(0.8)'
                                                      }}>
                                                        ${pkg.price}
                                                      </span>
                                                    </div>

                                                    {/* Select/Deselect Button - Ultra Modern Borderless */}
                                                    <div className="px-2 py-1.5 bg-gray-50/50">
                                                      <button
                                                        onClick={(e) => handleSelectPackageInTeam(enabler.id, pkg, originalIndex, e)}
                                                        className={`w-full text-xs font-medium py-1.5 rounded transition-all flex items-center justify-center gap-1.5 group ${
                                                          isPackageSelected
                                                            ? 'text-white'
                                                            : 'text-gray-600 hover:text-emerald-600'
                                                        }`}
                                                        style={{
                                                          backgroundColor: isPackageSelected ? '#155E63' : 'transparent',
                                                          filter: 'saturate(0.8)'
                                                        }}
                                                      >
                                                        <span>{isPackageSelected ? 'Selected' : 'Select Package'}</span>
                                                        {isPackageSelected ? (
                                                          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                        ) : (
                                                          <CheckCircle2 className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="py-4 text-center">
                                            <p className="text-xs text-gray-500">No packages available</p>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            )}
                          </motion.div>
                        );
                      })}

                      {/* Total Cost Summary with Next Button */}
                      <div className="mt-3 pt-3 border-t border-gray-200 rounded-lg px-4 py-3" style={{
                        backgroundColor: '#FCD9B8',
                        filter: 'saturate(0.8)'
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: '#155E63' }}>Total Team Cost</span>
                          <span className="text-lg font-bold" style={{ color: '#155E63' }}>
                            ${totalCost.toLocaleString()}
                          </span>
                        </div>

                        {/* Next Button - Shows when at least one package selected */}
                        <AnimatePresence>
                          {hasPackagesSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-3"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProceedToReview(variation, originalIndex);
                                }}
                                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white py-2 rounded-lg transition-colors"
                                style={{
                                  backgroundColor: '#155E63',
                                  filter: 'saturate(0.8)'
                                }}
                              >
                                <span>Next</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Replacement Modal */}
      {replacingEnabler && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setReplacingEnabler(null)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">Find Replacement</h3>
                <button
                  onClick={() => setReplacingEnabler(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Replacing: <span className="font-semibold">{replacingEnabler.enabler.business_name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Same industry: {replacingEnabler.enabler.industry || replacingEnabler.enabler.category?.replace(/_/g, ' ')}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingReplacements ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-600">Finding similar professionals...</p>
                </div>
              ) : replacementOptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-600 text-center">
                    No similar professionals found in this industry.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replacementOptions.map((newEnabler) => (
                    <Card
                      key={newEnabler.id}
                      className="p-4 hover:border-emerald-300 transition-all cursor-pointer"
                      onClick={() => confirmReplacement(newEnabler)}
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {newEnabler.profile_image ? (
                            <img
                              src={newEnabler.profile_image}
                              alt={newEnabler.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-gray-900 text-sm truncate">
                            {newEnabler.business_name}
                          </h5>
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {newEnabler.tagline || newEnabler.category?.replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-semibold">
                                {newEnabler.average_rating || 0}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({newEnabler.total_reviews || 0})
                              </span>
                            </div>
                            {newEnabler.base_price && (
                              <span className="text-sm font-bold text-emerald-600">
                                From ${newEnabler.base_price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Package Detail Modal */}
      {selectedPackageForModal && (
        <PackageDetailModal
          package={selectedPackageForModal}
          // The `enabler` prop is used for internal display within the modal
          // The actual `onViewPortfolio` and `onOpenGallery` will re-fetch or use data already available
          // Passing a specific enabler to the modal directly like this might be redundant if the modal itself uses enabler_id to look up enabler data.
          // However, keeping it for now to match original structure, but the critical part is below in onViewPortfolio.
          enabler={Object.values(eventEnablers).flat().find(e => e.id === selectedPackageForModal.enabler_id)}
          onClose={() => setSelectedPackageForModal(null)}
          onOpenGallery={(images) => {
            setSelectedPackageForModal(null);
            setSelectedGallery(images);
          }}
          onViewPortfolio={() => {
            // Find the enabler for this package
            const enablerId = selectedPackageForModal.enabler_id;

            // Validate enabler ID before proceeding
            if (!enablerId || enablerId === "-" || enablerId === "null") {
              console.error("Invalid enabler ID in package:", selectedPackageForModal);
              setSelectedPackageForModal(null); // Close modal if ID is bad
              return;
            }

            let enablerData = null;

            // Search through all variations to find the enabler
            Object.values(eventEnablers).forEach(enablerList => {
              const found = enablerList.find(e => e.id === enablerId);
              if (found) enablerData = found;
            });

            if (enablerData) {
              setSelectedPackageForModal(null);
              setSelectedEnablerForBrand(enablerData);
            } else {
              console.error("Could not find enabler with ID:", enablerId);
              // Optionally, alert the user or show a message
              alert("Could not find enabler details. Please try again.");
            }
          }}
        />
      )}

      {/* Enabler Brand Modal */}
      {selectedEnablerForBrand && (
        <EnablerBrandModal
          enabler={selectedEnablerForBrand}
          onClose={() => setSelectedEnablerForBrand(null)}
        />
      )}

      {/* Gallery Viewer */}
      {selectedGallery && (
        <GalleryViewer
          images={selectedGallery}
          onClose={() => setSelectedGallery(null)}
        />
      )}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes blink-minimal {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-blink-minimal {
          animation: blink-minimal 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
