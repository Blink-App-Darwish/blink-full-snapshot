import React from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, FileText, DollarSign, Calendar, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function ContractReviewModal({ 
  contract, 
  packageData,
  negotiationTerms,
  eventData,
  onAccept, 
  onDecline,
  isOpen 
}) {
  if (!isOpen || !contract) return null;

  const hasNegotiation = !!negotiationTerms;
  const originalPrice = packageData?.price || contract.pricing?.total_payment;
  const finalPrice = negotiationTerms?.final_price || contract.pricing?.total_payment;
  const savings = originalPrice - finalPrice;
  const savingsPercent = ((savings / originalPrice) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Review Your Agreement</h2>
              </div>
              <p className="text-emerald-50 text-sm">
                Please review all terms before accepting
              </p>
            </div>
            <button
              onClick={onDecline}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {hasNegotiation && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <p className="text-sm font-medium">
                Smart Negotiation: Terms have been customized for you
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-6">
          {/* Event Details */}
          {eventData && (
            <Card className="p-5 bg-gray-50">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Event Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Event Name</p>
                  <p className="font-medium text-gray-900">{eventData.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(eventData.date), "MMM d, yyyy")}
                  </p>
                </div>
                {eventData.location && (
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{eventData.location}</p>
                  </div>
                )}
                {eventData.guest_count && (
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {eventData.guest_count}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Pricing Summary */}
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Pricing Summary
            </h3>
            
            {hasNegotiation && savings > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Original Package Price</span>
                  <span className="text-gray-400 line-through">
                    ${originalPrice?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-emerald-900">Your Negotiated Price</span>
                  <span className="text-emerald-600">
                    ${finalPrice?.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-emerald-200">
                  <div className="bg-emerald-100 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-emerald-900 font-medium">You Save</span>
                    <span className="text-emerald-600 font-bold text-lg">
                      ${savings.toLocaleString()} ({savingsPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-emerald-600">
                  ${finalPrice?.toLocaleString()}
                </span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-emerald-200 text-xs text-gray-600">
              <p>💳 Payment will be processed securely after you accept</p>
              <p className="mt-1">🔒 Your card information is protected by industry-standard encryption</p>
            </div>
          </Card>

          {/* Negotiated Terms */}
          {hasNegotiation && negotiationTerms && (
            <Card className="p-5 border-2 border-purple-200 bg-purple-50">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Your Customized Terms
              </h3>
              <div className="space-y-3">
                {negotiationTerms.final_package && negotiationTerms.final_package.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Included Services:</p>
                    <ul className="space-y-1">
                      {negotiationTerms.final_package.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {negotiationTerms.payment_plan && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Payment Plan:</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {negotiationTerms.payment_plan.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {negotiationTerms.additional_terms && negotiationTerms.additional_terms.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Terms:</p>
                    <ul className="space-y-1">
                      {negotiationTerms.additional_terms.map((term, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                          {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Package Features */}
          {packageData && packageData.features && packageData.features.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 mb-3">What's Included</h3>
              <div className="grid gap-2">
                {packageData.features.filter(f => f.included).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contract Terms Summary */}
          {contract.human_readable_summary && (
            <Card className="p-5 bg-gray-50">
              <h3 className="font-bold text-gray-900 mb-3">Key Contract Terms</h3>
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-gray-700 space-y-2 whitespace-pre-wrap">
                  {contract.human_readable_summary.split('\n').slice(0, 15).map((line, idx) => (
                    <p key={idx} className="leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
              <button
                onClick={() => window.open(`/contract-detail?id=${contract.id}`, '_blank')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-3"
              >
                View Full Contract Details →
              </button>
            </Card>
          )}

          {/* Important Notice */}
          <Card className="p-5 bg-amber-50 border-2 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-2">Before You Accept</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• This is a legally binding agreement</li>
                  <li>• Your payment will be processed immediately after acceptance</li>
                  <li>• Review cancellation policy in the full contract</li>
                  <li>• Contact the enabler if you have any questions</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 py-6 text-base"
            >
              Decline
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-base font-semibold"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              I Accept All Terms
            </Button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">
            By accepting, you agree to the terms and conditions outlined above
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}