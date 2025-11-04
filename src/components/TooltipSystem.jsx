import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Contextual Tooltip Component
 * Shows helpful tips and guidance throughout the app
 */

export function ContextualTooltip({ content, title, position = "top" }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-sm">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Feature Spotlight
 * Highlights new features with dismissible tooltips
 */

export function FeatureSpotlight({ feature, onDismiss, children }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss(feature.id);
    // Store in localStorage to not show again
    localStorage.setItem(`feature_${feature.id}_seen`, 'true');
  };

  // Check if already seen
  const alreadySeen = localStorage.getItem(`feature_${feature.id}_seen`);
  if (alreadySeen || !isVisible) return children;

  return (
    <div className="relative">
      {children}
      <div className="absolute -top-2 -right-2 z-10">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative bg-white rounded-full p-3 shadow-lg">
            <button
              onClick={handleDismiss}
              className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="max-w-xs">
              <p className="font-bold text-sm text-gray-900 mb-1">
                {feature.title}
              </p>
              <p className="text-xs text-gray-600">
                {feature.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tooltip Data Library
 */

export const TOOLTIPS = {
  // Booking Flow
  booking_hold: {
    title: "20-Minute Hold",
    content: "We reserve your selected services for 20 minutes while you review and sign the contract. This ensures availability."
  },
  booking_contract: {
    title: "Smart Contracts",
    content: "Digital contracts protect both you and service providers with clear terms, payment schedules, and cancellation policies."
  },
  booking_payment: {
    title: "Secure Payments",
    content: "50% deposit required to confirm. Remaining balance due 7 days before event. All transactions are encrypted and secure."
  },

  // Calendar
  calendar_sync: {
    title: "Calendar Sync",
    content: "Connect your Google Calendar to automatically sync bookings, availability, and reminders across all your devices."
  },
  calendar_buffer: {
    title: "Buffer Times",
    content: "Automatic breaks between bookings for setup, teardown, and rest. Prevents burnout and ensures quality service."
  },

  // Packages
  package_negotiation: {
    title: "Flexible Pricing",
    content: "Enable negotiations to let clients propose their budget. You can accept, decline, or counter-offer."
  },
  package_tiers: {
    title: "Multiple Tiers",
    content: "Offer 2-3 package options (Basic, Standard, Premium) to cater to different budgets and needs."
  },

  // Profile
  profile_portfolio: {
    title: "Portfolio Quality",
    content: "High-quality images increase bookings by 3x. Show your best work with professional photos."
  },
  profile_reviews: {
    title: "Social Proof",
    content: "Reviews build trust. Encourage satisfied clients to leave feedback to boost your visibility."
  },

  // Brain (Host Tools)
  brain_ideas: {
    title: "Idea Board",
    content: "Capture inspiration from anywhere - screenshots, links, notes. Organize by color and tags."
  },
  brain_budget: {
    title: "Budget Tracking",
    content: "Track every expense automatically. See where your money goes and stay within budget."
  },
  brain_timeline: {
    title: "Smart Timeline",
    content: "AI optimizes your event schedule by coordinating all services, setup times, and dependencies."
  }
};

/**
 * Usage example:
 * 
 * import { ContextualTooltip, TOOLTIPS } from "@/components/TooltipSystem";
 * 
 * <div className="flex items-center gap-2">
 *   <span>20-Minute Hold</span>
 *   <ContextualTooltip {...TOOLTIPS.booking_hold} />
 * </div>
 */