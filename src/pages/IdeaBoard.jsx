import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Idea, User } from "@/api/entities";
import { ArrowLeft, Plus, Search, Grid, List, Lightbulb, Image as ImageIcon, Tag, Link as LinkIcon, Palette, Trash2, Edit2, X, Camera, Upload, Save, Share2, Filter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadFile } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";
import { format } from "date-fns";

const categories = [
  { value: "theme", label: "Theme", icon: "🎨", color: "from-purple-400 to-pink-400" },
  { value: "decor", label: "Decor", icon: "✨", color: "from-amber-400 to-orange-400" },
  { value: "food", label: "Food & Drinks", icon: "🍽️", color: "from-red-400 to-pink-400" },
  { value: "entertainment", label: "Entertainment", icon: "🎵", color: "from-blue-400 to-indigo-400" },
  { value: "venue", label: "Venue", icon: "🏛️", color: "from-emerald-400 to-cyan-400" },
  { value: "guest_experience", label: "Guest Experience", icon: "💝", color: "from-rose-400 to-pink-400" },
  { value: "other", label: "Other", icon: "💡", color: "from-gray-400 to-gray-500" }
];

const colors = [
  { value: "#EF4444", name: "Red" },
  { value: "#F59E0B", name: "Orange" },
  { value: "#EAB308", name: "Yellow" },
  { value: "#10B981", name: "Green" },
  { value: "#06B6D4", name: "Cyan" },
  { value: "#3B82F6", name: "Blue" },
  { value: "#8B5CF6", name: "Purple" },
  { value: "#EC4899", name: "Pink" }
];

