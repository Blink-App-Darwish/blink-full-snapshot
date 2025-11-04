import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ChangeReviewModal({ isOpen, onClose, changeData, onAccept, onDecline, onContactSupport }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !changeData) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept();
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    await onDecline();
    setIsProcessing(false);
  };

  const getImpactBadgeColor = (impactLevel) => {
    switch (impactLevel) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 0 60px rgba(16, 185, 129, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-100" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Change Detected</h2>
                  <p className="text-xs text-gray-500">Review the updates below</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Event Info */}
              <div className="p-4 rounded-xl" style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <p className="text-sm font-semibold text-gray-900 mb-1">{changeData.eventName}</p>
                <p className="text-xs text-gray-500">{changeData.changeType}</p>
              </div>

              {/* Changes Summary */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Changes Made</h3>
                
                {changeData.changes.map((change, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{change.field}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1">Previous</p>
                          <p className="text-sm font-medium text-gray-700 line-through">{change.oldValue}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1">New</p>
                          <p className="text-sm font-medium text-emerald-600">{change.newValue}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Impact Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Impact Summary</h3>
                
                <div className={`p-4 rounded-xl border ${getImpactBadgeColor(changeData.impactLevel)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {changeData.impactLevel} Impact
                    </p>
                  </div>
                  <p className="text-sm">{changeData.impactDescription}</p>
                </div>

                {/* Affected Items */}
                {changeData.affectedItems && changeData.affectedItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Affected Items:</p>
                    {changeData.affectedItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-700 pl-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Required Actions */}
              {changeData.requiredActions && changeData.requiredActions.length > 0 && (
                <div className="p-4 rounded-xl" style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.1)'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                      Action Required
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {changeData.requiredActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 p-6 border-t border-gray-100 bg-white/80 backdrop-blur-xl flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold"
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept Changes
                  </>
                )}
              </Button>

              <Button
                onClick={handleDecline}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 h-12 border-gray-300"
              >
                Decline
              </Button>

              {onContactSupport && (
                <Button
                  onClick={onContactSupport}
                  disabled={isProcessing}
                  variant="ghost"
                  className="px-6 h-12"
                >
                  Contact Support
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}