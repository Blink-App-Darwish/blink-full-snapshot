import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Reel, Enabler } from "@/api/entities";
import { ArrowLeft, Heart, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ReelView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reelId = searchParams.get("id");
  
  const [reel, setReel] = useState(null);
  const [enabler, setEnabler] = useState(null);

  useEffect(() => {
    const loadReel = async () => {
      if (!reelId) return;
      
      const reelData = await Reel.filter({ id: reelId });
      if (reelData[0]) {
        setReel(reelData[0]);
        
        // Increment views
        await Reel.update(reelId, { views: (reelData[0].views || 0) + 1 });
        
        // Load enabler
        const enablerData = await Enabler.filter({ id: reelData[0].enabler_id });
        if (enablerData[0]) {
          setEnabler(enablerData[0]);
        }
      }
    };

    loadReel();
  }, [reelId]);

  if (!reel) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="h-screen flex items-center justify-center">
        <video
          src={reel.video_url}
          className="w-full h-full object-contain"
          controls
          autoPlay
          loop
        />
      </div>

      {/* Info Overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-start gap-4 mb-4">
            {enabler && (
              <Link to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                  {enabler.profile_image ? (
                    <img src={enabler.profile_image} alt={enabler.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">👤</div>
                  )}
                </div>
              </Link>
            )}
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg mb-1">{reel.title}</h2>
              {enabler && (
                <p className="text-gray-300 text-sm">{enabler.business_name}</p>
              )}
              {reel.description && (
                <p className="text-gray-400 text-sm mt-2">{reel.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Eye className="w-5 h-5" />
              <span className="text-sm">{reel.views || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{reel.likes || 0}</span>
            </div>
            {reel.event_type && (
              <Badge className="bg-emerald-500 text-white">
                {reel.event_type}
              </Badge>
            )}
          </div>

          {enabler && (
            <Link to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}>
              <Button className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600">
                View Profile
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}