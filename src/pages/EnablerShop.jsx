
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, Package, User, NegotiationFramework } from "@/api/entities"; // Added NegotiationFramework
import { Upload, Plus, Edit, Trash2, Save, Sparkles, X, CheckCircle2, FileText, XCircle, Image as ImageIcon, Settings, Shield, MapPin, ChevronRight } from "lucide-react"; // Added MapPin, ChevronRight
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge"; // Added Badge component
import { UploadFile, InvokeLLM } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";
import PackageDetailModal from "../components/PackageDetailModal";
import GalleryViewer from "../components/GalleryViewer";

const PRESET_PACKAGES_BY_CATEGORY = {
  event_planner: [
    { name: "Basic Planning", description: "Essential event coordination and vendor management", price: 2000 },
    { name: "Full Service", description: "Complete event planning from concept to execution", price: 5000 },
    { name: "Premium Package", description: "White-glove service with unlimited consultations", price: 10000 }
  ],
  photographer: [
    { name: "Half Day Coverage", description: "4 hours of photography with basic editing", price: 800 },
    { name: "Full Day Coverage", description: "8 hours with professional editing and album", price: 1500 },
    { name: "Complete Package", description: "Full day coverage, album, prints and digital files", price: 2500 }
  ],
  videographer: [
    { name: "Highlights Reel", description: "3-5 minute edited highlight video", price: 1200 },
    { name: "Full Coverage", description: "Full event coverage with cinematic editing", price: 2500 },
    { name: "Premium Production", description: "Multi-camera setup with drone footage", price: 5000 }
  ],
  caterer: [
    { name: "Basic Menu", description: "Standard catering menu per person", price: 35 },
    { name: "Premium Menu", description: "Upscale dining options per person", price: 65 },
    { name: "Luxury Experience", description: "Gourmet multi-course dining per person", price: 120 }
  ],
  musician: [
    { name: "Solo Performance", description: "2 hours of solo musical entertainment", price: 500 },
    { name: "Band Performance", description: "3 hours with full band setup", price: 2000 },
    { name: "Premium Show", description: "Full evening entertainment with lighting", price: 5000 }
  ],
  dj: [
    { name: "Basic Package", description: "4 hours DJ service with standard equipment", price: 600 },
    { name: "Premium Package", description: "6 hours with professional lighting", price: 1200 },
    { name: "Complete Experience", description: "Full event with premium sound and visual effects", price: 2500 }
  ],
  venue: [
    { name: "Basic Rental", description: "Venue space for 4 hours", price: 1500 },
    { name: "Full Day Rental", description: "8 hours with basic setup included", price: 3000 },
    { name: "Premium Package", description: "Full day with catering facilities and staff", price: 6000 }
  ],
  florist: [
    { name: "Basic Arrangements", description: "Simple floral centerpieces and bouquets", price: 500 },
    { name: "Enhanced Décor", description: "Complete floral design for ceremony and reception", price: 1500 },
    { name: "Luxury Florals", description: "Premium flowers with elaborate installations", price: 5000 }
  ],
  decorator: [
    { name: "Basic Setup", description: "Standard décor package with linens and centerpieces", price: 1000 },
    { name: "Themed Décor", description: "Custom themed decoration with props", price: 3000 },
    { name: "Luxury Design", description: "High-end design with premium materials", price: 8000 }
  ],
  beauty_specialist: [
    { name: "Bridal Makeup", description: "Bride makeup and hair styling", price: 300 },
    { name: "Bridal Party", description: "Bride + 5 people makeup and hair", price: 800 },
    { name: "Full Service", description: "Unlimited styling for entire wedding party", price: 1500 }
  ],
  audio_visual: [
    { name: "Basic Setup", description: "Standard sound system and microphones", price: 500 },
    { name: "Professional Package", description: "Complete AV with lighting and screens", price: 2000 },
    { name: "Premium Production", description: "High-end equipment with technical support", price: 5000 }
  ]
};

const CURRENCIES = [
  { symbol: "$", code: "USD", name: "US Dollar" },
  { symbol: "AED", code: "AED", name: "UAE Dirham" },
  { symbol: "EGP", code: "EGP", name: "Egyptian Pound" }
];

