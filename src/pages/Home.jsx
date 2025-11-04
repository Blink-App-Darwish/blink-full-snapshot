import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Enabler, Notification } from '@/api/entities';
import { Plus, Mic, Eye, Bell, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BlinkLogo from '../components/BlinkLogo';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

// Custom hook to detect prefers-reduced-motion for performance/accessibility
const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);

    // Initial check
    handleChange();

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [userType, setUserType] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [showPlaceholderCursor, setShowPlaceholderCursor] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const reducedMotion = useReducedMotion(); // Use the custom hook for motion preference

  const placeholderTexts = useMemo(
    () => [
      'I am Planning A Birthday For My Cat . . .',
      'Retirement Party for My Blender . . .',
      'Backyard Movie Night, Popcorn Bar . . .',
      'Surprise Picnic Proposal . . .',
      'Our Garage 80s Disco, Go . . .',
      'Glow-in-the-Dark Dance Party . . .',
      '"We Survived Renovations" Dinner . . .',
      'Super Man Baby Shower . . .',
    ],
    []
  ); // Memoize placeholderTexts as it's a constant array

  // Separate function for loading notifications (lazy loading)
  const loadNotifications = async (userId) => {
    try {
      const notificationsData = await Notification.filter(
        { user_id: userId },
        '-created_date',
        10
      );
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    const checkUserAndLoad = async () => {
      // CRITICAL: Check if user explicitly chose host portal recently
      const explicitChoice =
        localStorage.getItem('portal_explicit_choice') === 'true';
      const choiceTimestamp = localStorage.getItem('portal_choice_timestamp');

      if (explicitChoice && choiceTimestamp) {
        const timeSinceChoice = Date.now() - parseInt(choiceTimestamp);
        if (timeSinceChoice < 5 * 60 * 1000) {
          // 5 minutes
          const chosenPortal = localStorage.getItem('last_active_portal');
          console.log('✅ Home page respecting explicit choice:', chosenPortal);

          // If user explicitly chose host, don't redirect them away
          if (chosenPortal === 'host') {
            console.log('✅ User explicitly chose host - staying on Home');
            // Continue loading home page
          }
        }
      }

      // Check if we're in active event flow - don't redirect if so
      const flowActive = sessionStorage.getItem('event_flow_active');
      if (flowActive === 'true') {
        console.log('✅ Event flow active - staying on Home');
        // User is in event creation flow, don't interfere
        return;
      }

      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        if (!user.profile_completed) {
          navigate(createPageUrl('ProfileSetup'));
          return;
        }

        if (!user.user_type) {
          navigate(createPageUrl('RoleSelection'));
          return;
        }

        setUserType(user.user_type);

        // CRITICAL: Only redirect to enabler if user ONLY has enabler role
        // Don't redirect users with 'both' or explicit host choice
        if (user.user_type === 'enabler') {
          const enablerProfiles = await Enabler.filter({ user_id: user.id });

          if (enablerProfiles.length === 0) {
            navigate(createPageUrl('CreateEnablerProfile'));
            return;
          }

          navigate(createPageUrl('EnablerDashboard'));
          return;
        }

        // Load notifications for enabler/both users
        if (user.user_type === 'enabler' || user.user_type === 'both') {
          loadNotifications(user.id);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    checkUserAndLoad();
  }, [navigate]);

  useEffect(() => {
    // Skip typewriter animation if reduced motion is preferred
    if (reducedMotion) {
      setPlaceholder(placeholderTexts[0]);
      return;
    }

    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;

    const typeWriter = () => {
      const currentText = placeholderTexts[currentTextIndex];

      if (!isDeleting) {
        if (currentCharIndex <= currentText.length) {
          setPlaceholder(currentText.slice(0, currentCharIndex));
          setShowPlaceholderCursor(true);
          currentCharIndex++;
        } else {
          setShowPlaceholderCursor(false);
          setTimeout(() => {
            isDeleting = true;
          }, 2000); // Pause before deleting
        }
      } else {
        // isDeleting
        if (currentCharIndex > 0) {
          currentCharIndex--;
          setPlaceholder(currentText.slice(0, currentCharIndex));
          setShowPlaceholderCursor(true);
        } else {
          isDeleting = false;
          currentTextIndex = (currentTextIndex + 1) % placeholderTexts.length;
          setShowPlaceholderCursor(false);
        }
      }
    };

    // Adjust typing speed based on state
    const typingInterval = setInterval(typeWriter, isDeleting ? 50 : 100);

    return () => clearInterval(typingInterval);
  }, [reducedMotion, placeholderTexts]); // Added reducedMotion and placeholderTexts to dependency array

  const handleAISearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isGenerating) return;

    setIsGenerating(true);

    // Show loading message after 5 seconds
    const slowLoadingTimeout = setTimeout(() => {
      console.log('⏳ LLM taking longer than expected...');
    }, 5000);

    try {
      const user = await base44.auth.me();
      if (!user) {
        throw new Error('User not authenticated.');
      }

      const allEnablers = await Enabler.list('-average_rating', 100);

      console.log('🤖 Calling LLM to generate event variations...');

      // Dynamically import Core
      const { InvokeLLM } = await import('@/api/integrations');

      // Simplified prompt for faster processing
      const eventVariations = await Promise.race([
        InvokeLLM({
          prompt: `Based on: "${searchQuery}"

Create 4 different event variations:
- name: Clear, descriptive event name
- type: wedding, birthday, corporate, conference, product_launch, baby_shower, dinner, or other
- date: Extract if mentioned
- location: Extract if mentioned
- guest_count: Extract if mentioned
- budget: Extract if mentioned (number only)
- theme: Unique theme/vision for each
- vibe: Mood description
- required_categories: Array of enabler categories needed
- color_palette: 3 hex colors
- illustration_prompt: Prompt for minimal illustration

RULES:
1. Variation 1: Traditional/Classic
2. Variation 2: Modern/Contemporary
3. Variation 3: Bohemian/Artistic
4. Variation 4: Luxe/High-end
5. Make each VERY different`,
          response_json_schema: {
            type: 'object',
            properties: {
              variations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    date: { type: 'string' },
                    location: { type: 'string' },
                    guest_count: { type: 'number' },
                    budget: { type: 'number' },
                    theme: { type: 'string' },
                    vibe: { type: 'string' },
                    required_categories: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    color_palette: { type: 'array', items: { type: 'string' } },
                    illustration_prompt: { type: 'string' },
                  },
                  required: [
                    'name',
                    'type',
                    'theme',
                    'vibe',
                    'required_categories',
                    'color_palette',
                    'illustration_prompt',
                  ],
                },
              },
            },
            required: ['variations'],
          },
        }),
        // Timeout after 45 seconds
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Request timeout - please try a simpler description')
              ),
            45000
          )
        ),
      ]);

      clearTimeout(slowLoadingTimeout);
      console.log('✅ Event variations generated successfully');

      sessionStorage.setItem(
        'blinkReadyEvents',
        JSON.stringify({
          searchQuery,
          variations: eventVariations.variations,
          allEnablers,
        })
      );

      navigate(createPageUrl('BlinkReadyEvents'));
    } catch (error) {
      clearTimeout(slowLoadingTimeout);
      console.error('Error creating event variations:', error);

      // User-friendly error messages
      let errorMessage = "Couldn't process your request. Please try again.";

      if (
        error.message?.includes('timeout') ||
        error.message?.includes('timed out')
      ) {
        errorMessage =
          'The AI took too long to respond. Please try:\n\n• Using a shorter, simpler description\n• Being more specific about what you want\n• Trying again in a moment';
      } else if (error.message?.includes('500')) {
        errorMessage =
          'Server error. Please try again in a moment or use the manual event creation option.';
      } else if (error.message?.includes('authenticated')) {
        errorMessage = 'Please log in to create events.';
      }

      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Create button clicked, navigating to GuidedEventCreation');
    navigate(createPageUrl('GuidedEventCreation'));
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      const updatedNotifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_received':
        return '💰';
      case 'booking_confirmed':
        return '✅';
      case 'review_received':
        return '⭐';
      case 'message_received':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className="min-h-screen w-screen bg-white relative flex flex-col"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 44px)', // ← 44px minimum!
        pointerEvents: 'auto',
      }}
    >
      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-gray-50 opacity-60 pointer-events-none"
        style={{ zIndex: 0 }}
      ></div>
      {/* Minimal Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm safe-top"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          pointerEvents: 'auto',
        }}
      >
        <div className="max-w-md mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Notification Bell - Left Side */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group"
                style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '0.5px solid rgba(156, 163, 175, 0.3)',
                  cursor: 'pointer',
                }}
              >
                <Bell
                  className={`w-4 h-4 text-emerald-500 ${
                    !reducedMotion
                      ? 'group-hover:scale-110 transition-transform'
                      : ''
                  }`}
                  strokeWidth={1.5}
                />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">
                      {unreadCount}
                    </span>
                  </div>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />

                  {/* Dropdown */}
                  <div
                    className="absolute top-12 left-0 w-80 z-50 rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '0.5px solid rgba(156, 163, 175, 0.2)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span className="text-xs text-emerald-600">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell
                            className="w-8 h-8 mx-auto text-gray-300 mb-2"
                            strokeWidth={1.5}
                          />
                          <p className="text-xs text-gray-400">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.link) {
                                navigate(notification.link);
                              }
                              setShowNotifications(false);
                            }}
                            className="w-full p-4 hover:bg-gray-50/50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                          >
                            <div className="flex gap-3">
                              <span className="text-lg flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-xs font-medium text-gray-900 line-clamp-1">
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {format(
                                    new Date(notification.created_date),
                                    'MMM d, h:mm a'
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            navigate(createPageUrl('Profile'));
                            setShowNotifications(false);
                          }}
                          className="w-full text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Create Button - Right Side */}
            <button
              onClick={handleCreateClick}
              type="button"
              className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 group"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <Plus
                className={`w-3.5 h-3.5 text-emerald-500 ${
                  !reducedMotion
                    ? 'group-hover:rotate-90 transition-all duration-300'
                    : ''
                }`}
                strokeWidth={1.5}
              />
              <span className="text-xs font-light text-gray-700 group-hover:text-emerald-600 transition-colors tracking-wide">
                Create
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Perfectly Centered Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <BlinkLogo
              className={`w-24 h-24 ${!reducedMotion ? 'animate-breath' : ''}`}
            />
            <p className="text-xl font-light text-gray-700 animate-pulse">
              Blinking your event ideas...
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-8">
            {/* Title Section */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-light text-gray-800 tracking-tight leading-tight">
                Blink{' '}
                <span className="font-normal bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  Your Perfect Event
                </span>
              </h1>
              <div className="flex items-center justify-center gap-2">
                <p className="text-xs font-light text-gray-400 tracking-[0.2em] uppercase">
                  AI Crafted Occasions
                </p>
                {/* AI Icon - Borderless */}
                <div className="relative flex items-center justify-center">
                  <Sparkles
                    className={`w-3.5 h-3.5 text-emerald-500 ${
                      !reducedMotion ? 'animate-pulse' : ''
                    }`}
                    strokeWidth={2}
                  />
                  {!reducedMotion && ( // Conditionally render ping animation based on reducedMotion
                    <div className="absolute inset-0 scale-150 opacity-30">
                      <Sparkles
                        className="w-3.5 h-3.5 text-emerald-400 animate-ping"
                        strokeWidth={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={handleAISearch} className="space-y-4">
              {/* Search Input - Chic Low Height */}
              <div className="relative group">
                {/* Conditional blur effect for hover based on reducedMotion */}
                {!reducedMotion && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full opacity-0 group-hover:opacity-20 blur transition-all duration-500 pointer-events-none"></div>
                )}
                <div className="relative bg-white/80 backdrop-blur-xl rounded-full border border-gray-200 hover:border-gray-300 focus-within:border-emerald-400/50 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="flex items-center pl-5 pr-3 py-2.5">
                    <Input
                      placeholder={
                        placeholder +
                        (showPlaceholderCursor && !reducedMotion ? '|' : '')
                      } // Only show cursor if not reduced motion
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isGenerating} // Added disabled attribute
                      className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-light bg-transparent placeholder:text-gray-400 h-auto py-0 px-0 disabled:opacity-50" // Added disabled:opacity-50
                    />
                    <button
                      type="button"
                      className="flex-shrink-0 ml-2 text-gray-300 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled classes
                      disabled={isGenerating} // Added disabled attribute
                    >
                      <Mic className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Smart Generate Button */}
              <div className="flex flex-col items-center gap-2">
                {' '}
                {/* Changed to flex-col to stack button and message */}
                <button
                  type="submit"
                  disabled={isGenerating || !searchQuery.trim()}
                  className="relative group px-6 py-2 rounded-full text-xs font-medium tracking-wide disabled:opacity-40 transition-all duration-300 overflow-hidden cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '0.5px solid rgba(16, 185, 129, 0.3)',
                    boxShadow: '0 2px 12px rgba(16, 185, 129, 0.1)',
                  }}
                >
                  {/* Animated gradient overlay (conditional based on reducedMotion) */}
                  {!reducedMotion && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/15 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  )}

                  <span className="relative flex items-center gap-2">
                    {isGenerating ? (
                      <>
                        {/* Loading spinner */}
                        <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                          Thinking . . .
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles
                          className={`w-3.5 h-3.5 text-emerald-500 ${
                            !reducedMotion
                              ? 'group-hover:rotate-180 transition-transform duration-500'
                              : ''
                          }`} // Conditional animation
                          strokeWidth={2}
                        />
                        <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                          Generate
                        </span>
                      </>
                    )}
                  </span>
                </button>
                {/* Helpful tip while generating */}
                {isGenerating && (
                  <p className="text-[10px] text-gray-400 animate-pulse">
                    This may take 15-30 seconds...
                  </p>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
      <style>{`
        @keyframes breath {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .animate-breath {
          animation: breath 3s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }

        body, html {
          overflow: hidden !important;
          height: 100vh !important;
          width: 100vw !important;
        }
      `}</style>
    </div>
  );
}
