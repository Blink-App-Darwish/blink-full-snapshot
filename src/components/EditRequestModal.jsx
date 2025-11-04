import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, X, DollarSign, Clock, AlertCircle, ArrowRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";

export default function EditRequestModal({ 
  isOpen, 
  onClose, 
  fieldName, 
  currentValue, 
  onSubmit,
  enablerName 
}) {
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!newValue.trim()) {
      alert("Please enter a new value");
      return;
    }
    onSubmit({ fieldName, oldValue: currentValue, newValue, reason });
    setNewValue("");
    setReason("");
  };

  const formatFieldName = (field) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (field, value) => {
    if (field === 'date' && value) {
      try {
        return format(parseISO(value), 'MMMM d, yyyy');
      } catch {
        return value;
      }
    }
    if (field === 'guest_count') return `${value} guests`;
    if (field === 'budget') return `$${value}`;
    return value;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-gray-100/50"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))'
              }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/80 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Request Edit</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Changes require {enablerName}'s approval</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Field Being Edited */}
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-gray-100 border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 tracking-widest uppercase">
                    {formatFieldName(fieldName)}
                  </p>
                </div>
              </div>

              {/* Old Value vs New Value - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* OLD VALUE - Left Side */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <Label className="text-xs font-bold text-gray-500 tracking-wide uppercase">Current Value</Label>
                  </div>
                  <div className="relative p-5 rounded-2xl border-2 border-gray-200 bg-gray-50/80 backdrop-blur-sm">
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
                    </div>
                    <p className="text-base font-semibold text-gray-700 leading-relaxed">
                      {formatValue(fieldName, currentValue)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Confirmed with enabler</p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-xl animate-pulse">
                    <ArrowRight className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                </div>

                {/* NEW VALUE - Right Side */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-900 tracking-wide uppercase mb-3 block">New Value</Label>
                  <div className="p-1 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border-2 border-emerald-300">
                    <div className="p-4 rounded-xl bg-white">
                      {fieldName === 'date' ? (
                        <Input
                          type="date"
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          className="border-0 focus:ring-2 focus:ring-emerald-500 text-base font-semibold"
                        />
                      ) : fieldName === 'guest_count' ? (
                        <Input
                          type="number"
                          placeholder="Enter new guest count"
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          className="border-0 focus:ring-2 focus:ring-emerald-500 text-base font-semibold"
                        />
                      ) : fieldName === 'budget' ? (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-emerald-500" />
                          <Input
                            type="number"
                            placeholder="Enter new budget"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="border-0 focus:ring-2 focus:ring-emerald-500 text-base font-semibold flex-1"
                          />
                        </div>
                      ) : (
                        <Input
                          type="text"
                          placeholder={`Enter new ${formatFieldName(fieldName).toLowerCase()}`}
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          className="border-0 focus:ring-2 focus:ring-emerald-500 text-base font-semibold"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Pending approval</p>
                </div>
              </div>

              {/* Reason for Change */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900">
                  Reason for Change <span className="text-gray-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  placeholder="Help the enabler understand why this change is needed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="resize-none border-2 border-gray-200 focus:border-emerald-500 rounded-xl"
                />
              </div>

              {/* Info Box */}
              <div className="relative p-5 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
              >
                <div className="relative z-10 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Auto-Check System</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Your request will be automatically checked against <span className="font-semibold">{enablerName}'s</span> negotiation framework. 
                      If compliant, it may be <span className="font-semibold">auto-approved</span> with applicable fees. 
                      If not, the enabler will review it manually.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100/50 flex gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.8))'
              }}
            >
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-12 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!newValue.trim()}
                className="flex-1 h-12 rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
                style={{
                  background: newValue.trim() 
                    ? 'linear-gradient(135deg, #10b981, #06b6d4)' 
                    : '#d1d5db'
                }}
              >
                Submit Request
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}