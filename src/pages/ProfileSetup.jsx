
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Enabler } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Instagram, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import BlinkLogo from "../components/BlinkLogo";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    instagram_handle: "",
    whatsapp: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Redirect to role selection if no role selected
      if (!user.user_type) {
        navigate(createPageUrl("RoleSelection"));
        return;
      }
      
      setFormData({
        full_name: user.full_name || "",
        instagram_handle: user.instagram_handle || "",
        whatsapp: user.whatsapp || ""
      });
      
      // If already completed, redirect based on role
      if (user.profile_completed) {
        if (user.user_type === "enabler") {
          const enablerProfile = await Enabler.filter({ user_id: user.id });
          if (enablerProfile.length === 0) {
            navigate(createPageUrl("CreateEnablerProfile"));
          } else {
            navigate(createPageUrl("EnablerDashboard"));
          }
        } else {
          navigate(createPageUrl("Home"));
        }
        return;
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    try {
      // SAFE UPDATE: Using base44.auth.updateMe() instead of User.update()
      await base44.auth.updateMe({
        full_name: formData.full_name.trim(),
        instagram_handle: formData.instagram_handle.trim() || "",
        whatsapp: formData.whatsapp.trim() || "",
        profile_completed: true
      });
      
      // Navigate based on user type
      const updatedUser = await base44.auth.me();
      
      if (updatedUser.user_type === "enabler") {
        // For enablers, go to create enabler profile
        navigate(createPageUrl("CreateEnablerProfile"));
      } else {
        // For hosts, go to home
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center">
        <BlinkLogo size="md" className="animate-breath" />
      </div>
    );
  }

  const roleTitle = currentUser?.user_type === "enabler" ? "Enabler" : "Host";
  const roleColor = currentUser?.user_type === "enabler" ? "cyan" : "emerald";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="relative">
              <BlinkLogo size="lg" />
              <div className={`absolute -inset-4 bg-gradient-to-r from-${roleColor}-400/20 to-${roleColor}-400/20 rounded-full blur-2xl -z-10`}></div>
            </div>
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">
            Complete Your <span className={`font-semibold bg-gradient-to-r from-${roleColor}-600 to-${roleColor}-600 bg-clip-text text-transparent`}>{roleTitle} Profile</span>
          </h1>
          <p className="text-gray-500 text-sm font-light">Tell us a bit about yourself</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-gray-200/50 p-8 shadow-2xl"
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-${roleColor}-400/5 to-${roleColor}-400/5`}></div>
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            {currentUser && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-3 h-3 text-gray-600" strokeWidth={2} />
                  </div>
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="pl-11 h-12 bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full bg-${roleColor}-100 flex items-center justify-center`}>
                  <UserIcon className={`w-3 h-3 text-${roleColor}-600`} strokeWidth={2} />
                </div>
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="full_name"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                  className={`pl-11 h-12 border-gray-200 focus:border-${roleColor}-400 focus:ring-${roleColor}-400/20 transition-all`}
                />
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Instagram className="w-3 h-3 text-white" strokeWidth={2} />
                </div>
                Instagram Handle
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={formData.instagram_handle}
                  onChange={(e) => handleChange("instagram_handle", e.target.value)}
                  className="pl-11 h-12 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                />
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" strokeWidth={2} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-white" strokeWidth={2} />
                </div>
                WhatsApp Number
                <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                  className="pl-11 h-12 border-gray-200 focus:border-green-400 focus:ring-green-400/20 transition-all"
                />
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" strokeWidth={2} />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r from-${roleColor}-500 to-${roleColor}-500 hover:from-${roleColor}-600 hover:to-${roleColor}-600 text-white h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-8`}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </Button>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center text-xs text-gray-400 mt-6"
        >
          {currentUser?.user_type === "enabler" 
            ? "Next: Set up your professional profile" 
            : "Your information is secure and will only be used to enhance your experience"}
        </motion.p>
      </motion.div>
    </div>
  );
}
