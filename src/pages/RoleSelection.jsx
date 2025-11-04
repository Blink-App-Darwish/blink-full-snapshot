
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import BlinkLogo from "../components/BlinkLogo";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Users, Plus } from "lucide-react";

export default function RoleSelection() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [existingRole, setExistingRole] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        
        // If user already has a role
        if (user.user_type) {
          setExistingRole(user.user_type);
          
          // If profile is complete
          if (user.profile_completed) {
            // If user has both roles, show role selector
            if (user.user_type === 'both') {
              navigate(createPageUrl("RoleSelector")); // Assuming a RoleSelector page exists
            } else if (user.user_type === "enabler") {
              navigate(createPageUrl("EnablerDashboard"));
            } else { // user.user_type is 'host'
              navigate(createPageUrl("Home"));
            }
            return;
          }
          
          // If user has a role but profile not complete, go to profile setup
          navigate(createPageUrl("ProfileSetup"));
          return;
        }
        
        // If no user_type, proceed to show role selection screen
        const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || "there";
        setUserName(firstName);
      } catch (error) {
        console.error("Error loading user:", error);
        setUserName("there"); // Fallback for error or no user info
      }
    };
    loadUser();
  }, [navigate]);

  const selectRole = async (role) => {
    setIsLoading(true);
    try {
      // Set the user type first
      await base44.auth.updateMe({ user_type: role });
      
      // Then redirect to profile setup
      navigate(createPageUrl("ProfileSetup"));
    } catch (error) {
      console.error("Error setting role:", error);
      alert("Failed to set role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addAdditionalRole = async () => {
    setIsLoading(true);
    try {
      // Upgrade to 'both'
      await base44.auth.updateMe({ user_type: 'both' });
      
      // Determine which portal to set up or navigate to
      if (existingRole === 'host') {
        alert("Let's set up your Enabler profile!"); // Inform user
        navigate(createPageUrl("CreateEnablerProfile")); // Assuming this is the next step for Enabler setup
      } else { // existingRole === 'enabler'
        alert("Host features are now available!"); // Inform user
        navigate(createPageUrl("Home")); // Navigate to the Host dashboard/home
      }
    } catch (error) {
      console.error("Error adding role:", error);
      alert("Failed to add role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // If user has existing role and it's not 'both', show "Add Role" interface
  if (existingRole && existingRole !== 'both') {
    const otherRole = existingRole === 'host' ? 'enabler' : 'host';
    const otherRoleLabel = existingRole === 'host' ? 'Enabler' : 'Host';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <BlinkLogo size="lg" className="mx-auto mb-6" />
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Add {otherRoleLabel} Role?
          </h1>
          <p className="text-gray-600 mb-6">
            You already have a <span className="font-medium capitalize">{existingRole}</span> account. 
            Would you like to add {otherRoleLabel} features to your profile?
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={addAdditionalRole}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white h-12"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yes, Add {otherRoleLabel} Role
            </Button>
            <Button
              onClick={() => navigate(-1)} // Go back to previous page
              variant="outline"
              className="w-full h-12"
            >
              No, Continue as {existingRole}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLoading || !userName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
        <BlinkLogo size="md" className="animate-breath" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full relative z-10"
      >
        {/* Logo and Title Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <BlinkLogo size="lg" />
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-full blur-2xl -z-10"></div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-2 tracking-tight">
              Welcome <span className="font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">{userName}</span>!
            </h1>
            <p className="text-gray-500 text-base font-light tracking-wide">
              Choose your path to get started
            </p>
          </motion.div>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Host Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            onMouseEnter={() => setHoveredRole('host')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => !isLoading && selectRole("host")}
            className="group relative cursor-pointer"
          >
            <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
              hoveredRole === 'host' 
                ? 'border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-[1.02]' 
                : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
            }`}>
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 transition-opacity duration-500 ${
                hoveredRole === 'host' ? 'opacity-100' : 'opacity-0'
              }`}></div>
              
              {/* Content */}
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg transition-transform duration-500 ${
                    hoveredRole === 'host' ? 'scale-110 rotate-6' : ''
                  }`}>
                    <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className={`transition-all duration-500 ${
                    hoveredRole === 'host' ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                  }`}>
                    <ArrowRight className="w-5 h-5 text-emerald-500" strokeWidth={2} />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">
                  Host
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4 font-light text-sm">
                  Plan and manage unforgettable events with ease. Connect with top professionals.
                </p>
                
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Create Events
                  </span>
                  <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Find Enablers
                  </span>
                  <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Event Planning
                  </span>
                </div>
              </div>
              
              {/* Shimmer effect */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </div>
          </motion.div>

          {/* Enabler Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            onMouseEnter={() => setHoveredRole('enabler')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => !isLoading && selectRole("enabler")}
            className="group relative cursor-pointer"
          >
            <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
              hoveredRole === 'enabler' 
                ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20 scale-[1.02]' 
                : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
            }`}>
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50 transition-opacity duration-500 ${
                hoveredRole === 'enabler' ? 'opacity-100' : 'opacity-0'
              }`}></div>
              
              {/* Content */}
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg transition-transform duration-500 ${
                    hoveredRole === 'enabler' ? 'scale-110 rotate-6' : ''
                  }`}>
                    <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className={`transition-all duration-500 ${
                    hoveredRole === 'enabler' ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                  }`}>
                    <ArrowRight className="w-5 h-5 text-cyan-500" strokeWidth={2} />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">
                  Enabler
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4 font-light text-sm">
                  Showcase your expertise and grow your business. Connect with clients who need you.
                </p>
                
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Service Provider
                  </span>
                  <span className="text-[10px] px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Setup Shop
                  </span>
                  <span className="text-[10px] px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Build Portfolio
                  </span>
                </div>
              </div>
              
              {/* Shimmer effect */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xs text-gray-400 font-light tracking-wide">
            You can add the other role later from your profile settings
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
