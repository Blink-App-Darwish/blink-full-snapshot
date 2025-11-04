
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { StructuredNegotiation, NegotiationFramework, Enabler, Event, User, Package, Booking, Contract, Notification } from "@/api/entities"; // Added Booking, Contract, Notification
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, DollarSign, Calendar, Package as PackageIcon, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BlinkLogo from "../components/BlinkLogo";
import { InvokeLLM } from "@/api/integrations";
import { format } from "date-fns";

export default function StructuredNegotiate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const enablerId = searchParams.get("enabler_id");
  const eventId = searchParams.get("event_id");
  const packageId = searchParams.get("package_id"); // Added from outline
  const frameworkId = searchParams.get("framework_id"); // Added from outline
  
  const [enabler, setEnabler] = useState(null);
  const [event, setEvent] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [packages, setPackages] = useState([]);
  const [negotiation, setNegotiation] = useState(null);
  const [offer, setOffer] = useState({
    price: "",
    date: "",
    guest_count: "",
    package_items: [],
    add_ons: [],
    payment_plan: "full_upfront"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Consolidated data loading function
  const loadData = useCallback(async (shouldLoadEvent = true) => {
    // Always load enabler-related data
    const enablerData = await Enabler.filter({ id: enablerId });
    if (enablerData[0]) {
      setEnabler(enablerData[0]);

      const frameworksData = await NegotiationFramework.filter({
        enabler_id: enablerId,
        status: "active"
      });
      setFrameworks(frameworksData);

      const packagesData = await Package.filter({ enabler_id: enablerId });
      setPackages(packagesData);

      // Pre-select framework if provided in URL
      if (frameworkId) {
        const preSelectedFramework = frameworksData.find(f => f.id === frameworkId);
        if (preSelectedFramework) {
          setSelectedFramework(preSelectedFramework);
        }
      }

      // Pre-select package if provided in URL
      if (packageId) {
        const preSelectedPackage = packagesData.find(p => p.id === packageId);
        if (preSelectedPackage) {
          setOffer(prev => ({
            ...prev,
            package_items: [preSelectedPackage.id] // Assuming single package selection for now
          }));
        }
      }
    } else {
      // If enabler data isn't found, there's a problem, navigate back.
      console.error("Enabler not found for ID:", enablerId);
      navigate(-1, { replace: true });
      return;
    }

    // Load event-specific data only if requested and eventId is valid
    const isEventIdValid = eventId && eventId !== "null" && eventId !== "undefined" && eventId.trim() !== "" && eventId !== "-";
    if (shouldLoadEvent && isEventIdValid) {
      const eventData = await Event.filter({ id: eventId });
      if (eventData[0]) {
        setEvent(eventData[0]);
        setOffer(prev => ({
          ...prev,
          date: eventData[0].date,
          guest_count: eventData[0].guest_count?.toString() || ""
        }));
      }

      // Check if negotiation already exists
      const existingNeg = await StructuredNegotiation.filter({
        event_id: eventId,
        enabler_id: enablerId
      });
      if (existingNeg[0]) {
        setNegotiation(existingNeg[0]);
      }
    }
  }, [enablerId, eventId, packageId, frameworkId, navigate]);

  useEffect(() => {
    // Validate required IDs
    const isEnablerIdValid = enablerId && enablerId !== "null" && enablerId !== "undefined" && enablerId.trim() !== "" && enablerId !== "-";

    if (!isEnablerIdValid) {
      console.error("Invalid enabler ID in StructuredNegotiate:", enablerId);
      navigate(-1, { replace: true });
      return;
    }

    const isEventIdProvidedAndValid = eventId && eventId !== "null" && eventId !== "undefined" && eventId.trim() !== "" && eventId !== "-";

    if (isEventIdProvidedAndValid) {
      loadData(true); // Load all data including event
    } else {
      console.warn("Event ID is invalid or missing, loading enabler data only.");
      loadData(false); // Load only enabler-related data
    }

  }, [enablerId, eventId, packageId, frameworkId, navigate, loadData]); // Added dependencies

  const getAISuggestion = async () => {
    if (!selectedFramework || !offer.price) return;

    setIsProcessing(true);
    try {
      const suggestion = await InvokeLLM({
        prompt: `Analyze this negotiation scenario and provide strategic advice:
        
        HOST OFFER:
        - Price: $${offer.price}
        - Date: ${offer.date}
        - Guest Count: ${offer.guest_count}
        
        ENABLER FRAMEWORK:
        - Base Price: $${enabler.base_price || 'Not set'}
        - Max Discount: ${selectedFramework.price_flexibility?.max_discount_percentage || 0}%
        - Auto-negotiate: ${selectedFramework.auto_negotiate ? 'Yes' : 'No'}
        
        Provide:
        1. Is this offer within acceptable range?
        2. Counter-offer recommendation (if needed)
        3. Alternative suggestions
        4. Probability of acceptance`,
        response_json_schema: {
          type: "object",
          properties: {
            acceptable: { type: "boolean" },
            reason: { type: "string" },
            counter_price: { type: "number" },
            suggestions: { type: "array", items: { type: "string" } },
            acceptance_probability: { type: "number" }
          }
        }
      });

      setAiSuggestion(suggestion);
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
    }
    setIsProcessing(false);
  };

  const handleSubmitOffer = async () => {
    if (!offer.price || !selectedFramework) {
      alert("Please select a framework and enter an offer price");
      return;
    }

    setIsProcessing(true);
    try {
      const user = await User.me();

      // Create structured negotiation
      const negData = {
        event_id: eventId,
        enabler_id: enablerId,
        host_id: user.id,
        framework_id: selectedFramework.id,
        negotiation_type: selectedFramework.framework_type,
        status: "host_offer",
        current_offer: {
          price: parseFloat(offer.price),
          date: offer.date,
          guest_count: parseInt(offer.guest_count) || 0,
          package_items: offer.package_items,
          add_ons: offer.add_ons,
          payment_plan: offer.payment_plan
        },
        negotiation_history: [{
          timestamp: new Date().toISOString(),
          actor: "host",
          action: "initial_offer",
          offer_details: offer
        }]
      };

      // If auto-negotiate is enabled, process immediately
      if (selectedFramework.auto_negotiate) {
        const response = await autoNegotiate(negData, selectedFramework);
        negData.status = response.status;
        negData.counter_offer = response.counter_offer;
        negData.auto_negotiated = true;
        
        // If agreed, create booking automatically
        if (response.status === "agreed") {
          negData.agreed_terms = {
            final_price: parseFloat(offer.price),
            final_date: offer.date,
            final_package: offer.package_items,
            payment_plan: offer.payment_plan,
            additional_terms: []
          };
        }
      }

      const createdNegotiation = await StructuredNegotiation.create(negData);

      // If agreement reached, create booking automatically
      if (createdNegotiation.status === "agreed") {
        await createBookingFromNegotiation(createdNegotiation);
      }

      alert(selectedFramework.auto_negotiate 
        ? "Offer processed automatically! Check results below." 
        : "Offer submitted! Enabler will respond within " + selectedFramework.response_time_commitment.replace(/_/g, ' '));
      
      // Reload data to show updated negotiation status
      const isEventIdProvidedAndValid = eventId && eventId !== "null" && eventId !== "undefined" && eventId.trim() !== "" && eventId !== "-";
      loadData(isEventIdProvidedAndValid); 
    } catch (error) {
      console.error("Error submitting offer:", error);
      alert("Failed to submit offer");
    }
    setIsProcessing(false);
  };

  const createBookingFromNegotiation = async (negotiation) => {
    try {
      // Dynamic imports to avoid circular dependencies and ensure they are loaded when needed.
      // Removed dynamic imports as they are now at the top of the file.
      
      // Find the package. The outline assumes the first package item is the primary one.
      const packageIdToBook = negotiation.current_offer.package_items[0]; 
      const pkgs = await Package.filter({ id: packageIdToBook });
      const pkg = pkgs[0];
      
      if (!pkg) {
        console.error("Package not found for ID:", packageIdToBook);
        alert("Failed to find package for booking. Please contact support.");
        return;
      }

      // Use agreed terms if available, otherwise current offer
      const finalPrice = negotiation.agreed_terms?.final_price || negotiation.current_offer.price;
      const finalPaymentPlan = negotiation.agreed_terms?.payment_plan || negotiation.current_offer.payment_plan;

      // Create booking
      const booking = await Booking.create({
        event_id: negotiation.event_id,
        enabler_id: negotiation.enabler_id,
        package_id: packageIdToBook,
        total_amount: finalPrice,
        status: "pending", // Will become "confirmed" after contract signing or immediately if no contract
        payment_status: "pending",
        payment_plan: finalPaymentPlan
      });

      let contractLink = null; // To store contract link for notification
      let notificationMessage = `Your offer with ${enabler.business_name} was accepted.`;
      let bookingStatusUpdate = "confirmed"; // Default status if no contract

      // Check if package has linked contract
      if (pkg.linked_contract_id) {
        const contracts = await Contract.filter({ id: pkg.linked_contract_id });
        const contract = contracts[0];
        
        if (contract && contract.auto_signed_by_enabler) {
          // Contract is pre-signed by enabler, just needs host signature
          // Update contract with host/event details and mark as pending host signature
          await Contract.update(contract.id, {
            host_id: negotiation.host_id,
            event_id: negotiation.event_id,
            pricing: {
              ...(contract.pricing || {}), // Ensure pricing object exists before spreading
              total_payment: finalPrice
            },
            status: "pending_signature",
            negotiation_details: {
              framework_id: negotiation.framework_id,
              negotiation_type: negotiation.negotiation_type,
              agreed_terms: negotiation.agreed_terms
            }
          });

          contractLink = createPageUrl("ContractDetail") + "?id=" + contract.id;
          notificationMessage = `Agreement reached! Please review and electronically sign the contract to finalize your booking with ${enabler.business_name}.`;
          bookingStatusUpdate = "pending_contract_signature";

          // Create notification for host to sign contract
          await Notification.create({
            user_id: negotiation.host_id,
            enabler_id: negotiation.enabler_id,
            type: "contract_pending_host_signature",
            title: "Action Required: Sign Your Contract",
            message: notificationMessage,
            link: contractLink
          });
        }
      }

      // Update booking status based on contract requirements
      await Booking.update(booking.id, { status: bookingStatusUpdate });

      // Create main notification for host about agreement
      await Notification.create({
        user_id: negotiation.host_id,
        enabler_id: negotiation.enabler_id,
        type: "negotiation_agreement_reached",
        title: "Agreement Reached!",
        message: notificationMessage,
        link: contractLink || createPageUrl("EventDetail") + "?id=" + negotiation.event_id
      });

    } catch (error) {
      console.error("Error creating booking from negotiation:", error);
      alert("An error occurred while finalizing your booking. Please contact support.");
    }
  };

  const autoNegotiate = async (negotiation, framework) => {
    const offeredPrice = negotiation.current_offer.price;
    const basePrice = enabler.base_price || 0;
    const maxDiscount = framework.price_flexibility?.max_discount_percentage || 0;
    const minAcceptable = basePrice * (1 - maxDiscount / 100);

    if (offeredPrice >= basePrice) {
      // Accept immediately
      return {
        status: "agreed",
        counter_offer: null
      };
    } else if (offeredPrice >= minAcceptable) {
      // Within acceptable range
      return {
        status: "agreed",
        counter_offer: null
      };
    } else {
      // Counter offer with minimum acceptable
      return {
        status: "enabler_counter",
        counter_offer: {
          price: minAcceptable,
          alternative_dates: [],
          conditions: [`Price is below minimum acceptable. Counter-offer: $${minAcceptable.toFixed(2)}`]
        }
      };
    }
  };

  if (!enabler || (eventId && !event)) { // Adjusted condition to allow enabler only view if no eventId or invalid eventId
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Smart Negotiation</h1>
            <p className="text-xs text-gray-500">No messaging needed</p>
          </div>
          <BlinkLogo size="sm" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-20 pb-8 space-y-6">
        {/* Enabler Card */}
        <Card className="p-6 bg-white border-2 border-emerald-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold">
              {enabler.business_name[0]}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">{enabler.business_name}</h3>
              <p className="text-sm text-gray-600 capitalize">{enabler.category.replace(/_/g, ' ')}</p>
              {enabler.base_price && (
                <p className="text-sm text-emerald-600 font-semibold mt-2">
                  Base Price: ${enabler.base_price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Framework Selection */}
        {frameworks.length > 0 && (
          <Card className="p-6">
            <Label className="text-sm font-bold mb-3 block">Select Negotiation Framework</Label>
            <div className="space-y-2">
              {frameworks.map((framework) => (
                <button
                  key={framework.id}
                  onClick={() => setSelectedFramework(framework)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedFramework?.id === framework.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{framework.framework_name}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">
                        {framework.framework_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {framework.auto_negotiate && (
                      <Badge className="bg-emerald-500 text-white text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {framework.price_flexibility?.allow_discount && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Up to {framework.price_flexibility.max_discount_percentage}% off
                      </span>
                    )}
                    {framework.quick_accept_bonus?.enabled && (
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {framework.quick_accept_bonus.hours_window}h bonus
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {selectedFramework && (
          <>
            {/* Offer Form */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Your Offer</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Offer Price ($)</Label>
                  <Input
                    type="number"
                    value={offer.price}
                    onChange={(e) => setOffer({...offer, price: e.target.value})}
                    placeholder="Enter your offer"
                    className="mt-2"
                  />
                  {enabler.base_price && offer.price && (
                    <p className={`text-xs mt-2 ${
                      parseFloat(offer.price) < enabler.base_price 
                        ? 'text-amber-600' 
                        : 'text-emerald-600'
                    }`}>
                      {parseFloat(offer.price) < enabler.base_price 
                        ? `${((1 - parseFloat(offer.price) / enabler.base_price) * 100).toFixed(1)}% below base price`
                        : 'Within acceptable range'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    value={offer.date}
                    onChange={(e) => setOffer({...offer, date: e.target.value})}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Guest Count</Label>
                  <Input
                    type="number"
                    value={offer.guest_count}
                    onChange={(e) => setOffer({...offer, guest_count: e.target.value})}
                    className="mt-2"
                  />
                </div>

                {selectedFramework.payment_terms_options?.length > 0 && (
                  <div>
                    <Label>Payment Plan</Label>
                    <Select
                      value={offer.payment_plan}
                      onValueChange={(value) => setOffer({...offer, payment_plan: value})}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFramework.payment_terms_options.map(option => (
                          <SelectItem key={option} value={option}>
                            {option.replace(/_/g, ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {packages.length > 0 && (
                  <div>
                    <Label>Select Package (Optional)</Label>
                    <div className="space-y-2 mt-2">
                      {packages.map((pkg) => (
                        <label key={pkg.id} className="flex items-start gap-2 p-3 border rounded-lg hover:border-emerald-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={offer.package_items.includes(pkg.id)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...offer.package_items, pkg.id]
                                : offer.package_items.filter(id => id !== pkg.id);
                              setOffer({...offer, package_items: updated});
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{pkg.name}</p>
                            <p className="text-xs text-gray-600">${pkg.price}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={getAISuggestion}
                  disabled={!offer.price || isProcessing}
                  variant="outline"
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Advice
                </Button>
                <Button
                  onClick={handleSubmitOffer}
                  disabled={!offer.price || isProcessing}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : "Submit Offer"}
                </Button>
              </div>
            </Card>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <div>
                    <h4 className="font-bold text-gray-900">AI Analysis</h4>
                    <p className="text-sm text-gray-700 mt-2">{aiSuggestion.reason}</p>
                  </div>
                </div>

                {!aiSuggestion.acceptable && aiSuggestion.counter_price && (
                  <div className="p-4 bg-white rounded-lg mt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Recommended Counter: ${aiSuggestion.counter_price.toFixed(2)}
                    </p>
                    <Button
                      onClick={() => setOffer({...offer, price: aiSuggestion.counter_price.toString()})}
                      size="sm"
                      variant="outline"
                    >
                      Use This Price
                    </Button>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Suggestions:</p>
                  <ul className="space-y-1">
                    {aiSuggestion.suggestions?.map((suggestion, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                {aiSuggestion.acceptance_probability && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Acceptance Probability:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${aiSuggestion.acceptance_probability}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {aiSuggestion.acceptance_probability}%
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Quick Accept Bonus */}
            {selectedFramework.quick_accept_bonus?.enabled && (
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Quick Accept Bonus!</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Accept within {selectedFramework.quick_accept_bonus.hours_window} hours and get an additional{' '}
                      <span className="font-bold text-amber-600">
                        {selectedFramework.quick_accept_bonus.discount_percentage}% off
                      </span>
                    </p>
                  </div>
                </div >
              </Card>
            )}
          </>
        )}

        {negotiation && (
          <Card className="p-6 border-2 border-emerald-200">
            <h4 className="font-bold text-gray-900 mb-4">Negotiation Status</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className={
                  negotiation.status === 'agreed' ? 'bg-emerald-500' :
                  negotiation.status === 'declined' ? 'bg-red-500' :
                  'bg-amber-500'
                }>
                  {negotiation.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              {negotiation.auto_negotiated && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-negotiated by AI</span>
                </div>
              )}
              {negotiation.status === 'agreed' && negotiation.agreed_terms && (
                <div className="p-4 bg-emerald-50 rounded-lg mt-4">
                  <p className="font-semibold text-emerald-900 mb-2">Agreement Reached!</p>
                  <p className="text-sm text-emerald-800">
                    Final Price: ${negotiation.agreed_terms.final_price}
                  </p>
                </div>
              )}
              {negotiation.status === 'enabler_counter' && negotiation.counter_offer && (
                <div className="p-4 bg-blue-50 rounded-lg mt-4">
                  <p className="font-semibold text-blue-900 mb-2">Counter Offer Received</p>
                  <p className="text-sm text-blue-800">
                    Counter Price: ${negotiation.counter_offer.price}
                  </p>
                  {negotiation.counter_offer.conditions && (
                    <ul className="mt-2 space-y-1">
                      {negotiation.counter_offer.conditions.map((condition, idx) => (
                        <li key={idx} className="text-xs text-blue-700">• {condition}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
