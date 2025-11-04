import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler, User } from "@/api/entities";
import { ArrowLeft, Upload, Plus, X, Sparkles, Edit2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadFile } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";

const EVENT_INDUSTRIES = [
  { value: "event_planning", label: "Event Planning", subs: ["Corporate Events", "Wedding Planning", "Social Events", "Conference Management"] },
  { value: "catering", label: "Catering & Food", subs: ["Full Service Catering", "Beverage Service", "Dessert Catering", "Food Trucks"] },
  { value: "photography", label: "Photography", subs: ["Event Photography", "Wedding Photography", "Portrait Photography", "Product Photography"] },
  { value: "videography", label: "Videography", subs: ["Event Videography", "Cinematic Films", "Drone Footage", "Live Streaming"] },
  { value: "music", label: "Music & Entertainment", subs: ["Live Bands", "DJs", "Solo Artists", "Classical Music"] },
  { value: "venue", label: "Venues", subs: ["Banquet Halls", "Outdoor Venues", "Hotels", "Unique Spaces"] },
  { value: "decor", label: "Decor & Design", subs: ["Floral Design", "Event Styling", "Lighting Design", "Stage Design"] },
  { value: "beauty", label: "Beauty & Wellness", subs: ["Makeup Artists", "Hair Styling", "Spa Services", "Beauty Consultants"] },
  { value: "av", label: "Audio/Visual", subs: ["Sound Systems", "Lighting Equipment", "Stage Production", "Projection Services"] },
  { value: "other", label: "Other", subs: [] }
];

const PRESET_PACKAGES = {
  event_planning: [
    { name: "Basic Package", description: "Essential planning services", currency: "$", price: 2000 },
    { name: "Premium Package", description: "Full-service event management", currency: "$", price: 5000 },
    { name: "Luxury Package", description: "White-glove concierge service", currency: "$", price: 10000 }
  ],
  photography: [
    { name: "Half Day Coverage", description: "4 hours of photography", currency: "$", price: 800 },
    { name: "Full Day Coverage", description: "8 hours + edited photos", currency: "$", price: 1500 },
    { name: "Complete Package", description: "Full day + album + prints", currency: "$", price: 2500 }
  ],
  catering: [
    { name: "Basic Menu", description: "Standard catering per person", currency: "$", price: 35 },
    { name: "Premium Menu", description: "Upscale options per person", currency: "$", price: 65 },
    { name: "Luxury Menu", description: "Gourmet dining per person", currency: "$", price: 120 }
  ]
};

const PRESET_COLLABORATION_TERMS = [
  "Open to partnerships with other vendors for full-service events",
  "Available for collaborative projects with complementary service providers",
  "Willing to work with other professionals to create comprehensive event solutions",
  "Interested in cross-referrals and bundled service offerings"
];

const CURRENCIES = [
  { symbol: "$", code: "USD", name: "US Dollar" },
  { symbol: "AED", code: "AED", name: "UAE Dirham" },
  { symbol: "EGP", code: "EGP", name: "Egyptian Pound" }
];

