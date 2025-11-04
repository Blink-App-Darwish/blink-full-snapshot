import React, { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/api/entities";

const ONBOARDING_STEPS = {
  host: [
    {
      id: "welcome",
      title: "Welcome to Blink! 🎉",
      description: "Let's help you plan your perfect event in minutes.",
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80",
      tips: [
        "Use AI to generate event ideas",
        "Browse verified service providers",
        "Manage everything in one place"
      ]
    },
    {
      id: "create-event",
      title: "Create Your First Event",
      description: "Start by telling us about your event. You can use natural language!",
      image: "https://images.unsplash.com/photo-1519167758481-83f29da8ee97?w=400&q=80",
      tips: [
        'Try: "I want a birthday party for 50 people"',
        "AI will suggest different event styles",
        "Pick the one that matches your vision"
      ]
    },
    {
      id: "find-enablers",
      title: "Find Perfect Service Providers",
      description: "Browse our verified enablers or let AI match you automatically.",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&q=80",
      tips: [
        "View portfolios and reviews",
        "Compare packages and prices",
        "Send booking requests instantly"
      ]
    },
    {
      id: "manage-brain",
      title: "Your Event Brain 🧠",
      description: "Track ideas, tasks, finances, and timelines all in one place.",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
      tips: [
        "Capture inspiration on the go",
        "Manage your budget automatically",
        "Never miss a deadline"
      ]
    }
  ],
  enabler: [
    {
      id: "welcome",
      title: "Welcome, Enabler! 🚀",
      description: "Let's get your business set up to receive bookings.",
      image: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80",
      tips: [
        "Create your professional profile",
        "Set up your packages",
        "Start receiving bookings"
      ]
    },
    {
      id: "profile-setup",
      title: "Create Your Profile",
      description: "Showcase your work and tell clients what makes you special.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
      tips: [
        "Add high-quality portfolio images",
        "Write a compelling bio",
        "List your certifications"
      ]
    },
    {
      id: "packages",
      title: "Set Up Your Packages",
      description: "Create service packages that clients can book instantly.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80",
      tips: [
        "Offer 2-3 package tiers",
        "Use smart package creator",
        "Enable negotiation options"
      ]
    },
    {
      id: "calendar",
      title: "Manage Your Calendar",
      description: "Set your availability and let the system handle scheduling.",
      image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&q=80",
      tips: [
        "Choose a preset schedule mode",
        "Set buffer times between bookings",
        "Sync with Google Calendar"
      ]
    }
  ]
};

export default function OnboardingGuide({ userType = "host", onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const steps = ONBOARDING_STEPS[userType] || ONBOARDING_STEPS.host;

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const user = await User.me();
      const onboardingKey = `onboarding_${userType}_completed`;
      
      // Check if user has completed onboarding
      if (!user[onboardingKey]) {
        setIsVisible(true);
      } else {
        setHasSeenOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const user = await User.me();
      const onboardingKey = `onboarding_${userType}_completed`;
      await User.update(user.id, { [onboardingKey]: true });
      
      setIsVisible(false);
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Content */}
          <div className="p-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Image */}
              <div className="mb-6 rounded-2xl overflow-hidden">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-48 object-cover"
                />
              </div>

              {/* Title & Description */}
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {step.title}
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                {step.description}
              </p>

              {/* Tips */}
              <div className="space-y-3 mb-8">
                {step.tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{tip}</span>
                  </motion.div>
                ))}
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-2 mb-6">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentStep
                        ? "w-8 bg-emerald-500"
                        : idx < currentStep
                        ? "w-2 bg-emerald-300"
                        : "w-2 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                >
                  {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}