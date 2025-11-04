import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

export default function BookingCountdown({ 
  onComplete, 
  onCancel,
  duration = 60,
  contractDetails,
  packageDetails 
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleComplete = () => {
    // Trigger confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    onComplete();
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return;
    }
    
    setIsCancelling(true);
    try {
      await onCancel();
    } catch (error) {
      console.error("Error cancelling:", error);
      alert("Failed to cancel. Please try again.");
      setIsCancelling(false);
    }
  };

  const progress = ((duration - timeLeft) / duration) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 text-center">
          {/* Countdown Circle */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Background Circle */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="#E5E7EB"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress Circle */}
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                stroke="#10B981"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: "552.92", strokeDashoffset: "552.92" }}
                animate={{ 
                  strokeDashoffset: 552.92 - (progress / 100) * 552.92
                }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Clock className="w-8 h-8 text-emerald-600 mb-2" />
              <div className="text-4xl font-bold text-gray-900">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-gray-500 mt-1">remaining</p>
            </div>
          </div>

          {/* Status Message */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Finalizing Your Booking
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your booking is being processed. This ensures all parties are ready.
            </p>
            
            {/* Booking Details */}
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Package:</span>
                <span className="font-medium text-gray-900">{packageDetails?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-emerald-600">
                  {contractDetails?.pricing?.currency}{contractDetails?.pricing?.total_payment?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="flex items-center gap-1 text-amber-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 text-left">
                <strong>Please wait:</strong> Your payment is being processed and the enabler's calendar is being updated. 
                Cancelling now may result in payment complications.
              </p>
            </div>
          </div>

          {/* Cancel Button (only first 30 seconds) */}
          {timeLeft > (duration / 2) && (
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel Booking
                </>
              )}
            </Button>
          )}

          {/* Can't cancel message */}
          {timeLeft <= (duration / 2) && (
            <div className="text-xs text-gray-500">
              <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-600" />
              Payment processed. Finalizing booking...
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}