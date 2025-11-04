import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Enabler } from "@/api/entities";
import { Store } from "lucide-react";

export default function FinaliseShopButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState(null);
  const [showButton, setShowButton] = useState(false);
  
  useEffect(() => {
    const checkUserAndShop = async () => {
      try {
        const user = await User.me();
        setUserType(user.user_type);
        
        if (user.user_type !== "enabler") {
          setShowButton(false);
          return;
        }
        
        const selectedProfileId = localStorage.getItem("selected_enabler_profile");
        if (selectedProfileId) {
          const profiles = await Enabler.filter({ id: selectedProfileId });
          const enabler = profiles[0];
          
          if (enabler && !enabler.portfolio_completed) {
            setShowButton(true);
          } else {
            setShowButton(false);
          }
        }
      } catch (error) {
        setShowButton(false);
      }
    };
    checkUserAndShop();
  }, [location.pathname]);
  
  if (userType !== "enabler" || !showButton) {
    return null;
  }
  
  const hiddenPages = [
    createPageUrl("EnablerShop"),
    createPageUrl("PortfolioCreator")
  ];
  
  if (hiddenPages.includes(location.pathname)) {
    return null;
  }
  
  return (
    <button
      onClick={() => navigate(createPageUrl("EnablerShop"))}
      className="fixed bottom-40 right-4 z-40 w-14 h-14 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center group"
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(251, 191, 36, 0.3)',
        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
      }}
      aria-label="Complete Your Shop"
    >
      <Store className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" style={{
        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
      }}></div>
    </button>
  );
}