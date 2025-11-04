import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Instagram,
  MessageCircle,
  Upload,
  Shield,
  Globe,
  CreditCard,
  Link as LinkIcon,
  Check,
  X,
  Camera
} from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";

export default function AccountProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  
  // Profile form
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    email: "",
    phone: "",
    instagram_handle: "",
    whatsapp: "",
    profile_picture: ""
  });
  
  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Preferences
  const [preferences, setPreferences] = useState({
    language: "en",
    region: "US",
    timezone: "UTC",
    currency: "USD"
  });
  
  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: false,
    apple: false,
    email: true,
    phone: false
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || "",
        bio: userData.bio || "",
        email: userData.email || "",
        phone: userData.phone || "",
        instagram_handle: userData.instagram_handle || "",
        whatsapp: userData.whatsapp || "",
        profile_picture: userData.profile_picture || ""
      });
      
      // Load preferences from user data
      if (userData.preferences) {
        setPreferences(userData.preferences);
      }
      
      setTwoFactorEnabled(userData.two_factor_enabled || false);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { file_url } = await UploadFile({ file });
        setFormData(prev => ({ ...prev, profile_picture: file_url }));
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image");
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
        bio: formData.bio,
        phone: formData.phone,
        instagram_handle: formData.instagram_handle,
        whatsapp: formData.whatsapp,
        profile_picture: formData.profile_picture
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ preferences });
      alert("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      await base44.auth.updateMe({ two_factor_enabled: !twoFactorEnabled });
      setTwoFactorEnabled(!twoFactorEnabled);
      alert(`Two-factor authentication ${!twoFactorEnabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling 2FA:", error);
      alert("Failed to update security settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "accounts", label: "Accounts", icon: LinkIcon },
    { id: "preferences", label: "Preferences", icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Account & Profile</h1>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="fixed top-[72px] left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-24">
        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className="space-y-6">
            {/* Profile Picture */}
            <Card className="p-6">
              <Label className="text-sm font-semibold text-gray-900 mb-4 block">Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                  {formData.profile_picture ? (
                    <img
                      src={formData.profile_picture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {formData.full_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Click to upload a new photo</p>
                  <p className="text-xs text-gray-400">JPG, PNG or GIF (max 5MB)</p>
                </div>
              </div>
            </Card>

            {/* Basic Info */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
              
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  disabled
                  className="mt-2 bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </Card>

            {/* Contact Info */}
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram Handle
                </Label>
                <Input
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@username"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Number
                </Label>
                <Input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="mt-2"
                />
              </div>
            </Card>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-xs text-gray-500 mt-1">Add an extra layer of security</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleToggle2FA}
                />
              </div>
              {twoFactorEnabled && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-800">
                    ✓ Two-factor authentication is enabled for your account
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Password & Biometrics</h3>
              
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">🔑</span>
                Enable Passkey
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <span className="mr-2">👤</span>
                Enable Face ID
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Active Sessions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">This Device</p>
                    <p className="text-xs text-gray-500">Last active: Now</p>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">Current</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Connected Accounts Section */}
        {activeSection === "accounts" && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Connected Accounts</h3>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-lg">G</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google</p>
                    <p className="text-xs text-gray-500">
                      {connectedAccounts.google ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={connectedAccounts.google ? "outline" : "default"}
                  size="sm"
                  onClick={() => setConnectedAccounts({ ...connectedAccounts, google: !connectedAccounts.google })}
                >
                  {connectedAccounts.google ? "Disconnect" : "Connect"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                    <span className="text-white text-lg"></span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Apple</p>
                    <p className="text-xs text-gray-500">
                      {connectedAccounts.apple ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={connectedAccounts.apple ? "outline" : "default"}
                  size="sm"
                  onClick={() => setConnectedAccounts({ ...connectedAccounts, apple: !connectedAccounts.apple })}
                >
                  {connectedAccounts.apple ? "Disconnect" : "Connect"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Primary</span>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-xs text-gray-500">
                      {connectedAccounts.phone ? formData.phone || "Add number" : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={connectedAccounts.phone ? "outline" : "default"}
                  size="sm"
                  onClick={() => setConnectedAccounts({ ...connectedAccounts, phone: !connectedAccounts.phone })}
                >
                  {connectedAccounts.phone ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Preferences Section */}
        {activeSection === "preferences" && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Language & Region</h3>
              
              <div>
                <Label>Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Region</Label>
                <Select
                  value={preferences.region}
                  onValueChange={(value) => setPreferences({ ...preferences, region: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="AE">United Arab Emirates</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Time & Currency</h3>
              
              <div>
                <Label>Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (GMT-5)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (GMT-8)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GMT+4)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (GMT+9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Currency</Label>
                <Select
                  value={preferences.currency}
                  onValueChange={(value) => setPreferences({ ...preferences, currency: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}