export default function PortfolioCreator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [enabler, setEnabler] = useState(null);
  const [formData, setFormData] = useState({
    industry: "",
    custom_industry: "",
    sub_industry: "",
    custom_sub_industry: "",
    certificate_files: [],
    packages: [],
    collaboration_open: false,
    collaboration_terms: "",
    portfolio_images: [],
    google_review_link: "",
    other_review_links: [],
    proud_project_image: "",
    proud_project_description: ""
  });
  const [currentPackage, setCurrentPackage] = useState({
    name: "",
    description: "",
    currency: "$",
    price: "",
    image: ""
  });
  const [editingPackageIndex, setEditingPackageIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadEnabler();
  }, []);

  const loadEnabler = async () => {
    const user = await User.me();
    const enablerData = await Enabler.filter({ user_id: user.id });
    if (enablerData[0]) {
      setEnabler(enablerData[0]);
      if (enablerData[0].portfolio_completed) {
        setFormData({
          industry: enablerData[0].industry || "",
          custom_industry: "",
          sub_industry: enablerData[0].sub_industry || "",
          custom_sub_industry: "",
          certificate_files: enablerData[0].certificate_files || [],
          packages: enablerData[0].preset_packages || [],
          collaboration_open: enablerData[0].collaboration_open || false,
          collaboration_terms: enablerData[0].collaboration_terms || "",
          portfolio_images: enablerData[0].portfolio_images || [],
          google_review_link: enablerData[0].google_review_link || "",
          other_review_links: enablerData[0].other_review_links || [],
          proud_project_image: enablerData[0].proud_project_image || "",
          proud_project_description: enablerData[0].proud_project_description || ""
        });
      }
    }
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      if (type === "certificates") {
        setFormData(prev => ({
          ...prev,
          certificate_files: [...prev.certificate_files, ...urls]
        }));
      } else if (type === "portfolio") {
        setFormData(prev => ({
          ...prev,
          portfolio_images: [...prev.portfolio_images, ...urls]
        }));
      } else if (type === "proud_project") {
        setFormData(prev => ({
          ...prev,
          proud_project_image: urls[0]
        }));
      } else if (type === "package_image") {
        setCurrentPackage(prev => ({ ...prev, image: urls[0] }));
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    }
    setUploading(false);
  };

  const loadPresetPackages = () => {
    const industry = formData.industry;
    const presets = PRESET_PACKAGES[industry] || PRESET_PACKAGES.event_planning;
    setFormData(prev => ({
      ...prev,
      packages: presets
    }));
  };

  const editPackage = (index) => {
    setCurrentPackage(formData.packages[index]);
    setEditingPackageIndex(index);
  };

  const addOrUpdatePackage = () => {
    if (!currentPackage.name || !currentPackage.price) return;
    
    if (editingPackageIndex !== null) {
      const updatedPackages = [...formData.packages];
      updatedPackages[editingPackageIndex] = currentPackage;
      setFormData(prev => ({
        ...prev,
        packages: updatedPackages
      }));
      setEditingPackageIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        packages: [...prev.packages, currentPackage]
      }));
    }
    setCurrentPackage({ name: "", description: "", currency: "$", price: "", image: "" });
  };

  const removePackage = (index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
  };

  const loadPresetCollaborationTerms = () => {
    const randomTerm = PRESET_COLLABORATION_TERMS[Math.floor(Math.random() * PRESET_COLLABORATION_TERMS.length)];
    setFormData(prev => ({
      ...prev,
      collaboration_terms: randomTerm
    }));
  };

  const handleStartOver = () => {
    if (confirm("Are you sure you want to start over? All unsaved changes will be lost.")) {
      setFormData({
        industry: "",
        custom_industry: "",
        sub_industry: "",
        custom_sub_industry: "",
        certificate_files: [],
        packages: [],
        collaboration_open: false,
        collaboration_terms: "",
        portfolio_images: [],
        google_review_link: "",
        other_review_links: [],
        proud_project_image: "",
        proud_project_description: ""
      });
      setStep(1);
    }
  };

  const handleQuickSave = async () => {
    try {
      await Enabler.update(enabler.id, {
        industry: formData.custom_industry || formData.industry,
        sub_industry: formData.custom_sub_industry || formData.sub_industry,
        certificate_files: formData.certificate_files,
        preset_packages: formData.packages,
        collaboration_open: formData.collaboration_open,
        collaboration_terms: formData.collaboration_terms,
        portfolio_images: formData.portfolio_images,
        google_review_link: formData.google_review_link,
        other_review_links: formData.other_review_links,
        proud_project_image: formData.proud_project_image,
        proud_project_description: formData.proud_project_description,
        portfolio_completed: formData.portfolio_images.length >= 5
      });
      alert("Progress saved!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const handleSave = async () => {
    if (formData.portfolio_images.length < 5) {
      alert("Please upload at least 5 portfolio images");
      return;
    }

    try {
      await Enabler.update(enabler.id, {
        industry: formData.custom_industry || formData.industry,
        sub_industry: formData.custom_sub_industry || formData.sub_industry,
        certificate_files: formData.certificate_files,
        preset_packages: formData.packages,
        collaboration_open: formData.collaboration_open,
        collaboration_terms: formData.collaboration_terms,
        portfolio_images: formData.portfolio_images,
        google_review_link: formData.google_review_link,
        other_review_links: formData.other_review_links,
        proud_project_image: formData.proud_project_image,
        proud_project_description: formData.proud_project_description,
        portfolio_completed: true
      });
      
      navigate(createPageUrl("EnablerShop"));
    } catch (error) {
      console.error("Error saving portfolio:", error);
      alert("Failed to save portfolio. Please try again.");
    }
  };

  const renderNavigationButtons = (showBack = true, backStep = null) => (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleStartOver}
        className="flex items-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Start Over
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleQuickSave}
        className="flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save Progress
      </Button>
      {showBack && (
        <Button
          variant="outline"
          onClick={() => setStep(backStep || step - 1)}
          className="flex-1"
        >
          Back
        </Button>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Industry & Specialization</h3>
            
            <div>
              <Label>Industry *</Label>
              <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.industry === "other" && (
              <div>
                <Label>Custom Industry</Label>
                <Input
                  value={formData.custom_industry}
                  onChange={(e) => setFormData({...formData, custom_industry: e.target.value})}
                  placeholder="Enter your industry"
                  className="mt-2"
                />
              </div>
            )}

            {formData.industry && formData.industry !== "other" && (
              <div>
                <Label>Sub-Industry *</Label>
                <Select value={formData.sub_industry} onValueChange={(value) => setFormData({...formData, sub_industry: value})}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_INDUSTRIES.find(i => i.value === formData.industry)?.subs.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Other (specify)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.sub_industry === "custom" && (
              <div>
                <Label>Custom Specialization</Label>
                <Input
                  value={formData.custom_sub_industry}
                  onChange={(e) => setFormData({...formData, custom_sub_industry: e.target.value})}
                  placeholder="Enter your specialization"
                  className="mt-2"
                />
              </div>
            )}

            {renderNavigationButtons(false)}
            
            <Button onClick={() => setStep(2)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 2:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Certifications & Training</h3>
            
            <div>
              <Label>Upload Certificates (Optional)</Label>
              <label className="mt-2 flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => handleFileUpload(e, "certificates")}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload Certificates</p>
                </div>
              </label>
            </div>

            {formData.certificate_files.length > 0 && (
              <div className="space-y-2">
                {formData.certificate_files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Certificate {idx + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({...formData, certificate_files: formData.certificate_files.filter((_, i) => i !== idx)})}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {renderNavigationButtons(true, 1)}
            
            <Button onClick={() => setStep(3)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 3:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Service Packages</h3>
            
            <Button
              onClick={loadPresetPackages}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Load Preset Packages
            </Button>

            <div className="space-y-3">
              <Input
                placeholder="Package name"
                value={currentPackage.name}
                onChange={(e) => setCurrentPackage({...currentPackage, name: e.target.value})}
              />
              <Textarea
                placeholder="Package description"
                value={currentPackage.description}
                onChange={(e) => setCurrentPackage({...currentPackage, description: e.target.value})}
                rows={2}
              />
              
              {/* Package Image Upload */}
              <div>
                <Label>Package Image (Optional)</Label>
                <label className="mt-2 flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "package_image")}
                    className="hidden"
                  />
                  {currentPackage.image ? (
                    <img src={currentPackage.image} alt="Package" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-gray-600">Upload Image</p>
                    </div>
                  )}
                </label>
              </div>
              
              <div className="flex gap-2">
                <Select value={currentPackage.currency} onValueChange={(value) => setCurrentPackage({...currentPackage, currency: value})}>
                  <SelectTrigger className="w-24">
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
                <Input
                  type="number"
                  placeholder="Price"
                  value={currentPackage.price}
                  onChange={(e) => setCurrentPackage({...currentPackage, price: e.target.value})}
                  className="flex-1"
                />
                <Button onClick={addOrUpdatePackage} size="icon">
                  {editingPackageIndex !== null ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {formData.packages.length > 0 && (
              <div className="space-y-2">
                {formData.packages.map((pkg, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                    <div className="flex gap-3 flex-1">
                      {pkg.image && (
                        <img src={pkg.image} alt={pkg.name} className="w-16 h-16 rounded object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{pkg.name}</p>
                        <p className="text-sm text-gray-600">{pkg.description}</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">
                          {pkg.currency}{pkg.price}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editPackage(idx)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePackage(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {renderNavigationButtons(true, 2)}
            
            <Button onClick={() => setStep(4)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 4:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Collaboration</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="collaboration"
                checked={formData.collaboration_open}
                onCheckedChange={(checked) => setFormData({...formData, collaboration_open: checked})}
              />
              <label htmlFor="collaboration" className="text-sm font-medium">
                Open for collaboration with other enablers
              </label>
            </div>

            {formData.collaboration_open && (
              <>
                <Button
                  onClick={loadPresetCollaborationTerms}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Load Preset Terms
                </Button>
                
                <div>
                  <Label>Collaboration Terms</Label>
                  <Textarea
                    value={formData.collaboration_terms}
                    onChange={(e) => setFormData({...formData, collaboration_terms: e.target.value})}
                    placeholder="Describe your collaboration preferences and terms..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </>
            )}

            {renderNavigationButtons(true, 3)}
            
            <Button onClick={() => setStep(5)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 5:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Portfolio Images</h3>
            <p className="text-sm text-gray-600">Upload at least 5 photos of your work *</p>
            
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, "portfolio")}
                className="hidden"
                disabled={uploading}
              />
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-gray-600">
                  {uploading ? "Uploading..." : "Upload Images"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.portfolio_images.length}/5 minimum
                </p>
              </div>
            </label>

            {formData.portfolio_images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.portfolio_images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 group">
                    <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData({...formData, portfolio_images: formData.portfolio_images.filter((_, i) => i !== idx)})}
                      className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {renderNavigationButtons(true, 4)}
            
            <Button onClick={() => setStep(6)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 6:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Reviews & Recognition</h3>
            
            <div>
              <Label>Google Reviews Link</Label>
              <Input
                value={formData.google_review_link}
                onChange={(e) => setFormData({...formData, google_review_link: e.target.value})}
                placeholder="https://g.page/your-business/review"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Other Review Links (Optional)</Label>
              <Input
                placeholder="Add review link"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    setFormData({
                      ...formData,
                      other_review_links: [...formData.other_review_links, e.target.value]
                    });
                    e.target.value = '';
                  }
                }}
                className="mt-2"
              />
              {formData.other_review_links.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded mt-2">
                  <span className="text-sm truncate">{link}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({...formData, other_review_links: formData.other_review_links.filter((_, i) => i !== idx)})}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {renderNavigationButtons(true, 5)}
            
            <Button onClick={() => setStep(7)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Continue
            </Button>
          </Card>
        );
      
      case 7:
        return (
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Proud Achievement</h3>
            <p className="text-sm text-gray-600">Share a project you're especially proud of</p>
            
            <div>
              <Label>Project Image *</Label>
              <label className="mt-2 flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "proud_project")}
                  className="hidden"
                />
                {formData.proud_project_image ? (
                  <img src={formData.proud_project_image} alt="Proud project" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Upload Project Image</p>
                  </div>
                )}
              </label>
            </div>

            <div>
              <Label>Project Description *</Label>
              <Textarea
                value={formData.proud_project_description}
                onChange={(e) => setFormData({...formData, proud_project_description: e.target.value})}
                placeholder="Describe this achievement and what made it special..."
                className="mt-2"
                rows={4}
              />
            </div>

            {renderNavigationButtons(true, 6)}
            
            <Button onClick={() => setShowPreview(true)} className="w-full bg-emerald-500 hover:bg-emerald-600">
              Preview Portfolio
            </Button>
          </Card>
        );
      
      default:
        return null;
    }
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Portfolio Preview</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Edit
              </Button>
              <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 flex items-center gap-2">
                <BlinkLogo size="xs" />
                Save Portfolio
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-3">Industry</h3>
            <p className="text-gray-700">{formData.custom_industry || formData.industry}</p>
            <p className="text-sm text-gray-600">{formData.custom_sub_industry || formData.sub_industry}</p>
          </Card>

          {formData.packages.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-3">Packages</h3>
              <div className="space-y-3">
                {formData.packages.map((pkg, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    {pkg.image && (
                      <img src={pkg.image} alt={pkg.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                    <p className="text-emerald-600 font-bold mt-1">{pkg.currency}{pkg.price}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {formData.portfolio_images.length > 0 && (
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-3">Portfolio</h3>
              <div className="grid grid-cols-3 gap-2">
                {formData.portfolio_images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                    <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {formData.proud_project_image && (
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-3">Featured Achievement</h3>
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-200 mb-3">
                <img src={formData.proud_project_image} alt="Proud project" className="w-full h-full object-cover" />
              </div>
              <p className="text-gray-700">{formData.proud_project_description}</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Portfolio</h1>
            <p className="text-sm text-gray-600">Step {step} of 7</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {renderStep()}
      </div>
    </div>
  );
}