
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, Calendar, DollarSign, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlinkLogo from "../components/BlinkLogo";

import { base44 } from "@/api/base44Client";

export default function BrainOrientation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const name = user.full_name?.split(' ')[0] || "Your";
      setFirstName(name);
    } catch (error) {
      console.error("Error loading user:", error);
      setFirstName("Your");
    }
  };

  const steps = [
    {
      icon: Brain,
      title: `Welcome to ${firstName}'s Think Space`,
      description: "Your personal event planning headquarters. Everything you need to organize, plan, and manage your events in one place.",
      color: "from-purple-400 to-pink-500"
    },
    {
      icon: Lightbulb,
      title: "Capture Ideas",
      description: "Jot down inspiration, save links, upload images. Never lose a great idea again.",
      color: "from-yellow-400 to-orange-500"
    },
    {
      icon: DollarSign,
      title: "Track Finances",
      description: "Monitor your budget, track payments, and see exactly where your money is going.",
      color: "from-emerald-400 to-cyan-500"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Coordinate timelines, set reminders, and never miss an important deadline.",
      color: "from-blue-400 to-indigo-500"
    }
  ];

  const handleComplete = async () => {
    try {
      if (currentUser) {
        await base44.auth.updateMe({ has_accessed_brain: true });
      }
      navigate(createPageUrl("HostBrain"));
    } catch (error) {
      console.error("Error updating user:", error);
      navigate(createPageUrl("HostBrain"));
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <BlinkLogo size="md" className="animate-breath" />
      </div>
    );
  }

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <BlinkLogo size="lg" className="mx-auto mb-4" />
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === step ? 'w-12 bg-purple-500' : 'w-6 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-purple-200/50 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10"></div>
          
          <div className="relative z-10">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${currentStep.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
              <Icon className="w-10 h-10 text-white" strokeWidth={2} />
            </div>

            <h2 className="text-2xl font-light text-gray-900 text-center mb-4">
              {currentStep.title}
            </h2>
            <p className="text-gray-600 text-center mb-8 leading-relaxed">
              {currentStep.description}
            </p>

            <div className="flex gap-3">
              {step < steps.length - 1 ? (
                <>
                  <Button
                    onClick={() => handleComplete()}
                    variant="outline"
                    className="flex-1 rounded-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={() => setStep(step + 1)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full flex items-center justify-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 rounded-full flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
