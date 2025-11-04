
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, ArrowRight, Check, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { determineVenueStatus, isVenueCategory } from "../components/VenueLogic";

const categories = [
  { name: "Event Planners", icon: "📋", value: "event_planner" },
  { name: "Beauty & Style", icon: "💄", value: "beauty_specialist" },
  { name: "Photography", icon: "📸", value: "photographer" },
  { name: "Videography", icon: "🎥", value: "videographer" },
  { name: "Music & DJs", icon: "🎵", value: "musician" },
  { name: "Venues", icon: "🏛️", value: "venue" },
  { name: "Catering", icon: "🍽️", value: "caterer" },
  { name: "Flowers & Decor", icon: "💐", value: "florist" },
  { name: "Audio/Visual", icon: "🎬", value: "audio_visual" },
  { name: "Speakers", icon: "🎤", value: "speaker" },
  { name: "Influencers", icon: "⭐", value: "influencer" }
];

export default function GuidedEventCreation() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [venueStatus, setVenueStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setVenueStatus(determineVenueStatus(selectedCategories));
  }, [selectedCategories]);

  // Load existing data if user navigates back
  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = () => {
    try {
      const stored = localStorage.getItem('guidedEventCategories') || sessionStorage.getItem('guidedEventCategories');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.categories && Array.isArray(data.categories)) {
          console.log('✅ Loaded existing categories:', data.categories);
          setSelectedCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const toggleCategory = (value) => {
    if (selectedCategories.includes(value)) {
      setSelectedCategories(selectedCategories.filter(c => c !== value));
    } else {
      setSelectedCategories([...selectedCategories, value]);
    }
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      setSelectedCategories([...selectedCategories, customCategory.trim()]);
      setCustomCategory("");
    }
  };

  const handleNext = async () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one service for your event");
      return;
    }
    
    setIsSaving(true);
    
    console.log('==========================================');
    console.log('🚀 STEP 1: SAVING CATEGORIES');
    console.log('Selected Categories:', selectedCategories);
    console.log('Venue Status:', venueStatus);
    console.log('==========================================');
    
    const eventData = {
      categories: selectedCategories,
      selected_categories: selectedCategories, // Alias for compatibility
      venue_status: venueStatus,
      timestamp: Date.now(),
      step: 1,
      completed: true
    };
    
    console.log('📦 Event data to save:', JSON.stringify(eventData, null, 2));
    
    try {
      const dataString = JSON.stringify(eventData);
      
      // Method 1: localStorage
      localStorage.setItem('guidedEventCategories', dataString);
      console.log('✅ Saved to localStorage');
      
      // Method 2: sessionStorage
      sessionStorage.setItem('guidedEventCategories', dataString);
      console.log('✅ Saved to sessionStorage');
      
      // Method 3: Backup key in localStorage
      localStorage.setItem('blink_event_categories', dataString);
      console.log('✅ Saved to backup key');
      
      // Wait a bit to ensure storage write completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // VERIFY saves
      const verifyLocal = localStorage.getItem('guidedEventCategories');
      const verifySession = sessionStorage.getItem('guidedEventCategories');
      const verifyBackup = localStorage.getItem('blink_event_categories');
      
      console.log('🔍 VERIFICATION:');
      console.log('localStorage exists:', !!verifyLocal);
      console.log('sessionStorage exists:', !!verifySession);
      console.log('backup exists:', !!verifyBackup);
      
      if (!verifyLocal && !verifySession && !verifyBackup) {
        throw new Error('❌ All storage methods failed');
      }
      
      if (verifyLocal) {
        const parsed = JSON.parse(verifyLocal);
        console.log('✅ localStorage data verified:', parsed);
      }
      
      // Mark flow as active
      sessionStorage.setItem('event_flow_active', 'true');
      sessionStorage.setItem('event_flow_stage', 'details');
      localStorage.setItem('event_flow_active', 'true');
      
      console.log('✅ Flow markers set');
      console.log('==========================================');
      
      // Navigate with state as additional backup
      navigate(createPageUrl("EventDetailsCollection"), {
        state: {
          categories: selectedCategories,
          venue_status: venueStatus,
          guidedEventData: eventData
        }
      });
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR saving categories:', error);
      alert('Failed to save data. Please check your browser storage permissions and try again.');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(createPageUrl("Blink"));
  };

  const hasVenueSelected = venueStatus === 'with_venue';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 z-10">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-light text-gray-900">Let's Create Your Event</h1>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">Step 1 of 4: Choose Your Services</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pt-24 pb-32">
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-transparent overflow-hidden">
              <span className="text-3xl animate-roll-in">🛒</span>
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">What services do you need?</h2>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.value);
              const isVenue = isVenueCategory(cat.value);
              
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleCategory(cat.value)}
                  className={`relative group overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 backdrop-blur-xl border-2 border-emerald-400 scale-105'
                      : 'bg-white/60 backdrop-blur-md border border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  
                  {isVenue && (
                    <div className="absolute top-2 left-2">
                      <span className="text-xs">📍</span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <span className="text-4xl mb-3 block">{cat.icon}</span>
                    <p className="text-xs font-medium text-gray-900">{cat.name}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Category Input */}
          <div className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Can't find what you need? Add your own:</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Magician, Face Painter..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
                className="flex-1 border-emerald-200 focus:border-emerald-400"
              />
              <Button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                variant="outline"
                size="icon"
                className={`rounded-full ${isRecording ? 'bg-red-500 text-white' : ''}`}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                onClick={addCustomCategory}
                variant="outline"
                className="rounded-full"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Selected Categories */}
          {selectedCategories.length > 0 && (
            <div className="mt-6 bg-emerald-50/50 backdrop-blur-sm border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-emerald-900">Selected Services ({selectedCategories.length}):</p>
                
                {!hasVenueSelected && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-600">
                    <span>⏳</span>
                    <span className="font-medium">No Venue</span>
                  </div>
                )}
                {hasVenueSelected && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <span>📍</span>
                    <span className="font-medium">Venue Selected</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((cat) => {
                  const category = categories.find(c => c.value === cat);
                  const isVenue = isVenueCategory(cat);
                  
                  return (
                    <Badge
                      key={cat}
                      className={`${
                        isVenue 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400' 
                          : 'bg-white/80 text-emerald-700 border-emerald-300'
                      } border px-3 py-1 flex items-center gap-2`}
                    >
                      {category ? category.icon : '✨'} {category ? category.name : cat}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Continue Button */}
      {selectedCategories.length > 0 && (
        <div className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            onClick={handleNext}
            disabled={isSaving}
            className="pointer-events-auto w-auto px-8 py-4 text-base font-bold rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(75,158,158,0.6)] transition-all flex items-center justify-center gap-2 border-2 active:scale-95 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: '#4B9E9E',
              color: '#3A7A7A',
              boxShadow: '0 0 25px rgba(75, 158, 158, 0.4), 0 8px 16px rgba(0, 0, 0, 0.15)',
              animation: 'pop-in 0.3s ease-out'
            }}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      )}
      
      <style>{`
        @keyframes roll-in {
          0% {
            transform: translateX(200%) rotate(0deg);
            opacity: 0;
          }
          100% {
            transform: translateX(0) rotate(360deg);
            opacity: 1;
          }
        }
        
        .animate-roll-in {
          animation: roll-in 1s ease-out;
        }
        
        @keyframes pop-in {
          0% {
            transform: scale(0.8) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
