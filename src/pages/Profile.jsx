
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Enabler } from "@/api/entities";
import { Settings, LogOut, Briefcase, ChevronRight, Check, Repeat2, Plus, User as UserIcon, DollarSign, ArrowLeftRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlinkLogo from "../components/BlinkLogo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

function ProfileSwitcher({ currentProfile, allProfiles, onProfileChange, onCreateNew }) {
  const handleSelectProfile = (profile) => {
    localStorage.setItem("selected_enabler_profile", profile.id);
    onProfileChange(profile);
  };

  if (!allProfiles || allProfiles.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between pr-3 border border-gray-200">
          <span className="flex items-center gap-2 text-gray-700">
            <Repeat2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
            {currentProfile ? (currentProfile.profile_name || currentProfile.business_name) : "Select Profile"}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[calc(100%-48px)] max-w-md">
        <DropdownMenuLabel>Switch Business Profile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onSelect={() => handleSelectProfile(profile)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex-1">
              <p className="font-medium">{profile.profile_name || profile.business_name}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">
                {profile.industry || profile.category?.replace(/_/g, " ")}
              </p>
            </div>
            {currentProfile && currentProfile.id === profile.id && (
              <Check className="ml-2 h-4 w-4 text-emerald-500" />
            )}
          </DropdownMenuItem>
        ))}
        
        {allProfiles.length < 3 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onCreateNew}
              className="flex items-center gap-2 cursor-pointer text-emerald-600 font-medium"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Create New Profile
              <span className="text-xs text-gray-500 ml-auto">
                ({allProfiles.length}/3)
              </span>
            </DropdownMenuItem>
          </>
        )}
        
        {allProfiles.length >= 3 && (
          <div className="px-2 py-2">
            <p className="text-xs text-gray-500 text-center">
              Maximum profiles reached (3/3)
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [currentPortal, setCurrentPortal] = useState(null);

  useEffect(() => {
    loadUser();
    const lastPortal = localStorage.getItem('last_active_portal');
    setCurrentPortal(lastPortal || 'host');
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setCurrentUser(userData);
      
      if (userData.user_type === "enabler" || userData.user_type === "both") {
        await loadEnablerProfiles(userData);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadEnablerProfiles = async (userData) => {
    try {
      const profiles = await Enabler.filter({ user_id: userData.id }, "-created_date");
      setAllProfiles(profiles);
      
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      let profile = null;
      
      if (selectedProfileId) {
        profile = profiles.find(p => p.id === selectedProfileId);
      }
      
      if (!profile && profiles.length > 0) {
        profile = profiles.find(p => p.is_primary) || profiles[0];
        localStorage.setItem("selected_enabler_profile", profile.id);
      }
      
      setCurrentProfile(profile);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleProfileChange = (profile) => {
    setCurrentProfile(profile);
    window.location.reload();
  };

  const handleCreateNewProfile = () => {
    if (allProfiles.length >= 3) {
      alert("Maximum 3 profiles allowed. Please delete an existing profile first.");
      return;
    }
    navigate(createPageUrl("CreateEnablerProfile"));
  };

  const handleSwitchPortal = async (targetPortal) => {
    console.log('🔄 EXPLICIT PORTAL SWITCH:', { 
      from: currentPortal, 
      to: targetPortal, 
      userType: currentUser?.user_type 
    });
    
    try {
      // CRITICAL: Mark this as an explicit user choice
      localStorage.setItem('last_active_portal', targetPortal);
      localStorage.setItem('portal_explicit_choice', 'true');
      localStorage.setItem('portal_choice_timestamp', Date.now().toString());
      
      console.log('✅ Portal choice saved:', {
        portal: targetPortal,
        explicit: 'true',
        timestamp: Date.now()
      });
      
      if (targetPortal === 'enabler') {
        if (currentUser?.user_type === 'host') {
          await base44.auth.updateMe({ user_type: 'both' });
          console.log('✅ User upgraded to "both"');
          alert("Let's set up your Enabler profile!");
          navigate(createPageUrl('CreateEnablerProfile'));
          return;
        } else {
          console.log('✅ Navigating to EnablerDashboard');
          window.location.href = createPageUrl('EnablerDashboard');
        }
      } else {
        if (currentUser?.user_type === 'enabler') {
          await base44.auth.updateMe({ user_type: 'both' });
          console.log('✅ User upgraded to "both"');
        }
        console.log('✅ Navigating to Home');
        window.location.href = createPageUrl('Home');
      }
    } catch (error) {
      console.error('❌ Error switching portal:', error);
      alert('Failed to switch portal. Please try again.');
    }
  };

  const handleResetRolePreference = () => {
    localStorage.removeItem('preferred_role');
    localStorage.removeItem('auto_select_role');
    localStorage.removeItem('portal_explicit_choice'); // Clear explicit choice
    localStorage.removeItem('portal_choice_timestamp'); // Clear timestamp
    localStorage.removeItem('last_active_portal'); // Clear last active portal as well
    alert('Role preference cleared! You\'ll be asked to choose next time you log in.');
  };

  const handleLogout = async () => {
    localStorage.removeItem("selected_enabler_profile");
    localStorage.removeItem("last_active_portal");
    localStorage.removeItem("preferred_role");
    localStorage.removeItem("auto_select_role");
    localStorage.removeItem("portal_explicit_choice"); // Clear explicit choice on logout
    localStorage.removeItem("portal_choice_timestamp"); // Clear timestamp on logout
    await base44.auth.logout();
    navigate(createPageUrl("Login"));
  };

  if (!currentUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <BlinkLogo size="lg" className="animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 pb-32">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-md mx-auto px-6 py-4">
          <h1 className="text-base font-medium text-gray-900 tracking-tight">Profile</h1>
          <p className="text-[10px] text-gray-400 tracking-wider mt-0.5">ACCOUNT SETTINGS</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-20 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {currentUser.full_name?.[0] || currentUser.email[0].toUpperCase()}
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{currentUser?.full_name || currentUser?.email}</h2>
              <p className="text-sm text-gray-600">{currentUser?.email}</p>
              {currentUser?.user_type && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={
                    currentUser.user_type === 'enabler' ? 'bg-emerald-100 text-emerald-800' :
                    currentUser.user_type === 'host' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }>
                    {currentUser.user_type === 'both' ? 'HOST & ENABLER' : currentUser.user_type.toUpperCase()}
                  </Badge>
                  
                  <Badge variant="outline" className="text-gray-600">
                    Currently: {currentPortal === 'enabler' ? 'Enabler Mode' : 'Host Mode'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Portal Switching Section */}
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Switch Portal</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {currentUser.user_type === 'both' 
                    ? 'You have access to both portals'
                    : `Add ${currentUser.user_type === 'host' ? 'Enabler' : 'Host'} features`}
                </p>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-purple-600" />
            </div>
            
            {currentUser.user_type === 'both' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleSwitchPortal('host')}
                    variant={currentPortal === 'host' ? 'default' : 'outline'}
                    className={currentPortal === 'host' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                    size="sm"
                  >
                    🎉 Host
                  </Button>
                  <Button
                    onClick={() => handleSwitchPortal('enabler')}
                    variant={currentPortal === 'enabler' ? 'default' : 'outline'}
                    className={currentPortal === 'enabler' ? 'bg-cyan-500 hover:bg-cyan-600 text-white' : ''}
                    size="sm"
                  >
                    💼 Enabler
                  </Button>
                </div>
                <Button
                  onClick={handleResetRolePreference}
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                >
                  Reset login preference
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSwitchPortal(currentUser.user_type === 'host' ? 'enabler' : 'host')}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {currentUser.user_type === 'host' ? 'Enabler' : 'Host'} Role
              </Button>
            )}
          </div>

          {(currentUser.user_type === "enabler" || currentUser.user_type === "both") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 tracking-wide">MY BUSINESS PROFILES</h3>
                {allProfiles.length < 3 && (
                  <button
                    onClick={handleCreateNewProfile}
                    className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors tracking-wide flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    NEW
                  </button>
                )}
              </div>
              
              <ProfileSwitcher 
                currentProfile={currentProfile} 
                allProfiles={allProfiles}
                onProfileChange={handleProfileChange}
                onCreateNew={handleCreateNewProfile}
              />
              
              {currentProfile && (
                <div className="mt-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                    <p className="text-xs font-medium text-emerald-900 tracking-wide">
                      ACTIVE PROFILE
                    </p>
                  </div>
                  <p className="text-sm text-emerald-800 font-medium">
                    {currentProfile.profile_name || currentProfile.business_name}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 capitalize">
                    {currentProfile.industry || currentProfile.category?.replace(/_/g, " ")}
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-800 leading-relaxed">
                  💡 <strong>Multi-Profile Feature:</strong> Create up to 3 separate business profiles for different industries. Each profile has its own portfolio, packages, and contracts.
                </p>
              </div>
            </div>
          )}

        </Card>

        {/* Admin Console Access - Only visible to admins */}
        {currentUser?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
              onClick={() => navigate(createPageUrl("AdminDashboard"))}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16"></div>
              <div className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Admin Console</h3>
                    <p className="text-sm text-gray-600">Operations & Intelligence Hub</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="mt-4 pt-4 border-t border-purple-200 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Quick Access</p>
                    <div className="flex gap-2">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                        CRM
                      </Badge>
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
                        Analytics
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                        Disputes
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="space-y-1">
          <Link to={createPageUrl("AccountProfile")}>
            <div className="border border-gray-100 p-4 hover:border-emerald-500 transition-all group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-emerald-200 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                    <UserIcon className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 tracking-tight">Account & Profile</p>
                    <p className="text-xs text-gray-500 mt-0.5">Edit profile, security & preferences</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
          </Link>

          <Link to={createPageUrl("PaymentsFinancials")}>
            <div className="border border-gray-100 p-4 hover:border-blue-500 transition-all group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-blue-200 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                    <DollarSign className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 tracking-tight">Payments & Financials</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cards, bank accounts & transactions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
          </Link>
          
          <Link to={createPageUrl("SupportHelp")}>
            <div className="border border-gray-100 p-4 hover:border-purple-500 transition-all group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center group-hover:border-purple-500 transition-colors bg-gradient-to-br from-purple-100 to-pink-100">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68debc13e09ac863690db587/dd26bcf28_Untitleddesign-5.png"
                      alt="Baby Blink"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 tracking-tight">Support & Help</p>
                    <p className="text-xs text-gray-500 mt-0.5">Get help from Baby Blink</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
          </Link>
          
          <Link to={createPageUrl("Settings")}>
            <div className="border border-gray-100 p-4 hover:border-emerald-500 transition-all group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 tracking-tight">Settings</p>
                    <p className="text-xs text-gray-500 mt-0.5">Preferences and privacy</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
              </div>
            </div>
          </Link>

          <div
            onClick={handleLogout}
            className="border border-gray-100 p-4 hover:border-red-200 hover:bg-red-50 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-red-300 transition-colors">
                  <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-red-600 tracking-tight transition-colors">Log Out</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sign out of your account</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100">
          <div className="text-center space-y-3">
            <BlinkLogo size="lg" className="mx-auto" />
            <div>
              <p className="text-xs text-gray-500 tracking-wide">BLINK EVENT MARKETPLACE</p>
              <p className="text-xs text-gray-400 mt-1">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
