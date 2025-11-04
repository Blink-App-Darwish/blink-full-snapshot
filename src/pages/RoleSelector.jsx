import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Users, Sparkles, ArrowRight } from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";
import { Enabler } from "@/api/entities";

export default function RoleSelector() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // If user doesn't have both roles, redirect appropriately
      if (user.user_type !== 'both') {
        if (user.user_type === 'enabler') {
          navigate(createPageUrl('EnablerDashboard'));
        } else {
          navigate(createPageUrl('Home'));
        }
        return;
      }
      
      // Check if user has a remembered choice
      const rememberedRole = localStorage.getItem('preferred_role');
      const autoSelect = localStorage.getItem('auto_select_role') === 'true';
      
      if (autoSelect && rememberedRole) {
        handleRoleSelect(rememberedRole);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      navigate(createPageUrl('RoleSelection'));
    }
  };

  const handleRoleSelect = async (role) => {
    try {
      // Store active role
      localStorage.setItem('last_active_portal', role);
      
      // Store preference if remember is checked
      if (rememberChoice) {
        localStorage.setItem('preferred_role', role);
        localStorage.setItem('auto_select_role', 'true');
      } else {
        localStorage.removeItem('preferred_role');
        localStorage.removeItem('auto_select_role');
      }
      
      // Navigate to appropriate portal
      if (role === 'enabler') {
        // Check if enabler profile exists
        const profiles = await Enabler.filter({ user_id: currentUser.id });
        if (profiles.length === 0) {
          navigate(createPageUrl('CreateEnablerProfile'));
        } else {
          navigate(createPageUrl('EnablerDashboard'));
        }
      } else {
        navigate(createPageUrl('Home'));
      }
    } catch (error) {
      console.error("Error selecting role:", error);
      alert("Failed to load portal. Please try again.");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  const firstName = currentUser.full_name?.split(' ')[0] || currentUser.email?.split('@')[0] || "there";

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
        {/* Logo and Title */}
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
              Welcome Back, <span className="font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">{firstName}</span>!
            </h1>
            <p className="text-gray-500 text-base font-light tracking-wide">
              Continue as...
            </p>
          </motion.div>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Host Card */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            onMouseEnter={() => setHoveredRole('host')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleRoleSelect('host')}
            className="group relative cursor-pointer text-left"
          >
            <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 p-8 ${
              hoveredRole === 'host' 
                ? 'border-emerald-400 shadow-2xl shadow-emerald-500/20 scale-[1.02]' 
                : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 transition-opacity duration-500 ${
                hoveredRole === 'host' ? 'opacity-100' : 'opacity-0'
              }`}></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg transition-transform duration-500 ${
                    hoveredRole === 'host' ? 'scale-110 rotate-6' : ''
                  }`}>
                    <Users className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <ArrowRight className={`w-6 h-6 text-emerald-500 transition-all duration-500 ${
                    hoveredRole === 'host' ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                  }`} strokeWidth={2} />
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-3 tracking-tight">
                  Host Portal
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4 font-light">
                  Plan events, connect with service providers, and bring your vision to life.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Event Planning
                  </span>
                  <span className="text-[10px] px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Find Enablers
                  </span>
                  <span className="text-[10px] px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Manage Events
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </div>
          </motion.button>

          {/* Enabler Card */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            onMouseEnter={() => setHoveredRole('enabler')}
            onMouseLeave={() => setHoveredRole(null)}
            onClick={() => handleRoleSelect('enabler')}
            className="group relative cursor-pointer text-left"
          >
            <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 p-8 ${
              hoveredRole === 'enabler' 
                ? 'border-cyan-400 shadow-2xl shadow-cyan-500/20 scale-[1.02]' 
                : 'border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
            }`}>
              <div className={`absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50 transition-opacity duration-500 ${
                hoveredRole === 'enabler' ? 'opacity-100' : 'opacity-0'
              }`}></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg transition-transform duration-500 ${
                    hoveredRole === 'enabler' ? 'scale-110 rotate-6' : ''
                  }`}>
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <ArrowRight className={`w-6 h-6 text-cyan-500 transition-all duration-500 ${
                    hoveredRole === 'enabler' ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
                  }`} strokeWidth={2} />
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-3 tracking-tight">
                  Enabler Portal
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4 font-light">
                  Showcase your services, manage bookings, and grow your business.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Service Provider
                  </span>
                  <span className="text-[10px] px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Manage Bookings
                  </span>
                  <span className="text-[10px] px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                    Build Portfolio
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Remember Choice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <input
            type="checkbox"
            id="remember"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
            Remember my choice for next time
          </label>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xs text-gray-400 font-light tracking-wide">
            You can switch between portals anytime from your profile
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}