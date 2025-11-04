import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Reel, Enabler, User } from "@/api/entities";
import { X, Heart, MessageCircle, Share2, MoreVertical, Plus, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";

export default function ReelsViewer() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [enabler, setEnabler] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newReel, setNewReel] = useState({
    title: "",
    description: "",
    event_type: "",
    video_url: "",
    thumbnail_url: ""
  });
  const containerRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (userData.user_type === "enabler") {
        const enablerData = await Enabler.filter({ user_id: userData.id });
        if (enablerData[0]) {
          setEnabler(enablerData[0]);
        }
      }
      
      const reelsData = await Reel.list("-created_date", 50);
      setReels(reelsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const windowHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / windowHeight);
    setCurrentIndex(newIndex);
  };

  const handleLike = async (reelId) => {
    const reel = reels.find(r => r.id === reelId);
    if (reel) {
      await Reel.update(reelId, { likes: (reel.likes || 0) + 1 });
      loadData();
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      if (type === "video") {
        setNewReel(prev => ({ ...prev, video_url: file_url }));
      } else if (type === "thumbnail") {
        setNewReel(prev => ({ ...prev, thumbnail_url: file_url }));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    }
    setUploading(false);
  };

  const handleCreateReel = async () => {
    if (!newReel.video_url || !newReel.title) {
      alert("Please add a video and title");
      return;
    }

    try {
      await Reel.create({
        enabler_id: enabler.id,
        enabler_name: enabler.business_name,
        video_url: newReel.video_url,
        thumbnail_url: newReel.thumbnail_url,
        title: newReel.title,
        description: newReel.description,
        event_type: newReel.event_type,
        views: 0,
        likes: 0
      });
      
      setShowUpload(false);
      setNewReel({
        title: "",
        description: "",
        event_type: "",
        video_url: "",
        thumbnail_url: ""
      });
      loadData();
    } catch (error) {
      console.error("Error creating reel:", error);
      alert("Failed to create reel. Please try again.");
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (!confirm("Delete this reel?")) return;
    
    try {
      await Reel.delete(reelId);
      loadData();
    } catch (error) {
      console.error("Error deleting reel:", error);
      alert("Failed to delete reel.");
    }
  };

  if (showUpload && user?.user_type === "enabler") {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <button
              onClick={() => setShowUpload(false)}
              className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-900 transition-colors"
            >
              <X className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
            <h2 className="text-white font-medium tracking-tight">CREATE REEL</h2>
            <button
              onClick={handleCreateReel}
              disabled={uploading}
              className="px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {uploading ? "UPLOADING..." : "POST"}
            </button>
          </div>

          {/* Upload Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <Label className="text-white text-xs tracking-wide mb-2 block">VIDEO *</Label>
              <label className="flex items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors bg-gray-900/50">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, "video")}
                  className="hidden"
                />
                {newReel.video_url ? (
                  <video src={newReel.video_url} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-gray-400">Upload Video</p>
                  </div>
                )}
              </label>
            </div>

            <div>
              <Label className="text-white text-xs tracking-wide mb-2 block">THUMBNAIL (OPTIONAL)</Label>
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors bg-gray-900/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "thumbnail")}
                  className="hidden"
                />
                {newReel.thumbnail_url ? (
                  <img src={newReel.thumbnail_url} className="w-full h-full object-cover rounded-lg" alt="Thumbnail" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" strokeWidth={1.5} />
                    <p className="text-xs text-gray-400">Upload Thumbnail</p>
                  </div>
                )}
              </label>
            </div>

            <div>
              <Label className="text-white text-xs tracking-wide mb-2 block">TITLE *</Label>
              <Input
                value={newReel.title}
                onChange={(e) => setNewReel({...newReel, title: e.target.value})}
                placeholder="Give your reel a catchy title"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label className="text-white text-xs tracking-wide mb-2 block">DESCRIPTION</Label>
              <Textarea
                value={newReel.description}
                onChange={(e) => setNewReel({...newReel, description: e.target.value})}
                placeholder="Describe your work..."
                rows={3}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <Label className="text-white text-xs tracking-wide mb-2 block">EVENT TYPE</Label>
              <Select value={newReel.event_type} onValueChange={(value) => setNewReel({...newReel, event_type: value})}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="product_launch">Product Launch</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <BlinkLogo size="sm" />
            <span className="text-white font-medium tracking-tight">Reels</span>
          </div>
          {user?.user_type === "enabler" && (
            <button
              onClick={() => setShowUpload(true)}
              className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
          )}
          {user?.user_type === "host" && <div className="w-10"></div>}
        </div>
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reels.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <BlinkLogo size="lg" className="mx-auto mb-4 opacity-50" />
              <p className="text-white/60 text-sm">No reels yet</p>
              {user?.user_type === "enabler" && (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600"
                >
                  Create First Reel
                </Button>
              )}
            </div>
          </div>
        ) : (
          reels.map((reel, index) => (
            <div key={reel.id} className="h-screen snap-start relative">
              {/* Video */}
              <video
                src={reel.video_url}
                className="w-full h-full object-cover"
                autoPlay={index === currentIndex}
                loop
                muted
                playsInline
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none"></div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pb-24">
                <div className="max-w-md mx-auto">
                  <h3 className="text-white font-bold text-lg mb-2">{reel.title}</h3>
                  {reel.description && (
                    <p className="text-white/90 text-sm mb-3">{reel.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-white/80 text-xs">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      {reel.event_type}
                    </span>
                    <span>{reel.views || 0} views</span>
                    <span>•</span>
                    <span>{reel.enabler_name}</span>
                  </div>
                </div>
              </div>

              {/* Actions Sidebar */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-6">
                <button
                  onClick={() => handleLike(reel.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Heart className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-white text-xs font-medium">{reel.likes || 0}</span>
                </button>

                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <MessageCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-white text-xs font-medium">0</span>
                </button>

                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Share2 className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                </button>

                {user?.user_type === "enabler" && enabler?.id === reel.enabler_id && (
                  <button
                    onClick={() => handleDeleteReel(reel.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                      <Trash2 className="w-5 h-5 text-red-400" strokeWidth={1.5} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}