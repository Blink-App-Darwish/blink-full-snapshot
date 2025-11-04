
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
// Added Enabler to imports, as specified in the outline for notification logic
import { Contract, User, Booking, Notification, Package, Event, NegotiationSession, Reservation, Enabler } from "@/api/entities"; 
// Added Loader2 for loading animation, as specified in the outline
import { ArrowLeft, Download, Share2, Edit, FileText, CheckCircle2, Clock, AlertCircle, ExternalLink, Mail, Sparkles, ChevronDown, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// AvailabilityChecker and ReservationService are still relevant for other flows, so keeping them
import AvailabilityChecker from "../components/AvailabilityChecker";
import ReservationService from "../components/ReservationService";

export default function ContractDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get("id");
  const reservationId = searchParams.get("reservation_id"); // Get reservation ID from URL
  
  const [contract, setContract] = useState(null);
  const [user, setUser] = useState(null);
  const [signingUrl, setSigningUrl] = useState(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false); // Used for DocuSign flow, consistent with previous state
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [negotiationSession, setNegotiationSession] = useState(null);
  const [showFullContract, setShowFullContract] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [negotiationTermsData, setNegotiationTermsData] = useState(null);
  const [bookingData, setBookingData] = useState(null); // Added bookingData state

  useEffect(() => {
    // Validate contract ID exists and is valid
    if (!contractId || contractId === "null" || contractId === "undefined" || contractId === "-" || contractId.trim() === "") {
      console.error("Invalid contract ID:", contractId);
      navigate(-1, { replace: true });
      return;
    }
    
    loadContract();
    loadUser();
  }, [contractId, reservationId, navigate]);

  const loadContract = async () => {
    if (!contractId || contractId === "null" || contractId === "undefined" || contractId === "-" || contractId.trim() === "") {
      setLoading(false); // Ensure loading state is false if contractId is invalid
      return;
    }
    
    setLoading(true);
    try {
      const contracts = await Contract.filter({ id: contractId });
      
      if (!contracts || contracts.length === 0) {
        console.error("Contract not found:", contractId);
        setError("Contract not found");
        setLoading(false); // Ensure loading state is false
        setTimeout(() => navigate(-1), 2000); // Redirect after a short delay
        return;
      }
      
      if (contracts[0]) {
        setContract(contracts[0]);
        
        // Load package data
        if (contracts[0].package_id) {
          const packages = await Package.filter({ id: contracts[0].package_id });
          if (packages[0]) setPackageData(packages[0]);
        }

        // Load event data
        if (contracts[0].event_details?.event_id) { // Use event_details.event_id for consistency
          const events = await Event.filter({ id: contracts[0].event_details.event_id });
          if (events[0]) setEventData(events[0]);
        }

        // Load booking data if linked
        if (contracts[0].booking_id) {
          const bookings = await Booking.filter({ id: contracts[0].booking_id });
          if (bookings[0]) setBookingData(bookings[0]);
        }

        // Parse negotiation terms if they exist
        if (contracts[0].negotiation_session_id) {
          const sessions = await NegotiationSession.filter({ id: contracts[0].negotiation_session_id });
          if (sessions[0]) {
            setNegotiationSession(sessions[0]); // Keep existing negotiationSession state for older uses
            if (sessions[0].revised_terms) {
              setNegotiationTermsData(sessions[0].revised_terms);
            }
          }
        }
        
        // If contract is pending signature, check for existing signing session
        if (contracts[0].status === "pending_signature") {
          checkSigningStatus();
        }
      }
    } catch (error) {
      console.error("Error loading contract:", error);
      setError("Failed to load contract");
    }
    setLoading(false);
  };

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const checkSigningStatus = async () => {
    try {
      // Call backend to check if there's an active signing session
      const response = await fetch(`/api/contracts/${contractId}/signing-status`);
      if (response.ok) {
        const { signing_url, status } = await response.json();
        if (signing_url) {
          setSigningUrl(signing_url);
        }
        
        // If status has changed, refresh contract
        if (status !== contract?.status) {
          loadContract();
        }
      }
    } catch (error) {
      console.error("Error checking signing status:", error);
    }
  };

  const initiateSigningFlow = async () => {
    if (!contract || !user) return;
    
    // If this is a pre-signed contract by enabler, show review modal first
    const isHost = user && contract.host_id === user.id;
    if (contract.auto_signed_by_enabler && isHost) {
      setShowReviewModal(true);
      return;
    }

    // Otherwise, use DocuSign flow
    setIsLoadingSignature(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/initiate-signing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId,
          signer_email: user.email,
          signer_name: user.full_name,
          return_url: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error("Failed to initiate signing");
      }

      const { signing_url, envelope_id } = await response.json();

      await Contract.update(contractId, {
        docusign_envelope_id: envelope_id
      });

      setSigningUrl(signing_url);
      window.open(signing_url, "_blank");

    } catch (error) {
      console.error("Error initiating signing:", error);
      setError("Failed to initiate contract signing. Please try again.");
    } finally {
      setIsLoadingSignature(false);
    }
  };

  const handleAcceptContract = async () => {
    setShowReviewModal(false);
    await signContractAsHost();
  };

  const handleDeclineContract = () => {
    setShowReviewModal(false);
    if (confirm("Are you sure you want to decline this contract? You can review it again later.")) {
      navigate(-1);
    }
  };

  const signContractAsHost = async () => {
    // Confirmation dialog added as per outline
    if (!confirm("By clicking OK, you agree to all terms and conditions in this contract. This action is legally binding. Do you wish to proceed?")) {
      return;
    }

    setIsLoadingSignature(true); // Using existing state for loading
    setError(null);
    try {
      const user = await User.me(); // Fetch current user for notifications, renamed to 'user' as per outline
      const now = new Date().toISOString();
      
      console.log("Signing contract as host...");
      
      // Removed reservationHold and AvailabilityChecker logic as per outline.
      // This simplifies the flow for pre-signed contracts by the enabler.

      // Update contract to active
      await Contract.update(contractId, {
        status: "active",
        confirmed_at: now,
        signatures: {
          ...contract.signatures,
          host_signed: true,
          host_signed_at: now,
          vendor_signed: true, // Auto-signed by enabler when they created it
          vendor_signed_at: contract.signatures?.vendor_signed_at || contract.created_date // Use created_date as per outline for auto-signed contracts
        }
      });
      
      console.log("Contract updated to active");
      
      // Update booking to confirmed (using bookingData state which is fetched from contract.booking_id)
      if (bookingData) { 
        await Booking.update(bookingData.id, {
          status: "confirmed",
          payment_status: "pending" // TODO: Integrate payment capture here
        });
        console.log("Booking updated to confirmed");
      }
      
      // Confirm reservation hold if exists - removed as per outline

      // Send notifications for Enabler
      // Using Enabler entity and its user_id and business_name as per outline
      try {
        const enablers = await Enabler.filter({ id: contract.enabler_id });
        if (enablers[0]) {
          await Notification.create({
            user_id: enablers[0].user_id, // Enabler's User ID
            enabler_id: enablers[0].id, // Enabler Profile ID
            profile_name: enablers[0].business_name, // Changed from full_name to business_name
            type: "booking_confirmed",
            title: "New Booking Confirmed!",
            message: `${user.full_name} has signed the contract for your service`, // Message updated as per outline
            link: createPageUrl("EnablerBookings")
          });
        }
      } catch (notifError) {
        console.warn("Failed to send enabler notification:", notifError);
      }
      

      // Send notification for Host
      await Notification.create({
        user_id: user.id, // Use the fetched 'user' object
        type: "booking_confirmed",
        title: "Booking Confirmed!",
        message: `Your booking is now confirmed! You'll receive payment instructions shortly.`,
        link: createPageUrl("EventDetail") + "?id=" + (eventData?.id || contract.event_details?.event_id)
      });
      
      alert("✅ Contract signed successfully! Your booking is now confirmed."); // Updated alert message as per outline
      
      // Navigate to event detail or my events using bookingData
      if (bookingData && bookingData.event_id) { // Use bookingData.event_id for redirection
        navigate(`${createPageUrl("EventDetail")}?id=${bookingData.event_id}`);
      } else {
        navigate(createPageUrl("MyEvents"));
      }
      
    } catch (error) {
      console.error("Error signing contract:", error);
      setError("Failed to sign contract. Please try again.");
      alert("❌ Failed to sign contract: " + error.message); // Added specific alert as per outline
    } finally {
      setIsLoadingSignature(false);
    }
  };

  const resendSigningEmail = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/resend-email`, {
        method: "POST"
      });

      if (response.ok) {
        alert("Signing reminder sent!");
      }
    } catch (error) {
      console.error("Error resending email:", error);
      alert("Failed to send reminder");
    }
  };

  const downloadContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${contractId}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error("Error downloading contract:", error);
      alert("Failed to download contract");
    }
  };

  const getStatusInfo = (status) => {
    const configs = {
      draft: {
        icon: <Edit className="w-5 h-5" />,
        color: "bg-gray-100 text-gray-800",
        label: "Draft"
      },
      pending_signature: {
        icon: <Clock className="w-5 h-5" />,
        color: "bg-yellow-100 text-yellow-800",
        label: "Pending Signature"
      },
      pending_confirmation: { // New status - kept for potential other flows or history
        icon: <Clock className="w-5 h-5" />,
        color: "bg-blue-100 text-blue-800",
        label: "Pending Confirmation"
      },
      active: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "bg-green-100 text-green-800",
        label: "Active"
      },
      completed: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: "bg-blue-100 text-blue-800",
        label: "Completed"
      },
      cancelled: {
        icon: <AlertCircle className="w-5 h-5" />,
        color: "bg-red-100 text-red-800",
        label: "Cancelled"
      },
      disputed: {
        icon: <AlertCircle className="w-5 h-5" />,
        color: "bg-orange-100 text-orange-800",
        label: "Disputed"
      }
    };
    return configs[status] || configs.draft;
  };

  if (!contractId || contractId === "null" || contractId === "undefined" || contractId === "-" || contractId.trim() === "") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invalid contract ID</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Updated loading display as per outline
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Added specific display for when contract is not found, as per outline
  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || "Contract not found"}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(contract.status);
  const isHost = user && contract.host_id === user.id;
  const isVendor = user && contract.enabler_id && user.id === contract.enabler_id;
  const needsMySignature = contract.status === "pending_signature" && (
    (isHost && !contract.signatures?.host_signed) ||
    (isVendor && !contract.signatures?.vendor_signed)
  );

  return (
    <>
      {/* AnimatePresence for modals/overlays */}
      <AnimatePresence>
        {/* Removed BookingCountdown as it's no longer used for this simplified flow */}
      </AnimatePresence>

      {/* Contract Review Modal */}
      <ContractReviewModal
        isOpen={showReviewModal}
        contract={contract}
        packageData={packageData}
        negotiationTerms={negotiationTermsData}
        eventData={eventData}
        onAccept={handleAcceptContract}
        onDecline={handleDeclineContract}
      />

      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="max-w-md mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
              </button>
              <div className="flex gap-2">
                {contract.status === "active" && (
                  <button
                    onClick={downloadContract}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
                  >
                    <Download className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => {/* Share logic */}}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
                >
                  <Share2 className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.color}`}>
                {statusInfo.icon}
                <span className="font-medium text-sm">{statusInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-8">
          {/* Contract Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-medium text-gray-900 tracking-tight mb-2">
              {contract.event_details?.event_name || "Service Agreement"}
            </h1>
            <p className="text-xs text-gray-500 tracking-wide capitalize">
              {contract.contract_type.replace(/_/g, " ")}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="p-4 mb-6 bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </Card>
          )}

          {/* Auto-Signed by Enabler Notice */}
          {contract.auto_signed_by_enabler && (
            <Card className="p-5 mb-6 bg-indigo-50 border-2 border-indigo-200">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-indigo-900 mb-2">✓ Pre-Approved Smart Contract</h3>
                  <p className="text-sm text-indigo-800 mb-3">
                    This contract has been <span className="font-semibold">pre-signed and approved by the enabler</span>. 
                    No further approval needed from their side.
                  </p>
                  <div className="bg-white/70 rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      <strong>What this means:</strong> Once you review and sign, your booking will be instantly processed.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Negotiation Terms Summary (if exists) */}
          {contract.negotiation_terms && (
            <Card className="p-5 mb-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900 mb-2">📋 Agreed Negotiation Terms</h3>
                  <p className="text-xs text-emerald-700 mb-3">
                    These terms were agreed upon through smart negotiation
                  </p>
                </div>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 border border-emerald-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                  {contract.negotiation_terms}
                </pre>
              </div>
            </Card>
          )}

          {/* Signature Required Alert */}
          {needsMySignature && (
            <Card className="p-6 mb-6 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-2">Your Signature Required</h3>
                  
                  {contract.negotiation_terms && (
                    <div className="mb-4 p-3 bg-white/80 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 mb-2 font-medium">
                        ✓ Negotiation terms have been agreed upon
                      </p>
                      <p className="text-xs text-amber-700">
                        Review all terms below before finalizing your booking
                      </p>
                    </div>
                  )}
                  
                  {contract.auto_signed_by_enabler && isHost ? (
                    <>
                      <p className="text-sm text-amber-800 mb-4">
                        This contract has been pre-signed by the enabler. 
                        <span className="font-semibold"> Review all terms and click below to proceed with your booking.</span>
                      </p>
                      
                      <div className="space-y-3">
                        <Button
                          onClick={initiateSigningFlow}
                          disabled={isLoadingSignature}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6"
                        >
                          {isLoadingSignature ? (
                            <>
                              <Clock className="w-5 h-5 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Review Terms & Finalize Booking
                            </>
                          )}
                        </Button>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <p className="text-xs text-emerald-800">
                            <Shield className="w-3 h-3 inline mr-1" />
                            <strong>Instant Confirmation:</strong> Your booking will be instantly confirmed upon signing.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-amber-800 mb-4">
                        This contract is waiting for your digital signature to become active.
                      </p>
                      
                      {signingUrl ? (
                        <Button
                          onClick={() => window.open(signingUrl, "_blank")}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Signing Session
                        </Button>
                      ) : (
                        <Button
                          onClick={initiateSigningFlow}
                          disabled={isLoadingSignature}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {isLoadingSignature ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              Review & Sign Contract
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}

                  {contract.status === "pending_signature" && (
                    <button
                      onClick={resendSigningEmail}
                      className="w-full mt-2 text-xs text-amber-700 hover:text-amber-900 flex items-center justify-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      Resend Signing Email
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Success Message for Confirmed Booking */}
          {contract.status === "active" && contract.signatures?.host_signed && contract.signatures?.vendor_signed && (
            <Card className="p-6 mb-6 bg-emerald-50 border-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-900 mb-2">Booking Confirmed! 🎉</h3>
                  <p className="text-sm text-emerald-800">
                    Both parties have signed. Your booking is now active and confirmed.
                  </p>
                  {contract.negotiation_terms && (
                    <p className="text-xs text-emerald-700 mt-2">
                      All negotiated terms are now in effect.
                    </p>
                  )}
                  {contract.confirmed_at && (
                    <p className="text-xs text-emerald-600 mt-2">
                      Confirmed on {format(new Date(contract.confirmed_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Signature Status */}
          {contract.status === "pending_signature" && (
            <Card className="p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Signature Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      contract.signatures?.host_signed ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      {contract.signatures?.host_signed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.parties?.host?.name || "Host"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {contract.parties?.host?.contact_email}
                      </p>
                    </div>
                  </div>
                  {contract.signatures?.host_signed && contract.signatures?.host_signed_at && (
                    <p className="text-xs text-gray-500">
                      {format(new Date(contract.signatures.host_signed_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      contract.signatures?.vendor_signed ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      {contract.signatures?.vendor_signed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.parties?.vendor?.name || "Vendor"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {contract.parties?.vendor?.contact_email}
                      </p>
                    </div>
                  </div>
                  {contract.signatures?.vendor_signed && contract.signatures?.vendor_signed_at && (
                    <p className="text-xs text-gray-500">
                      {format(new Date(contract.signatures.vendor_signed_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="p-6 bg-emerald-50/30 border-emerald-500 mb-6">
            <h3 className="font-medium text-gray-900 mb-4 text-sm tracking-tight">QUICK SUMMARY</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Value</span>
                <span className="font-medium">
                  {contract.pricing?.currency} {contract.pricing?.total_payment?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deposit</span>
                <span className="font-medium">
                  {contract.pricing?.deposit_percentage}% ({contract.pricing?.currency} {contract.pricing?.deposit_amount?.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium capitalize">{contract.status.replace(/_/g, " ")}</span>
              </div>
              {contract.event_details?.start_datetime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Event Date</span>
                  <span className="font-medium">
                    {format(new Date(contract.event_details.start_datetime), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Full Contract Details */}
          <Card className="p-5 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 tracking-wide">FULL CONTRACT</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullContract(!showFullContract)}
                className="text-xs"
              >
                {showFullContract ? "Hide" : "Show"}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFullContract ? "rotate-180" : ""}`} />
              </Button>
            </div>

            <AnimatePresence>
              {showFullContract && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                    {contract.negotiation_terms && (
                      <>
                        <div className="mb-4 pb-4 border-b-2 border-emerald-200">
                          <p className="text-xs font-bold text-emerald-700 mb-2">NEGOTIATED TERMS</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                            {contract.negotiation_terms}
                          </pre>
                        </div>
                      </>
                    )}
                    
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {contract.human_readable_summary || "Contract details not available"}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>


          {/* Full Contract Details (old section, now wrapped by toggle) */}
          {showFullContract && (
            <div className="space-y-6 mt-6">
            <Section title="PRICING TERMS">
              <Detail label="Payment Schedule" value={contract.pricing?.payment_schedule?.replace(/_/g, " ")} />
              <Detail label="Currency" value={contract.pricing?.currency} />
            </Section>

            <Section title="CANCELLATION POLICY">
              {contract.cancellation_policy?.host_cancellation_windows?.map((window, idx) => (
                <Detail 
                  key={idx} 
                  label={`${window.days_before}+ days before`} 
                  value={`${window.refund_percentage}% refund`} 
                />
              ))}
              <Detail 
                label="Force Majeure" 
                value={contract.cancellation_policy?.force_majeure_clause ? "Included" : "Not included"} 
              />
            </Section>

            {contract.rescheduling_policy?.allowed && (
              <Section title="RESCHEDULING POLICY">
                <Detail label="Notice Period" value={`${contract.rescheduling_policy?.notice_period_days} days`} />
                <Detail label="Fee" value={`${contract.pricing?.currency} ${contract.rescheduling_policy?.fee || 0}`} />
                <Detail label="Maximum Reschedules" value={contract.rescheduling_policy?.max_reschedules} />
              </Section>
            )}

            {contract.insurance_requirements?.required && (
              <Section title="INSURANCE REQUIREMENTS">
                <Detail label="Minimum Coverage" value={`${contract.pricing?.currency} ${contract.insurance_requirements?.minimum_coverage?.toLocaleString()}`} />
                <Detail label="Verification" value={contract.insurance_requirements?.verification_method?.replace(/_/g, " ")} />
              </Section>
            )}

            <Section title="INTELLECTUAL PROPERTY">
              <Detail label="Photo Rights" value={contract.intellectual_property?.photo_rights} />
              <Detail label="Video Rights" value={contract.intellectual_property?.video_rights} />
            </Section>

            <Section title="DISPUTE RESOLUTION">
              <Detail label="Method" value={contract.dispute_resolution?.method} />
              {contract.dispute_resolution?.jurisdiction && (
                <Detail label="Jurisdiction" value={contract.dispute_resolution.jurisdiction} />
              )}
            </Section>

            {contract.blockchain_config?.chain !== "off_chain" && (
              <Section title="BLOCKCHAIN CONFIGURATION">
                <Detail label="Network" value={contract.blockchain_config?.chain} />
                <Detail label="Escrow" value={contract.blockchain_config?.use_escrow ? "Enabled" : "Disabled"} />
                <Detail label="Multi-Signature" value={contract.blockchain_config?.use_multisig ? "Required" : "Not required"} />
              </Section>
            )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-3">
            {contract.status === "draft" && (
              <Button
                onClick={() => navigate(`${createPageUrl("CreateContract")}?edit=${contract.id}`)}
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Edit className="w-4 h-4 mr-2" strokeWidth={1.5} />
                EDIT CONTRACT
              </Button>
            )}

            {contract.status === "active" && (
              <Button
                onClick={downloadContract}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Signed Contract
              </Button>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="mt-8 border border-gray-200 p-4 text-xs text-gray-600 italic">
            ⚖️ This document is generated for convenience. Both parties should review carefully and consult legal counsel before signing.
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <Card className="p-5">
      <h4 className="text-xs text-gray-400 tracking-wide mb-4">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </Card>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900 capitalize">{value}</span>
    </div>
  );
}

function ContractReviewModal({ isOpen, contract, packageData, negotiationTerms, eventData, onAccept, onDecline }) {
  if (!isOpen || !contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Review Contract & Confirm Booking</DialogTitle>
          <DialogDescription>
            Please review the details below before accepting the contract.
            This booking will be confirmed instantly upon your acceptance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Section title="CONTRACT SUMMARY">
            <Detail label="Contract Type" value={contract.contract_type?.replace(/_/g, " ")} />
            <Detail label="Event Name" value={contract.event_details?.event_name} />
            {eventData?.start_datetime && <Detail label="Event Date" value={format(new Date(eventData.start_datetime), "MMM d, yyyy")} />}
          </Section>

          {packageData && (
            <Section title="PACKAGE DETAILS">
              <Detail label="Package Name" value={packageData.name} />
              <Detail label="Description" value={packageData.description} />
              <Detail label="Price" value={`${packageData.currency} ${packageData.price?.toLocaleString()}`} />
            </Section>
          )}

          {negotiationTerms && (
            <Section title="NEGOTIATED TERMS">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {negotiationTerms}
              </pre>
            </Section>
          )}

          <Section title="PRICING OVERVIEW">
            <Detail label="Total Value" value={`${contract.pricing?.currency} ${contract.pricing?.total_payment?.toLocaleString()}`} />
            <Detail label="Deposit" value={`${contract.pricing?.deposit_percentage}% (${contract.pricing?.currency} ${contract.pricing?.deposit_amount?.toLocaleString()})`} />
          </Section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={onAccept}>
            Accept & Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

