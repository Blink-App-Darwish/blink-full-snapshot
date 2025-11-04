import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import BlinkLogo from "./BlinkLogo";

const PUBLIC_ROUTES = [
  createPageUrl("ProfileSetup"),
  createPageUrl("RoleSelection"),
  createPageUrl("RoleSelector"),
  createPageUrl("MobileLogin"),
  "/MobileLogin",
  "/mobilelogin",
];

export default function ProfileSetupGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const checkAuth = async () => {
    console.log('🔒 ProfileSetupGuard checking:', location.pathname);

    // CRITICAL: Check BLINK_MOBILE_MODE flag FIRST
    const mobileMode = typeof window !== 'undefined' && window.BLINK_MOBILE_MODE === true;
    
    const currentPath = location.pathname.toLowerCase();
    
    // Skip ALL auth checks for mobile
    if (mobileMode || currentPath === '/mobilelogin' || currentPath.includes('mobilelogin')) {
      console.log('✅ Mobile mode - skipping auth');
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    // Skip check for public routes
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      console.log('✅ Public route - authorized');
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    // Desktop: Normal auth check
    try {
      const user = await base44.auth.me();

      if (!user.user_type) {
        navigate(createPageUrl("RoleSelection"), { replace: true });
        return;
      }

      if (!user.profile_completed) {
        navigate(createPageUrl("ProfileSetup"), { replace: true });
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("ProfileSetupGuard auth error:", error);
      setIsAuthorized(true);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <BlinkLogo size="lg" className="animate-pulse mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
