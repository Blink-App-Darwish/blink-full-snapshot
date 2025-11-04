
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, Package, User } from "@/api/entities";
import { ArrowLeft, Sparkles, CheckCircle2, Loader2, Upload, Wand2, Plus, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { InvokeLLM, GenerateImage, UploadFile } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INDUSTRY_QUESTIONNAIRES = {
  caterer: [
    { id: "cuisine", label: "What cuisine(s) do you specialize in?", type: "text", placeholder: "e.g., Italian, Mediterranean, Fusion" },
    { id: "dietary", label: "Dietary options you provide", type: "multi-select", options: ["Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Allergy-friendly"] },
    { id: "min_guests", label: "Minimum number of guests", type: "number", placeholder: "e.g., 50" },
    { id: "tasting", label: "Do you provide tasting sessions?", type: "yes-no" },
    { id: "timeline", label: "Typical prep, cooking, and serving timeline", type: "text", placeholder: "e.g., 3 hours setup, 2 hours service" },
    { id: "equipment", label: "What do you provide?", type: "multi-select", options: ["Serving equipment", "Cutlery", "Tableware", "Linens", "Chafing dishes"] },
    { id: "staff", label: "Staff you bring", type: "text", placeholder: "e.g., 2 chefs, 4 servers, 1 bartender" },
    { id: "backup", label: "Backup plan for food issues", type: "text", placeholder: "e.g., Extra portions, backup suppliers" },
  ],
  beauty_specialist: [
    { id: "styles", label: "Make-up styles you specialize in", type: "multi-select", options: ["Natural", "Editorial", "Bridal", "Stage", "HD", "Airbrush"] },
    { id: "services", label: "Services you offer", type: "multi-select", options: ["Make-up only", "Hair styling", "Hair & Make-up combo", "Nails", "Skincare"] },
    { id: "capacity", label: "How many people can you handle simultaneously?", type: "number", placeholder: "e.g., 5" },
    { id: "products", label: "Product brands you use", type: "text", placeholder: "e.g., MAC, Bobbi Brown, Charlotte Tilbury" },
    { id: "hypoallergenic", label: "Do you use hypoallergenic products?", type: "yes-no" },
    { id: "trial", label: "Trial session policy", type: "text", placeholder: "e.g., $50 for 1-hour trial, deducted from final price" },
    { id: "setup_time", label: "Setup time required (minutes)", type: "number", placeholder: "e.g., 30" },
    { id: "bring_equipment", label: "What equipment do you bring?", type: "multi-select", options: ["Professional lighting", "Mirrors", "Chairs", "Brushes & tools", "Products"] },
  ],
  decorator: [
    { id: "styles", label: "Design styles you specialize in", type: "multi-select", options: ["Modern", "Rustic", "Themed", "Minimalist", "Luxurious", "Traditional"] },
    { id: "past_work", label: "Briefly describe your signature work", type: "text", placeholder: "e.g., Large-scale floral installations, ambient lighting setups" },
    { id: "materials", label: "Materials you typically use", type: "text", placeholder: "e.g., Fresh flowers, LED lights, fabric draping" },
    { id: "lead_time", label: "Lead time required (days)", type: "number", placeholder: "e.g., 14" },
    { id: "requirements", label: "Venue requirements", type: "text", placeholder: "e.g., Access 12 hours before, power outlets, ceiling height 15ft+" },
    { id: "transport", label: "Do you handle transport, installation, and dismantling?", type: "yes-no" },
    { id: "staff", label: "Staff required on-site", type: "number", placeholder: "e.g., 4" },
    { id: "coordination", label: "How do you coordinate with other vendors?", type: "text", placeholder: "e.g., Pre-event meetings, shared timeline docs" },
  ],
  audio_visual: [
    { id: "services", label: "AV services you provide", type: "multi-select", options: ["Sound system", "Microphones", "Speakers", "Projectors", "Screens", "Video", "Live streaming"] },
    { id: "capacity", label: "Maximum venue size / audience you can handle", type: "text", placeholder: "e.g., 500 people, 5000 sq ft" },
    { id: "equipment_specs", label: "Key equipment specifications", type: "text", placeholder: "e.g., 10kW speakers, 4K projectors, 32-channel mixer" },
    { id: "power_needs", label: "Power and rigging requirements", type: "text", placeholder: "e.g., 220V, 3-phase, ceiling mounts" },
    { id: "setup_time", label: "Setup and sound check time (hours)", type: "number", placeholder: "e.g., 4" },
    { id: "redundancy", label: "Backup equipment you bring", type: "text", placeholder: "e.g., Spare mics, backup mixer, power backup" },
    { id: "operator", label: "Do you provide an operator during the event?", type: "yes-no" },
    { id: "teardown", label: "Tear-down included?", type: "yes-no" },
  ],
  musician: [
    { id: "genres", label: "Genres/styles you perform", type: "text", placeholder: "e.g., Jazz, Classical, Pop covers" },
    { id: "adaptability", label: "Can you adapt to guest preferences?", type: "yes-no" },
    { id: "recordings", label: "Link to past performances/recordings", type: "text", placeholder: "YouTube, SoundCloud, website" },
    { id: "members", label: "Number of band/group members", type: "number", placeholder: "e.g., 5" },
    { id: "equipment", label: "Do you bring all your own equipment?", type: "yes-no" },
    { id: "setlist", label: "Do you allow custom song requests?", type: "yes-no" },
    { id: "attire", label: "Performance attire", type: "text", placeholder: "e.g., Black tie, themed costumes" },
    { id: "duration", label: "Typical performance duration (hours)", type: "number", placeholder: "e.g., 3" },
  ],
  dj: [
    { id: "genres", label: "Music genres you specialize in", type: "text", placeholder: "e.g., House, Hip-Hop, Top 40, Disco" },
    { id: "equipment", label: "Equipment you bring", type: "multi-select", options: ["DJ decks", "Mixer", "Speakers", "Lighting", "Microphone", "Laptop/controller"] },
    { id: "requests", label: "Do you take song requests during the event?", type: "yes-no" },
    { id: "mc_services", label: "Do you provide MC/hosting services?", type: "yes-no" },
    { id: "setup_time", label: "Setup time required (hours)", type: "number", placeholder: "e.g., 2" },
    { id: "backup", label: "Backup equipment/plan", type: "text", placeholder: "e.g., Spare laptop, backup mixer" },
    { id: "duration", label: "Typical set duration (hours)", type: "number", placeholder: "e.g., 4" },
  ],
  photographer: [
    { id: "styles", label: "Photography styles", type: "multi-select", options: ["Candid", "Posed", "Documentary", "Artistic", "Black & White", "Drone"] },
    { id: "equipment", label: "Camera equipment you use", type: "text", placeholder: "e.g., Canon 5D Mark IV, Sony A7III, drones" },
    { id: "duration", label: "Typical coverage duration (hours)", type: "number", placeholder: "e.g., 8" },
    { id: "deliverables", label: "What's included in your package?", type: "multi-select", options: ["Digital files", "Prints", "Album", "Online gallery", "Edited photos", "Raw files"] },
    { id: "turnaround", label: "Editing turnaround time (days)", type: "number", placeholder: "e.g., 14" },
    { id: "assistant", label: "Do you bring an assistant/second shooter?", type: "yes-no" },
    { id: "backup", label: "Photo backup strategy", type: "text", placeholder: "e.g., Dual memory cards, cloud backup same day" },
  ],
  videographer: [
    { id: "styles", label: "Videography styles", type: "multi-select", options: ["Cinematic", "Documentary", "Highlights reel", "Full coverage", "Drone footage", "Live streaming"] },
    { id: "equipment", label: "Video equipment", type: "text", placeholder: "e.g., Sony A7S III, DJI drone, gimbals, lighting" },
    { id: "crew", label: "Number of videographers/crew", type: "number", placeholder: "e.g., 2" },
    { id: "deliverables", label: "Deliverables included", type: "multi-select", options: ["Highlights video (3-5 min)", "Full ceremony", "Full reception", "Raw footage", "Social media edits", "Drone shots"] },
    { id: "turnaround", label: "Editing turnaround time (days)", type: "number", placeholder: "e.g., 30" },
    { id: "backup", label: "Footage backup plan", type: "text", placeholder: "e.g., Multiple cards, immediate cloud backup" },
  ],
  venue: [
    { id: "capacity", label: "Maximum guest capacity", type: "number", placeholder: "e.g., 200" },
    { id: "space_type", label: "Venue type/style", type: "text", placeholder: "e.g., Indoor ballroom, Outdoor garden, Rooftop" },
    { id: "included", label: "What's included with venue rental?", type: "multi-select", options: ["Tables & chairs", "Linens", "Basic lighting", "Sound system", "Parking", "Kitchen access", "Staff", "Setup/cleanup"] },
    { id: "rental_hours", label: "Rental duration (hours)", type: "number", placeholder: "e.g., 8" },
    { id: "restrictions", label: "Any restrictions or rules?", type: "text", placeholder: "e.g., No open flames, Music curfew 11pm" },
    { id: "catering", label: "Catering options", type: "select", options: ["In-house only", "Preferred vendors", "Any caterer allowed", "No food allowed"] },
    { id: "accessibility", label: "Accessibility features", type: "text", placeholder: "e.g., Wheelchair accessible, Elevator, Accessible parking" },
  ],
  florist: [
    { id: "specialties", label: "Floral specialties", type: "text", placeholder: "e.g., Bridal bouquets, large installations, tropical flowers" },
    { id: "styles", label: "Design styles", type: "multi-select", options: ["Modern", "Rustic", "Classic", "Tropical", "Minimalist", "Luxurious"] },
    { id: "services", label: "Services you offer", type: "multi-select", options: ["Bridal bouquet", "Centerpieces", "Ceremony arch", "Boutonnieres", "Installations", "Delivery & setup"] },
    { id: "seasonal", label: "Do you work with seasonal flowers only?", type: "yes-no" },
    { id: "consultation", label: "Do you offer design consultations?", type: "yes-no" },
    { id: "setup_time", label: "Setup time required (hours)", type: "number", placeholder: "e.g., 3" },
    { id: "removal", label: "Do you handle post-event flower removal?", type: "yes-no" },
  ],
  event_planner: [
    { id: "event_types", label: "Event types you specialize in", type: "multi-select", options: ["Weddings", "Corporate events", "Birthday parties", "Conferences", "Product launches", "Social gatherings"] },
    { id: "services", label: "Planning services you provide", type: "multi-select", options: ["Full planning", "Partial planning", "Day-of coordination", "Vendor management", "Design services", "Budget management"] },
    { id: "vendor_network", label: "Do you have a preferred vendor network?", type: "yes-no" },
    { id: "meetings", label: "Number of planning meetings included", type: "number", placeholder: "e.g., 5" },
    { id: "timeline", label: "Ideal planning timeline (months)", type: "number", placeholder: "e.g., 6" },
    { id: "emergency", label: "Day-of emergency kit/backup plan", type: "text", placeholder: "e.g., Sewing kit, stain remover, backup vendors on standby" },
  ],
};

const CRUCIAL_DETAILS_FORMS = {
  caterer: [
    {
      section: "Menu Options",
      fields: [
        { id: "entrees", label: "Entrées / Starters (2-3 options)", type: "array", placeholder: "Add entrée option" },
        { id: "mains", label: "Main Courses (2-3 options)", type: "array", placeholder: "Add main course" },
        { id: "sides", label: "Side Dishes (2-3 options)", type: "array", placeholder: "Add side dish" },
        { id: "desserts", label: "Desserts (2-3 options)", type: "array", placeholder: "Add dessert" },
        { id: "beverages", label: "Beverages", type: "array", placeholder: "Add beverage option" },
      ]
    },
    {
      section: "Service Details",
      fields: [
        { id: "service_style", label: "Food Service Style", type: "multi-select", options: ["Plated", "Buffet", "Canapés / Passed", "Self-serve"] },
        { id: "provided", label: "What You Provide", type: "multi-select", options: ["Cutlery", "Tableware", "Staff", "Bar service", "Cleanup team"] },
        { id: "requirements", label: "Venue Requirements", type: "multi-select", options: ["On-site kitchen access", "Power supply", "Water source"] },
      ]
    }
  ],
  beauty_specialist: [
    {
      section: "Service Capacity",
      fields: [
        { id: "capacity", label: "Number of people you can service", type: "number", placeholder: "e.g., 5" },
        { id: "services", label: "Services Offered", type: "multi-select", options: ["Hair styling", "Traditional makeup", "Airbrush makeup", "Men's grooming", "Touch-ups during event"] },
      ]
    },
    {
      section: "Products & Timing",
      fields: [
        { id: "sensitivities", label: "Products suitable for sensitivities", type: "text", placeholder: "e.g., Hypoallergenic, paraben-free" },
        { id: "brands", label: "Preferred/Available Brands", type: "text", placeholder: "e.g., MAC, Bobbi Brown" },
        { id: "trial", label: "Trial session available?", type: "yes-no" },
        { id: "prep_time", label: "Typical prep time per person (minutes)", type: "number", placeholder: "e.g., 45" },
      ]
    }
  ],
  musician: [
    {
      section: "Performance Details",
      fields: [
        { id: "duration", label: "Performance Duration", type: "select", options: ["Single set (1-2 hours)", "Multiple sets (3-4 hours)", "Full evening (5+ hours)"] },
        { id: "song_requests", label: "Accept song requests from guests?", type: "yes-no" },
        { id: "setlist", label: "Sample setlist or music styles", type: "textarea", placeholder: "List your typical songs or styles" },
      ]
    },
    {
      section: "Technical Requirements",
      fields: [
        { id: "equipment_provided", label: "Equipment You Bring", type: "multi-select", options: ["PA system", "Instruments", "Microphones", "Lighting"] },
        { id: "requirements", label: "Venue Requirements", type: "multi-select", options: ["Stage", "Sound check time (specify below)", "Changing room", "Meals/drinks provided"] },
        { id: "sound_check_time", label: "Sound check time needed (hours before)", type: "number", placeholder: "e.g., 2" },
      ]
    }
  ],
  dj: [
    {
      section: "Performance Details",
      fields: [
        { id: "duration", label: "Set Duration", type: "select", options: ["2-3 hours", "4-5 hours", "Full night (6+ hours)"] },
        { id: "song_requests", label: "Accept live song requests?", type: "yes-no" },
        { id: "mc_services", label: "Provide MC/Hosting services?", type: "yes-no" },
      ]
    },
    {
      section: "Equipment & Setup",
      fields: [
        { id: "equipment", label: "Equipment You Provide", type: "multi-select", options: ["DJ decks", "Mixer", "Speakers", "Lighting", "Microphone", "Laptop/controller"] },
        { id: "setup_time", label: "Setup time needed (hours)", type: "number", placeholder: "e.g., 2" },
        { id: "power_needs", label: "Power requirements", type: "text", placeholder: "e.g., 220V, 2 outlets" },
      ]
    }
  ],
  photographer: [
    {
      section: "Coverage Details",
      fields: [
        { id: "shot_list", label: "Priority Coverage", type: "multi-select", options: ["Ceremony", "Reception", "Prep / Behind the scenes", "Family portraits", "Drone footage"] },
        { id: "coverage_hours", label: "Coverage duration (hours)", type: "number", placeholder: "e.g., 8" },
        { id: "shooters", label: "Number of photographers", type: "number", placeholder: "e.g., 2" },
      ]
    },
    {
      section: "Deliverables",
      fields: [
        { id: "deliverables", label: "What's Delivered", type: "multi-select", options: ["Raw photos", "Edited photos", "Prints", "Album", "Online gallery"] },
        { id: "turnaround", label: "Delivery timeline (days)", type: "number", placeholder: "e.g., 14" },
        { id: "requirements", label: "Venue Requirements", type: "multi-select", options: ["Power source", "Crew meals", "Access to private areas"] },
      ]
    }
  ],
  videographer: [
    {
      section: "Video Coverage",
      fields: [
        { id: "coverage", label: "Coverage Type", type: "multi-select", options: ["Ceremony", "Reception", "Prep / Behind the scenes", "Drone footage", "Live streaming"] },
        { id: "crew_size", label: "Crew size", type: "number", placeholder: "e.g., 2" },
        { id: "coverage_hours", label: "Coverage duration (hours)", type: "number", placeholder: "e.g., 8" },
      ]
    },
    {
      section: "Final Product",
      fields: [
        { id: "deliverables", label: "Deliverables", type: "multi-select", options: ["Highlights video (3-5 min)", "Full ceremony", "Full reception", "Raw footage", "Social media edits"] },
        { id: "turnaround", label: "Editing delivery timeline (days)", type: "number", placeholder: "e.g., 30" },
        { id: "requirements", label: "Venue Requirements", type: "multi-select", options: ["Power source", "Crew meals", "Access to private areas"] },
      ]
    }
  ],
  audio_visual: [
    {
      section: "Equipment List",
      fields: [
        { id: "lighting_types", label: "Lighting Equipment", type: "array", placeholder: "e.g., LED par cans, moving heads" },
        { id: "av_types", label: "AV Equipment", type: "array", placeholder: "e.g., 4K projector, 120\" screen" },
        { id: "control_systems", label: "Control Systems", type: "text", placeholder: "e.g., DMX, Lighting console" },
      ]
    },
    {
      section: "Technical Requirements",
      fields: [
        { id: "rigging", label: "Rigging Needed", type: "multi-select", options: ["Trusses", "DMX controllers", "Stage fog/haze"] },
        { id: "power_requirements", label: "Power requirements", type: "text", placeholder: "e.g., 220V, 50 amps" },
        { id: "setup_hours", label: "Setup time needed (hours before)", type: "number", placeholder: "e.g., 4" },
        { id: "live_operator", label: "Operator present during event?", type: "yes-no" },
      ]
    }
  ],
  decorator: [
    {
      section: "Design Details",
      fields: [
        { id: "theme", label: "Theme / Aesthetic", type: "text", placeholder: "Describe the look and feel" },
        { id: "items", label: "Items You Provide", type: "multi-select", options: ["Stage", "Backdrop", "Florals", "Tables/furniture", "Signage", "Props"] },
        { id: "materials", label: "Materials Used", type: "text", placeholder: "e.g., Wood, metal, foam, LED, fabric" },
      ]
    },
    {
      section: "Logistics",
      fields: [
        { id: "dimensions", label: "Main build dimensions", type: "text", placeholder: "L × W × H" },
        { id: "setup_hours", label: "Setup time (hours)", type: "number", placeholder: "e.g., 6" },
        { id: "breakdown_hours", label: "Breakdown time (hours)", type: "number", placeholder: "e.g., 2" },
      ]
    }
  ],
  venue: [
    {
      section: "Venue Specifications",
      fields: [
        { id: "capacity", label: "Maximum capacity", type: "number", placeholder: "e.g., 200" },
        { id: "space_type", label: "Venue style/type", type: "text", placeholder: "e.g., Indoor ballroom, garden" },
        { id: "included", label: "Included in Rental", type: "multi-select", options: ["Tables & chairs", "Linens", "Basic lighting", "Sound system", "Parking", "Kitchen access", "Staff", "Setup/cleanup"] },
      ]
    },
    {
      section: "Policies",
      fields: [
        { id: "rental_hours", label: "Rental duration (hours)", type: "number", placeholder: "e.g., 8" },
        { id: "restrictions", label: "Restrictions or rules", type: "textarea", placeholder: "e.g., No open flames, curfew at 11pm" },
        { id: "catering_policy", label: "Catering policy", type: "select", options: ["In-house only", "Preferred vendors", "Any caterer allowed", "No food allowed"] },
      ]
    }
  ],
  florist: [
    {
      section: "Floral Offerings",
      fields: [
        { id: "specialties", label: "Floral specialties", type: "text", placeholder: "e.g., Roses, orchids, tropical" },
        { id: "services", label: "Services Offered", type: "multi-select", options: ["Bridal bouquet", "Centerpieces", "Ceremony arch", "Boutonnieres", "Installations", "Delivery & setup"] },
        { id: "seasonal_only", label: "Work with seasonal flowers only?", type: "yes-no" },
      ]
    },
    {
      section: "Logistics",
      fields: [
        { id: "consultation", label: "Offer design consultation?", type: "yes-no" },
        { id: "setup_hours", label: "Setup time (hours)", type: "number", placeholder: "e.g., 3" },
        { id: "removal", label: "Handle post-event removal?", type: "yes-no" },
      ]
    }
  ],
  event_planner: [
    {
      section: "Planning Services",
      fields: [
        { id: "event_types", label: "Event Types You Handle", type: "multi-select", options: ["Weddings", "Corporate events", "Birthday parties", "Conferences", "Product launches"] },
        { id: "services", label: "Services You Provide", type: "multi-select", options: ["Full planning", "Partial planning", "Day-of coordination", "Vendor management", "Design services", "Budget management"] },
        { id: "vendor_network", label: "Have preferred vendor network?", type: "yes-no" },
      ]
    },
    {
      section: "Engagement Details",
      fields: [
        { id: "meetings", label: "Number of planning meetings included", type: "number", placeholder: "e.g., 5" },
        { id: "timeline_months", label: "Ideal planning timeline (months)", type: "number", placeholder: "e.g., 6" },
        { id: "emergency_kit", label: "Day-of emergency kit details", type: "textarea", placeholder: "Describe your backup plans" },
      ]
    }
  ],
};

export default function SmartPackageCreator() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flowStage, setFlowStage] = useState("questionnaire"); // 'questionnaire', 'crucial_details', 'review', 'gallery'
  const [answers, setAnswers] = useState({});
  const [crucialDetails, setCrucialDetails] = useState({});
  const [generating, setGenerating] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [imageMethod, setImageMethod] = useState("ai");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

  useEffect(() => {
    loadEnabler();
  }, []);

  const loadEnabler = async () => {
    const user = await User.me();
    const selectedProfileId = localStorage.getItem("selected_enabler_profile");

    if (selectedProfileId) {
      const profiles = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
      setEnabler(profiles[0]);
    } else {
      const enablerData = await Enabler.filter({ user_id: user.id }, "-created_date");
      if (enablerData[0]) {
        setEnabler(enablerData[0]);
        localStorage.setItem("selected_enabler_profile", enablerData[0].id);
      }
    }
  };

  const questions = INDUSTRY_QUESTIONNAIRES[enabler?.category] || [];
  const crucialForm = CRUCIAL_DETAILS_FORMS[enabler?.category] || [];

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelect = (questionId, option) => {
    const current = answers[questionId] || [];
    const updated = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option];
    handleAnswer(questionId, updated);
  };

  const handleCrucialDetail = (fieldId, value) => {
    setCrucialDetails(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleArrayField = (fieldId, action, value, index) => {
    const current = crucialDetails[fieldId] || []; // Fixed: Changed 'field.id' to 'fieldId'
    if (action === "add" && value) {
      setCrucialDetails(prev => ({ ...prev, [fieldId]: [...current, value] }));
    } else if (action === "remove") {
      setCrucialDetails(prev => ({ ...prev, [fieldId]: current.filter((_, i) => i !== index) }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await UploadFile({ file });
      setPackageData(prev => ({ ...prev, thumbnail_image: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      e.target.value = ''; // Clear input to allow re-uploading the same file
    }
  };

  const generateThumbnail = async () => {
    if (!packageData) return;

    setGeneratingImage(true);
    try {
      const imagePrompt = `Professional minimal ${enabler.category.replace(/_/g, ' ')} service illustration. ${packageData.name}. Clean, modern, elegant aesthetic. High quality, soft lighting, professional photography style.`;
      const result = await GenerateImage({ prompt: imagePrompt });
      setPackageData(prev => ({ ...prev, thumbnail_image: result.url }));
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    }
    setGeneratingImage(false);
  };

  const generatePackageSummary = async () => {
    setGenerating(true);
    try {
      const formattedAnswers = questions.map((q, idx) => {
        const answer = answers[q.id];
        let formattedAnswer = answer;

        if (Array.isArray(answer)) {
          formattedAnswer = answer.join(", ");
        } else if (typeof answer === "boolean") {
          formattedAnswer = answer ? "Yes" : "No";
        }

        return `${idx + 1}. ${q.label}\n   Answer: ${formattedAnswer || "Not provided"}`;
      }).join("\n\n");

      const packageName = await InvokeLLM({
        prompt: `Based on these questionnaire responses for a ${enabler.category.replace(/_/g, ' ')}, suggest a catchy, professional package name (max 5 words):

${formattedAnswers}

Just return the package name, nothing else.`,
      });

      const features = await InvokeLLM({
        prompt: `Based on these questionnaire responses for a ${enabler.category.replace(/_/g, ' ')} service, create a list of 6-8 key features/benefits in short, punchy format.

Questionnaire Responses:
${formattedAnswers}

Return ONLY a JSON array of objects with this structure:
[
  {"icon": "check-circle", "text": "Equipment Provided", "included": true},
  {"icon": "users", "text": "Guest Song Requests", "included": true},
  {"icon": "clock", "text": "4 Hour Performance", "included": true}
]

Use these icon names only: check-circle, users, clock, music, camera, mic, utensils, sparkles, shield, calendar, map-pin, settings

Keep each text under 4 words. Set included to true for what's provided, false for what's NOT included.`,
        response_json_schema: {
          type: "object",
          properties: {
            features: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  icon: { type: "string" },
                  text: { type: "string" },
                  included: { type: "boolean" }
                },
                required: ["icon", "text", "included"]
              }
            }
          },
          required: ["features"]
        }
      });

      setPackageData({
        name: packageName.trim(),
        features: features.features,
        thumbnail_image: null,
        price: enabler.base_price || 1000,
        currency: "$"
      });

      setFlowStage("crucial_details");
    } catch (error) {
      console.error("Error generating package:", error);
      alert("Failed to generate package. Please try again.");
    }
    setGenerating(false);
  };

  const handleGalleryImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingGalleryImage(true);
    try {
      const uploadedImages = [];
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        uploadedImages.push({ url: file_url, label: "" });
      }
      setGalleryImages(prevImages => [...prevImages, ...uploadedImages]);
    } catch (error) {
      console.error("Error uploading gallery images:", error);
      alert("Failed to upload images. Please try again.");
    } finally {
      setUploadingGalleryImage(false);
      e.target.value = ''; // Clear input to allow re-uploading
    }
  };

  const updateGalleryLabel = (index, label) => {
    setGalleryImages(prevImages => {
      const updated = [...prevImages];
      updated[index] = { ...updated[index], label: label };
      return updated;
    });
  };

  const removeGalleryImage = (index) => {
    setGalleryImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const savePackage = async () => {
    if (!packageData.thumbnail_image) {
      alert("Please add a thumbnail image for your package");
      return;
    }

    try {
      await Package.create({
        enabler_id: enabler.id,
        name: packageData.name,
        description: "",
        features: packageData.features,
        crucial_details: crucialDetails,
        thumbnail_image: packageData.thumbnail_image,
        gallery_images: galleryImages,
        price: parseFloat(packageData.price),
        currency: packageData.currency,
        allow_negotiations: false,
        max_discount_percentage: 0
      });

      navigate(createPageUrl("EnablerShop"));
    } catch (error) {
      console.error("Error saving package:", error);
      alert("Failed to save package. Please try again.");
    }
  };

  if (!enabler) {
    return <div className="flex items-center justify-center min-h-screen">
      <BlinkLogo size="lg" className="animate-pulse" />
    </div>;
  }

  // Gallery Stage
  if (flowStage === "gallery") {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => setFlowStage("review")} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Package Gallery</h1>
              <p className="text-xs text-gray-500">Add photos to showcase your work</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <Card className="p-6 border-purple-200 bg-purple-50">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-900">Build Your Gallery</h3>
            </div>
            <p className="text-xs text-purple-700">
              Add photos that showcase this package. Label each photo to help clients understand what they're seeing.
            </p>
          </Card>

          {/* Upload Button - Now accepts multiple files */}
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryImageUpload}
              disabled={uploadingGalleryImage}
              className="hidden"
            />
            <Card className="p-8 text-center border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer">
              {uploadingGalleryImage ? (
                <>
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-500 animate-spin" />
                  <p className="text-sm text-gray-600">Uploading images...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload photos</p>
                  <p className="text-xs text-gray-400 mt-1">You can select multiple images</p>
                </>
              )}
            </Card>
          </label>

          {/* Gallery Images */}
          {galleryImages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Gallery Photos ({galleryImages.length})</h3>
              {galleryImages.map((img, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={img.url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Add label (e.g., 'Ceremony Setup', 'Table Arrangement')"
                        value={img.label}
                        onChange={(e) => updateGalleryLabel(idx, e.target.value)}
                        className="text-sm"
                      />
                      <button
                        onClick={() => removeGalleryImage(idx)}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFlowStage("review")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={savePackage}
              disabled={!packageData.thumbnail_image}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {galleryImages.length > 0 ? "Save Package" : "Skip & Save"}
            </Button>
          </div>

          {galleryImages.length === 0 && (
            <p className="text-xs text-center text-gray-400">
              You can add photos now or skip and add them later
            </p>
          )}
        </div>
      </div>
    );
  }

  // Review Stage - with thumbnail selection
  if (flowStage === "review") {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => setFlowStage("crucial_details")} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Final Review</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <Card className="p-6 border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-900">AI Generated Package</h3>
            </div>
            <p className="text-xs text-emerald-700">
              Review and add a thumbnail before publishing
            </p>
          </Card>

          {/* Thumbnail Image Section */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Package Thumbnail *</Label>

            {!packageData.thumbnail_image ? (
              <Tabs value={imageMethod} onValueChange={setImageMethod} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="ai">AI Generate</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-3">
                  <Card className="p-6 text-center border-2 border-dashed border-gray-200">
                    <Wand2 className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                    <p className="text-sm text-gray-600 mb-4">Let AI create a professional thumbnail for your package</p>
                    <Button
                      onClick={generateThumbnail}
                      disabled={generatingImage}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Thumbnail
                        </>
                      )}
                    </Button>
                  </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-3">
                  <Card className="p-6 text-center border-2 border-dashed border-gray-200">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                    <p className="text-sm text-gray-600 mb-4">Upload your own image</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Image
                        </span>
                      </Button>
                    </label>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={packageData.thumbnail_image}
                    alt="Package thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => setPackageData(prev => ({ ...prev, thumbnail_image: null }))}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label>Package Name</Label>
              <Input
                value={packageData.name}
                onChange={(e) => setPackageData({...packageData, name: e.target.value})}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="mb-3 block">Features</Label>
              <div className="space-y-2">
                {packageData.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2
                      className={`w-5 h-5 flex-shrink-0 ${feature.included ? 'text-emerald-500' : 'text-gray-300'}`}
                    />
                    <Input
                      value={feature.text}
                      onChange={(e) => {
                        const updated = [...packageData.features];
                        updated[idx].text = e.target.value;
                        setPackageData({...packageData, features: updated});
                      }}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Checkbox
                      checked={feature.included}
                      onCheckedChange={(checked) => {
                        const updated = [...packageData.features];
                        updated[idx].included = checked;
                        setPackageData({...packageData, features: updated});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <Select
                  value={packageData.currency}
                  onValueChange={(value) => setPackageData({...packageData, currency: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ USD</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="EGP">EGP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={packageData.price}
                  onChange={(e) => setPackageData({...packageData, price: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setFlowStage("crucial_details")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setFlowStage("gallery")}
              disabled={!packageData.thumbnail_image}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Continue to Gallery
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Crucial Details Stage
  if (flowStage === "crucial_details") {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => setFlowStage("questionnaire")} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Crucial Details</h1>
              <p className="text-xs text-gray-500">
                Add service-specific information
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {crucialForm.map((section, sectionIdx) => (
            <Card key={sectionIdx} className="p-6">
              <h3 className="font-bold text-lg mb-4">{section.section}</h3>

              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    <Label className="text-sm mb-2 block">{field.label}</Label>

                    {field.type === "text" && (
                      <Input
                        placeholder={field.placeholder}
                        value={crucialDetails[field.id] || ""}
                        onChange={(e) => handleCrucialDetail(field.id, e.target.value)}
                      />
                    )}

                    {field.type === "number" && (
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={crucialDetails[field.id] || ""}
                        onChange={(e) => handleCrucialDetail(field.id, e.target.value)}
                      />
                    )}

                    {field.type === "textarea" && (
                      <Textarea
                        placeholder={field.placeholder}
                        value={crucialDetails[field.id] || ""}
                        onChange={(e) => handleCrucialDetail(field.id, e.target.value)}
                        rows={3}
                      />
                    )}

                    {field.type === "yes-no" && (
                      <div className="flex gap-3">
                        <Button
                          variant={crucialDetails[field.id] === true ? "default" : "outline"}
                          onClick={() => handleCrucialDetail(field.id, true)}
                          className={`flex-1 ${crucialDetails[field.id] === true ? 'bg-emerald-500' : ''}`}
                        >
                          Yes
                        </Button>
                        <Button
                          variant={crucialDetails[field.id] === false ? "default" : "outline"}
                          onClick={() => handleCrucialDetail(field.id, false)}
                          className={`flex-1 ${crucialDetails[field.id] === false ? 'bg-gray-900' : ''}`}
                        >
                          No
                        </Button>
                      </div>
                    )}

                    {field.type === "select" && (
                      <Select
                        value={crucialDetails[field.id] || ""}
                        onValueChange={(value) => handleCrucialDetail(field.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === "multi-select" && (
                      <div className="space-y-2">
                        {field.options.map((option) => (
                          <div key={option} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${field.id}-${option}`}
                              checked={(crucialDetails[field.id] || []).includes(option)}
                              onCheckedChange={(checked) => {
                                const current = crucialDetails[field.id] || [];
                                const updated = checked
                                  ? [...current, option]
                                  : current.filter(item => item !== option);
                                handleCrucialDetail(field.id, updated);
                              }}
                            />
                            <label htmlFor={`${field.id}-${option}`} className="text-sm cursor-pointer">
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {field.type === "array" && (
                      <div className="space-y-2">
                        {(crucialDetails[field.id] || []).map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input value={item} readOnly className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArrayField(field.id, "remove", null, idx)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder={field.placeholder}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && e.target.value) {
                                handleArrayField(field.id, "add", e.target.value);
                                e.target.value = "";
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              const input = e.target.closest('div').querySelector('input');
                              if (input.value) {
                                handleArrayField(field.id, "add", input.value);
                                input.value = "";
                              }
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Button
            onClick={() => setFlowStage("review")}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6"
          >
            Continue to Review
          </Button>
        </div>
      </div>
    );
  }

  // Questionnaire Stage
  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const canProceed = answers[currentQuestion?.id] !== undefined && answers[currentQuestion?.id] !== "";

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Smart Package Creator</h1>
            <p className="text-xs text-gray-500">
              Question {currentStep + 1} of {questions.length}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {currentQuestion && (
          <Card className="p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">{currentQuestion.label}</h3>

            {currentQuestion.type === "text" && (
              <Input
                placeholder={currentQuestion.placeholder}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="text-base"
              />
            )}

            {currentQuestion.type === "number" && (
              <Input
                type="number"
                placeholder={currentQuestion.placeholder}
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="text-base"
              />
            )}

            {currentQuestion.type === "yes-no" && (
              <div className="flex gap-3">
                <Button
                  variant={answers[currentQuestion.id] === true ? "default" : "outline"}
                  onClick={() => handleAnswer(currentQuestion.id, true)}
                  className={`flex-1 ${answers[currentQuestion.id] === true ? 'bg-emerald-500' : ''}`}
                >
                  Yes
                </Button>
                <Button
                  variant={answers[currentQuestion.id] === false ? "default" : "outline"}
                  onClick={() => handleAnswer(currentQuestion.id, false)}
                  className={`flex-1 ${answers[currentQuestion.id] === false ? 'bg-gray-900' : ''}`}
                >
                  No
                </Button>
              </div>
            )}

            {currentQuestion.type === "select" && (
              <Select
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {currentQuestion.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {currentQuestion.type === "multi-select" && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={(answers[currentQuestion.id] || []).includes(option)}
                      onCheckedChange={() => handleMultiSelect(currentQuestion.id, option)}
                    />
                    <label htmlFor={option} className="text-sm cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              Previous
            </Button>
          )}

          {!isLastQuestion ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={generatePackageSummary}
              disabled={!canProceed || generating}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Package
                </>
              )}
            </Button>
          )}
        </div>

        {currentQuestion && (
          <button
            onClick={() => {
              if (isLastQuestion) {
                generatePackageSummary();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}
