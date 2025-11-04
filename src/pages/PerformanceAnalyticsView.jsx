import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PerformanceAnalyticsDashboard from "../components/PerformanceAnalyticsDashboard";

export default function PerformanceAnalyticsView() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [enablerProfile, setEnablerProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const { User, Enabler } = await import("@/api/entities");
      
      const user = await User.me();
      setCurrentUser(user);

      // Try to load enabler profile
      const enablers = await Enabler.filter({ user_id: user.id });
      if (enablers[0]) {
        setEnablerProfile(enablers[0]);
      }

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h1 className="text-lg font-bold text-gray-900">Performance Analytics</h1>
              </div>
              <p className="text-sm text-gray-500">AI-powered insights and trends</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <PerformanceAnalyticsDashboard 
          enablerId={enablerProfile?.id} 
          hostId={!enablerProfile ? currentUser?.id : null}
        />
      </div>
    </div>
  );
}