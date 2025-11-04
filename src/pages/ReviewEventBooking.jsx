
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event, Booking, Contract, Package, Notification, User } from "@/api/entities"; // Enabler removed from here as it's dynamically imported below
import { ArrowLeft, CheckCircle2, Clock, DollarSign, Calendar, MapPin, Users, Edit2, Loader2, Sparkles, X, FileText, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ReviewEventBooking() {
  const location = useLocation();
  const navigate = useNavigate();

  const [eventDetails, setEventDetails] = useState(null);
  const [enablers, setEnablers] = useState([]);
  const [eventImage, setEventImage] = useState(null);
  const [totalCost, setTotalCost] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [user, setUser] = useState(null);
  const [agreedContracts, setAgreedContracts] = useState({});
  const [countdowns, setCountdowns] = useState({});
  const [signedContracts, setSignedContracts] = useState({});
  const [contracts, setContracts] = useState({});
  
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedEventName, setEditedEventName] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [editedGuestCount, setEditedGuestCount] = useState(0);

  const [selectedContractForReview, setSelectedContractForReview] = useState(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    loadEventData();
  }, []);

  useEffect(() => {
    if (eventDetails) {
      console.log('📝 Setting edit fields from eventDetails:', eventDetails);
      setEditedEventName(eventDetails.name || "");
      setEditedDate(eventDetails.date || "");
      setEditedLocation(eventDetails.location || "");
      setEditedGuestCount(eventDetails.guest_count || 0);
    }
  }, [eventDetails]);

  useEffect(() => {
    if (enablers.length > 0 && user) {
      console.log('🔄 Triggering loadUserAndContracts...');
      loadUserAndContracts();
      sessionStorage.setItem('event_flow_stage', 'review');
    }
  }, [enablers, user]);

  const loadEventData = async () => {
    try {
      console.log('🔍 ReviewEventBooking: Loading event data from session...');
      
      // Try multiple sources
      let sessionData = sessionStorage.getItem('pendingEventBooking');
      
      if (!sessionData) {
        console.log('⚠️ Trying backup key: blink_review_data');
        sessionData = sessionStorage.getItem('blink_review_data');
      }
      
      if (!sessionData) {
        console.log('⚠️ Trying localStorage backup');
        sessionData = localStorage.getItem('pendingEventBooking');
      }
      
      console.log('📦 Session data raw:', sessionData ? 'FOUND' : 'NOT FOUND');
      
      if (!sessionData) {
        console.error('❌ No session data found in any storage');
        
        // Check if we're coming from navigation
        const flowActive = sessionStorage.getItem('event_flow_active');
        const flowStage = sessionStorage.getItem('event_flow_stage');
        
        console.log('Flow status:', { flowActive, flowStage });
        
        setError('Session expired or data lost. Please start the booking process again.');
        setIsLoading(false);
        
        // Give user time to see the error
        setTimeout(() => {
          navigate(createPageUrl("Blink"), { replace: true });
        }, 3000);
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(sessionData);
        console.log('✅ Parsed session data successfully');
      } catch (parseError) {
        console.error('❌ Failed to parse session data:', parseError);
        setError('Invalid session data. Please start over.');
        setIsLoading(false);
        setTimeout(() => {
          navigate(createPageUrl("Blink"), { replace: true });
        }, 2000);
        return;
      }

      const eventInfo = parsedData.variation || parsedData.eventDetails || null;
      const enablersData = parsedData.enablers || [];
      const eventImageUrl = parsedData.eventImage || null;

      console.log('📋 Event info extracted:', eventInfo ? 'YES' : 'NO');
      console.log('👥 Enablers data count:', enablersData.length);
      console.log('🖼️ Event image:', eventImageUrl ? 'YES' : 'NO');

      if (!eventInfo) {
        console.error('❌ No event info in session data');
        setError('Event data is incomplete. Please start over.');
        setIsLoading(false);
        setTimeout(() => {
          navigate(createPageUrl("Blink"), { replace: true });
        }, 2000);
        return;
      }

      if (!enablersData || enablersData.length === 0) {
        console.error('❌ No enablers data in session');
        setError('No services selected. Please select services first.');
        setIsLoading(false);
        setTimeout(() => {
          navigate(createPageUrl("GuidedEnablerSelection") + `?event_id=${eventInfo.id || ''}`);
        }, 2000);
        return;
      }

      console.log('✅ Setting eventDetails state');
      setEventDetails(eventInfo);
      setEventImage(eventImageUrl);
      
      const userData = await base44.auth.me();
      setUser(userData);
      console.log('✅ User loaded:', userData.full_name);
      
      const enablersList = [];
      console.log(`🔄 Processing ${enablersData.length} enablers...`);
      
      for (const enablerData of enablersData) {
        try {
          console.log('🔍 Processing enabler:', enablerData);
          
          if (enablerData.business_name || enablerData.id) {
            console.log('✅ Using enabler data:', enablerData.business_name || enablerData.id);
            enablersList.push({
              ...enablerData,
              id: enablerData.id || enablerData.enabler_id,
              compatibility: enablerData.compatibility_status || 'compatible',
              suggested_price: enablerData.suggested_price || enablerData.base_price || 0,
              selected_package_id: enablerData.selected_package_id || enablerData.package_id || null,
              selected_package_name: enablerData.selected_package_name || null,
              role_description: enablerData.role_description || ''
            });
            console.log('✅ Added enabler to list:', enablerData.business_name || enablerData.id);
          } else if (enablerData.enabler_id) {
            console.log('🔄 Fetching enabler by ID:', enablerData.enabler_id);
            const { Enabler } = await import("@/api/entities");
            const fullEnablerData = await Enabler.filter({ id: enablerData.enabler_id });
            if (fullEnablerData[0]) {
              console.log('✅ Loaded full enabler data:', fullEnablerData[0].business_name);
              enablersList.push({
                ...fullEnablerData[0],
                suggested_price: enablerData.suggested_price || fullEnablerData[0].base_price || 0,
                role_description: enablerData.role_description || fullEnablerData[0].role_description || '',
                selected_package_id: enablerData.selected_package_id || enablerData.package_id || null,
                selected_package_name: enablerData.selected_package_name || null,
                compatibility: enablerData.compatibility_status || 'compatible'
              });
              console.log('✅ Added fetched enabler to list:', fullEnablerData[0].business_name);
            } else {
              console.warn(`⚠️ Enabler with ID ${enablerData.enabler_id} not found`);
            }
          } else {
            console.warn('⚠️ Invalid enabler data structure:', enablerData);
          }
        } catch (err) {
          console.error('❌ Error loading enabler:', err);
        }
      }

      console.log(`✅ Final enablers list: ${enablersList.length} enablers`);
      console.log('✅ Enablers:', enablersList);
      
      if (enablersList.length === 0) {
        console.error('❌ No valid enablers processed');
        setError('Failed to load service providers. Please try again.');
        setIsLoading(false);
        setTimeout(() => {
          navigate(createPageUrl("GuidedEnablerSelection") + `?event_id=${eventInfo.id || ''}`);
        }, 2000);
        return;
      }
      
      setEnablers(enablersList);

      const total = enablersList.reduce((sum, e) => sum + (e.suggested_price || 0), 0);
      console.log('💰 Total cost:', total);
      setTotalCost(total);

      setIsLoading(false);
      console.log('✅ Load complete - eventDetails:', !!eventInfo, 'enablers:', enablersList.length);

    } catch (error) {
      console.error('❌ Error in loadEventData:', error);
      setError('Failed to load event data: ' + error.message);
      setIsLoading(false);
      setTimeout(() => {
        navigate(createPageUrl("Blink"), { replace: true });
      }, 3000);
    }
  };

  useEffect(() => {
    const intervals = {};
    Object.keys(countdowns).forEach((enablerId) => {
      if (countdowns[enablerId] > 0 && !signedContracts[enablerId]) {
        intervals[enablerId] = setInterval(() => {
          setCountdowns(prev => {
            const newCount = prev[enablerId] - 1;
            if (newCount <= 0) {
              clearInterval(intervals[enablerId]);
              setSignedContracts(p => ({ ...p, [enablerId]: true }));
            }
            return { ...prev, [enablerId]: Math.max(0, newCount) };
          });
        }, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [countdowns, signedContracts]);

  const loadUserAndContracts = async () => {
    try {
      const contractsMap = {};
      if (enablers && enablers.length > 0) {
        for (const enabler of enablers) {
          if (enabler.selected_package_id) {
            console.log('📦 Loading package for enabler:', enabler.business_name);
            const pkg = await Package.filter({ id: enabler.selected_package_id });
            
            if (pkg[0]?.linked_contract_id) {
              console.log('📄 Found linked contract:', pkg[0].linked_contract_id);
              const contract = await Contract.filter({ id: pkg[0].linked_contract_id });
              
              if (contract[0]) {
                console.log('✅ Contract loaded:', contract[0].contract_type);
                contractsMap[enabler.id] = {
                  ...contract[0],
                  package_name: pkg[0].name,
                  package_price: pkg[0].price
                };
              } else {
                console.warn('⚠️ Contract not found for ID:', pkg[0].linked_contract_id);
              }
            } else {
              console.log('ℹ️ No linked contract for package:', pkg[0]?.name);
            }
          }
        }
      }
      
      console.log('📋 All contracts loaded:', Object.keys(contractsMap).length);
      setContracts(contractsMap);
    } catch (err) {
      console.error("Error loading contracts:", err);
    }
  };

  const handleAgreeContract = (enablerId) => {
    setAgreedContracts(prev => ({ ...prev, [enablerId]: true }));
    setCountdowns(prev => ({ ...prev, [enablerId]: 30 }));
  };

  const allContractsSigned = () => {
    return enablers.every(e => {
      const hasContract = contracts[e.id];
      if (!hasContract) return true; // If there's no contract, it's implicitly "signed" for the purpose of proceeding
      return signedContracts[e.id] === true;
    });
  };

  const handleConfirmBooking = async () => {
    if (isConfirming) return;
    
    setIsConfirming(true);
    try {
      console.log('🎯 Starting event creation...');
      
      if (!user) {
        throw new Error("User not logged in or not loaded.");
      }

      const eventRecord = await Event.create({
        host_id: user.id,
        name: editedEventName,
        type: eventDetails?.type || eventDetails?.variation?.type,
        date: editedDate,
        location: editedLocation,
        guest_count: editedGuestCount,
        budget: eventDetails?.budget || eventDetails?.variation?.budget || 0,
        theme: eventDetails?.theme || eventDetails?.variation?.theme || '',
        status: "planning",
        image: eventImage || '',
        venue_status: eventDetails?.venue_status || 'pending_venue',
        venue_confirmed: eventDetails?.venue_confirmed || false,
        venue_enabler_id: eventDetails?.venue_enabler_id || null,
        venue_capacity: eventDetails?.venue_capacity || null,
        service_area: eventDetails?.service_area || null,
        selected_categories: eventDetails?.selected_categories || []
      });

      console.log("Event created with ID:", eventRecord.id);

      for (const enabler of enablers) {
        await Booking.create({
          event_id: eventRecord.id,
          enabler_id: enabler.id,
          package_id: enabler.selected_package_id || null,
          total_amount: enabler.suggested_price || 0,
          status: "pending",
          payment_status: "pending"
        });

        await Notification.create({
          user_id: enabler.user_id || enabler.id, // Assuming enabler.id can be used as user_id for enablers or they have a user_id field
          enabler_id: enabler.id,
          profile_name: enabler.business_name,
          type: "booking_request",
          title: "New Booking Request!",
          message: `${user.full_name} has requested your services for ${editedEventName}`,
          link: createPageUrl("EnablerBookings")
        });
      }

      sessionStorage.removeItem('pendingEventBooking');
      sessionStorage.removeItem('blink_review_data'); // Clear the backup key as well
      localStorage.removeItem('pendingEventBooking'); // Clear local storage backup
      sessionStorage.removeItem('guidedEventCategories');
      sessionStorage.removeItem('event_flow_active');
      sessionStorage.removeItem('event_flow_stage');

      setShowSuccess(true);
      
      setTimeout(() => {
        navigate(createPageUrl("MyEvents"), { replace: true });
      }, 2000);
      
    } catch (err) {
      console.error("Error creating event:", err);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const saveSummaryEdits = () => {
    setIsEditingSummary(false);
  };

  const handleContractScroll = (e) => {
    const element = e.target;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleCloseContractModal = () => {
    setSelectedContractForReview(null);
    setHasScrolledToBottom(false);
  };

  const handleViewContract = (enabler) => {
    const contract = contracts[enabler.id];
    
    if (!contract) {
      alert('No smart contract available for this enabler. They may not have linked a contract to their package yet.');
      return;
    }
    
    console.log('🔍 Opening contract for:', enabler.business_name);
    setSelectedContractForReview({ enabler, contract });
    setHasScrolledToBottom(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-lg font-semibold">Loading your event details...</p>
        <p className="text-sm text-gray-500 mt-1">Please wait while we prepare everything.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-700 bg-gradient-to-br from-red-50 to-red-100 p-4 text-center">
        <Frown className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Oops! Something went wrong.</h2>
        <p className="text-lg">{error}</p>
        <Button onClick={() => navigate(createPageUrl("Home"), { replace: true })} className="mt-6 bg-red-600 hover:bg-red-700">
          Go to Home
        </Button>
      </div>
    );
  }

  if (!eventDetails || enablers.length === 0) {
    console.error('❌ Render check failed - eventDetails:', !!eventDetails, 'enablers:', enablers.length);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 p-4 text-center">
        <Frown className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No event data available.</h2>
        <p className="text-lg">It seems there was an issue loading your event. Please try starting the event creation process again.</p>
        <Button onClick={() => navigate(createPageUrl("Home"), { replace: true })} className="mt-6 bg-blue-600 hover:bg-blue-700">
          Start New Event
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="fixed top-0 left-0 right-0 z-10" style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <h1 className="text-lg font-bold">Final Review</h1>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-20 pb-32">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Smart Contracts Review</h2>
                <Badge className="bg-blue-100 text-blue-800">
                  Click cards to view full contract
                </Badge>
              </div>
              
              {enablers.map((enabler) => {
                const contract = contracts[enabler.id];
                const isAgreed = agreedContracts[enabler.id];
                const countdown = countdowns[enabler.id];
                const isSigned = signedContracts[enabler.id];

                return (
                  <motion.div
                    key={enabler.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleViewContract(enabler)}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: `2px solid ${isSigned ? '#10b981' : isAgreed ? '#f59e0b' : 'rgba(0, 0, 0, 0.05)'}`,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <div className="p-4 flex items-start gap-4 border-b border-gray-100">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-400 flex-shrink-0">
                        {enabler.profile_image ? (
                          <img src={enabler.profile_image} alt={enabler.business_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                            {enabler.business_name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{enabler.business_name}</h3>
                        <p className="text-sm text-gray-600">{enabler.role_description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-emerald-100 text-emerald-800">
                            ${enabler.suggested_price?.toLocaleString()}
                          </Badge>
                          {contract && (
                            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Smart Contract
                            </Badge>
                          )}
                          {isSigned && (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Signed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {contract ? (
                      <div className="p-4 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm text-gray-900">Contract Summary</h4>
                          <span className="text-xs text-blue-600 font-medium">Click to view full details →</span>
                        </div>
                        <div className="space-y-2 text-xs text-gray-700">
                          <div className="flex justify-between">
                            <span>Contract Type:</span>
                            <span className="font-semibold capitalize">{contract.contract_type?.replace(/_/g, ' ')}</span>
                          </div>
                          {contract.package_name && (
                            <div className="flex justify-between">
                              <span>Package:</span>
                              <span className="font-semibold">{contract.package_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Total Payment:</span>
                            <span className="font-semibold">${contract.pricing?.total_payment?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Deposit Required:</span>
                            <span className="font-semibold">{contract.pricing?.deposit_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50/50 border-t border-amber-100">
                        <p className="text-xs text-amber-800 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          No contract linked to this service yet
                        </p>
                      </div>
                    )}

                    <div className="p-4" onClick={(e) => e.stopPropagation()}>
                      {contract && !isAgreed && !isSigned && (
                        <Button
                          onClick={() => handleAgreeContract(enabler.id)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          I Acknowledge and Agree
                        </Button>
                      )}

                      {isAgreed && countdown > 0 && !isSigned && (
                        <Button
                          disabled
                          className="w-full py-3 rounded-xl font-semibold transition-all"
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '2px solid #f59e0b',
                            color: '#f59e0b',
                            opacity: 1 - (countdown / 30) * 0.5
                          }}
                        >
                          <Clock className="w-4 h-4 mr-2 animate-pulse" />
                          Enabler's signature expected in {countdown}s
                        </Button>
                      )}

                      {isSigned && (
                        <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border-2 border-green-500">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">Signed & Confirmed</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="md:col-span-1">
              <div className="sticky top-20">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '2px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Event Summary</h3>
                    <button
                      onClick={() => setIsEditingSummary(!isEditingSummary)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {isEditingSummary ? (
                      <>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1">Event Name</Label>
                          <Input
                            value={editedEventName}
                            onChange={(e) => setEditedEventName(e.target.value)}
                            className="text-sm border-emerald-200 focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1">Date</Label>
                          <Input
                            type="date"
                            value={editedDate}
                            onChange={(e) => setEditedDate(e.target.value)}
                            className="text-sm border-emerald-200 focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1">Location</Label>
                          <Input
                            value={editedLocation}
                            onChange={(e) => setEditedLocation(e.target.value)}
                            className="text-sm border-emerald-200 focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1">Guest Count</Label>
                          <Input
                            type="number"
                            value={editedGuestCount}
                            onChange={(e) => setEditedGuestCount(parseInt(e.target.value) || 0)}
                            className="text-sm border-emerald-200 focus:border-emerald-400"
                          />
                        </div>
                        <Button
                          onClick={saveSummaryEdits}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm"
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Event Name</p>
                            <p className="font-semibold text-gray-900">{editedEventName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="font-semibold text-gray-900">
                              {editedDate ? format(new Date(editedDate), "MMM d, yyyy") : "TBD"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="font-semibold text-gray-900">{editedLocation || "TBD"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Guests</p>
                            <p className="font-semibold text-gray-900">{editedGuestCount}</p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Total Cost</span>
                        <span className="text-2xl font-bold text-emerald-600">${totalCost.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500">{enablers.length} service{enablers.length !== 1 ? 's' : ''} selected</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {allContractsSigned() && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="p-4"
                      >
                        <Button
                          onClick={handleConfirmBooking}
                          disabled={isConfirming}
                          className="w-full py-4 text-base font-bold rounded-xl transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                            border: '2px solid rgba(16, 185, 129, 0.5)',
                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                            color: 'white'
                          }}
                        >
                          {isConfirming ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Confirm Booking
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedContractForReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            onClick={handleCloseContractModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl mx-4"
              style={{
                maxHeight: '85vh',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-cyan-400 flex-shrink-0">
                    {selectedContractForReview.enabler.profile_image ? (
                      <img 
                        src={selectedContractForReview.enabler.profile_image} 
                        alt={selectedContractForReview.enabler.business_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                        {selectedContractForReview.enabler.business_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{selectedContractForReview.enabler.business_name}</h3>
                    <p className="text-sm text-gray-600">Service Agreement</p>
                  </div>
                  <button
                    onClick={handleCloseContractModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div 
                className="overflow-y-auto px-6 py-6"
                style={{ maxHeight: 'calc(85vh - 140px)' }}
                onScroll={handleContractScroll}
              >
                <div className="space-y-6">
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/50">
                    <h4 className="text-sm font-bold text-emerald-900 mb-3">CONTRACT OVERVIEW</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contract Type:</span>
                        <span className="font-semibold capitalize">{selectedContractForReview.contract.contract_type?.replace(/_/g, ' ')}</span>
                      </div>
                      {selectedContractForReview.contract.package_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Package:</span>
                          <span className="font-semibold">{selectedContractForReview.contract.package_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value</span>
                        <span className="font-semibold text-gray-900">
                          {selectedContractForReview.contract.pricing?.currency} {selectedContractForReview.contract.pricing?.total_payment?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deposit Required</span>
                        <span className="font-semibold text-gray-900">
                          {selectedContractForReview.contract.pricing?.deposit_percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Schedule</span>
                        <span className="font-semibold text-gray-900 capitalize">
                          {selectedContractForReview.contract.pricing?.payment_schedule?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">FULL CONTRACT TERMS</h4>
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-200/50">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedContractForReview.contract.human_readable_summary || "Contract details not available"}
                      </pre>
                    </div>
                  </div>

                  {selectedContractForReview.contract.pricing && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3">PRICING TERMS</h4>
                      <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Schedule</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {selectedContractForReview.contract.pricing.payment_schedule?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Currency</span>
                          <span className="font-medium text-gray-900">
                            {selectedContractForReview.contract.pricing.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedContractForReview.contract.cancellation_policy && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3">CANCELLATION POLICY</h4>
                      <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50 space-y-2 text-xs">
                        {selectedContractForReview.contract.cancellation_policy.host_cancellation_windows?.map((window, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-gray-600">{window.days_before}+ days before</span>
                            <span className="font-medium text-gray-900">{window.refund_percentage}% refund</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Force Majeure</span>
                          <span className="font-medium text-gray-900">
                            {selectedContractForReview.contract.cancellation_policy.force_majeure_clause ? "Included" : "Not included"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedContractForReview.contract.rescheduling_policy?.allowed && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3">RESCHEDULING POLICY</h4>
                      <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Notice Period</span>
                          <span className="font-medium text-gray-900">
                            {selectedContractForReview.contract.rescheduling_policy.notice_period_days} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rescheduling Fee</span>
                          <span className="font-medium text-gray-900">
                            {selectedContractForReview.contract.pricing?.currency} {selectedContractForReview.contract.rescheduling_policy.fee || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Maximum Reschedules</span>
                          <span className="font-medium text-gray-900">
                            {selectedContractForReview.contract.rescheduling_policy.max_reschedules}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedContractForReview.contract.dispute_resolution && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3">DISPUTE RESOLUTION</h4>
                      <div className="bg-white/60 rounded-xl p-4 border border-gray-200/50 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Method</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {selectedContractForReview.contract.dispute_resolution.method}
                          </span>
                        </div>
                        {selectedContractForReview.contract.dispute_resolution.jurisdiction && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Jurisdiction</span>
                            <span className="font-medium text-gray-900">
                              {selectedContractForReview.contract.dispute_resolution.jurisdiction}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50">
                    <p className="text-xs text-amber-800 italic">
                      ⚖️ This document is legally binding. Both parties should review carefully before signing. 
                      Consult legal counsel if needed.
                    </p>
                  </div>

                  <div className="h-4"></div>
                </div>
              </div>

              <AnimatePresence>
                {hasScrolledToBottom && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20"
                  >
                    <button
                      onClick={handleCloseContractModal}
                      className="px-8 py-3 rounded-full font-semibold text-sm shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        border: '2px solid rgba(255, 255, 255, 0.5)',
                        color: 'white'
                      }}
                    >
                      <span className="text-lg">👍</span>
                      READ
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