export default function IdeaBoard() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [blinkHistory, setBlinkHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    tags: "",
    color: colors[0].value,
    priority: "medium",
    status: "draft",
    notes: ""
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("ideas");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const ideasData = await Idea.filter({ user_id: user.id }, "-created_date");
      setIdeas(ideasData);
      
      // Load Blink event history
      const { BlinkEventHistory } = await import("@/api/entities");
      const historyData = await BlinkEventHistory.filter({ user_id: user.id }, "-created_date", 20);
      setBlinkHistory(historyData);
    } catch (error) {
      console.error("Error loading ideas:", error);
    }
  };

  const loadHistoryEvents = (historyItem) => {
    try {
      const variations = JSON.parse(historyItem.variations);
      const eventImages = historyItem.event_images ? JSON.parse(historyItem.event_images) : {};
      const enablerMatches = historyItem.enabler_matches ? JSON.parse(historyItem.enabler_matches) : {};
      
      // Get all enablers from the original data
      const stored = sessionStorage.getItem('blinkReadyEvents');
      let allEnablers = [];
      if (stored) {
        const data = JSON.parse(stored);
        allEnablers = data.allEnablers || [];
      }
      
      sessionStorage.setItem('blinkReadyEvents', JSON.stringify({
        searchQuery: historyItem.search_query,
        variations,
        allEnablers,
        cachedEnablerMatches: enablerMatches,
        cachedEventImages: eventImages
      }));
      
      navigate(createPageUrl("BlinkReadyEvents"));
    } catch (error) {
      console.error("Error loading history:", error);
      alert("Failed to load history. Please try again.");
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setUploadedImages([...uploadedImages, ...urls]);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload some images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateIdea = async () => {
    try {
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
      
      await Idea.create({
        user_id: currentUser.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        color: formData.color,
        priority: formData.priority,
        status: formData.status,
        notes: formData.notes,
        images: uploadedImages,
        linked_ideas: []
      });
      
      resetForm();
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating idea:", error);
      alert("Failed to create idea. Please try again.");
    }
  };

  const handleUpdateIdea = async () => {
    try {
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
      
      await Idea.update(editingIdea.id, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        color: formData.color,
        priority: formData.priority,
        status: formData.status,
        notes: formData.notes,
        images: uploadedImages
      });
      
      resetForm();
      setShowEditModal(false);
      setEditingIdea(null);
      loadData();
    } catch (error) {
      console.error("Error updating idea:", error);
      alert("Failed to update idea. Please try again.");
    }
  };

  const handleDeleteIdea = async (ideaId) => {
    if (!confirm("Delete this idea?")) return;
    
    try {
      await Idea.delete(ideaId);
      loadData();
    } catch (error) {
      console.error("Error deleting idea:", error);
      alert("Failed to delete idea. Please try again.");
    }
  };

  const handleEditIdea = (idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || "",
      category: idea.category,
      tags: idea.tags?.join(", ") || "",
      color: idea.color || colors[0].value,
      priority: idea.priority || "medium",
      status: idea.status || "draft",
      notes: idea.notes || ""
    });
    setUploadedImages(idea.images || []);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      tags: "",
      color: colors[0].value,
      priority: "medium",
      status: "draft",
      notes: ""
    });
    setUploadedImages([]);
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         idea.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || idea.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (categoryValue) => {
    return categories.find(c => c.value === categoryValue) || categories[categories.length - 1];
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("HostBrain"))}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <Lightbulb className="w-6 h-6 text-purple-500" />
              <h1 className="text-xl font-light text-gray-900">{firstName}'s Idea Board</h1>
            </div>
          </div>

          {activeTab === "ideas" && (
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search ideas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/60 backdrop-blur-sm border-purple-200/50"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 bg-white/60 backdrop-blur-sm border-purple-200/50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 bg-white/60 backdrop-blur-sm border border-purple-200/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-purple-500 text-white" : "text-gray-600 hover:bg-purple-50"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded transition-colors ${viewMode === "list" ? "bg-purple-500 text-white" : "text-gray-600 hover:bg-purple-50"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Adequate bottom padding */}
      <div className="max-w-md mx-auto px-4 pt-20 pb-32">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="ideas" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-purple-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-pink-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <Lightbulb className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Ideas</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="history" 
              className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-emerald-200/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:to-cyan-400 data-[state=active]:text-white data-[state=active]:border-transparent transition-all"
            >
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[9px] font-medium">Blink History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas" className="space-y-4">
            {filteredIdeas.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No ideas yet</h3>
                <p className="text-gray-600 mb-4">Start capturing your event inspiration</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Idea
                </Button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                {filteredIdeas.map((idea) => {
                  const categoryInfo = getCategoryInfo(idea.category);
                  
                  return (
                    <Card
                      key={idea.id}
                      className="overflow-hidden hover:shadow-lg transition-all bg-white/80 backdrop-blur-sm border-purple-100/50"
                      style={{ borderLeftWidth: "4px", borderLeftColor: idea.color }}
                    >
                      {idea.images && idea.images.length > 0 && (
                        <div className="relative h-40 bg-gray-100">
                          <img
                            src={idea.images[0]}
                            alt={idea.title}
                            className="w-full h-full object-cover"
                          />
                          {idea.images.length > 1 && (
                            <Badge className="absolute top-2 right-2 bg-black/50 text-white backdrop-blur-sm">
                              +{idea.images.length - 1}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{categoryInfo.icon}</span>
                              <Badge variant="outline" className="text-xs">
                                {categoryInfo.label}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-gray-900">{idea.title}</h3>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditIdea(idea)}
                              className="p-1.5 hover:bg-purple-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteIdea(idea.id)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        {idea.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {idea.description}
                          </p>
                        )}
                        
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {idea.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {idea.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{idea.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="capitalize">{idea.status}</span>
                          <Badge className={`${
                            idea.priority === "high" ? "bg-red-500" :
                            idea.priority === "medium" ? "bg-yellow-500" :
                            "bg-blue-500"
                          } text-white`}>
                            {idea.priority}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI-Generated Events</h3>
              <Badge variant="outline" className="text-xs">
                Last 20 searches
              </Badge>
            </div>
            
            {blinkHistory.length === 0 ? (
              <Card className="p-8 text-center bg-white/60 backdrop-blur-md border-emerald-200/50">
                <Lightbulb className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-3">No AI-generated events yet</p>
                <p className="text-sm text-gray-500">Use Blink to generate event ideas</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {blinkHistory.map((historyItem) => {
                  let variationsCount = 0;
                  try {
                    const variations = JSON.parse(historyItem.variations);
                    variationsCount = variations.length;
                  } catch (error) {
                    console.error("Error parsing variations:", error);
                  }
                  
                  return (
                    <Card 
                      key={historyItem.id}
                      className="p-4 bg-white/80 backdrop-blur-sm border-emerald-100/50 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => loadHistoryEvents(historyItem)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 truncate">
                            {historyItem.search_query}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {variationsCount} event variations generated
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {format(new Date(historyItem.created_date), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              View Events
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Create/Edit Modal - Keep existing modal code */}
      {(showCreateModal || showEditModal) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}
          onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            resetForm();
            setEditingIdea(null);
          }}
        >
          {/* Keep existing modal content */}
        </div>
      )}
    </div>
  );
}