// New component for package negotiation settings
const PackageNegotiationSettings = ({ packageId, onSave, onClose }) => {
  const [pkg, setPkg] = useState(null);
  const [allowNegotiations, setAllowNegotiations] = useState(false);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setIsLoading(true);
        const fetchedPackage = await Package.get(packageId);
        setPkg(fetchedPackage);
        setAllowNegotiations(fetchedPackage.allow_negotiations || false);
        setMaxDiscountPercentage(fetchedPackage.max_discount_percentage || 0);
      } catch (err) {
        console.error("Failed to fetch package:", err);
        setError("Failed to load package settings.");
      } finally {
        setIsLoading(false);
      }
    };
    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  const handleSave = async () => {
    try {
      await Package.update(packageId, {
        allow_negotiations: allowNegotiations,
        max_discount_percentage: allowNegotiations ? maxDiscountPercentage : 0
      });
      onSave();
    } catch (err) {
      console.error("Failed to update package negotiation settings:", err);
      alert("Failed to save settings. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  if (!pkg) return null; // Should not happen if error handled

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Negotiation Settings for "{pkg.name}"</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-900" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Configure how clients can negotiate the price for this package. Set a maximum discount percentage to automatically accept offers within your limits.
        </p>

        <div className="flex items-center justify-between py-3 border-t border-b border-gray-100">
          <Label htmlFor="allow-negotiations" className="text-base font-medium text-gray-700">
            Allow Negotiations
          </Label>
          <Checkbox
            id="allow-negotiations"
            checked={allowNegotiations}
            onCheckedChange={setAllowNegotiations}
          />
        </div>

        {allowNegotiations && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">
                Maximum Discount Buffer: <span className="font-semibold">{maxDiscountPercentage}%</span>
              </Label>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 25, 30].map((percentage) => (
                  <button
                    key={percentage}
                    type="button"
                    onClick={() => setMaxDiscountPercentage(percentage)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      maxDiscountPercentage === percentage
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {percentage}%
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              This is the maximum percentage off the listed price you are willing to accept via automated negotiations. An offer within this buffer will be automatically accepted.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-3">
          <Button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!allowNegotiations && maxDiscountPercentage > 0}
          >
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};


export default function EnablerShop() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [packages, setPackages] = useState([]);
  const [newPackage, setNewPackage] = useState({
    name: "",
    description: "",
    price: "",
    max_guests: "",
    currency: "$",
    allow_negotiations: false,
    max_discount_percentage: 0,
    negotiation_framework_ids: [] // Changed to array
  });
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showPresetPackages, setShowPresetPackages] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState([]);
  const [editingPreset, setEditingPreset] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showNegotiationSettings, setShowNegotiationSettings] = useState(false);
  const [selectedPackageForNegotiation, setSelectedPackageForNegotiation] = useState(null);
  const [frameworks, setFrameworks] = useState([]); // New state for frameworks
  const [activeTab, setActiveTab] = useState("brand"); // Default tab

  useEffect(() => {
    loadShop();
    
    // Check if URL has hash to open specific tab
    const hash = window.location.hash.replace('#', '');
    if (hash === 'packages') {
      setActiveTab('packages');
    }
  }, []);

  const loadShop = async () => {
    const user = await User.me();
    
    const selectedProfileId = localStorage.getItem("selected_enabler_profile");
    let enablerData;
    
    if (selectedProfileId) {
      const filterResult = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
      enablerData = filterResult[0];
    } else {
      const filterResult = await Enabler.filter({ user_id: user.id }, "-created_date");
      enablerData = filterResult[0];
      if (enablerData) {
        localStorage.setItem("selected_enabler_profile", enablerData.id);
      }
    }
    
    if (enablerData) {
      setEnabler(enablerData);
      
      const packagesData = await Package.filter({ enabler_id: enablerData.id });
      setPackages(packagesData.map(pkg => ({ 
        ...pkg, 
        currency: pkg.currency || "$",
        allow_negotiations: pkg.allow_negotiations || false,
        max_discount_percentage: pkg.max_discount_percentage || 0,
        linked_contract_id: pkg.linked_contract_id || null,
        negotiation_framework_ids: pkg.negotiation_framework_ids || [] // Changed to array
      })));
      
      // Load frameworks
      const frameworksData = await NegotiationFramework.filter({ enabler_id: enablerData.id });
      setFrameworks(frameworksData);

    } else {
      setEnabler(null);
      setPackages([]);
      setFrameworks([]); // Reset frameworks too
      localStorage.removeItem("selected_enabler_profile");
    }
  };

  const handleManageNegotiation = () => {
    navigate(createPageUrl("NegotiationSetup"));
  };

  const handleAddPackage = async () => {
    await Package.create({
      enabler_id: enabler.id,
      name: newPackage.name,
      description: newPackage.description,
      price: parseFloat(newPackage.price),
      max_guests: parseInt(newPackage.max_guests) || null,
      currency: newPackage.currency,
      allow_negotiations: false, // Default to false, configured via dedicated modal
      max_discount_percentage: 0, // Default to 0, configured via dedicated modal
      negotiation_framework_ids: [] // Default to empty array
    });
    
    setNewPackage({ name: "", description: "", price: "", max_guests: "", currency: "$", allow_negotiations: false, max_discount_percentage: 0, negotiation_framework_ids: [] });
    setShowAddPackage(false);
    loadShop();
  };

  const deletePackage = async (id) => {
    if (confirm("Delete this package?")) {
      await Package.delete(id);
      loadShop();
    }
  };

  const getPresetPackagesForCategory = () => {
    if (!enabler?.category) return [];
    return PRESET_PACKAGES_BY_CATEGORY[enabler.category] || [];
  };

  const handleSelectPreset = (preset) => {
    const isSelected = selectedPresets.some(p => p.name === preset.name);
    if (isSelected) {
      setSelectedPresets(selectedPresets.filter(p => p.name !== preset.name));
    } else {
      setSelectedPresets([...selectedPresets, { 
        ...preset, 
        currency: "$",
        allow_negotiations: false, // Presets don't carry negotiation settings directly
        max_discount_percentage: 0, // Presets don't carry negotiation settings directly
        negotiation_framework_ids: [] // Presets don't carry negotiation settings directly
      }]);
    }
  };

  const handleEditPreset = (preset) => {
    setEditingPreset({ 
      ...preset, 
      originalName: preset.name, 
      currency: preset.currency || "$",
      // Negotiation settings are no longer edited via preset modal
    });
  };

  const handleSaveEditedPreset = () => {
    setSelectedPresets(selectedPresets.map(p => 
      p.name === editingPreset.originalName 
        ? { 
            ...editingPreset, 
            originalName: undefined,
            // Negotiation settings are no longer edited via preset modal
          } 
        : p
    ));
    setEditingPreset(null);
  };

  const handleAddPresetsToPackages = async () => {
    try {
      for (const preset of selectedPresets) {
        await Package.create({
          enabler_id: enabler.id,
          name: preset.name,
          description: preset.description,
          price: parseFloat(preset.price),
          currency: preset.currency,
          max_guests: parseInt(preset.max_guests) || null,
          allow_negotiations: false, // Default to false, configured via dedicated modal
          max_discount_percentage: 0, // Default to 0, configured via dedicated modal
          negotiation_framework_ids: [] // Default to empty array
        });
      }
      setSelectedPresets([]);
      setShowPresetPackages(false);
      loadShop();
    } catch (error) {
      console.error("Error adding packages:", error);
      alert("Failed to add packages. Please try again.");
    }
  };

  const handleDeleteProfile = async () => {
    if (!enabler) return;
    
    try {
      await Enabler.delete(enabler.id);
      localStorage.removeItem("selected_enabler_profile");
      window.location.reload();
    } catch (error) {
      console.error("Error deleting profile:", error);
      alert("Failed to delete profile. Please try again.");
    }
  };

  const handleEditPackage = (pkg) => {
    const pkgWithFeatures = { 
        ...pkg, 
        features: pkg.features ? pkg.features.map(f => ({...f})) : [],
        max_guests: pkg.max_guests || ""
    };
    setEditingPackage(pkgWithFeatures);
  };

  const handleSaveEditedPackage = async () => {
    if (!editingPackage) return;

    try {
      await Package.update(editingPackage.id, {
        name: editingPackage.name,
        description: editingPackage.description,
        price: parseFloat(editingPackage.price),
        currency: editingPackage.currency,
        max_guests: editingPackage.max_guests ? parseInt(editingPackage.max_guests) : null,
        features: editingPackage.features,
        allow_negotiations: editingPackage.allow_negotiations,
        max_discount_percentage: editingPackage.allow_negotiations ? editingPackage.max_discount_percentage : 0,
        negotiation_framework_ids: editingPackage.negotiation_framework_ids || [] // Ensure this is passed through
      });
      setEditingPackage(null);
      loadShop();
    } catch (error) {
      console.error("Error updating package:", error);
      alert("Failed to update package. Please try again.");
    }
  };

  // Helper function to get rank emoji
  const getRankEmoji = (totalReviews, averageRating) => {
    if (!totalReviews || !averageRating) return { emoji: "🌱", label: "Newcomer" };
    
    if (totalReviews >= 100 && averageRating >= 4.8) return { emoji: "👑", label: "Elite" };
    if (totalReviews >= 50 && averageRating >= 4.5) return { emoji: "⭐", label: "Expert" };
    if (totalReviews >= 20 && averageRating >= 4.0) return { emoji: "💎", label: "Pro" };
    if (totalReviews >= 10) return { emoji: "✨", label: "Rising Star" };
    return { emoji: "🌱", label: "Newcomer" };
  };

  // Helper function to truncate about to 4 sentences
  const truncateToSentences = (text, maxSentences = 4) => {
    if (!text) return "";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, maxSentences).join(" ");
  };

  // Helper function to get first name
  const getFirstName = (fullName) => {
    if (!fullName) return "";
    return fullName.split(" ")[0];
  };

  if (!enabler) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Create your enabler profile first</p>
          <Link to={createPageUrl("CreateEnablerProfile")}>
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              Create Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const rank = getRankEmoji(enabler.total_reviews, enabler.average_rating);

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header with Title and Navigation Tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          {/* Title Section */}
          <div className="pt-4 pb-2">
            <h1 className="text-base font-medium text-gray-900 tracking-tight">My Shop</h1>
            <p className="text-[10px] text-gray-400 tracking-wider mt-0.5">BUSINESS PROFILE</p>
          </div>
          
          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 border-0 bg-transparent p-0 h-14">
              <TabsTrigger 
                value="brand"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-xs tracking-wide font-medium text-gray-500 data-[state=active]:text-emerald-600"
              >
                BRAND
              </TabsTrigger>
              <TabsTrigger 
                value="packages"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-xs tracking-wide font-medium text-gray-500 data-[state=active]:text-emerald-600"
              >
                PACKAGES
              </TabsTrigger>
              <TabsTrigger 
                value="contracts"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-xs tracking-wide font-medium text-gray-500 data-[state=active]:text-emerald-600"
              >
                CONTRACTS
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Scrollable Content with Adjusted Top Padding */}
      <div className="pt-[104px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="max-w-5xl mx-auto px-6">
            {/* Brand Tab - Redesigned */}
            <TabsContent value="brand" className="mt-0 space-y-6 pb-24">
              {/* Edit Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => navigate(createPageUrl("EditEnablerProfile"))}
                  className="text-xs text-gray-900 hover:text-emerald-500 transition-colors tracking-wide flex items-center gap-2"
                >
                  <Edit className="w-3.5 h-3.5" strokeWidth={1.5} />
                  EDIT PROFILE
                </button>
              </div>

              {/* Hero Section */}
              <div className="relative -mx-6">
                {/* Cover Image */}
                <div className="h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {enabler.cover_image ? (
                    <img src={enabler.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                
                {/* Profile Info Overlay */}
                <div className="px-6 pb-6" style={{
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
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">{enabler.brand_name || enabler.business_name}</h1>
                        {enabler.user_id && (
                          <span className="text-sm text-gray-500">by {getFirstName(enabler.profile_name || "Enabler")}</span>
                        )}
                      </div>
                      {enabler.profession_title && <p className="text-sm text-gray-600 mb-2">{enabler.profession_title}</p>}
                      {enabler.tagline && (
                        <p className="text-sm italic text-gray-500">"{enabler.tagline}"</p>
                      )}
                    </div>

                    {/* Rank and Rating */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="text-2xl">{rank.emoji}</span>
                        <span className="text-xs font-semibold text-gray-700">{rank.label}</span>
                      </div>
                      {enabler.average_rating > 0 && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-sm font-bold text-amber-500">{enabler.average_rating.toFixed(1)}</span>
                          <span className="text-amber-500">⭐</span>
                          <span className="text-xs text-gray-500">({enabler.total_reviews})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {enabler.location && <span>📍 {enabler.location}</span>}
                    {enabler.years_experience && (
                      <span>⏱️ {enabler.years_experience} years</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Area - Top Priority */}
              {enabler.service_area && (
                <div className="p-4 bg-emerald-50/50 backdrop-blur-sm border border-emerald-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                    <h4 className="text-xs font-bold text-emerald-900 tracking-wider">SERVICE AREA</h4>
                  </div>
                  <p className="text-sm text-emerald-800 font-medium">{enabler.service_area}</p>
                </div>
              )}

              {/* About Section - Limited to 4 Sentences */}
              {enabler.bio_story && (
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                  <h3 className="text-xs text-gray-400 tracking-wide mb-3">ABOUT</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{truncateToSentences(enabler.bio_story, 4)}</p>
                </div>
              )}

              {/* Specialty - Bullet Style */}
              {enabler.niche_specialty && (
                <div className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg">
                  <h3 className="text-xs text-purple-700 tracking-wide mb-3 font-bold">SPECIALTY</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-base font-medium text-gray-900 leading-relaxed tracking-tight">
                      {enabler.niche_specialty}
                    </p>
                  </div>
                </div>
              )}

              {/* Proud Achievements */}
              {enabler.proud_project_description && (
                <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-lg">
                  <h3 className="text-xs text-amber-700 tracking-wide mb-3 font-bold">PROUD ACHIEVEMENTS</h3>
                  {enabler.proud_project_image && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={enabler.proud_project_image} 
                        alt="Proud Achievement" 
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">{enabler.proud_project_description}</p>
                </div>
              )}

              {/* Certifications */}
              {enabler.certifications && enabler.certifications.length > 0 && (
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                  <h3 className="text-xs text-gray-400 tracking-wide mb-4 font-bold">CERTIFICATIONS</h3>
                  <div className="space-y-3">
                    {enabler.certifications.map((cert, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (enabler.certificate_files && enabler.certificate_files[idx]) {
                            window.open(enabler.certificate_files[idx], '_blank');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{cert}</p>
                            {enabler.certificate_files && enabler.certificate_files[idx] && (
                              <p className="text-xs text-emerald-600 group-hover:underline">Click to view</p>
                            )}
                          </div>
                        </div>
                        {enabler.certificate_files && enabler.certificate_files[idx] && (
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services Offered - Redesigned */}
              {enabler.services_offered && enabler.services_offered.length > 0 && (
                <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-lg">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-tight">Services Offered</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {enabler.services_offered.map((service, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                          idx % 3 === 0 ? 'bg-blue-50 border-blue-200' :
                          idx % 3 === 1 ? 'bg-purple-50 border-purple-200' :
                          'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            idx % 3 === 0 ? 'bg-blue-100' :
                            idx % 3 === 1 ? 'bg-purple-100' :
                            'bg-emerald-100'
                          }`}>
                            <CheckCircle2 className={`w-5 h-5 ${
                              idx % 3 === 0 ? 'text-blue-600' :
                              idx % 3 === 1 ? 'text-purple-600' :
                              'text-emerald-600'
                            }`} strokeWidth={2} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-base text-gray-900 mb-1">{service.name}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed mb-2">{service.description}</p>
                            {service.starting_price && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Starting from</span>
                                <span className={`font-bold text-sm ${
                                  idx % 3 === 0 ? 'text-blue-600' :
                                  idx % 3 === 1 ? 'text-purple-600' :
                                  'text-emerald-600'
                                }`}>${service.starting_price}</span>
                              </div>
                            )}
                          </div>
                        </div>
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

              {/* Delete Profile Button */}
              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full py-3 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
                >
                  DELETE PROFILE
                </button>
              </div>
            </TabsContent>

            {/* Packages Tab */}
            <TabsContent value="packages" className="mt-0 space-y-4 py-6 pb-24">
              <div className="flex items-center justify-between">
                <h3 className="text-xs text-gray-400 tracking-wide">SERVICE PACKAGES</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowPresetPackages(!showPresetPackages);
                      setShowAddPackage(false);
                    }}
                    className="text-xs text-gray-900 hover:text-emerald-500 transition-colors tracking-wide flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                    PRESETS
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPackage(!showAddPackage);
                      setShowPresetPackages(false);
                    }}
                    className="text-xs text-gray-900 hover:text-emerald-500 transition-colors tracking-wide flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    CUSTOM
                  </button>
                </div>
              </div>

              {/* Preset Packages Selection */}
              {showPresetPackages && (
                <div className="border-2 border-emerald-200 p-5 space-y-4">
                  <h4 className="text-xs text-gray-400 tracking-wide mb-3">SELECT PRESET PACKAGES</h4>
                  
                  {getPresetPackagesForCategory().length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {getPresetPackagesForCategory().map((preset, idx) => {
                          const isSelected = selectedPresets.some(p => p.name === preset.name);
                          return (
                            <div 
                              key={idx}
                              className={`border p-3 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-emerald-500 bg-emerald-50' 
                                  : 'border-gray-100 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1" onClick={() => handleSelectPreset(preset)}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                      isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                                    }`}>
                                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={2} />}
                                    </div>
                                    <p className="font-medium text-sm">{preset.name}</p>
                                  </div>
                                  <p className="text-xs text-gray-600 ml-6">{preset.description}</p>
                                  <p className="text-xs font-bold text-emerald-600 ml-6 mt-1">${preset.price}</p>
                                </div>
                                {isSelected && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditPreset({ ...preset, originalName: preset.name }); }}
                                    className="text-emerald-500 hover:text-emerald-600 ml-2"
                                  >
                                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedPresets.length > 0 && (
                        <div className="pt-3 border-t border-emerald-200">
                          <p className="text-xs text-gray-400 mb-3 tracking-wide">
                            {selectedPresets.length} PACKAGE{selectedPresets.length > 1 ? 'S' : ''} SELECTED
                          </p>
                          <button
                            onClick={handleAddPresetsToPackages}
                            className="w-full bg-emerald-500 text-white py-2.5 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors"
                          >
                            ADD SELECTED TO PORTFOLIO
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No preset packages available for your category
                    </p>
                  )}
                </div>
              )}

              {/* Edit Preset Modal */}
              {editingPreset && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900">EDIT PACKAGE</h3>
                      <button onClick={() => setEditingPreset(null)}>
                        <X className="w-5 h-5 text-gray-500 hover:text-gray-900" strokeWidth={1.5} />
                      </button>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-400 tracking-wide">PACKAGE NAME</Label>
                      <Input
                        value={editingPreset.name}
                        onChange={(e) => setEditingPreset({...editingPreset, name: e.target.value})}
                        className="mt-2 border-emerald-200 focus:border-emerald-500 text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-400 tracking-wide">DESCRIPTION</Label>
                      <Textarea
                        value={editingPreset.description}
                        onChange={(e) => setEditingPreset({...editingPreset, description: e.target.value})}
                        className="mt-2 border-emerald-200 focus:border-emerald-500 text-sm"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-400 tracking-wide">CURRENCY</Label>
                        <Select 
                          value={editingPreset.currency || "$"} 
                          onValueChange={(value) => setEditingPreset({...editingPreset, currency: value})}
                        >
                          <SelectTrigger className="mt-2 border-emerald-200 focus:ring-1 focus:ring-emerald-500 text-sm">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((curr) => (
                              <SelectItem key={curr.code} value={curr.symbol}>
                                {curr.symbol} {curr.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-400 tracking-wide">PRICE</Label>
                        <Input
                          type="number"
                          value={editingPreset.price}
                          onChange={(e) => setEditingPreset({...editingPreset, price: e.target.value})}
                          className="mt-2 border-emerald-200 focus:border-emerald-500 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-400 tracking-wide">MAX GUESTS (OPTIONAL)</Label>
                      <Input
                        type="number"
                        value={editingPreset.max_guests || ""}
                        onChange={(e) => setEditingPreset({...editingPreset, max_guests: e.target.value})}
                        className="mt-2 border-emerald-200 focus:border-emerald-500 text-sm"
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                    
                    {/* Negotiation Settings for Editing Preset are removed */}

                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={handleSaveEditedPreset}
                        className="flex-1 bg-emerald-500 text-white py-2.5 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors"
                      >
                        SAVE CHANGES
                      </button>
                      <button
                        onClick={() => setEditingPreset(null)}
                        className="flex-1 border border-emerald-500 text-emerald-500 py-2.5 text-xs font-medium tracking-wide hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Package Creation */}
              {showAddPackage && (
                <div className="border-2 border-emerald-200 p-5">
                  <h4 className="text-xs text-gray-400 tracking-wide mb-4">NEW CUSTOM PACKAGE</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Package name"
                      value={newPackage.name}
                      onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                      className="border-emerald-200 focus:border-emerald-500 text-sm"
                    />
                    <Textarea
                      placeholder="Description"
                      value={newPackage.description}
                      onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                      rows={2}
                      className="border-emerald-200 focus:border-emerald-500 text-sm"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Select 
                        value={newPackage.currency} 
                        onValueChange={(value) => setNewPackage({...newPackage, currency: value})}
                      >
                        <SelectTrigger className="border-emerald-200 focus:ring-1 focus:ring-emerald-500 text-sm">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.symbol}>
                              {curr.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={newPackage.price}
                        onChange={(e) => setNewPackage({...newPackage, price: e.target.value})}
                        className="border-emerald-200 focus:border-emerald-500 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max guests"
                        value={newPackage.max_guests}
                        onChange={(e) => setNewPackage({...newPackage, max_guests: e.target.value})}
                        className="border-emerald-200 focus:border-emerald-500 text-sm"
                      />
                    </div>
                    
                    {/* Negotiation Settings for Custom Package Creation are removed */}
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddPackage}
                        className="flex-1 bg-emerald-500 text-white py-2.5 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors"
                      >
                        CREATE
                      </button>
                      <button
                        onClick={() => {
                          setShowAddPackage(false);
                          setNewPackage({ name: "", description: "", price: "", max_guests: "", currency: "$", allow_negotiations: false, max_discount_percentage: 0, negotiation_framework_ids: [] });
                        }}
                        className="flex-1 border border-emerald-500 text-emerald-500 py-2.5 text-xs font-medium tracking-wide hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Package Creator CTA */}
              {!showAddPackage && !showPresetPackages && (
                <div className="border-2 border-purple-200 p-6 text-center bg-gradient-to-br from-purple-50 to-blue-50">
                  <Sparkles className="w-12 h-12 mx-auto text-purple-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">AI Package Builder</h4>
                  <p className="text-xs text-gray-600 mb-4">
                    Answer a few smart questions and let AI create a professional package description for you
                  </p>
                  <Link to={createPageUrl("SmartPackageCreator")}>
                    <button className="bg-purple-600 text-white px-6 py-2.5 text-xs font-medium tracking-wide hover:bg-purple-700 transition-colors rounded-lg">
                      BUILD WITH AI
                    </button>
                  </Link>
                </div>
              )}

              {/* Existing Packages with Modern Card Design */}
              <div className="space-y-4">
                {packages.map((pkg) => {
                  const linkedFrameworks = frameworks.filter(f => 
                    pkg.negotiation_framework_ids && pkg.negotiation_framework_ids.includes(f.id)
                  );
                  
                  return (
                    <div 
                      key={pkg.id} 
                      className="group relative overflow-hidden border border-gray-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg"
                    >
                      {/* Thumbnail Image */}
                      {pkg.thumbnail_image && (
                        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                          <img
                            src={pkg.thumbnail_image}
                            alt={pkg.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      
                      <div className="p-5">
                        {/* Header with Actions */}
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-gray-900 text-lg tracking-tight flex-1">{pkg.name}</h4>
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPackage(pkg);
                              }}
                              className="text-gray-300 hover:text-emerald-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePackage(pkg.id);
                              }}
                              className="text-gray-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>

                        {/* Negotiation & Contract Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {pkg.linked_contract_id && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
                              <Shield className="w-3 h-3 mr-1" strokeWidth={2} />
                              Contract Linked
                            </Badge>
                          )}
                          {linkedFrameworks.length > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                              <Sparkles className="w-3 h-3 mr-1" strokeWidth={2} />
                              {linkedFrameworks.length} Framework{linkedFrameworks.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {pkg.allow_negotiations && linkedFrameworks.length === 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                              <Sparkles className="w-3 h-3 mr-1" strokeWidth={2} />
                              Manual Negotiations
                            </Badge>
                          )}
                        </div>

                        {/* Show linked frameworks */}
                        {linkedFrameworks.length > 0 && (
                          <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-xs font-medium text-emerald-900 mb-2">
                              Smart Negotiation Options:
                            </p>
                            <div className="space-y-1">
                              {linkedFrameworks.map(framework => (
                                <div key={framework.id} className="flex items-center gap-2 text-xs text-emerald-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{framework.framework_name}</span>
                                  <span className="text-emerald-600 text-[10px]">
                                    ({framework.framework_type.replace(/_/g, ' ')})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Features Grid - Side by Side or Description */}
                        {pkg.features && pkg.features.length > 0 ? (
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
                        ) : (
                          <p className="text-xs text-gray-500 mb-4">{pkg.description}</p>
                        )}


                        {/* Footer with Price and Gallery Button */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div>
                            {pkg.max_guests && (
                              <span className="text-xs text-gray-400 tracking-wide block mb-1">
                                UP TO {pkg.max_guests} GUESTS
                              </span>
                            )}
                            {pkg.allow_negotiations && (
                              <span className="text-xs text-emerald-600 tracking-wide block">
                                Negotiable -{pkg.max_discount_percentage}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Gallery Button */}
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

                            {/* Price */}
                            <div className="text-right">
                              <span className="font-semibold text-emerald-600 text-xl tracking-tight">
                                {pkg.currency}{pkg.price}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* View Details Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackageForDetail(pkg);
                          }}
                          className="w-full mt-3 py-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-lg transition-colors"
                        >
                          VIEW FULL DETAILS
                        </button>

                        {/* Negotiation Settings Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackageForNegotiation(pkg.id);
                            setShowNegotiationSettings(true);
                          }}
                          className="w-full mt-3 py-2 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Settings className="w-4 h-4" strokeWidth={1.5} />
                          SMART NEGOTIATIONS
                        </button>
                      </div>
                    </div>
                  );
                })}
                {packages.length === 0 && !showAddPackage && !showPresetPackages && (
                  <div className="border border-emerald-100 p-12 text-center">
                    <p className="text-sm text-gray-400 mb-6 tracking-wide">NO PACKAGES YET</p>
                    <button
                      onClick={() => setShowPresetPackages(true)}
                      className="bg-emerald-500 text-white px-8 py-3 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors"
                    >
                      BROWSE PRESETS
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contracts" className="mt-0 py-6 pb-24">
              <div className="space-y-4">
                <div className="border border-emerald-100 p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-emerald-500 mb-4" strokeWidth={1.5} />
                  <h3 className="font-medium text-gray-900 mb-2 tracking-tight">Smart Contracts</h3>
                  <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                    Create legally-binding agreements with automated terms, payment schedules, and dispute resolution.
                  </p>
                  <Link to={createPageUrl("EnablerContracts")}>
                    <button className="bg-emerald-500 text-white px-8 py-3 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors">
                      MANAGE CONTRACTS
                    </button>
                  </Link>
                </div>

                {/* Add Negotiation Framework Section */}
                <div className="border border-purple-100 p-6 text-center bg-gradient-to-br from-purple-50 to-blue-50">
                  <Sparkles className="w-12 h-12 mx-auto text-purple-600 mb-4" strokeWidth={1.5} />
                  <h3 className="font-medium text-gray-900 mb-2 tracking-tight">Auto-Negotiation Frameworks</h3>
                  <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                    Create reusable negotiation rules and link them to specific packages. Set your boundaries once, let AI handle offers automatically.
                  </p>
                  <button 
                    onClick={handleManageNegotiation}
                    className="bg-purple-600 text-white px-8 py-3 text-xs font-medium tracking-wide hover:bg-purple-700 transition-colors"
                  >
                    SETUP NEGOTIATION FRAMEWORKS
                  </button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6" strokeWidth={1.5} />
              <h3 className="text-lg font-bold">Delete Profile?</h3>
            </div>
            
            <p className="text-sm text-gray-700">
              Are you sure you want to delete this business profile? This action cannot be undone.
            </p>
            
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-xs text-red-800">
                <strong>Warning:</strong> Deleting this profile will remove all associated packages, bookings, and contracts.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 text-sm font-medium tracking-wide hover:bg-gray-50 transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                className="flex-1 bg-red-600 text-white py-2.5 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-lg"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Package</h3>
              <button onClick={() => setEditingPackage(null)}>
                <X className="w-5 h-5 text-gray-500 hover:text-gray-900" strokeWidth={1.5} />
              </button>
            </div>
            
            <div>
              <Label className="text-xs text-gray-400 tracking-wide">PACKAGE NAME</Label>
              <Input
                value={editingPackage.name}
                onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-400 tracking-wide">DESCRIPTION</Label>
              <Textarea
                value={editingPackage.description || ""}
                onChange={(e) => setEditingPackage({...editingPackage, description: e.target.value})}
                className="mt-2"
                rows={3} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400 tracking-wide">CURRENCY</Label>
                <Select 
                  value={editingPackage.currency} 
                  onValueChange={(value) => setEditingPackage({...editingPackage, currency: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.symbol}>
                        {curr.symbol} {curr.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-400 tracking-wide">PRICE</Label>
                <Input
                  type="number"
                  value={editingPackage.price}
                  onChange={(e) => setEditingPackage({...editingPackage, price: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-400 tracking-wide">MAX GUESTS (OPTIONAL)</Label>
              <Input
                type="number"
                value={editingPackage.max_guests || ""}
                onChange={(e) => setEditingPackage({...editingPackage, max_guests: e.target.value})}
                className="mt-2"
              />
            </div>

            {/* Features */}
            {editingPackage.features && editingPackage.features.length > 0 && (
              <div>
                <Label className="text-xs text-gray-400 tracking-wide mb-2 block">FEATURES</Label>
                <div className="space-y-2">
                  {editingPackage.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Checkbox
                        checked={feature.included}
                        onCheckedChange={(checked) => {
                          const updated = [...editingPackage.features];
                          updated[idx].included = checked;
                          setEditingPackage({...editingPackage, features: updated});
                        }}
                      />
                      <Input
                        value={feature.text}
                        onChange={(e) => {
                          const updated = [...editingPackage.features];
                          updated[idx].text = e.target.value;
                          setEditingPackage({...editingPackage, features: updated});
                        }}
                        className="flex-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negotiation Settings */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs text-gray-400 tracking-wide">ALLOW NEGOTIATIONS</Label>
                <Checkbox
                  checked={editingPackage.allow_negotiations || false}
                  onCheckedChange={(checked) => setEditingPackage({
                    ...editingPackage,
                    allow_negotiations: checked,
                    max_discount_percentage: checked ? editingPackage.max_discount_percentage : 0
                  })}
                />
              </div>
              
              {editingPackage.allow_negotiations && (
                <div>
                  <Label className="text-xs text-gray-600 mb-2 block">
                    Maximum Discount: {editingPackage.max_discount_percentage || 0}%
                  </Label>
                  <div className="flex gap-2">
                    {[10, 20, 30].map((percentage) => (
                      <button
                        key={percentage}
                        type="button"
                        onClick={() => setEditingPackage({...editingPackage, max_discount_percentage: percentage})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          editingPackage.max_discount_percentage === percentage
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <Button
                onClick={handleSaveEditedPackage}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingPackage(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Package Detail Modal */}
      {selectedPackageForDetail && (
        <PackageDetailModal 
          package={selectedPackageForDetail} 
          onClose={() => setSelectedPackageForDetail(null)}
          onOpenGallery={(images) => setSelectedGallery(images)}
        />
      )}

      {/* Gallery Viewer */}
      {selectedGallery && (
        <GalleryViewer 
          images={selectedGallery} 
          onClose={() => setSelectedGallery(null)} 
        />
      )}

      {/* Negotiation Settings Modal */}
      {showNegotiationSettings && selectedPackageForNegotiation && (
        <PackageNegotiationSettings
          packageId={selectedPackageForNegotiation}
          onSave={() => {
            setShowNegotiationSettings(false);
            setSelectedPackageForNegotiation(null);
            loadShop(); // Reload packages to reflect updated negotiation settings
          }}
          onClose={() => {
            setShowNegotiationSettings(false);
            setSelectedPackageForNegotiation(null);
          }}
        />
      )}
    </div>
  );
}
