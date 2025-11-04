import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, Enabler, Event, User, Booking, Contract } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";
import BookingConfirmationHandler from "../components/BookingConfirmationHandler";

export default function BookingFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const enablerId = searchParams.get("enabler_id");
  const packageId = searchParams.get("package_id");
  const eventId = searchParams.get("event_id");
  const autoConfirm = searchParams.get("auto_confirm") === "true"; // NEW: Auto-confirm flag
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enabler, setEnabler] = useState(null);
  const [processingStage, setProcessingStage] = useState("initializing"); // NEW: Track processing stage

  useEffect(() => {
    const invalidIds = [];
    
    const isValidId = (id) => id && id !== "null" && id !== "undefined" && id !== "-" && id.trim() !== "";

    if (!isValidId(enablerId) || enablerId === "0") {
      console.error("Invalid enabler ID in BookingFlow:", enablerId);
      setError("Invalid enabler profile ID provided");
      setIsLoading(false);
      setTimeout(() => navigate(-1, { replace: true }), 2000);
      return;
    }

    if (!isValidId(packageId)) {
      invalidIds.push("package");
    }
    
    if (!isValidId(eventId)) {
      invalidIds.push("event");
    }
    
    if (invalidIds.length > 0) {
      console.error("Invalid IDs in BookingFlow:", invalidIds.join(", "));
      setError(`Missing or invalid ${invalidIds.join(", ")} ID(s)`);
      setTimeout(() => navigate(-1, { replace: true }), 2000);
      return;
    }
    
    processBookingFlow();
  }, [enablerId, packageId, eventId, navigate, autoConfirm]);

  const processBookingFlow = async () => {
    try {
      console.log("BookingFlow starting...", { enablerId, packageId, eventId, autoConfirm });
      
      setProcessingStage("loading_data");
      
      // Load required data
      const user = await User.me();
      console.log("User loaded:", user.id);
      
      // Fetch enabler data
      const enablerData = await Enabler.filter({ id: enablerId });
      if (!enablerData[0]) {
        setError("Enabler not found");
        setIsLoading(false);
        setEnabler(null);
        return;
      }
      setEnabler(enablerData[0]);
      console.log("Enabler loaded:", enablerData[0]?.business_name);

      const pkgData = await Package.filter({ id: packageId });
      console.log("Package loaded:", pkgData[0]?.name);
      
      if (!pkgData[0]) {
        setError("Package not found");
        setIsLoading(false);
        return;
      }
      
      const pkg = pkgData[0];

      setProcessingStage("creating_booking");

      // Create booking
      console.log("Creating booking...");
      const booking = await Booking.create({
        event_id: eventId,
        enabler_id: enablerId,
        package_id: packageId,
        status: "pending",
        total_amount: pkg.price,
        payment_status: "pending"
      });
      console.log("✅ Booking created:", booking.id);

      // NEW: Auto-confirm if flag is set (for testing or direct bookings)
      if (autoConfirm) {
        setProcessingStage("confirming_booking");
        console.log("🚀 Auto-confirming booking and triggering ABE...");
        
        try {
          const confirmResult = await BookingConfirmationHandler.confirmBooking(booking.id);
          console.log("✅ Booking confirmed & ABE executed:", confirmResult);
          
          setProcessingStage("abe_complete");
          
          // Show success message briefly
          setTimeout(() => {
            navigate(`${createPageUrl("EventDetail")}?id=${eventId}`, { replace: true });
          }, 2000);
          
          return;
        } catch (abeError) {
          console.error("❌ ABE execution failed:", abeError);
          setError("Booking created but workflow setup failed. Our team has been notified.");
          setIsLoading(false);
          return;
        }
      }

      // Route based on package configuration
      setProcessingStage("routing");
      console.log("Checking package config...", {
        hasContract: !!pkg.linked_contract_id,
        hasNegotiation: pkg.negotiation_framework_ids?.length > 0
      });
      
      // Check if package has smart contract
      if (pkg.linked_contract_id) {
        console.log("Redirecting to contract...");
        navigate(`${createPageUrl("ContractDetail")}?contract_id=${pkg.linked_contract_id}&booking_id=${booking.id}`);
        return;
      }

      // Check if package has negotiation frameworks
      if (pkg.negotiation_framework_ids && pkg.negotiation_framework_ids.length > 0) {
        console.log("Redirecting to negotiation...");
        if (pkg.negotiation_framework_ids.length === 1) {
          navigate(`${createPageUrl("StructuredNegotiate")}?framework_id=${pkg.negotiation_framework_ids[0]}&package_id=${packageId}&event_id=${eventId}&booking_id=${booking.id}`);
        } else {
          navigate(`${createPageUrl("SelectNegotiationFramework")}?package_id=${packageId}&event_id=${eventId}&booking_id=${booking.id}`);
        }
        return;
      }

      // Standard booking path - redirect to payment/confirmation
      console.log("Redirecting to event detail...");
      navigate(`${createPageUrl("EventDetail")}?id=${eventId}`);

    } catch (error) {
      console.error("Error in booking flow:", error);
      setError("Something went wrong: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render different states based on processing stage
  const renderProcessingState = () => {
    const stages = {
      initializing: { icon: Loader2, text: "Initializing...", color: "text-gray-500" },
      loading_data: { icon: Loader2, text: "Loading booking details...", color: "text-blue-500" },
      creating_booking: { icon: Loader2, text: "Creating your booking...", color: "text-emerald-500" },
      confirming_booking: { icon: Loader2, text: "Confirming booking...", color: "text-purple-500" },
      abe_complete: { icon: CheckCircle2, text: "Booking confirmed! Setting up your workflow...", color: "text-emerald-500" },
      routing: { icon: Loader2, text: "Preparing next steps...", color: "text-cyan-500" }
    };

    const stage = stages[processingStage] || stages.initializing;
    const Icon = stage.icon;

    return (
      <div className="text-center">
        <BlinkLogo size="md" className="mx-auto mb-4 animate-breath" />
        <Icon className={`w-8 h-8 mx-auto mb-2 ${stage.color} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
        <p className="text-gray-600">{stage.text}</p>
        
        {processingStage === "abe_complete" && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs text-emerald-700">
              ✨ Smart contract generated<br/>
              🔒 Payment secured<br/>
              📋 Checklists created<br/>
              📧 Notifications sent
            </p>
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate(-1)} className="w-full">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {renderProcessingState()}
      </div>
    );
  }
  
  if (!enabler) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Enabler profile could not be loaded or found.</p>
          <Button onClick={() => navigate(-1, { replace: true })}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <BlinkLogo size="md" className="animate-breath" />
    </div>
  );
}