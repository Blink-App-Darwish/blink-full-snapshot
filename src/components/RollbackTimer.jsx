import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RotateCcw, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function RollbackTimer({ repairSnapshot, onRollback, onAccept }) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const expiresAt = new Date(repairSnapshot.rollback_expires_at);
      const now = new Date();
      const diff = expiresAt - now;
      
      if (diff <= 0) {
        setIsExpired(true);
        return 0;
      }
      
      return Math.floor(diff / 1000); // seconds
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [repairSnapshot.rollback_expires_at]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const totalSeconds = 15 * 60; // Assuming 15 min rollback window
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100;
  };

  if (isExpired) {
    return (
      <Card className="border-2 border-emerald-200 bg-emerald-50 p-4 mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-900">Fix Accepted</h4>
            <p className="text-sm text-emerald-700">The automated fix has been permanently applied.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 mb-1">Auto-Fix Applied</h4>
              <p className="text-sm text-amber-800">
                We applied a small fix to prevent cancellation. You can undo this change within the time limit.
              </p>
            </div>
          </div>

          {/* Timer Display */}
          <div className="bg-white rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Time to Rollback</span>
              <span className="text-2xl font-bold text-amber-600">{formatTime(timeRemaining)}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full"
                initial={{ width: "0%" }}
                animate={{ width: `${getProgressPercentage()}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onRollback}
              variant="outline"
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo Fix
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Keep Fix
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}