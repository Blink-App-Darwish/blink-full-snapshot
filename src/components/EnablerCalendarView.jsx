import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isPast
} from "date-fns";
import AvailabilityService from "./AvailabilityService";

/**
 * ENABLER CALENDAR VIEW
 * Full 90-day calendar showing availability
 * Used in EnablerProfile Availability tab
 */
export default function EnablerCalendarView({ enablerId, onDateSelect = null, readOnly = true }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilitySummary, setAvailabilitySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
  }, [enablerId, currentMonth]);

  const loadAvailability = async () => {
    if (!enablerId) return;

    setIsLoading(true);
    try {
      const summary = await AvailabilityService.getAvailabilitySummary(
        enablerId,
        startOfMonth(currentMonth),
        90
      );
      setAvailabilitySummary(summary);
    } catch (error) {
      console.error("Error loading calendar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date) => {
    if (readOnly) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayInfo = availabilitySummary?.availability[dateStr];
    
    if (dayInfo?.canBook && !isPast(date)) {
      setSelectedDate(date);
      if (onDateSelect) {
        onDateSelect(date, dayInfo);
      }
    }
  };

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilitySummary?.availability[dateStr] || { status: 'unknown', canBook: false };
  };

  const getDayClassName = (date) => {
    const dayStatus = getDayStatus(date);
    const base = "h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-all";
    
    if (!isSameMonth(date, currentMonth)) {
      return `${base} text-gray-300 cursor-not-allowed`;
    }

    if (isPast(date) && !isToday(date)) {
      return `${base} text-gray-400 cursor-not-allowed opacity-50`;
    }

    if (selectedDate && isSameDay(date, selectedDate)) {
      return `${base} bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2 cursor-pointer`;
    }

    switch (dayStatus.status) {
      case 'available':
        return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 ${
          readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
        }`;
      case 'booked':
        return `${base} bg-red-50 text-red-700 border border-red-200 cursor-not-allowed`;
      case 'blocked':
        return `${base} bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed`;
      default:
        return `${base} bg-gray-50 text-gray-600 border border-gray-200`;
    }
  };

  const getDayIcon = (date) => {
    const dayStatus = getDayStatus(date);
    
    switch (dayStatus.status) {
      case 'available':
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" strokeWidth={2} />;
      case 'booked':
        return <XCircle className="w-3 h-3 text-red-500" strokeWidth={2} />;
      case 'blocked':
        return <MinusCircle className="w-3 h-3 text-gray-400" strokeWidth={2} />;
      default:
        return null;
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-600">Loading calendar...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          {availabilitySummary && (
            <p className="text-xs text-gray-500 mt-1">
              {availabilitySummary.summary.availableDays} days available this period
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={loadAvailability}
            className="h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
          <span className="text-gray-600">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
          <span className="text-gray-600">Blocked</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {paddingDays.map((_, idx) => (
            <div key={`padding-${idx}`} className="h-12"></div>
          ))}
          
          {calendarDays.map(date => {
            const dayStatus = getDayStatus(date);
            
            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                className={getDayClassName(date)}
                title={dayStatus.reason}
              >
                <div className="flex flex-col items-center">
                  <span className={isToday(date) ? 'font-bold' : ''}>
                    {format(date, 'd')}
                  </span>
                  {getDayIcon(date)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Info */}
      {selectedDate && (
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {getDayStatus(selectedDate).reason}
              </p>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Request Booking
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {availabilitySummary && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {availabilitySummary.summary.availableDays}
            </p>
            <p className="text-xs text-gray-600 mt-1">Available Days</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {availabilitySummary.summary.bookedDays}
            </p>
            <p className="text-xs text-gray-600 mt-1">Booked Days</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">
              {availabilitySummary.summary.blockedDays}
            </p>
            <p className="text-xs text-gray-600 mt-1">Blocked Days</p>
          </Card>
        </div>
      )}
    </div>
  );
}

export { EnablerCalendarView };