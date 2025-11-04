
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, Wishlist, User, Event, BookingOffer, Package } from "@/api/entities";
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  Plus, 
  CheckCircle2, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Award,
  Zap,
  TrendingUp,
  Shield,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

import PackageDetailModal from "../components/PackageDetailModal";
import EnablerBrandModal from "../components/EnablerBrandModal";
import GalleryViewer from "../components/GalleryViewer";
import AddToEventModal from "../components/AddToEventModal";
import EnablerAvailabilityBadge from "../components/EnablerAvailabilityBadge";
import BlinkLogo from "../components/BlinkLogo";

const categories = [
  { label: "All Categories", value: "all", icon: "✨" },
  { label: "Event Planners", value: "event_planner", icon: "📋" },
  { label: "Beauty Specialists", value: "beauty_specialist", icon: "💄" },
  { label: "Photographers", value: "photographer", icon: "📸" },
  { label: "Musicians", value: "musician", icon: "🎵" },
  { label: "Venues", value: "venue", icon: "🏛️" },
  { label: "Caterers", value: "caterer", icon: "🍽️" },
  { label: "Florists", value: "florist", icon: "🌸" },
  { label: "Audio/Visual", value: "audio_visual", icon: "🎬" }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function Browse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get("category");
  const eventId = searchParams.get("event_id");
  const replaceEnablerId = searchParams.get("replace_enabler");
  
  const [enablers, setEnablers] = useState([]);
  const [enablerPackages, setEnablerPackages] = useState({}); // Packages are now lazy-loaded
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "all");
  const [sortBy, setSortBy] = useState("rating");
  const [expandedEnabler, setExpandedEnabler] = useState(null);
  const [originalEnabler, setOriginalEnabler] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(false); // Global loading state for packages
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState(null);
  const [selectedEnablerForBrand, setSelectedEnablerForBrand] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState(null);

  const [favoriteEnablers, setFavoriteEnablers] = useState(new Set());
  const [selectedEnablers, setSelectedEnablers] = useState(new Set());
  
  const [showAddToEventModal, setShowAddToEventModal] = useState(false);
  const [selectedEnablerForEvent, setSelectedEnablerForEvent] = useState(null);
  const [selectedPackageForEvent, setSelectedPackageForEvent] = useState(null); // New state for selected package
  const [currentUser, setCurrentUser] = useState(null);

  const hasLoadedEnablersRef = useRef(false);
  const originalEnablerLoadedRef = useRef(false);

  // Enhanced ID validation
  const isValidEnablerId = (id) => {
    if (!id) return false;
    const idStr = String(id).trim();
    const invalidPatterns = ["", "-", "null", "undefined", "0", "none", "N/A", "na"];
    if (invalidPatterns.includes(idStr.toLowerCase())) return false;
    return /[a-zA-Z0-9]/.test(idStr) && idStr.length >= 3;
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadOriginalEnabler = async () => {
      if (replaceEnablerId && !originalEnablerLoadedRef.current) {
        originalEnablerLoadedRef.current = true;
        try {
          await delay(200);
          const originalEnablerData = await Enabler.filter({ id: replaceEnablerId });
          if (originalEnablerData[0]) {
            setOriginalEnabler(originalEnablerData[0]);
          }
        } catch (error) {
          console.error("Error loading original enabler:", error);
          originalEnablerLoadedRef.current = false;
        }
      }
    };
    loadOriginalEnabler();
  }, [replaceEnablerId]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const user = await User.me();
        const wishlist = await Wishlist.filter({ user_id: user.id });
        const favoriteIds = new Set(wishlist.map(w => w.enabler_id));
        setFavoriteEnablers(favoriteIds);
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    if (hasLoadedEnablersRef.current) return;
    if (replaceEnablerId && !originalEnabler) return;

    const loadEnablers = async () => {
      hasLoadedEnablersRef.current = true;
      setIsLoading(true);

      try {
        await delay(300);
        
        let enablersData;
        
        if (replaceEnablerId && originalEnabler) {
          const filters = { category: originalEnabler.category };
          if (originalEnabler.industry) filters.industry = originalEnabler.industry;
          if (originalEnabler.sub_industry) filters.sub_industry = originalEnabler.sub_industry;
          
          enablersData = await Enabler.filter(
            filters,
            sortBy === "rating" ? "-average_rating" : "-created_date",
            20
          );
          enablersData = enablersData.filter(e => e.id !== replaceEnablerId);
        } else if (selectedCategory === "all") {
          enablersData = await Enabler.list(
            sortBy === "rating" ? "-average_rating" : "-created_date",
            20
          );
        } else {
          enablersData = await Enabler.filter(
            { category: selectedCategory },
            sortBy === "rating" ? "-average_rating" : "-created_date",
            20
          );
        }
        
        const validEnabledData = enablersData.filter(e => isValidEnablerId(e.id));
        
        setEnablers(validEnabledData);
        setEnablerPackages({}); // Initialize as empty for lazy loading
        
      } catch (error) {
        console.error("Error loading enablers:", error);
        hasLoadedEnablersRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    loadEnablers();
  }, [selectedCategory, sortBy, replaceEnablerId, originalEnabler]);

  useEffect(() => {
    hasLoadedEnablersRef.current = false;
    setEnablerPackages({}); // Clear packages when filters change to trigger re-fetch on expand
  }, [selectedCategory, sortBy]);

  const loadPackagesForEnabler = async (enablerId) => {
    if (enablerPackages[enablerId] && enablerPackages[enablerId].length > 0) {
      return; // Already loaded
    }

    setLoadingPackages(true);
    try {
      const packages = await Package.filter({ enabler_id: enablerId });
      setEnablerPackages(prev => ({ ...prev, [enablerId]: packages }));
    } catch (error) {
      console.error("Error loading packages:", error);
      setEnablerPackages(prev => ({ ...prev, [enablerId]: [] })); // Set empty array on error
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleViewPackages = async (e, enabler) => {
    e.stopPropagation();
    
    if (expandedEnabler === enabler.id) {
      setExpandedEnabler(null);
    } else {
      setExpandedEnabler(enabler.id);
      if (!enablerPackages[enabler.id]) { // Check if packages haven't been loaded yet
        await loadPackagesForEnabler(enabler.id);
      }
    }
  };

  const handlePackageSelect = (e, pkg, enabler) => {
    e.stopPropagation();
    setSelectedPackageForEvent({ package: pkg, enabler });
    setShowAddToEventModal(true);
  };

  const toggleFavorite = async (e, enabler) => {
    e.stopPropagation();
    if (!currentUser || !isValidEnablerId(enabler.id)) return;
    
    try {
      const isFavorited = favoriteEnablers.has(enabler.id);
      
      if (isFavorited) {
        const existing = await Wishlist.filter({
          user_id: currentUser.id,
          enabler_id: enabler.id
        });
        if (existing[0]) await Wishlist.delete(existing[0].id);
        setFavoriteEnablers(prev => {
          const next = new Set(prev);
          next.delete(enabler.id);
          return next;
        });
      } else {
        await Wishlist.create({
          user_id: currentUser.id,
          enabler_id: enabler.id,
          enabler_name: enabler.business_name,
          enabler_category: enabler.category,
          enabler_image: enabler.profile_image,
          base_price: enabler.base_price,
          average_rating: enabler.average_rating
        });
        setFavoriteEnablers(prev => new Set(prev).add(enabler.id));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleEnablerSelect = (enabler) => {
    if (selectedEnablers.has(enabler.id)) {
      setSelectedEnablers(prev => {
        const next = new Set(prev);
        next.delete(enabler.id);
        return next;
      });
    } else {
      setSelectedEnablers(prev => new Set(prev).add(enabler.id));
    }
  };

  const filteredEnablers = enablers.filter(e =>
    (e.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tagline?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    isValidEnablerId(e.id)
  );

  const isReplaceMode = eventId && replaceEnablerId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-cyan-50/30 flex items-center justify-center">
        <div className="text-center">
          <BlinkLogo size="lg" className="mx-auto mb-4 animate-breath" />
          <p className="text-sm text-gray-600 animate-pulse">Finding perfect professionals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-cyan-50/30">
      {/* Modern Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isReplaceMode ? `${createPageUrl("EventDetail")}?id=${eventId}` : createPageUrl("Home"))}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {isReplaceMode ? "Find Alternative Professional" : "Browse Professionals"}
              </h1>
              {isReplaceMode && originalEnabler && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Similar to {originalEnabler.business_name} • {originalEnabler.category?.replace(/_/g, ' ')}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, specialty, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-11 rounded-xl border-gray-200 focus:border-emerald-300 bg-white"
            />
          </div>

          {/* Filters - Desktop */}
          <div className="hidden lg:flex items-center gap-3 mt-4">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    selectedCategory === cat.value
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">⭐ Top Rated</SelectItem>
                <SelectItem value="recent">🆕 Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters - Mobile */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden mt-4 space-y-3"
              >
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">⭐ Top Rated</SelectItem>
                    <SelectItem value="recent">🆕 Recent</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 pt-48 lg:pt-56 pb-12">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filteredEnablers.length}</span> professional
            {filteredEnablers.length !== 1 ? 's' : ''} found
          </p>
          
          {selectedEnablers.size > 0 && !isReplaceMode && (
            <Button
              onClick={() => {
                setShowAddToEventModal(true);
              }}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {selectedEnablers.size} to Event
            </Button>
          )}
        </div>

        {/* Enabler Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEnablers.map((enabler) => {
            const isExpanded = expandedEnabler === enabler.id;
            const packages = enablerPackages[enabler.id] || []; // Packages are loaded on demand
            const isFavorited = favoriteEnablers.has(enabler.id);
            const isSelected = selectedEnablers.has(enabler.id);

            return (
              <motion.div
                key={enabler.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                <Card 
                  className={`overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/20' 
                      : 'hover:shadow-2xl hover:-translate-y-1'
                  }`}
                  onClick={() => !isReplaceMode && handleEnablerSelect(enabler)}
                >
                  {/* Cover Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-400">
                    {enabler.cover_image ? (
                      <img
                        src={enabler.cover_image}
                        alt="Cover"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl opacity-20">{categories.find(c => c.value === enabler.category)?.icon || '✨'}</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={(e) => toggleFavorite(e, enabler)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                      >
                        <Heart 
                          className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                        />
                      </button>

                      {!isReplaceMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEnablerForEvent(enabler); setShowAddToEventModal(true); }}
                          className="p-2 bg-emerald-500/90 backdrop-blur-sm rounded-full hover:bg-emerald-600 transition-all shadow-lg"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>

                    {/* Profile Image */}
                    <div className="absolute bottom-0 left-6 transform translate-y-1/2">
                      <div className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-white shadow-xl">
                        {enabler.profile_image ? (
                          <img
                            src={enabler.profile_image}
                            alt={enabler.business_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-emerald-100 to-cyan-100">
                            👤
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute bottom-3 right-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                        <span className="text-sm font-bold text-gray-900">{enabler.average_rating || 0}</span>
                        <span className="text-xs text-gray-500">({enabler.total_reviews || 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 pt-12">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {enabler.business_name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {enabler.tagline || enabler.profession_title || enabler.category?.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {/* Key Info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {enabler.location && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          {enabler.location}
                        </Badge>
                      )}
                      {enabler.years_experience && (
                        <Badge variant="outline" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          {enabler.years_experience}y
                        </Badge>
                      )}
                      <EnablerAvailabilityBadge enablerId={enabler.id} compact={true} />
                    </div>

                    {/* Pricing */}
                    {enabler.base_price && (
                      <div className="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-600">Starting from</span>
                        <span className="text-xl font-bold text-emerald-600">${enabler.base_price}</span>
                      </div>
                    )}

                    {/* Packages Dropdown */}
                    {!isReplaceMode && (
                      <div className="mb-4">
                        <button
                          onClick={(e) => handleViewPackages(e, enabler)}
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 rounded-xl transition-all border border-emerald-200"
                        >
                          <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            View Packages {enablerPackages[enabler.id] && `(${enablerPackages[enabler.id].length})`}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 space-y-2 overflow-hidden"
                            >
                              {loadingPackages && !enablerPackages[enabler.id] ? (
                                <div className="text-center py-4">
                                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                                </div>
                              ) : packages.length === 0 ? (
                                <div className="text-center py-4 text-sm text-gray-500">
                                  No packages available. <Link to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}${eventId ? `&event_id=${eventId}` : ''}`} className="text-emerald-600 hover:underline" onClick={(e) => e.stopPropagation()}>View full profile</Link> for more details.
                                </div>
                              ) : (
                                packages.slice(0, 5).map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="group/pkg p-3 bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-md rounded-lg transition-all"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-semibold text-sm text-gray-900 flex-1">{pkg.name}</h4>
                                      <span className="text-sm font-bold text-emerald-600 whitespace-nowrap ml-2">
                                        ${pkg.price}
                                      </span>
                                    </div>
                                    {pkg.description && (
                                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{pkg.description}</p>
                                    )}
                                    {pkg.max_guests && (
                                      <p className="text-xs text-gray-500 mb-3">Up to {pkg.max_guests} guests</p>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPackageForDetail({ pkg, enabler });
                                        }}
                                        className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                      >
                                        View Details
                                      </button>
                                      <button
                                        onClick={(e) => handlePackageSelect(e, pkg, enabler)}
                                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Add to Event
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                              
                              {packages.length > 5 && (
                                <p className="text-xs text-center text-gray-500 pt-2">
                                  +{packages.length - 5} more package{packages.length - 5 !== 1 ? 's' : ''}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEnablerForBrand(enabler);
                        }}
                      >
                        View Portfolio
                      </Button>

                      {isReplaceMode && (
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const user = await User.me();
                              const oldOffers = await BookingOffer.filter({ 
                                event_id: eventId, 
                                enabler_id: replaceEnablerId 
                              });
                              if (oldOffers[0]) await BookingOffer.delete(oldOffers[0].id);
                              
                              await BookingOffer.create({
                                event_id: eventId,
                                enabler_id: enabler.id,
                                host_id: user.id,
                                offered_amount: enabler.base_price || 0,
                                custom_requirements: `Replacement enabler - ${enabler.category?.replace(/_/g, ' ')}`,
                                status: "pending"
                              });
                              
                              navigate(`${createPageUrl("EventDetail")}?id=${eventId}`);
                            } catch (error) {
                              console.error("Error selecting enabler:", error);
                            }
                          }}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Select
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && !isReplaceMode && (
                    <div className="absolute top-3 left-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredEnablers.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No professionals found</h3>
            <p className="text-sm text-gray-600 mb-6">Try adjusting your filters or search query</p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              variant="outline"
              className="rounded-xl"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPackageForDetail && (
        <PackageDetailModal
          package={selectedPackageForDetail.pkg}
          enabler={selectedPackageForDetail.enabler}
          onClose={() => setSelectedPackageForDetail(null)}
          onOpenGallery={(images) => {
            setSelectedPackageForDetail(null);
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

      {showAddToEventModal && (selectedEnablerForEvent || selectedPackageForEvent) && currentUser && (
        <AddToEventModal
          enabler={selectedEnablerForEvent || selectedPackageForEvent?.enabler}
          package={selectedPackageForEvent?.package}
          userId={currentUser.id}
          onClose={() => {
            setShowAddToEventModal(false);
            setSelectedEnablerForEvent(null);
            setSelectedPackageForEvent(null);
          }}
          onSuccess={() => {
            setShowAddToEventModal(false);
            setSelectedEnablerForEvent(null);
            setSelectedPackageForEvent(null);
          }}
        />
      )}
    </div>
  );
}
