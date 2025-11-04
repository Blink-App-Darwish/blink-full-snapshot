import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function FloatingReelsButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  
  useEffect(() => {
    const checkUserType = async () => {
      try {
        const user = await base44.auth.me();
        setUserType(user.user_type);
      } catch (error) {
        setUserType("host");
      }
    };
    checkUserType();
  }, []);

  useEffect(() => {
    let timeout;
    
    const handleScroll = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 3000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const initialTimeout = setTimeout(() => setIsActive(false), 5000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
      clearTimeout(initialTimeout);
    };
  }, []);
  
  const hiddenPages = [
    createPageUrl("ReelsViewer"),
    createPageUrl("Blink"),
    createPageUrl("Home")
  ];
  
  if (hiddenPages.includes(location.pathname)) return null;
  
  // Position above BabyBlink button (which is at bottom-32)
  const bottomPosition = "bottom-48";
  
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
      onClick={() => navigate(createPageUrl("ReelsViewer"))}
      onMouseEnter={() => setIsActive(true)}
      className={`fixed ${bottomPosition} right-4 z-[85] w-14 h-14 rounded-full flex items-center justify-center cursor-pointer`}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2)'
      }}
      {...animationProps}
      aria-label="View Reels"
    >
      <Play className="w-6 h-6 text-purple-500" fill="rgba(168, 85, 247, 0.7)" />
    </motion.button>
  );
}