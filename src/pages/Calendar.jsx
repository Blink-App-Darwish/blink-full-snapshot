import React, { useState, useEffect } from "react";
import { Event, Booking, User } from "@/api/entities";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const user = await User.me();
      const eventsData = await Event.filter({ host_id: user.id });
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDate = (date) => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700">
            {format(currentMonth, "MMMM yyyy")}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Calendar Grid */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {paddingDays.map((_, idx) => (
              <div key={`padding-${idx}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-white"
                      : hasEvents
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "hover:bg-gray-100 text-gray-700"
                  } ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}`}
                >
                  {format(day, "d")}
                  {hasEvents && !isSelected && (
                    <div className="w-1 h-1 bg-emerald-500 rounded-full mx-auto mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected Date Events */}
        {selectedDate && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {format(selectedDate, "MMMM d, yyyy")}
            </h2>
            {selectedDateEvents.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No events on this date</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <Card key={event.id} className="p-4">
                    <h3 className="font-bold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600">{event.type}</p>
                    {event.location && (
                      <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}