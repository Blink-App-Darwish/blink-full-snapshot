
import React, { useState, useEffect } from "react";
import { Package, Contract, NegotiationSession, User } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; // Although not used in final code, keep as per original
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Sparkles,
  DollarSign, 
  Clock, 
  List, 
  FileText, 
  CheckCircle2,
  X,
  ArrowRight,
  Edit3,
  Shield,
  ArrowLeft // New import
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HostPackageNegotiation({ 
  packageId, 
  eventId,
  onAccept, 
  onClose 
}) {
  const [pkg, setPackage] = useState(null);
  const [contract, setContract] = useState(null);
  const [user, setUser] = useState(null);
  const [negotiationSettings, setNegotiationSettings] = useState(null);
  const [revisedTerms, setRevisedTerms] = useState({
    price: null,
    duration: null,
    inclusions: [],
    custom_terms: {}
  });
  const [showContract, setShowContract] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false); // New state for final review
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [packageId]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const pkgData = await Package.filter({ id: packageId });
      if (pkgData[0]) {
        setPackage(pkgData[0]);
        setNegotiationSettings(pkgData[0].negotiation_settings);
        
        // Initialize revised terms with original values
        setRevisedTerms({
          price: pkgData[0].price,
          duration: null,
          inclusions: [],
          custom_terms: {}
        });

        // Load linked contract
        if (pkgData[0].linked_contract_id) {
          const contractData = await Contract.filter({ id: pkgData[0].linked_contract_id });
          if (contractData[0]) {
            setContract(contractData[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const hasChanges = () => {
    if (!pkg) return false;
    return (
      revisedTerms.price !== pkg.price ||
      revisedTerms.duration !== null || // If a duration was selected, it's a change
      revisedTerms.inclusions.length > 0 ||
      Object.keys(revisedTerms.custom_terms).length > 0
    );
  };

  const generateNegotiationSummary = () => {
    if (!pkg) return "";
    
    const currency = pkg.currency || "$";
    let summary = "=== AGREED NEGOTIATION TERMS ===\n\n";
    
    summary += `Package: ${pkg.name}\n`;
    summary += `Original Price: ${currency}${pkg.price}\n`;
    
    const finalPrice = revisedTerms.price !== null ? revisedTerms.price : pkg.price;

    if (finalPrice !== pkg.price) {
      summary += `\n✓ NEGOTIATED PRICE: ${currency}${finalPrice}\n`;
      const discount = ((pkg.price - finalPrice) / pkg.price * 100).toFixed(1);
      summary += `  (${discount}% discount applied)\n`;
    } else {
      summary += `\nAgreed Price: ${currency}${finalPrice}\n`;
    }
    
    if (pkg.max_guests) {
      summary += `\nGuest Count: Up to ${pkg.max_guests} guests\n`;
    }
    
    if (revisedTerms.duration) {
      summary += `\n✓ SELECTED DURATION: ${revisedTerms.duration}\n`;
    }
    
    if (revisedTerms.inclusions.length > 0) {
      summary += `\n✓ ADDITIONAL ADD-ONS:\n`;
      revisedTerms.inclusions.forEach(inc => {
        summary += `  • ${inc}\n`;
      });
    }
    
    if (Object.keys(revisedTerms.custom_terms).length > 0) {
      summary += `\n✓ CUSTOM TERMS SELECTED:\n`;
      Object.entries(revisedTerms.custom_terms).forEach(([key, value]) => {
        summary += `  • ${key}: ${value}\n`;
      });
    }
    
    summary += `\n--- WHAT'S INCLUDED ---\n`;
    if (pkg.features && pkg.features.length > 0) {
      pkg.features.filter(f => f.included).forEach(feature => {
        summary += `✓ ${feature.text}\n`;
      });
    }
    
    if (pkg.description) {
      summary += `\n--- PACKAGE DESCRIPTION ---\n${pkg.description}\n`;
    }
    
    summary += `\n--- PAYMENT TERMS ---\n`;
    summary += `Total Amount: ${currency}${finalPrice}\n`;
    summary += `Payment Status: Pending\n`;
    summary += `(Payment instructions will be provided after contract signing)\n`;
    
    summary += `\n--- AGREEMENT ---\n`;
    summary += `By signing this agreement, you confirm that you have reviewed and accept these negotiated terms.\n`;
    summary += `This contract is legally binding between you and ${contract?.parties?.vendor?.name || 'the service provider'}.\n`;
    
    return summary;
  };

  const handleReviewBeforeSigning = () => {
    setShowFinalReview(true);
  };

  const handleAcceptAndProceed = async () => {
    if (!user || !pkg || !contract) return;
    
    setIsSaving(true);
    try {
      const negotiationSummary = generateNegotiationSummary();
      const finalPrice = revisedTerms.price !== null ? revisedTerms.price : pkg.price;
      
      // Create negotiation session
      const session = await NegotiationSession.create({
        package_id: packageId,
        enabler_id: pkg.enabler_id,
        host_id: user.id,
        event_id: eventId,
        contract_id: contract.id,
        status: "accepted", // Host has accepted these terms
        original_terms: {
          price: pkg.price,
          duration: null, // Original package might not have a duration field
          inclusions: pkg.includes || [],
          custom_terms: {}
        },
        revised_terms: hasChanges() ? revisedTerms : null,
        revision_history: [{
          timestamp: new Date().toISOString(),
          actor: "host",
          changes: revisedTerms,
          message: "Host submitted negotiation terms"
        }],
        host_signed_at: new Date().toISOString(),
        enabler_signed_at: new Date().toISOString(), // Auto-signed by enabler
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });

      // Update contract with negotiation details
      const updatedContractSummary = (contract.human_readable_summary || "") + "\n\n" + negotiationSummary;
      
      await Contract.update(contract.id, {
        human_readable_summary: updatedContractSummary,
        host_id: user.id,
        event_id: eventId,
        package_id: packageId,
        status: "pending_signature", // Now awaiting vendor or payment confirmation to be 'active'
        pricing: {
          ...contract.pricing, // Preserve any existing pricing fields
          total_payment: finalPrice,
          currency: pkg.currency || "$"
        },
        negotiation_session_id: session.id,
        negotiation_terms: negotiationSummary // Store the generated summary directly
      });

      if (onAccept) {
        onAccept({
          negotiationSession: session,
          finalPrice: finalPrice,
          hasRevisions: hasChanges(),
          contractId: contract.id
        });
      }
    } catch (error) {
      console.error("Error accepting terms:", error);
      alert("Failed to finalize negotiation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!pkg || !negotiationSettings) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const anyNegotiable = 
    negotiationSettings.price_negotiable ||
    negotiationSettings.duration_negotiable ||
    negotiationSettings.inclusions_negotiable ||
    negotiationSettings.terms_negotiable;

  // Final Review Screen
  if (showFinalReview) {
    const negotiationSummary = generateNegotiationSummary();
    const finalPrice = revisedTerms.price !== null ? revisedTerms.price : pkg.price;
    const currency = pkg.currency || "$";

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} // Add exit animation for consistency
          className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Final Agreement Review</h2>
                  <p className="text-sm text-gray-600 mt-0.5">Please review carefully before signing</p>
                </div>
              </div>
              <button
                onClick={() => setShowFinalReview(false)}
                className="w-8 h-8 rounded-full hover:bg-white/80 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Agreement Summary */}
          <div className="p-6 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto">
            <Card className="p-5 bg-emerald-50 border-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <h3 className="font-bold text-emerald-900 mb-2">Agreement Reached</h3>
                  <p className="text-sm text-emerald-800">
                    You and the service provider have agreed to the following terms. 
                    This will become a binding contract once you sign below.
                  </p>
                </div>
              </div>
            </Card>

            {/* Key Terms Summary */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-gray-500 tracking-wide">KEY TERMS</Label>
              
              <Card className="p-4 border-2 border-emerald-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Package</p>
                    <p className="font-bold text-gray-900">{pkg.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Final Price</p>
                    <p className="font-bold text-emerald-600 text-lg">{currency}{finalPrice}</p>
                  </div>
                  {finalPrice !== pkg.price && (
                    <div className="col-span-2">
                      <Badge className="bg-emerald-100 text-emerald-700">
                        {((pkg.price - finalPrice) / pkg.price * 100).toFixed(1)}% discount applied
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              {revisedTerms.duration && (
                <Card className="p-4 border border-blue-200 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Selected Duration</p>
                      <p className="text-sm font-bold text-blue-900">{revisedTerms.duration}</p>
                    </div>
                  </div>
                </Card>
              )}

              {revisedTerms.inclusions.length > 0 && (
                <Card className="p-4 border border-purple-200 bg-purple-50">
                  <p className="text-xs text-purple-600 font-medium mb-2">Additional Add-Ons</p>
                  <div className="space-y-1">
                    {revisedTerms.inclusions.map((inc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        <span className="text-sm text-purple-900">{inc}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {Object.keys(revisedTerms.custom_terms).length > 0 && (
                <Card className="p-4 border border-amber-200 bg-amber-50">
                  <p className="text-xs text-amber-600 font-medium mb-2">Custom Terms</p>
                  <div className="space-y-1">
                    {Object.entries(revisedTerms.custom_terms).map(([key, value], idx) => (
                      <div key={idx} className="text-sm text-amber-900">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Full Contract Text */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 tracking-wide mb-2 block">FULL CONTRACT AGREEMENT</Label>
              <Card className="p-5 bg-gray-50 border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
                  {negotiationSummary}
                  
                  {contract.human_readable_summary && (
                    <>
                      {"\n\n"}
                      {"=== ADDITIONAL CONTRACT TERMS ==="}
                      {"\n\n"}
                      {contract.human_readable_summary}
                    </>
                  )}
                </pre>
              </Card>
            </div>

            {/* Legal Notice */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-2">Legal Binding Agreement</p>
                  <p>
                    By clicking "Sign & Confirm Booking" below, you acknowledge that you have read, 
                    understood, and agree to be bound by all terms and conditions stated above. 
                    This creates a legally enforceable contract between you and the service provider.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinalReview(false)}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2} />
                Back to Edit
              </Button>
              <Button
                onClick={handleAcceptAndProceed}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
              >
                {isSaving ? (
                  "Processing..."
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" strokeWidth={2} />
                    Sign & Confirm Booking
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-3">
              🔒 Your booking will be instantly confirmed upon signing
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Smart Negotiations</h2>
                <p className="text-sm text-gray-600 mt-0.5">{pkg.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/80 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[calc(100vh-240px)] overflow-y-auto">
          {/* Original Package Details */}
          <Card className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <Label className="text-xs font-semibold text-gray-500 tracking-wide mb-3 block">ORIGINAL PACKAGE</Label>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base Price</span>
                <span className="text-lg font-bold text-gray-900">${pkg.price}</span>
              </div>
              {pkg.max_guests && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Max Guests</span>
                  <span className="text-sm font-medium text-gray-900">{pkg.max_guests}</span>
                </div>
              )}
            </div>
          </Card>

          {!anyNegotiable && (
            <Card className="p-5 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Fixed Terms Package</p>
                  <p className="text-xs text-blue-700">
                    This package has fixed terms. Review the smart contract and proceed to book.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Price Negotiation */}
          {negotiationSettings.price_negotiable && (
            <Card className="p-5 border-2 border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Negotiate Price</Label>
                {revisedTerms.price !== pkg.price && (
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700">
                    <Edit3 className="w-3 h-3 mr-1" strokeWidth={2} />
                    Modified
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-700">Acceptable Range</span>
                  <span className="text-sm font-bold text-emerald-900">
                    ${negotiationSettings.price_range.min} - ${negotiationSettings.price_range.max}
                  </span>
                </div>
                <Input
                  type="number"
                  value={revisedTerms.price === null ? pkg.price : revisedTerms.price} // Use pkg.price as default if not revised
                  onChange={(e) => setRevisedTerms({ ...revisedTerms, price: parseFloat(e.target.value) || pkg.price })}
                  min={negotiationSettings.price_range.min}
                  max={negotiationSettings.price_range.max}
                  className="text-lg font-semibold border-2 border-emerald-300 focus:border-emerald-500"
                />
                {negotiationSettings.auto_accept_threshold > 0 && (
                  <p className="text-xs text-gray-600">
                    💡 Offers within {negotiationSettings.auto_accept_threshold}% are auto-accepted
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Duration Options */}
          {negotiationSettings.duration_negotiable && negotiationSettings.duration_options.length > 0 && (
            <Card className="p-5 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Select Duration</Label>
                {revisedTerms.duration && (
                  <Badge className="ml-auto bg-blue-100 text-blue-700">
                    <Edit3 className="w-3 h-3 mr-1" strokeWidth={2} />
                    Selected
                  </Badge>
                )}
              </div>
              <RadioGroup value={revisedTerms.duration} onValueChange={(val) => setRevisedTerms({ ...revisedTerms, duration: val })}>
                <div className="space-y-2">
                  {negotiationSettings.duration_options.map((duration, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-blue-50 rounded-lg p-3 border border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
                      <RadioGroupItem value={duration} id={`duration-${idx}`} />
                      <Label htmlFor={`duration-${idx}`} className="flex-1 cursor-pointer text-sm">
                        {duration}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </Card>
          )}

          {/* Additional Inclusions */}
          {negotiationSettings.inclusions_negotiable && negotiationSettings.negotiable_inclusions.length > 0 && (
            <Card className="p-5 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <List className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Add-Ons Available</Label>
                {revisedTerms.inclusions.length > 0 && (
                  <Badge className="ml-auto bg-purple-100 text-purple-700">
                    {revisedTerms.inclusions.length} selected
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {negotiationSettings.negotiable_inclusions.map((inclusion, idx) => {
                  const isSelected = revisedTerms.inclusions.includes(inclusion);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isSelected) {
                          setRevisedTerms({
                            ...revisedTerms,
                            inclusions: revisedTerms.inclusions.filter(i => i !== inclusion)
                          });
                        } else {
                          setRevisedTerms({
                            ...revisedTerms,
                            inclusions: [...revisedTerms.inclusions, inclusion]
                          });
                        }
                      }}
                      className={`w-full text-left rounded-lg p-3 border-2 transition-all ${
                        isSelected
                          ? "bg-purple-50 border-purple-400"
                          : "bg-purple-50/50 border-purple-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{inclusion}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-purple-600" strokeWidth={2} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Custom Terms */}
          {negotiationSettings.terms_negotiable && negotiationSettings.custom_terms.length > 0 && (
            <Card className="p-5 border-2 border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Custom Terms</Label>
              </div>
              <div className="space-y-4">
                {negotiationSettings.custom_terms.map((term, idx) => (
                  <div key={idx}>
                    <Label className="text-xs text-gray-600 mb-2 block">{term.term}</Label>
                    <RadioGroup 
                      value={revisedTerms.custom_terms[term.term]} 
                      onValueChange={(val) => setRevisedTerms({
                        ...revisedTerms,
                        custom_terms: { ...revisedTerms.custom_terms, [term.term]: val }
                      })}
                    >
                      <div className="space-y-2">
                        {term.options.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center space-x-2 bg-amber-50 rounded-lg p-3 border border-amber-200 hover:border-amber-400 transition-colors cursor-pointer">
                            <RadioGroupItem value={option} id={`term-${idx}-${optIdx}`} />
                            <Label htmlFor={`term-${idx}-${optIdx}`} className="flex-1 cursor-pointer text-sm">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contract Preview */}
          {contract && (
            <Card className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
                  <Label className="text-sm font-semibold text-indigo-900">Linked Smart Contract</Label>
                </div>
                <button
                  onClick={() => setShowContract(!showContract)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {showContract ? "Hide" : "Preview"}
                </button>
              </div>
              
              <AnimatePresence>
                {showContract && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 max-h-60 overflow-y-auto border border-indigo-200">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {contract.human_readable_summary}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasChanges() && (
                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-indigo-300">
                  <p className="text-xs font-medium text-indigo-900 mb-2">📝 Your Revisions Will Be Added:</p>
                  <div className="space-y-1 text-xs text-indigo-700">
                    {revisedTerms.price !== pkg.price && (
                      <div>• Price: ${revisedTerms.price}</div>
                    )}
                    {revisedTerms.duration && (
                      <div>• Duration: {revisedTerms.duration}</div>
                    )}
                    {revisedTerms.inclusions.length > 0 && (
                      <div>• Add-ons: {revisedTerms.inclusions.join(", ")}</div>
                    )}
                    {Object.keys(revisedTerms.custom_terms).length > 0 && (
                      Object.entries(revisedTerms.custom_terms).map(([key, val]) => (
                        <div key={key}>• {key}: {val}</div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewBeforeSigning}
              disabled={!contract || isSaving} // Disable if no contract or saving
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold"
            >
              Review Final Agreement
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
            </Button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">
            Next: Review complete agreement before signing
          </p>
        </div>
      </motion.div>
    </div>
  );
}
