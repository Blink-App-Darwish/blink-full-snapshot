import React, { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import AvailabilityService from "./AvailabilityService";

/**
 * ENABLER AVAILABILITY BADGE
 * Compact badge showing next available date
 * Used on enabler cards in Browse, Search, etc.
 */
export default function EnablerAvailabilityBadge({ enablerId, compact = false }) {
  const [nextAvailable, setNextAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Validate ID before loading
    if (!enablerId || enablerId === "-" || enablerId === "null" || enablerId === "undefined") {
      console.warn("⚠️ Invalid enabler ID for availability badge:", enablerId);
      setIsLoading(false);
      setError(true);
      return;
    }
    
    loadNextAvailable();
  }, [enablerId]);

  const loadNextAvailable = async () => {
    if (!enablerId) return;

    setIsLoading(true);
    setError(false);
    
    try {
      const result = await AvailabilityService.getNextAvailableDate(enablerId, 90);
      setNextAvailable(result);
    } catch (error) {
      console.error("Error loading availability:", error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return null; // Don't show badge if there's an error
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">
        <Clock className="w-3 h-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!nextAvailable) {
    return (
      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
        <Calendar className="w-3 h-3 mr-1" />
        Limited availability
      </Badge>
    );
  }

  const daysAway = Math.ceil((nextAvailable.date - new Date()) / (1000 * 60 * 60 * 24));
  
  if (compact) {
    return (
      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">
        <Calendar className="w-3 h-3 mr-1" />
        {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : format(nextAvailable.date, 'MMM d')}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
      <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
      <span className="font-medium">
        Next: {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : format(nextAvailable.date, 'MMM d')}
      </span>
    </div>
  );
}

export { EnablerAvailabilityBadge };