
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, Package, Review, Wishlist, User, Contract, Booking, Event } from "@/api/entities";
import { ArrowLeft, Heart, Share2, Star, CheckCircle2, Award, X, ChevronLeft, ChevronRight, FileText, DollarSign, Shield, Sparkles, XCircle, ImageIcon, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlinkLogo from "../components/BlinkLogo";
import PackageDetailModal from "../components/PackageDetailModal";
import GalleryViewer from "../components/GalleryViewer";
import EnablerBrandModal from "../components/EnablerBrandModal";
import HostPackageNegotiation from "../components/HostPackageNegotiation";

export default function EnablerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const enablerId = searchParams.get("id");
  const eventId = searchParams.get("event_id");

  const [enabler, setEnabler] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [showNegotiation, setShowNegotiation] = useState(false);
  const [selectedPackageForNegotiation, setSelectedPackageForNegotiation] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(eventId);

  // Enhanced validation function
  const isValidEnablerId = (id) => {
    if (id === null || id === undefined) {
      console.error("❌ No ID provided (null or undefined)");
      return false;
    }
    
    const idStr = String(id).trim();
    
    console.log("🔍 Validating enabler ID:", idStr);
    
    // Check for common invalid patterns
    const invalidPatterns = [
      "",
      "-",
      "null",
      "undefined",
      "0",
      "none",
      "n/a"
    ];
    
    if (invalidPatterns.includes(idStr.toLowerCase())) {
      console.error(`❌ Invalid enabler ID detected: "${idStr}"`);
      return false;
    }
    
    // Check if it looks like a valid ID (contains at least one alphanumeric character)
    if (!/[a-zA-Z0-9]/.test(idStr)) {
      console.error(`❌ ID contains no alphanumeric characters: "${idStr}"`);
      return false;
    }
    
    // Check minimum length (arbitrary, adjust if actual IDs are shorter)
    if (idStr.length < 3 && idStr !== "0") { // Allow "0" for some systems, but it's typically an invalid ID
      console.error(`❌ ID too short: "${idStr}"`);
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    // COMPREHENSIVE VALIDATION
    console.log("==========================================");
    console.log("🔍 ENABLER PROFILE VALIDATION");
    console.log("Raw ID from URL:", enablerId);
    console.log("ID type:", typeof enablerId);
    console.log("ID length:", enablerId?.length);
    console.log("==========================================");

    if (!isValidEnablerId(enablerId)) {
      console.error("❌ Invalid enabler ID in EnablerProfile:", enablerId);
      setIsLoading(false);
      setErrorMessage("Invalid professional profile ID");
      
      // Show user-friendly error
      setTimeout(() => {
        alert("⚠️ Unable to load professional profile. The profile ID is invalid or corrupted.");
        
        // Try to go back, but if history is empty, go to browse
        if (window.history.length > 1) {
          navigate(-1, { replace: true });
        } else {
          navigate(createPageUrl("Browse"), { replace: true });
        }
      }, 500);
      
      return;
    }
    
    console.log("✅ Valid enabler ID, loading data:", enablerId);
    loadEnablerData();
  }, [enablerId, navigate]);

  const loadEnablerData = async () => {
    // Double-check validation in async function
    if (!isValidEnablerId(enablerId)) {
      setIsLoading(false);
      setErrorMessage("Invalid professional ID");
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage(null); // Clear any previous error messages
      
      const user = await User.me();
      setCurrentUser(user);
        
      console.log("📡 Loading enabler with ID:", enablerId);
      const enablerData = await Enabler.filter({ id: enablerId });
      
      if (!enablerData || enablerData.length === 0) {
        console.error("❌ Enabler not found:", enablerId);
        setErrorMessage("Professional profile not found");
        
        setTimeout(() => {
          alert("⚠️ Professional profile not found. Redirecting back.");
          if (window.history.length > 1) {
            navigate(-1, { replace: true });
          } else {
            navigate(createPageUrl("Browse"), { replace: true });
          }
        }, 500);
        
        return; 
      }
      
      const loadedEnabler = enablerData[0];
      
      // Validate loaded enabler has valid ID
      if (!isValidEnablerId(loadedEnabler.id)) {
        console.error("❌ Loaded enabler has invalid ID:", loadedEnabler);
        setErrorMessage("Professional profile data is corrupted");
        
        setTimeout(() => {
          alert("⚠️ Professional profile data is corrupted. Redirecting back.");
          if (window.history.length > 1) {
            navigate(-1, { replace: true });
          } else {
            navigate(createPageUrl("Browse"), { replace: true });
          }
        }, 500);
        
        return;
      }
      
      console.log("✅ Loaded enabler successfully:", loadedEnabler.business_name);
      setEnabler(loadedEnabler);
      
      const packagesData = await Package.filter({ enabler_id: enablerId });
      setPackages(packagesData);
      
      const reviewsData = await Review.filter({ enabler_id: enablerId }, "-created_date", 5);
      setReviews(reviewsData);

      const contractsData = await Contract.filter({ enabler_id: enablerId, status: "active" });
      setContracts(contractsData);
      
      const wishlistData = await Wishlist.filter({
        user_id: user.id,
        enabler_id: enablerId
      });
      setIsInWishlist(wishlistData.length > 0);
      
    } catch (error) {
      console.error("❌ Error loading enabler data:", error);
      setErrorMessage("Failed to load professional profile");
      
      setTimeout(() => {
        alert("⚠️ Failed to load professional profile. Redirecting back.");
        if (window.history.length > 1) {
          navigate(-1, { replace: true });
        } else {
          navigate(createPageUrl("Browse"), { replace: true });
        }
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!currentUser || !enablerId) return;
    
    if (isInWishlist) {
      const items = await Wishlist.filter({
        user_id: currentUser.id,
        enabler_id: enablerId
      });
      if (items[0]) {
        await Wishlist.delete(items[0].id);
        setIsInWishlist(false);
      }
    } else {
      await Wishlist.create({
        user_id: currentUser.id,
        enabler_id: enablerId
      });
      setIsInWishlist(true);
    }
  };

  const handlePortfolioClick = (index) => {
    setSelectedImageIndex(index);
    setShowPortfolio(true);
  };

  const nextImage = () => {
    if (enabler.portfolio_images) {
      setSelectedImageIndex((prev) => 
        prev === enabler.portfolio_images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (enabler.portfolio_images) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? enabler.portfolio_images.length - 1 : prev - 1
      );
    }
  };

  const createQuickEvent = async () => {
    const user = await User.me();
    const event = await Event.create({
      host_id: user.id,
      name: `Event with ${enabler.brand_name || enabler.business_name}`,
      type: "other",
      date: new Date().toISOString(),
      status: "planning"
    });
    return event.id;
  };

  const handleNegotiationAccept = async (data) => {
    setShowNegotiation(false);
    
    try {
      const eventToUse = currentEventId || (await createQuickEvent());
      const booking = await Booking.create({
        event_id: eventToUse,
        enabler_id: enabler.id,
        package_id: selectedPackageForNegotiation,
        total_amount: data.finalPrice,
        status: "confirmed",
        payment_status: "pending",
        negotiated_terms: data.negotiatedTerms
      });

      navigate(`${createPageUrl("EventBooking")}?event_id=${eventToUse}`);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking");
    }
  };

  const handlePackageSelect = (pkg) => {
    if (pkg.negotiation_settings && pkg.linked_contract_id) {
      setSelectedPackageForNegotiation(pkg.id);
      setShowNegotiation(true);
    } else {
      setSelectedPackageForDetail(pkg);
    }
  };

  // Show comprehensive error screen for invalid IDs or loading failures
  if (errorMessage || !isValidEnablerId(enablerId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {errorMessage || "Invalid Profile ID"}
          </h2>
          <p className="text-gray-600 mb-4">
            {errorMessage === "Invalid professional profile ID" 
              ? "The professional profile ID provided is invalid or missing."
              : errorMessage === "Professional profile not found"
              ? "We couldn't find a professional with this ID."
              : errorMessage === "Professional profile data is corrupted"
              ? "The professional's profile data appears to be corrupted."
              : errorMessage === "Failed to load professional profile"
              ? "An unexpected error occurred while loading this profile."
              : "Unable to load this professional's profile due to an unknown issue."}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-800">
              <strong>ID provided:</strong> {enablerId || '(none)'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.history.length > 1 ? navigate(-1, { replace: true }) : navigate(createPageUrl("Home"), { replace: true })}
              variant="outline"
              className="flex-1"
            >
              Go Back
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl("Browse"), { replace: true })}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              Browse Professionals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="md" className="animate-breath" />
      </div>
    );
  }
  
  if (!enabler) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
              <div className="text-center max-w-md px-4">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
                  <p className="text-gray-600 mb-4">
                    The professional profile could not be loaded or does not exist.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => window.history.length > 1 ? navigate(-1, { replace: true }) : navigate(createPageUrl("Home"), { replace: true })}
                      variant="outline"
                      className="flex-1"
                    >
                      Go Back
                    </Button>
                    <Button 
                      onClick={() => navigate(createPageUrl("Browse"), { replace: true })}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    >
                      Browse Professionals
                    </Button>
                  </div>
              </div>
          </div>
      );
  }

  const hasPackages = packages.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Glass Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={toggleWishlist}
              className={`p-2 rounded-full transition-colors ${
                isInWishlist ? "text-red-500 bg-red-50" : "hover:bg-gray-100"
              }`}
            >
              <Heart className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Safe bottom padding for buttons */}
      <div className="max-w-md mx-auto pt-14 pb-40">
        {/* Tabs */}
        <Tabs defaultValue="portfolio" className="px-4 py-6">
          <TabsList className="w-full grid grid-cols-3 border-b border-gray-100 bg-transparent p-0 mb-6">
            <TabsTrigger 
              value="portfolio"
              className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none pb-3 text-xs tracking-wide"
            >
              PROFILE
            </TabsTrigger>
            <TabsTrigger 
              value="packages"
              className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none pb-3 text-xs tracking-wide"
            >
              PACKAGES
            </TabsTrigger>
            <TabsTrigger 
              value="reviews"
              className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none pb-3 text-xs tracking-wide"
            >
              REVIEWS
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Tab - Now Shows Brand Profile */}
          <TabsContent value="portfolio" className="space-y-6">
            {/* Hero Section */}
            <div className="relative -mx-4 -mt-6">
              {/* Cover Image */}
              <div className="h-48 overflow-hidden bg-gradient-to-r from-emerald-400 to-cyan-400">
                {enabler.cover_image ? (
                  <img src={enabler.cover_image} alt="Cover" className="w-full h-full object-cover" />
                ) : null}
              </div>
              
              {/* Profile Info Overlay */}
              <div className="px-4 pb-6" style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,1) 100%)',
                marginTop: '-4rem'
              }}>
                <div className="flex items-end gap-4 mb-4">
                  <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-lg">
                    {enabler.profile_image ? (
                      <img src={enabler.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                    )}
                  </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{enabler.brand_name || enabler.business_name}</h1>
                <p className="text-sm text-gray-600 mb-2">{enabler.profession_title}</p>
                {enabler.tagline && (
                  <p className="text-sm italic text-gray-500">"{enabler.tagline}"</p>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {enabler.location && <span>📍 {enabler.location}</span>}
                    {enabler.years_experience && (
                      <span>⏱️ {enabler.years_experience} years</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(enabler.average_rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                        strokeWidth={1.5}
                      />
                    ))}
                    <span className="ml-2 text-sm font-semibold">{enabler.average_rating || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            {enabler.bio_story && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-3">ABOUT</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{enabler.bio_story}</p>
              </div>
            )}

            {/* Mission Statement */}
            {enabler.mission_statement && (
              <div className="p-5 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-lg">
                <h3 className="text-xs text-emerald-700 tracking-wide mb-2">MISSION</h3>
                <p className="text-sm text-emerald-900 italic">"{enabler.mission_statement}"</p>
              </div>
            )}

            {/* Specialty & Starting Price */}
            <div className="grid grid-cols-2 gap-4">
              {enabler.niche_specialty && (
                <div className="p-4 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                  <h4 className="text-xs text-gray-400 tracking-wide mb-2">SPECIALTY</h4>
                  <p className="text-sm font-medium text-gray-900">{enabler.niche_specialty}</p>
                </div>
              )}
              {enabler.base_price > 0 && (
                <div className="p-4 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                  <h4 className="text-xs text-gray-400 tracking-wide mb-2">STARTING FROM</h4>
                  <p className="text-lg font-bold text-emerald-600">${enabler.base_price}</p>
                </div>
              )}
            </div>

            {/* What Makes Different */}
            {enabler.what_makes_different && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-3">WHAT MAKES US DIFFERENT</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{enabler.what_makes_different}</p>
              </div>
            )}

            {/* Services Offered */}
            {enabler.services_offered && enabler.services_offered.length > 0 && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4">SERVICES OFFERED</h3>
                <div className="space-y-3">
                  {enabler.services_offered.map((service, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-gray-50">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                        {service.starting_price && (
                          <p className="text-xs font-medium text-emerald-600 mt-2">From ${service.starting_price}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Images (Work Samples) */}
            {enabler.portfolio_images && enabler.portfolio_images.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs text-gray-400 tracking-wide">WORK SAMPLES</h3>
                  <span className="text-xs text-gray-500">{enabler.portfolio_images.length} photos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {enabler.portfolio_images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => handlePortfolioClick(idx)}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                    >
                      <img
                        src={img}
                        alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {enabler.faqs && enabler.faqs.length > 0 && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4">FREQUENTLY ASKED QUESTIONS</h3>
                <div className="space-y-4">
                  {enabler.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 bg-white/80 rounded-lg border border-gray-50">
                      <h4 className="font-medium text-gray-900 text-sm mb-2">Q: {faq.question}</h4>
                      <p className="text-xs text-gray-600 pl-3 border-l-2 border-emerald-200">A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Area */}
            {enabler.service_area && (
              <div className="p-4 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h4 className="text-xs text-gray-400 tracking-wide mb-2">SERVICE AREA</h4>
                <p className="text-sm text-gray-700">{enabler.service_area}</p>
              </div>
            )}

            {/* Certifications & Awards */}
            {(enabler.certificate_files?.length > 0 || enabler.certifications?.length > 0) && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  CERTIFICATIONS
                </h3>
                <div className="space-y-2">
                  {enabler.certificate_files?.map((cert, idx) => (
                    <a
                      key={idx}
                      href={cert}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white/80 rounded-lg hover:bg-emerald-50 transition-colors text-sm text-emerald-600 font-medium"
                    >
                      Certificate {idx + 1} →
                    </a>
                  ))}
                  {/* Assuming enabler.certifications is an array of strings */}
                  {enabler.certifications?.map((cert, idx) => (
                    <span key={`cert-text-${idx}`} className="block p-3 bg-white/80 rounded-lg text-sm text-gray-700">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Achievement */}
            {enabler.proud_project_image && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                  FEATURED ACHIEVEMENT
                </h3>
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-200 mb-3 border border-gray-100">
                  <img src={enabler.proud_project_image} alt="Featured project" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm text-gray-700">{enabler.proud_project_description}</p>
              </div>
            )}

            {/* Collaboration */}
            {enabler.collaboration_open && (
              <div className="p-5 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-lg">
                <h3 className="text-sm font-medium text-emerald-900 mb-2">OPEN FOR COLLABORATION</h3>
                <p className="text-xs text-emerald-800">{enabler.collaboration_terms}</p>
              </div>
            )}
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-4">
            {hasPackages ? (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg)}
                  className="relative overflow-hidden border border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg cursor-pointer hover:scale-[1.02]"
                >
                  {pkg.thumbnail_image && (
                    <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                      <img
                        src={pkg.thumbnail_image}
                        alt={pkg.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900 text-lg tracking-tight flex-1">{pkg.name}</h4>
                    </div>

                    {/* Features Grid */}
                    {pkg.features && pkg.features.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                        {pkg.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {feature.included ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
                            )}
                            <span className={`text-xs truncate ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                              {feature.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        {pkg.max_guests && (
                          <span className="text-xs text-gray-400 tracking-wide block">
                            UP TO {pkg.max_guests} GUESTS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {pkg.gallery_images && pkg.gallery_images.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGallery(pkg.gallery_images);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-emerald-300 rounded-full transition-colors group/gallery"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-gray-500 group-hover/gallery:text-emerald-600 transition-colors" strokeWidth={1.5} />
                            <span className="text-xs font-medium text-gray-600 group-hover/gallery:text-emerald-600 transition-colors">
                              {pkg.gallery_images.length}
                            </span>
                          </button>
                        )}

                        <span className="font-semibold text-emerald-600 text-xl tracking-tight">
                          {pkg.currency}{pkg.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add Smart Negotiation Badge */}
                  {pkg.negotiation_settings && pkg.linked_contract_id && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-white border-0 shadow-lg">
                        <Sparkles className="w-3 h-3 mr-1" strokeWidth={2} />
                        Smart Negotiation
                      </Badge>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="border border-gray-100 p-12 text-center">
                <p className="text-sm text-gray-400">NO PACKAGES AVAILABLE</p>
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id} className="p-5 bg-gray-50 border-gray-100">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {review.reviewer_name?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {review.reviewer_name}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "{review.comment}"
                  </p>
                </Card>
              ))
            ) : (
              <div className="border border-gray-100 p-12 text-center">
                <p className="text-sm text-gray-400">NO REVIEWS YET</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Booking CTAs - Now inside main content, not fixed */}
        <div className="px-4 mt-6 space-y-3 pb-6">
          <Button
            onClick={() => navigate(`${createPageUrl("BookingFlow")}?enabler_id=${enablerId}`)}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-6 text-base font-semibold rounded-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <BlinkLogo size="xs" />
            BOOK NOW
          </Button>

          <Link to={`${createPageUrl("StructuredNegotiate")}?enabler_id=${enablerId}&event_id=${eventId || 'new'}`}>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-6 text-base font-semibold rounded-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              SMART NEGOTIATE
            </Button>
          </Link>
        </div>
      </div>

      {/* Portfolio Slideup Modal */}
      {showPortfolio && enabler.portfolio_images && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end" onClick={() => setShowPortfolio(false)}>
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl overflow-hidden transition-all duration-300 ease-in-out transform translate-y-0"
            style={{ height: '66vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Portfolio ({selectedImageIndex + 1} of {enabler.portfolio_images.length})
                </h3>
                <button
                  onClick={() => setShowPortfolio(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image Viewer */}
            <div className="relative h-[calc(100%-64px)] bg-gray-900">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={enabler.portfolio_images[selectedImageIndex]}
                  alt={`Portfolio ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Navigation Buttons */}
              {enabler.portfolio_images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-900" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-900" />
                  </button>
                </>
              )}

              {/* Thumbnail Strip */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {enabler.portfolio_images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === selectedImageIndex
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Detail Modal */}
      {selectedPackageForDetail && (
        <PackageDetailModal 
          package={selectedPackageForDetail} 
          onClose={() => setSelectedPackageForDetail(null)}
          onOpenGallery={(images) => {
            setSelectedPackageForDetail(null);
            setSelectedGallery(images);
          }}
          onViewPortfolio={() => { 
            setSelectedPackageForDetail(null);
            setShowBrandModal(true);
          }}
        />
      )}

      {/* Enabler Brand Modal */}
      {showBrandModal && (
        <EnablerBrandModal
          enabler={enabler}
          onClose={() => setShowBrandModal(false)}
        />
      )}

      {/* Gallery Viewer */}
      {selectedGallery && (
        <GalleryViewer 
          images={selectedGallery} 
          onClose={() => setSelectedGallery(null)} 
        />
      )}

      {/* Host Negotiation Modal */}
      {showNegotiation && selectedPackageForNegotiation && (
        <HostPackageNegotiation
          package={packages.find(pkg => pkg.id === selectedPackageForNegotiation)}
          eventId={currentEventId}
          onAccept={handleNegotiationAccept}
          onClose={() => {
            setShowNegotiation(false);
            setSelectedPackageForNegotiation(null);
          }}
        />
      )}
    </div>
  );
}
