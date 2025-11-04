
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler } from "@/api/entities";
import { ArrowLeft, ArrowRight, Upload, Sparkles, Plus, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BlinkLogo from "../components/BlinkLogo";
import { base44 } from "@/api/base44Client";

const categories = [
  { label: "Event Planner", value: "event_planner" },
  { label: "Beauty Specialist", value: "beauty_specialist" },
  { label: "Photographer", value: "photographer" },
  { label: "Videographer", value: "videographer" },
  { label: "Musician", value: "musician" },
  { label: "DJ", value: "dj" },
  { label: "Venue", value: "venue" },
  { label: "Caterer", value: "caterer" },
  { label: "Florist", value: "florist" },
  { label: "Decorator", value: "decorator" },
  { label: "Audio/Visual", value: "audio_visual" },
  { label: "Speaker", value: "speaker" },
  { label: "Influencer", value: "influencer" },
  { label: "Other", value: "other" }
];

export default function CreateEnablerProfile() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    profile_name: "",
    business_name: "",
    profession_title: "",
    location: "",
    service_area: "",
    tagline: "",
    mission_statement: "",
    bio_story: "",
    years_experience: "",
    niche_specialty: "",
    what_makes_different: "",
    category: "",
    industry: "",
    base_price: "",
    services_offered: [],
    faqs: []
  });
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [newService, setNewService] = useState({ name: "", description: "", starting_price: "", available: true });
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [error, setError] = useState(null);

  const steps = [
    { title: "Basic Info", desc: "Tell us about your business" },
    { title: "About You", desc: "Your story and expertise" },
    { title: "Services", desc: "What you offer" },
    { title: "FAQs", desc: "Common questions" },
    { title: "Review", desc: "Finalize your profile" }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { UploadFile } = await import("@/api/integrations");
        const { file_url } = await UploadFile({ file });
        if (type === "profile") setProfileImage(file_url);
        if (type === "cover") setCoverImage(file_url);
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image. Please try again.");
      }
    }
  };

  const enhanceWithAI = async (field) => {
    if (!formData[field]) {
      alert(`Please enter ${field.replace(/_/g, ' ')} first`);
      return;
    }

    setEnhancing(true);
    try {
      const { InvokeLLM } = await import("@/api/integrations");
      const enhanced = await InvokeLLM({
        prompt: `Enhance this professional ${field.replace(/_/g, ' ')} to be more compelling and engaging. Keep it concise and professional: "${formData[field]}"`,
      });
      
      handleChange(field, enhanced);
    } catch (error) {
      console.error("Error enhancing text:", error);
      alert("AI enhancement failed. Your original text is saved.");
    }
    setEnhancing(false);
  };

  const addService = () => {
    if (!newService.name || !newService.description) {
      alert("Please enter both service name and description");
      return;
    }
    
    const service = {
      name: newService.name.trim(),
      description: newService.description.trim(),
      starting_price: newService.starting_price ? parseFloat(newService.starting_price) : null,
      available: true
    };
    
    handleChange("services_offered", [...formData.services_offered, service]);
    setNewService({ name: "", description: "", starting_price: "", available: true });
  };

  const removeService = (index) => {
    handleChange("services_offered", formData.services_offered.filter((_, i) => i !== index));
  };

  const addFaq = () => {
    if (!newFaq.question || !newFaq.answer) {
      alert("Please enter both question and answer");
      return;
    }
    const faq = {
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim(),
    };
    handleChange("faqs", [...formData.faqs, faq]);
    setNewFaq({ question: "", answer: "" });
  };

  const removeFaq = (index) => {
    handleChange("faqs", formData.faqs.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Basic Info
        if (!formData.business_name.trim()) {
          setError("Business name is required");
          return false;
        }
        if (!formData.profession_title.trim()) {
          setError("Profession title is required");
          return false;
        }
        if (!formData.category) {
          setError("Please select a category");
          return false;
        }
        if (!formData.location.trim()) {
          setError("Location is required");
          return false;
        }
        break;
      case 1: // About You
        if (!formData.bio_story.trim()) {
          setError("Please tell us your story");
          return false;
        }
        if (!formData.years_experience) {
          setError("Years of experience is required");
          return false;
        }
        if (!formData.niche_specialty.trim()) {
          setError("Niche/specialty is required");
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) {
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Final validation
    if (!formData.business_name || !formData.profession_title || !formData.category || !formData.location) {
      setError("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const user = await base44.auth.me();
      console.log("Current user:", user);
      
      // Check existing profiles
      const existingProfiles = await Enabler.filter({ user_id: user.id });
      console.log("Existing profiles:", existingProfiles.length);
      
      if (existingProfiles.length >= 3) {
        alert("Maximum 3 profiles allowed. Please delete an existing profile first.");
        setIsSubmitting(false);
        return;
      }
      
      // Prepare enabler data with all required fields
      const enablerData = {
        user_id: user.id,
        profile_name: formData.profile_name.trim() || formData.business_name.trim(),
        business_name: formData.business_name.trim(),
        profession_title: formData.profession_title.trim(),
        location: formData.location.trim(),
        category: formData.category,
        service_area: formData.service_area.trim() || formData.location.trim(),
        tagline: formData.tagline.trim() || "",
        mission_statement: formData.mission_statement.trim() || "",
        bio_story: formData.bio_story.trim() || "",
        years_experience: parseInt(formData.years_experience) || 0,
        niche_specialty: formData.niche_specialty.trim() || "",
        what_makes_different: formData.what_makes_different.trim() || "",
        industry: formData.industry.trim() || formData.category,
        base_price: parseFloat(formData.base_price) || 0,
        profile_image: profileImage || "",
        cover_image: coverImage || "",
        services_offered: formData.services_offered || [],
        faqs: formData.faqs || [],
        portfolio_images: [],
        certifications: [],
        awards: [],
        average_rating: 0,
        total_reviews: 0,
        is_primary: existingProfiles.length === 0,
        profile_completed: true
      };

      console.log("Creating enabler profile with data:", enablerData);

      // Create the profile
      const newProfile = await Enabler.create(enablerData);
      console.log("Profile created successfully:", newProfile);
      
      // Store as selected profile
      localStorage.setItem("selected_enabler_profile", newProfile.id);
      
      // Navigate to dashboard
      navigate(createPageUrl("EnablerDashboard"));
    } catch (error) {
      console.error("Error creating profile:", error);
      console.error("Error details:", error.response || error.message);
      
      // Show user-friendly error
      if (error.message.includes("required")) {
        setError("Please fill in all required fields");
      } else if (error.message.includes("category")) {
        setError("Please select a valid category");
      } else {
        setError("Failed to create profile. Please check all fields and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => currentStep === 0 ? navigate(-1) : prevStep()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Create Your Profile</h1>
              <p className="text-xs text-gray-500">{steps[currentStep].desc}</p>
            </div>
            <BlinkLogo size="sm" />
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex-1">
                <div className={`h-1 rounded-full transition-all ${
                  idx <= currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step 0: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Cover Image */}
            <div>
              <Label>Cover Image</Label>
              <div className="mt-2 aspect-[21/9] rounded-xl overflow-hidden bg-gradient-to-r from-emerald-400 to-cyan-400 relative">
                {coverImage ? (
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <Upload className="w-12 h-12 mx-auto mb-2 opacity-70" />
                      <p className="text-sm font-medium">Upload Cover Image</p>
                    </div>
                  </div>
                )}
                <label className="absolute inset-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "cover")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Profile Image */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 relative">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    📸
                  </div>
                )}
                <label className="absolute inset-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "profile")}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <Label>Profile Photo</Label>
                <p className="text-xs text-gray-500">Click to upload</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Business/Brand Name *</Label>
                <Input
                  placeholder="e.g., Elegant Events by Sarah"
                  value={formData.business_name}
                  onChange={(e) => handleChange("business_name", e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Profession Title *</Label>
                <Input
                  placeholder="e.g., Wedding Makeup Artist"
                  value={formData.profession_title}
                  onChange={(e) => handleChange("profession_title", e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Location *</Label>
                <Input
                  placeholder="e.g., Dubai, UAE"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Service Area</Label>
                <Input
                  placeholder="e.g., Dubai, Abu Dhabi, Sharjah"
                  value={formData.service_area}
                  onChange={(e) => handleChange("service_area", e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tagline</Label>
                <button
                  onClick={() => enhanceWithAI("tagline")}
                  disabled={enhancing}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {enhancing ? "Enhancing..." : "AI Enhance"}
                </button>
              </div>
              <Input
                placeholder="e.g., Crafting magical moments with elegant designs"
                value={formData.tagline}
                onChange={(e) => handleChange("tagline", e.target.value)}
              />
            </div>

            <div>
              <Label>Industry</Label>
              <Input
                placeholder="e.g., Wedding Services, Corporate Events"
                value={formData.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* Step 1: About You */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Your Story *</Label>
                <button
                  onClick={() => enhanceWithAI("bio_story")}
                  disabled={enhancing}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {enhancing ? "Enhancing..." : "AI Enhance"}
                </button>
              </div>
              <Textarea
                placeholder="Tell your story... Who you are, what you do, why you do it..."
                value={formData.bio_story}
                onChange={(e) => handleChange("bio_story", e.target.value)}
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">Share your journey, passion, and what drives you</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Years of Experience *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.years_experience}
                  onChange={(e) => handleChange("years_experience", e.target.value)}
                  className="mt-2"
                  min="0"
                />
              </div>

              <div>
                <Label>Starting Price ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={formData.base_price}
                  onChange={(e) => handleChange("base_price", e.target.value)}
                  className="mt-2"
                  min="0"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Niche/Specialty *</Label>
                <button
                  onClick={() => enhanceWithAI("niche_specialty")}
                  disabled={enhancing}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {enhancing ? "Enhancing..." : "AI Enhance"}
                </button>
              </div>
              <Input
                placeholder="e.g., South Asian Bridal Makeup"
                value={formData.niche_specialty}
                onChange={(e) => handleChange("niche_specialty", e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>What Makes You Different?</Label>
                <button
                  onClick={() => enhanceWithAI("what_makes_different")}
                  disabled={enhancing}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {enhancing ? "Enhancing..." : "AI Enhance"}
                </button>
              </div>
              <Textarea
                placeholder="What sets you apart from others in your field..."
                value={formData.what_makes_different}
                onChange={(e) => handleChange("what_makes_different", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Add a Service</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Service name (e.g., Bridal Makeup)"
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                />
                <Textarea
                  placeholder="Service description..."
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  rows={2}
                />
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Starting price"
                    value={newService.starting_price}
                    onChange={(e) => setNewService({...newService, starting_price: e.target.value})}
                    min="0"
                  />
                  <Button 
                    type="button"
                    onClick={addService}
                    disabled={!newService.name || !newService.description}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {formData.services_offered.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">Your Services ({formData.services_offered.length})</h3>
                {formData.services_offered.map((service, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                    {service.starting_price && (
                      <p className="text-sm font-medium text-emerald-600">From ${service.starting_price}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {formData.services_offered.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No services added yet</p>
                <p className="text-xs mt-1">Add your first service above</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: FAQs */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Add an FAQ</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Question (e.g., How early should I book?)"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
                />
                <Textarea
                  placeholder="Answer..."
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                  rows={3}
                />
                <Button 
                  type="button"
                  onClick={addFaq}
                  disabled={!newFaq.question || !newFaq.answer}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </div>

            {formData.faqs.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">Your FAQs ({formData.faqs.length})</h3>
                {formData.faqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">Q: {faq.question}</h4>
                      <button
                        type="button"
                        onClick={() => removeFaq(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">A: {faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
            
            {formData.faqs.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No FAQs added yet</p>
                <p className="text-xs mt-1">Add your first FAQ above</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Ready!</h3>
              <p className="text-sm text-gray-600">
                Review your information below and create your profile
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Basic Info</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Business Name:</strong> {formData.business_name}</p>
                  <p><strong>Title:</strong> {formData.profession_title}</p>
                  <p><strong>Location:</strong> {formData.location}</p>
                  <p><strong>Category:</strong> {categories.find(c => c.value === formData.category)?.label || formData.category}</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Experience:</strong> {formData.years_experience} years</p>
                  <p><strong>Specialty:</strong> {formData.niche_specialty}</p>
                  {formData.base_price && <p><strong>Starting Price:</strong> ${formData.base_price}</p>}
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Services</h4>
                <p className="text-sm text-gray-600">{formData.services_offered.length} services added</p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">FAQs</h4>
                <p className="text-sm text-gray-600">{formData.faqs.length} FAQs added</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={prevStep}
              className="flex-1"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {isSubmitting ? "Creating..." : "Create Profile"}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
