import React, { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle2, Calendar, MapPin, Users, DollarSign, Package as PackageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Event, BookingOffer } from "@/api/entities";
import { isVenueCategory } from "./VenueLogic";

export default function AddToEventModal({ enabler, package: selectedPackage, userId, onClose, onSuccess }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadEvents();
  }, [userId]);

  const loadEvents = async () => {
    try {
      const allEvents = await Event.filter(
        { host_id: userId, status: "planning" },
        "-created_date"
      );
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEventCompatibility = (event) => {
    const errors = {};

    const isVenue = isVenueCategory(enabler.category);

    if (isVenue) {
      if (event.venue_confirmed) {
        errors.venue = "This event already has a confirmed venue";
      }

      if (event.venue_enabler_id && event.venue_enabler_id !== enabler.id) {
        errors.venue = "This event already has a venue selected";
      }
    } else {
      if (event.venue_status === "pending_venue") {
        errors.venue = "Please select a venue for this event first";
      }
    }

    if (event.selected_categories && event.selected_categories.length > 0) {
      if (!event.selected_categories.includes(enabler.category)) {
        errors.category = `This enabler's category (${enabler.category?.replace(/_/g, ' ')}) wasn't included in your original event planning`;
      }
    }

    if (enabler.service_area && event.location) {
      const enablerArea = enabler.service_area.toLowerCase();
      const eventLocation = event.location.toLowerCase();
      
      if (!eventLocation.includes(enablerArea) && !enablerArea.includes("global") && !enablerArea.includes("worldwide")) {
        errors.location = `This professional's service area (${enabler.service_area}) may not cover your event location (${event.location})`;
      }
    }

    return errors;
  };

  const handleAdd = async (event) => {
    setIsAdding(true);
    setValidationErrors({});

    try {
      const errors = validateEventCompatibility(event);
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setSelectedEvent(event);
        setIsAdding(false);
        return;
      }

      const existingOffers = await BookingOffer.filter({
        event_id: event.id,
        enabler_id: enabler.id
      });

      if (existingOffers.length > 0) {
        alert("This professional is already added to this event");
        setIsAdding(false);
        return;
      }

      const offerData = {
        event_id: event.id,
        enabler_id: enabler.id,
        host_id: userId,
        offered_amount: selectedPackage?.price || enabler.base_price || 0,
        status: "pending"
      };

      // Add package reference if selected
      if (selectedPackage) {
        offerData.package_id = selectedPackage.id;
        offerData.custom_package_name = selectedPackage.name;
        offerData.custom_package_description = selectedPackage.description;
        offerData.custom_requirements = `Package: ${selectedPackage.name} - ${selectedPackage.description || ''}`;
      } else {
        offerData.custom_requirements = `Added from browse - ${enabler.category?.replace(/_/g, ' ')}`;
      }

      await BookingOffer.create(offerData);

      if (isVenueCategory(enabler.category)) {
        await Event.update(event.id, {
          venue_enabler_id: enabler.id,
          venue_status: "with_venue"
        });
      }

      onSuccess(event.id);
    } catch (error) {
      console.error("Error adding enabler to event:", error);
      alert("Failed to add professional to event. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md"
          style={{
            maxHeight: '85vh',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Add to Event</h3>
                <p className="text-xs text-gray-500 mt-0.5">{enabler.business_name}</p>
                {selectedPackage && (
                  <div className="flex items-center gap-1 mt-1">
                    <PackageIcon className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs text-emerald-600 font-medium">{selectedPackage.name}</span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No active events found</p>
                <p className="text-xs text-gray-500">Create an event first to add professionals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const errors = validateEventCompatibility(event);
                  const hasErrors = Object.keys(errors).length > 0;
                  const isSelected = selectedEvent?.id === event.id;

                  return (
                    <div
                      key={event.id}
                      className={`relative border rounded-xl p-4 transition-all ${
                        hasErrors
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md cursor-pointer'
                      }`}
                      onClick={() => !hasErrors && !isAdding && handleAdd(event)}
                    >
                      {/* Event Info */}
                      <div className="mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">
                          {event.display_name || event.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          {event.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location.length > 20 ? event.location.substring(0, 20) + '...' : event.location}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          {event.guest_count && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Users className="w-3 h-3" />
                              {event.guest_count} guests
                            </span>
                          )}
                          {event.budget && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <DollarSign className="w-3 h-3" />
                              ${event.budget.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Errors/Warnings */}
                      {hasErrors && isSelected && (
                        <div className="mt-3 space-y-1">
                          {Object.entries(errors).map(([key, message]) => (
                            <div key={key} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-100 rounded-lg p-2">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <p>{message}</p>
                            </div>
                          ))}
                          <p className="text-xs text-amber-600 mt-2">
                            ⚠️ You can still add this professional, but there may be compatibility issues.
                          </p>
                        </div>
                      )}

                      {/* Add Button (for events with warnings that are selected) */}
                      {hasErrors && isSelected && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setValidationErrors({});
                            handleAdd(event);
                          }}
                          disabled={isAdding}
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600"
                          size="sm"
                        >
                          {isAdding ? "Adding..." : "Add Anyway"}
                        </Button>
                      )}

                      {/* Success Indicator */}
                      {!hasErrors && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>
                      )}

                      {/* Warning Indicator */}
                      {hasErrors && (
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(isSelected ? null : event);
                            }}
                            className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center hover:bg-amber-200 transition-colors"
                          >
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}