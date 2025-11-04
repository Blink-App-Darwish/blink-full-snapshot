
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, User } from "@/api/entities";
import { ArrowLeft, Save, Upload, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";

export default function EditEnablerProfile() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [formData, setFormData] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newService, setNewService] = useState({ name: "", description: "", starting_price: "", available: true });
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  useEffect(() => {
    loadEnabler();
  }, []);

  const loadEnabler = async () => {
    const user = await User.me();
    const selectedProfileId = localStorage.getItem("selected_enabler_profile");
    
    if (selectedProfileId) {
      const profileData = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
      if (profileData[0]) {
        setEnabler(profileData[0]);
        setFormData(profileData[0]);
        setProfileImage(profileData[0].profile_image);
        setCoverImage(profileData[0].cover_image);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await UploadFile({ file });
        if (type === "profile") {
          setProfileImage(file_url);
          handleChange("profile_image", file_url);
        }
        if (type === "cover") {
          setCoverImage(file_url);
          handleChange("cover_image", file_url);
        }
      } catch (error) {
        console.error("Error uploading image:", error);
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
      const enhanced = await InvokeLLM({
        prompt: `Enhance this professional ${field.replace(/_/g, ' ')} to be more compelling and engaging. Keep it concise: "${formData[field]}"`,
      });
      handleChange(field, enhanced);
    } catch (error) {
      console.error("Error enhancing text:", error);
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
    
    const services = [...(formData.services_offered || []), service];
    handleChange("services_offered", services);
    setNewService({ name: "", description: "", starting_price: "", available: true });
  };

  const removeService = (index) => {
    const services = formData.services_offered.filter((_, i) => i !== index);
    handleChange("services_offered", services);
  };

  const addFaq = () => {
    if (!newFaq.question || !newFaq.answer) {
      alert("Please enter both question and answer");
      return;
    }
    
    const faq = {
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim()
    };
    
    const faqs = [...(formData.faqs || []), faq];
    handleChange("faqs", faqs);
    setNewFaq({ question: "", answer: "" });
  };

  const removeFaq = (index) => {
    const faqs = formData.faqs.filter((_, i) => i !== index);
    handleChange("faqs", faqs);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Enabler.update(enabler.id, formData);
      navigate(createPageUrl("EnablerShop"));
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    }
    setIsSaving(false);
  };

  if (!enabler) {
    return <div className="flex items-center justify-center min-h-screen">
      <BlinkLogo size="lg" className="animate-pulse" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
          </div>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Cover Image */}
        <div>
          <Label>Cover Image</Label>
          <div className="mt-2 aspect-[21/9] rounded-xl overflow-hidden bg-gradient-to-r from-emerald-400 to-cyan-400 relative">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Upload className="w-12 h-12 text-white opacity-70" />
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
              <div className="w-full h-full flex items-center justify-center text-4xl">📸</div>
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

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Brand Name</Label>
            <Input
              value={formData.brand_name || formData.business_name || ""}
              onChange={(e) => {
                handleChange("brand_name", e.target.value);
                handleChange("business_name", e.target.value);
              }}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Profession Title</Label>
            <Input
              value={formData.profession_title || ""}
              onChange={(e) => handleChange("profession_title", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={formData.location || ""}
              onChange={(e) => handleChange("location", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Years of Experience</Label>
            <Input
              type="number"
              value={formData.years_experience || ""}
              onChange={(e) => handleChange("years_experience", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        {/* Tagline */}
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
            value={formData.tagline || ""}
            onChange={(e) => handleChange("tagline", e.target.value)}
          />
        </div>

        {/* Mission Statement */}
        <div>
          <Label>Mission Statement</Label>
          <Textarea
            value={formData.mission_statement || ""}
            onChange={(e) => handleChange("mission_statement", e.target.value)}
            rows={2}
            className="mt-2"
          />
        </div>

        {/* Bio Story */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Your Story</Label>
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
            value={formData.bio_story || ""}
            onChange={(e) => handleChange("bio_story", e.target.value)}
            rows={5}
          />
        </div>

        {/* Niche/Specialty */}
        <div>
          <Label>Niche/Specialty</Label>
          <Input
            value={formData.niche_specialty || ""}
            onChange={(e) => handleChange("niche_specialty", e.target.value)}
            className="mt-2"
          />
        </div>

        {/* What Makes Different */}
        <div>
          <Label>What Makes You Different?</Label>
          <Textarea
            value={formData.what_makes_different || ""}
            onChange={(e) => handleChange("what_makes_different", e.target.value)}
            rows={3}
            className="mt-2"
          />
        </div>

        {/* Services */}
        <div>
          <Label>Services Offered</Label>
          <div className="mt-4 border-2 border-dashed border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <Input
                placeholder="Service name"
                value={newService.name}
                onChange={(e) => setNewService({...newService, name: e.target.value})}
              />
              <Textarea
                placeholder="Service description"
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
          
          {formData.services_offered && formData.services_offered.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.services_offered.map((service, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-gray-600">{service.description}</p>
                    {service.starting_price && (
                      <p className="text-xs text-emerald-600 mt-1">From ${service.starting_price}</p>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeService(idx)} 
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQs */}
        <div>
          <Label>FAQs</Label>
          <div className="mt-4 border-2 border-dashed border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <Input
                placeholder="Question"
                value={newFaq.question}
                onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
              />
              <Textarea
                placeholder="Answer"
                value={newFaq.answer}
                onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
                rows={2}
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
          
          {formData.faqs && formData.faqs.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.faqs.map((faq, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">Q: {faq.question}</p>
                    <p className="text-xs text-gray-600 mt-1">A: {faq.answer}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeFaq(idx)} 
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service Area & Base Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Service Area</Label>
            <Input
              value={formData.service_area || ""}
              onChange={(e) => handleChange("service_area", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Starting Price ($)</Label>
            <Input
              type="number"
              value={formData.base_price || ""}
              onChange={(e) => handleChange("base_price", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
