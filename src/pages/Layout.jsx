import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, User, Brain } from 'lucide-react';
import BlinkLogo from '../components/BlinkLogo';
import { base44 } from '@/api/base44Client';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isMobile =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isCapacitor =
    typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
  const mobileMode =
    typeof window !== 'undefined' && window.BLINK_MOBILE_MODE === true;

  const [currentPortal, setCurrentPortal] = useState('host');
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccessedBrain, setHasAccessedBrain] = useState(false);

  const isActive = (path) => location.pathname === createPageUrl(path);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        const accessedBrain =
          localStorage.getItem('has_accessed_brain') === 'true';
        setHasAccessedBrain(accessedBrain);

        // Simple portal detection
        if (user.user_type === 'enabler') {
          setCurrentPortal('enabler');
        } else {
          setCurrentPortal('host');
        }
      } catch (error) {
        console.error('Error:', error);
        setCurrentPortal('host');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <BlinkLogo size="md" />
      </div>
    );
  }

  console.log('🎨 RENDERING PORTAL:', currentPortal);

  return (
    <>
      <style>{`
        /* CSS Reset for consistent spacing */
        * {
          box-sizing: border-box;
        }

        /* Safe area variables */
        :root {
          --safe-area-inset-top: env(safe-area-inset-top, 0px);
          --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
          --safe-area-inset-left: env(safe-area-inset-left, 0px);
          --safe-area-inset-right: env(safe-area-inset-right, 0px);
        }

        /* Bottom Navigation Bar */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(60px + var(--safe-area-inset-bottom));
          padding-bottom: var(--safe-area-inset-bottom);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          z-index: 9999;
        }

        /* Main Content Wrapper - NO TOP PADDING */
        .mobile-content-wrapper {
          position: relative;
          min-height: 100vh;
          background: rgb(249, 250, 251);
          padding-bottom: calc(80px + var(--safe-area-inset-bottom));
          overflow-x: hidden;
        }

        /* Inner container with ONLY horizontal padding */
        .mobile-content-inner {
          width: 100%;
          padding-left: 16px;
          padding-right: 16px;
          /* REMOVED: padding-top */
          margin: 0 auto;
          max-width: 100%;
        }

        /* Prevent children from breaking out */
        .mobile-content-inner > * {
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Responsive padding for larger screens */
        @media (min-width: 640px) {
          .mobile-content-inner {
            padding-left: 24px;
            padding-right: 24px;
          }
        }

        @media (min-width: 1024px) {
          .mobile-content-inner {
            padding-left: 32px;
            padding-right: 32px;
            max-width: 1280px;
          }
        }

        /* Utility class for pages that need full width (rare cases) */
        .full-width-content {
          margin-left: -16px;
          margin-right: -16px;
          width: calc(100% + 32px);
        }

        @media (min-width: 640px) {
          .full-width-content {
            margin-left: -24px;
            margin-right: -24px;
            width: calc(100% + 48px);
          }
        }

        @media (min-width: 1024px) {
          .full-width-content {
            margin-left: -32px;
            margin-right: -32px;
            width: calc(100% + 64px);
          }
        }

        /* Fix for fixed headers - they should respect safe area */
        .page-header-fixed {
          padding-top: var(--safe-area-inset-top);
        }
      `}</style>

      {/* MAIN CONTENT WRAPPER - NO TOP PADDING */}
      <div className="mobile-content-wrapper">
        <div className="mobile-content-inner">{children}</div>
      </div>

      {/* BOTTOM NAVIGATION - ALWAYS VISIBLE FOR HOST */}
      {currentPortal === 'host' && (
        <nav className="mobile-bottom-nav">
          <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
            {/* HOME */}
            <Link
              to={createPageUrl('Home')}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
                isActive('Home') ? 'text-emerald-500' : 'text-gray-400'
              }`}
            >
              <Home className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">Home</span>
            </Link>

            {/* MY EVENTS */}
            <Link
              to={createPageUrl('MyEvents')}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
                isActive('MyEvents') ? 'text-emerald-500' : 'text-gray-400'
              }`}
            >
              <Calendar className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">Events</span>
            </Link>

            {/* BLINK CENTER */}
            <Link
              to={createPageUrl('Blink')}
              className="flex flex-col items-center justify-center -mt-8"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(6, 182, 212, 0.15))',
                  border: '3px solid white',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              >
                <BlinkLogo size="md" />
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 ${
                  isActive('Blink') ? 'text-emerald-500' : 'text-gray-400'
                }`}
              >
                Blink
              </span>
            </Link>

            {/* BRAIN/THINK */}
            <Link
              to={
                hasAccessedBrain
                  ? createPageUrl('HostBrain')
                  : createPageUrl('BrainOrientation')
              }
              onClick={(e) => {
                const targetUrl = hasAccessedBrain
                  ? createPageUrl('HostBrain')
                  : createPageUrl('BrainOrientation');
                console.log('🧠 ========================================');
                console.log('🧠 THINK BUTTON CLICKED');
                console.log('🧠 hasAccessedBrain:', hasAccessedBrain);
                console.log(
                  '🧠 Target Page:',
                  hasAccessedBrain ? 'HostBrain' : 'BrainOrientation'
                );
                console.log('🧠 Target URL:', targetUrl);
                console.log('🧠 Current Path:', location.pathname);
                console.log('🧠 ========================================');
              }}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
                isActive('HostBrain') || isActive('BrainOrientation')
                  ? 'text-emerald-500'
                  : 'text-gray-400'
              }`}
            >
              <Brain className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">Think</span>
            </Link>

            {/* PROFILE */}
            <Link
              to={createPageUrl('Profile')}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-1 transition-colors ${
                isActive('Profile') ? 'text-emerald-500' : 'text-gray-400'
              }`}
            >
              <User className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">Profile</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
