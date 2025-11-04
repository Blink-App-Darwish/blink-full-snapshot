
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { ArrowLeft, Brain, Plus, Lightbulb, DollarSign, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlinkLogo from "../components/BlinkLogo";

export default function HostBrain() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const firstName = currentUser?.full_name?.split(' ')[0] || "Your";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Brain className="w-6 h-6 text-purple-500" />
            <h1 className="text-xl font-light text-gray-900">{firstName}'s Think Space</h1>
          </div>
        </div>
      </div>

      {/* Main Content - Extra bottom padding for navigation */}
      <div className="max-w-md mx-auto px-4 pt-20 pb-32">
        <Tabs defaultValue="ideas" className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="ideas" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-purple-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-pink-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <Lightbulb className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Ideas</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="finance" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-emerald-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:to-cyan-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <DollarSign className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Finance</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-blue-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:to-indigo-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Tasks</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="notes" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-orange-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-red-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ideas & Inspiration</h3>
              <Button 
                size="sm" 
                onClick={() => navigate(createPageUrl("IdeaBoard"))}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Idea
              </Button>
            </div>
            
            <Card 
              onClick={() => navigate(createPageUrl("IdeaBoard"))}
              className="p-8 text-center bg-white/60 backdrop-blur-md border-purple-200/50 cursor-pointer hover:border-purple-400 hover:shadow-lg transition-all"
            >
              <Lightbulb className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-3">Start capturing inspiration</p>
              <p className="text-sm text-gray-500">Tap to open your idea board</p>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Budget Tracker</h3>
              <Button 
                size="sm" 
                onClick={() => navigate(createPageUrl("FinanceTracker"))}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            </div>
            
            <Card 
              onClick={() => navigate(createPageUrl("FinanceTracker"))}
              className="p-8 text-center bg-white/60 backdrop-blur-md border-emerald-200/50 cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all"
            >
              <DollarSign className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-3">Track your event budget</p>
              <p className="text-sm text-gray-500">Tap to manage finances</p>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Timeline & Tasks</h3>
              <Button 
                size="sm" 
                onClick={() => navigate(createPageUrl("TaskManager"))}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </div>
            
            <Card 
              onClick={() => navigate(createPageUrl("TaskManager"))}
              className="p-8 text-center bg-white/60 backdrop-blur-md border-blue-200/50 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <Calendar className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-3">No tasks scheduled</p>
              <p className="text-sm text-gray-500">Plan your timeline and set reminders</p>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Notes</h3>
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-full">
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            </div>
            
            <Card className="p-8 text-center bg-white/60 backdrop-blur-md border-orange-200/50">
              <FileText className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-3">No notes yet</p>
              <p className="text-sm text-gray-500">Jot down important details and reminders</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
