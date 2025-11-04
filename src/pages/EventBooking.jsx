
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event, User, Booking, Contract, Package, Enabler, Notification } from "@/api/entities";
import { ArrowLeft, Lock, CheckCircle2, Clock, AlertTriangle, Shield, Loader2, FileText, DollarSign, Calendar, Eye, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import BlinkLogo from "../components/BlinkLogo";
import { motion, AnimatePresence } from "framer-motion";

export default function EventBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = searchParams.get("event_id");
  
  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState({});
  const [enablers, setEnablers] = useState({});
  const [contracts, setContracts] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review state
  const [reviewedBookings, setReviewedBookings] = useState({});
  const [agreedContracts, setAgreedContracts] = useState({});
  const [expandedContract, setExpandedContract] = useState(null);
  const [showContractPreview, setShowContractPreview] = useState(null);

  useEffect(() => {
    // Strict validation of event ID
    if (!eventId || 
        eventId === "null" || 
        eventId === "undefined" || 
        eventId === "-" || 
        eventId === "" || // Added check for empty string
        eventId.trim() === "") {
      console.error("Invalid event ID in EventBooking:", eventId);
      setError("Invalid event ID. Please go back to your events."); // Set error state
      setIsLoading(false); // Stop loading state
      
      // Redirect after showing error
      setTimeout(() => {
        navigate(createPageUrl("MyEvents"), { replace: true });
      }, 2000);
      return;
    }
    
    loadBookingData();
  }, [eventId, navigate]);

  const loadBookingData = async () => {
    if (!eventId || eventId === "null" || eventId === "undefined" || eventId === "-" || eventId.trim() === "") {
      setIsLoading(false);
      return;
    }
    
    try {
      console.log("Loading event booking data for event:", eventId);
      
      const userData = await User.me();
      setUser(userData);
      
      const eventData = await Event.filter({ id: eventId });
      
      if (!eventData || eventData.length === 0) {
        console.error("Event not found in EventBooking:", eventId);
        setError("Event not found");
        setTimeout(() => navigate(createPageUrl("MyEvents"), { replace: true }), 2000);
        return;
      }
      
      if (eventData[0]) {
        setEvent(eventData[0]);
        console.log("Event loaded:", eventData[0].name);
        
        const bookingsData = await Booking.filter({ event_id: eventId });
        setBookings(bookingsData);
        console.log("Bookings loaded:", bookingsData.length);
        
        const packagesMap = {};
        const enablersMap = {};
        const contractsMap = {};
        
        for (const booking of bookingsData) {
          // Validate enabler ID before loading
          if (booking.enabler_id && 
              booking.enabler_id !== "null" && 
              booking.enabler_id !== "undefined" && 
              booking.enabler_id !== "-" && 
              booking.enabler_id.trim() !== "") {
            
            if (!enablersMap[booking.enabler_id]) {
              try {
                const enabler = await Enabler.filter({ id: booking.enabler_id });
                if (enabler[0]) {
                  enablersMap[booking.enabler_id] = enabler[0];
                  console.log("Enabler loaded:", enabler[0].business_name);
                }
              } catch (error) {
                console.warn(`Failed to load enabler ${booking.enabler_id}:`, error);
              }
            }
          }
          
          if (booking.package_id && !packagesMap[booking.package_id]) {
            const pkg = await Package.filter({ id: booking.package_id });
            if (pkg[0]) {
              packagesMap[booking.package_id] = pkg[0];
              console.log("Package loaded:", pkg[0].name);
              
              if (pkg[0].linked_contract_id) {
                const contract = await Contract.filter({ id: pkg[0].linked_contract_id });
                if (contract[0]) {
                  contractsMap[booking.id] = contract[0];
                  console.log("Contract loaded for booking:", booking.id);
                }
              }
            }
          }
        }
        
        setPackages(packagesMap);
        setEnablers(enablersMap);
        setContracts(contractsMap);
      }
    } catch (error) {
      console.error("Error loading booking data:", error);
      setError("Failed to load booking information: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewBooking = (bookingId) => {
    setReviewedBookings(prev => ({
      ...prev,
      [bookingId]: true
    }));
  };

  const handleAgreeContract = (bookingId) => {
    setAgreedContracts(prev => ({
      ...prev,
      [bookingId]: true
    }));
  };

  const canProceedToConfirmation = () => {
    const allReviewed = bookings.every(b => reviewedBookings[b.id]);
    const allAgreed = bookings.every(b => {
      if (contracts[b.id]) {
        return agreedContracts[b.id] === true;
      }
      return true;
    });
    
    return allReviewed && allAgreed;
  };

  const handleProceedToConfirmation = () => {
    if (!canProceedToConfirmation()) {
      alert("Please review all bookings and accept all contract terms before proceeding.");
      return;
    }
    setCurrentStep(2);
  };

  const handleConfirmAll = async () => {
    setIsProcessing(true);
    try {
      for (const booking of bookings) {
        await Booking.update(booking.id, {
          status: "confirmed",
          payment_status: "pending"
        });
        
        const contract = contracts[booking.id];
        if (contract) {
          await Contract.update(contract.id, {
            status: "active",
            confirmed_at: new Date().toISOString(),
            signatures: {
              ...contract.signatures,
              host_signed: true,
              host_signed_at: new Date().toISOString()
            }
          });
        }

        const enabler = enablers[booking.enabler_id];
        if (enabler) {
          await Notification.create({
            user_id: enabler.user_id,
            enabler_id: enabler.id,
            profile_name: enabler.business_name,
            type: "booking_confirmed",
            title: "New Booking Confirmed!",
            message: `${user.full_name} has confirmed their booking for ${event.name}`,
            link: createPageUrl("EnablerBookings")
          });
        }
      }
      
      alert("✅ All bookings confirmed! Your event is ready.");
      navigate(`${createPageUrl("EventDetail")}?id=${eventId}`);
      
    } catch (error) {
      console.error("Error confirming bookings:", error);
      setError("Failed to confirm bookings: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!eventId || eventId === "null" || eventId === "undefined" || eventId === "-" || eventId === "" || eventId.trim() === "") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Event</h2>
          <p className="text-gray-600 mb-4">The event ID is missing or invalid.</p>
          <Button onClick={() => navigate(createPageUrl("MyEvents"))}>
            Go to My Events
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate(createPageUrl("MyEvents"))}>Go Back to My Events</Button>
        </Card>
      </div>
    );
  }

  const totalAmount = bookings.reduce((sum, b) => sum + b.total_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Finalize Booking</h1>
            <p className="text-xs text-gray-600">{event?.name}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Proper padding for fixed header and footer */}
      <div className="max-w-2xl mx-auto p-4 pt-20 pb-40">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
              {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <span className="text-sm font-medium">Review & Accept</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Step 1: Review & Accept */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Instructions */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">Before You Proceed</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Review each booking's package details and pricing</li>
                    <li>✓ Read and accept all contract terms (if applicable)</li>
                    <li>✓ Confirm payment arrangements</li>
                    <li>✓ Click "Proceed to Confirmation" below when ready</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Bookings List */}
            <h2 className="text-lg font-bold mt-6 mb-4">Your Bookings ({bookings.length})</h2>
            
            {bookings.map((booking) => {
              const pkg = packages[booking.package_id];
              const enabler = enablers[booking.enabler_id];
              const contract = contracts[booking.id];
              const isReviewed = reviewedBookings[booking.id];
              const isAgreed = agreedContracts[booking.id];
              const isExpanded = expandedContract === booking.id;
              
              return (
                <Card key={booking.id} className={`p-6 transition-all ${
                  isReviewed && (!contract || isAgreed) 
                    ? 'border-2 border-emerald-500 bg-emerald-50/30' 
                    : 'border-2 border-gray-200'
                }`}>
                  {/* Enabler Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-lg font-bold">
                        {enabler?.business_name?.[0] || '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{enabler?.business_name || 'Unknown Enabler'}</h3>
                        <p className="text-sm text-gray-600 capitalize">{enabler?.category?.replace(/_/g, ' ') || 'N/A'}</p>
                        <Badge className="mt-1">{booking.status}</Badge>
                      </div>
                    </div>
                    {isReviewed && (!contract || isAgreed) && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">Ready</span>
                      </div>
                    )}
                  </div>

                  {/* Package Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{pkg?.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{pkg?.description}</p>
                      </div>
                      <span className="font-bold text-emerald-600 text-xl">${booking.total_amount}</span>
                    </div>
                    
                    {pkg?.features && pkg.features.length > 0 && (
                      <div className="space-y-1 mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Included:</p>
                        {pkg.features.filter(f => f.included).slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contract Section */}
                  {contract && (
                    <div className="mb-4">
                      <button
                        onClick={() => setExpandedContract(isExpanded ? null : booking.id)}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span className="font-semibold text-indigo-900">Smart Contract Terms</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 p-4 bg-white border border-indigo-200 rounded-lg space-y-3">
                              {/* Contract Summary */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Contract Type</p>
                                  <p className="font-semibold">{contract.contract_type?.replace(/_/g, ' ')}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Total Payment</p>
                                  <p className="font-semibold text-emerald-600">${contract.pricing?.total_payment}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Deposit</p>
                                  <p className="font-semibold">{contract.pricing?.deposit_percentage}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Payment Schedule</p>
                                  <p className="font-semibold">{contract.pricing?.payment_schedule?.replace(/_/g, ' ')}</p>
                                </div>
                              </div>

                              {/* Key Terms */}
                              <div className="pt-3 border-t border-gray-200">
                                <p className="font-semibold text-gray-900 mb-2">Key Terms:</p>
                                <ul className="space-y-1 text-xs text-gray-700">
                                  {contract.cancellation_policy && (
                                    <li>• Cancellation policy included with refund windows</li>
                                  )}
                                  {contract.rescheduling_policy?.allowed && (
                                    <li>• Rescheduling allowed with {contract.rescheduling_policy.notice_period_days} days notice</li>
                                  )}
                                  {contract.insurance_requirements?.required && (
                                    <li>• Insurance coverage required</li>
                                  )}
                                  {contract.intellectual_property && (
                                    <li>• Photo/video rights: {contract.intellectual_property.photo_rights}</li>
                                  )}
                                </ul>
                              </div>

                              {/* Full Contract */}
                              {contract.human_readable_summary && (
                                <details className="pt-3 border-t border-gray-200">
                                  <summary className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                                    View Full Contract
                                  </summary>
                                  <div className="mt-3 max-h-64 overflow-y-auto bg-gray-50 rounded p-3">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                      {contract.human_readable_summary}
                                    </pre>
                                  </div>
                                </details>
                              )}

                              {/* Agreement Checkbox */}
                              {!isAgreed && (
                                <div className="pt-3 border-t border-gray-200">
                                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                                    <Checkbox
                                      checked={isAgreed}
                                      onCheckedChange={() => handleAgreeContract(booking.id)}
                                      className="mt-1"
                                    />
                                    <span className="text-sm text-gray-900">
                                      I have read and agree to all terms and conditions in this contract. I understand this is a legally binding agreement.
                                    </span>
                                  </label>
                                </div>
                              )}

                              {isAgreed && (
                                <div className="pt-3 border-t border-gray-200 flex items-center gap-2 text-emerald-600">
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span className="font-semibold text-sm">Contract Terms Accepted</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Review Checkbox */}
                  {!isReviewed && (
                    <Button
                      onClick={() => handleReviewBooking(booking.id)}
                      variant="outline"
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Mark as Reviewed
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 2: Confirm */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card className="p-6 text-center">
              <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Ready to Confirm?</h2>
              <p className="text-gray-600 mb-6">
                You are about to confirm {bookings.length} booking{bookings.length !== 1 ? 's' : ''} for your event.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-emerald-600">${totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Event Date</p>
                    <p className="text-lg font-bold text-gray-900">
                      {event?.date ? format(new Date(event.date), "MMM d, yyyy") : "TBD"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-200">
                  <span className="text-gray-600">Total Bookings:</span>
                  <span className="font-bold">{bookings.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Contracts Accepted:</span>
                  <span className="font-bold text-emerald-600">{Object.keys(agreedContracts).length}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-900 font-semibold mb-2">What happens next:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✓ Enablers will be notified immediately</li>
                  <li>✓ You'll receive payment instructions via email</li>
                  <li>✓ Event will appear in your calendar</li>
                  <li>✓ You can track progress in My Events</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Single Fixed Footer Button - Changes per step */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-md mx-auto">
          {currentStep === 1 ? (
            <>
              {!canProceedToConfirmation() && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Action Required:</p>
                    <ul className="space-y-1 text-xs">
                      {bookings.some(b => !reviewedBookings[b.id]) && (
                        <li>• Review all bookings</li>
                      )}
                      {bookings.some(b => contracts[b.id] && !agreedContracts[b.id]) && (
                        <li>• Accept all contract terms</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleProceedToConfirmation}
                disabled={!canProceedToConfirmation()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold disabled:opacity-50"
              >
                Proceed to Confirmation
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-600">${totalAmount.toLocaleString()}</span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-6"
                  disabled={isProcessing}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Review
                </Button>
                <Button 
                  onClick={handleConfirmAll}
                  disabled={isProcessing}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm All Bookings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
