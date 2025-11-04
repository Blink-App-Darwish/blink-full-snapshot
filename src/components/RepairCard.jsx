import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, DollarSign, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RepairCard({ repair, onApply, onReject, isApplying }) {
  const [showDetails, setShowDetails] = useState(false);

  const getRepairIcon = (type) => {
    switch (type) {
      case "add_fee": return "💰";
      case "substitute_enabler": return "🔄";
      case "reschedule_window": return "📅";
      case "relax_constraint": return "🎯";
      case "adjust_terms": return "📝";
      case "manual_intervention": return "👤";
      default: return "⚙️";
    }
  };

  const getConfidenceColor = (probability) => {
    if (probability >= 0.85) return "text-emerald-600 bg-emerald-50";
    if (probability >= 0.70) return "text-blue-600 bg-blue-50";
    return "text-amber-600 bg-amber-50";
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "low": return "text-emerald-600 bg-emerald-50";
      case "medium": return "text-amber-600 bg-amber-50";
      case "high": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="overflow-hidden border-2 border-gray-100 hover:border-emerald-200 transition-all duration-300">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">{getRepairIcon(repair.repair_type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{repair.title}</h3>
                {repair.rank === 1 && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Recommended
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{repair.description}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`p-3 rounded-lg ${getConfidenceColor(repair.success_probability)}`}>
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-xs font-medium">Success</span>
              </div>
              <div className="text-lg font-bold">{(repair.success_probability * 100).toFixed(0)}%</div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-medium">Time</span>
              </div>
              <div className="text-lg font-bold">{repair.time_to_resolve_minutes}min</div>
            </div>

            <div className={`p-3 rounded-lg ${repair.impact_host.cost_delta > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-medium">Cost</span>
              </div>
              <div className="text-lg font-bold">
                {repair.impact_host.cost_delta > 0 ? '+' : ''}${Math.abs(repair.impact_host.cost_delta || 0)}
              </div>
            </div>
          </div>

          {/* Why This Works */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span>💡</span> Why This Works
            </div>
            <div className="space-y-1">
              {repair.why_signals.map((signal, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <span className="font-medium">Impact Details</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Detailed Impact */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="space-y-3 text-xs">
                  {/* Host Impact */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-900 mb-2">For You (Host)</div>
                    <div className="space-y-2">
                      {repair.impact_host.cost_delta !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cost Change:</span>
                          <span className={repair.impact_host.cost_delta > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                            {repair.impact_host.cost_delta > 0 ? '+' : ''}${Math.abs(repair.impact_host.cost_delta)}
                          </span>
                        </div>
                      )}
                      {repair.impact_host.schedule_change && repair.impact_host.schedule_change !== "None" && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Schedule:</span>
                          <span className="font-medium text-gray-900">{repair.impact_host.schedule_change}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Risk Level:</span>
                        <Badge className={getRiskColor(repair.impact_host.risk_level)}>
                          {repair.impact_host.risk_level}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Enabler Impact */}
                  {repair.impact_enabler && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold text-gray-900 mb-2">For Service Provider</div>
                      <div className="space-y-2">
                        {repair.impact_enabler.earnings_delta !== 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Earnings Change:</span>
                            <span className={repair.impact_enabler.earnings_delta > 0 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                              {repair.impact_enabler.earnings_delta > 0 ? '+' : ''}${Math.abs(repair.impact_enabler.earnings_delta)}
                            </span>
                          </div>
                        )}
                        {repair.impact_enabler.obligation_change && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Change:</span>
                            <span className="font-medium text-gray-900">{repair.impact_enabler.obligation_change}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => onApply(repair)}
              disabled={isApplying}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
            >
              {isApplying ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply Fix
                </>
              )}
            </Button>
            <Button
              onClick={() => onReject(repair)}
              variant="outline"
              disabled={isApplying}
              className="border-gray-300 hover:bg-gray-50"
            >
              Skip
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}