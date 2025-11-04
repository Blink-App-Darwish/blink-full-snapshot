import React, { useState, useEffect } from "react";
import { Enabler, User } from "@/api/entities";
import { Plus, Check, ChevronDown, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProfileSwitcher({ currentProfile, onProfileChange }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      const profilesData = await Enabler.filter({ user_id: userData.id }, "-created_date");
      setProfiles(profilesData);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleCreateProfile = () => {
    if (profiles.length >= 3) {
      alert("Maximum 3 profiles allowed");
      return;
    }
    navigate(createPageUrl("CreateEnablerProfile"));
  };

  const handleSelectProfile = (profile) => {
    localStorage.setItem("selected_enabler_profile", profile.id);
    onProfileChange(profile);
    window.location.reload();
  };

  const handleSetPrimary = async (profileId) => {
    // Set all profiles to non-primary
    for (const profile of profiles) {
      await Enabler.update(profile.id, { is_primary: false });
    }
    // Set selected as primary
    await Enabler.update(profileId, { is_primary: true });
    loadProfiles();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="border border-emerald-100 p-4 hover:border-emerald-500 transition-all group cursor-pointer w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-emerald-200 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                <Briefcase className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 tracking-tight">
                  {currentProfile?.profile_name || currentProfile?.business_name || "Select Profile"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                  {currentProfile?.industry || currentProfile?.category?.replace(/_/g, " ") || "No industry"}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-2">
        <div className="px-3 py-2 border-b border-gray-100 mb-2">
          <p className="text-xs text-gray-500 tracking-wide">MY PROFILES ({profiles.length}/3)</p>
        </div>
        
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="relative group"
          >
            <DropdownMenuItem
              onClick={() => handleSelectProfile(profile)}
              className={`cursor-pointer p-3 mb-1 ${
                currentProfile?.id === profile.id 
                  ? 'bg-emerald-50 border border-emerald-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {profile.profile_image ? (
                    <img src={profile.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      {profile.business_name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {profile.profile_name || profile.business_name}
                    </p>
                    {profile.is_primary && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {profile.industry || profile.category?.replace(/_/g, " ")}
                  </p>
                </div>
                {currentProfile?.id === profile.id && (
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                )}
              </div>
            </DropdownMenuItem>
            
            {/* Set Primary button */}
            {!profile.is_primary && currentProfile?.id === profile.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetPrimary(profile.id);
                }}
                className="absolute right-2 top-2 text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 bg-white rounded border border-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Set Primary
              </button>
            )}
          </div>
        ))}

        {profiles.length < 3 && (
          <>
            <div className="border-t border-gray-100 my-2"></div>
            <DropdownMenuItem
              onClick={handleCreateProfile}
              className="cursor-pointer p-3 hover:bg-emerald-50"
            >
              <div className="flex items-center gap-3 w-full text-emerald-600">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center">
                  <Plus className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-medium text-sm">Create New Profile</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Add another industry profile
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}