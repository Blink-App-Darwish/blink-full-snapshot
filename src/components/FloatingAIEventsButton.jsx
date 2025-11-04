import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function FloatingAIEventsButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasEvents, setHasEvents] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const shouldReduceMotion = useReducedMotion();
  
  useEffect(() => {
    const stored = sessionStorage.getItem('blinkReadyEvents');
    setHasEvents(!!stored);
  }, [location.pathname]);

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
    createPageUrl("BlinkReadyEvents"),
    createPageUrl("Home"),
    createPageUrl("Blink")
  ];
  
  if (hiddenPages.includes(location.pathname) || !hasEvents) return null;
  
  const animationProps = shouldReduceMotion ? {
    animate: { opacity: isActive ? 1 : 0.3 },
    transition: { duration: 0.2 }
  } : {
    animate: { 
      opacity: isActive ? 1 : 0.3,
      scale: isActive ? 1 : 0.9
    },
    whileHover: { scale: 1.05, opacity: 1 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.3 }
  };
  
  return (
    <motion.button
      onClick={() => navigate(createPageUrl("BlinkReadyEvents"))}
      onMouseEnter={() => setIsActive(true)}
      className="fixed bottom-64 right-4 z-[80] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(52, 211, 153, 0.3)'
      }}
      {...animationProps}
      aria-label="Back to Blink Ready Events"
    >
      <Sparkles className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
    </motion.button>
  );
}