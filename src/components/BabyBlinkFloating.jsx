import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

const BABY_BLINK_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68debc13e09ac863690db587/dd26bcf28_Untitleddesign-5.png";

export default function BabyBlinkFloating() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  // Hide on Support page
  const isOnSupportPage = location.pathname === createPageUrl("SupportHelp");

  useEffect(() => {
    let timeout;
    
    const handleScroll = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 3000);
    };

    // Use passive listeners for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const initialTimeout = setTimeout(() => setIsActive(false), 5000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
      clearTimeout(initialTimeout);
    };
  }, []);

  if (isOnSupportPage) return null;

  // Simplified animations for mobile/reduced motion
  const animationProps = shouldReduceMotion ? {
    animate: { opacity: isActive ? 1 : 0.3 },
    transition: { duration: 0.2 }
  } : {
    animate: { 
      opacity: isActive ? 1 : 0.3,
      scale: isActive ? 1 : 0.9
    },
    whileHover: { scale: 1.1, opacity: 1 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.3 }
  };

  return (
    <motion.button
      onClick={() => navigate(createPageUrl("SupportHelp"))}
      onMouseEnter={() => {
        setIsHovered(true);
        setIsActive(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-32 right-4 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center cursor-pointer"
      {...animationProps}
    >
      {/* Baby Blink Image - lazy load */}
      <div className="relative w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm p-1">
        <img 
          src={BABY_BLINK_IMAGE}
          alt="Baby Blink"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Simplified hover tooltip - desktop only */}
      {!shouldReduceMotion && isHovered && (
        <div className="hidden md:block absolute right-16 bg-white rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
          <p className="text-sm font-medium text-gray-900">Need help?</p>
          <p className="text-xs text-gray-500">Chat with Baby Blink</p>
        </div>
      )}
    </motion.button>
  );
}