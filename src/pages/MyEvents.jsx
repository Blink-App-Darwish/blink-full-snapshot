import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Event,
  Booking,
  User,
  EventWishlist,
  BookingOffer,
  Enabler,
  Package,
  EditRequest,
  NegotiationFramework,
  Notification,
  EventLock,
  EventAuditLog,
} from '@/api/entities';
import {
  Calendar,
  MapPin,
  Users,
  Trash2,
  Heart,
  Settings,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Edit2,
  Send,
  X,
  DollarSign,
  Sparkles,
  AlertCircle,
  Save,
  GitCompare,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, isValid, parseISO } from 'date-fns';
import BlinkLogo from '../components/BlinkLogo';
import EmptyState from '../components/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import EditRequestModal from '../components/EditRequestModal';
import EditHistoryView from '../components/EditHistoryView';
import { getVenueStatusDisplay } from '../components/VenueLogic';
import DependencyTracker from '../components/DependencyTracker';
import ChangeReviewModal from '../components/ChangeReviewModal';
import ChangeDetectionIndicator from '../components/ChangeDetectionIndicator';

// New component for displaying and editing Event Name and UID
const EventNameDisplay = ({
  event,
  onUpdate,
  showUID = false,
  editable = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(event.name || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditedName(event.name || '');
  }, [event.name]);

  const handleSave = async () => {
    if (editedName.trim() === '' || editedName === event.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const updatedEvent = await Event.update(event.id, { name: editedName });
      onUpdate(updatedEvent);
      setIsEditing(false);
      Notification.create({
        type: 'success',
        title: 'Event Name Updated',
        message: `Event name changed to "${editedName}"`,
      });
    } catch (error) {
      console.error('Failed to update event name:', error);
      Notification.create({
        type: 'error',
        title: 'Failed to Update Name',
        message: 'Could not save event name. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(event.name || '');
    setIsEditing(false);
  };

  const aiGenerateName = async () => {
    setIsLoading(true);
    try {
      const aiNameSuggestions = [
        `A Night to Remember: ${event.type} Extravaganza`,
        `The Grand ${event.name} Experience`,
        `Celestial Celebration: ${event.theme} Gala`,
        `Elegance Unveiled: A Premier ${event.type}`,
        `Future Horizons: The ${event.name} Summit`,
      ];
      const aiName =
        aiNameSuggestions[Math.floor(Math.random() * aiNameSuggestions.length)];

      setEditedName(aiName);
      setIsEditing(true);
      Notification.create({
        type: 'info',
        title: 'AI Name Generated',
        message: `AI suggested: "${aiName}"`,
      });
    } catch (error) {
      console.error('Failed to generate AI name:', error);
      Notification.create({
        type: 'error',
        title: 'AI Name Generation Failed',
        message: 'Could not generate an AI name. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-emerald-100/50 bg-emerald-50/20 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
          <p className="text-[10px] text-gray-500 font-medium tracking-wide">
            EVENT NAME
          </p>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={aiGenerateName}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                disabled={isLoading}
              >
                <Sparkles className="w-3 h-3" />
                AI Name
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) handleCancel();
                else setIsEditing(true);
              }}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              disabled={isLoading}
            >
              {isEditing ? (
                <X className="w-3 h-3" />
              ) : (
                <Edit2 className="w-3 h-3" />
              )}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex gap-2 items-center">
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="flex-1 h-8 text-sm px-2 py-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSave}
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : <Check className="w-4 h-4" />}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-900">
            {event.display_name || event.name}
          </p>
          {showUID && event.event_uid && (
            <code className="text-[9px] text-gray-400 font-mono mt-0.5 block">
              {event.event_uid}
            </code>
          )}
        </>
      )}
    </div>
  );
};

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [enablers, setEnablers] = useState({});
  const [packages, setPackages] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('planning');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventImages, setEventImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(false);

  const [editingOffer, setEditingOffer] = useState(null);
  const [offerEditData, setOfferEditData] = useState({});

  const [editRequestModal, setEditRequestModal] = useState(null);
  const [editRequests, setEditRequests] = useState({});
  const [showEditHistory, setShowEditHistory] = useState(null);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  const [eventLocks, setEventLocks] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [showChangeReview, setShowChangeReview] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadEventLocks();
  }, []);

  const loadEventLocks = async () => {
    try {
      const allLocks = await EventLock.filter({ status: 'active' });
      const locksMap = {};
      allLocks.forEach((lock) => {
        locksMap[lock.event_id] = lock;
      });
      setEventLocks(locksMap);
    } catch (error) {
      console.error('Error loading event locks:', error);
    }
  };

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const eventsData = await Event.filter(
        { host_id: user.id },
        '-created_date'
      );
      setEvents(eventsData);

      const allBookings = [];
      const allOffers = [];
      const enablersMap = {};
      const packagesMap = {};
      const editRequestsMap = {};

      for (const event of eventsData) {
        try {
          const eventBookings = await Booking.filter({ event_id: event.id });
          allBookings.push(...eventBookings);

          const eventOffers = await BookingOffer.filter({ event_id: event.id });
          allOffers.push(...eventOffers);

          const eventEditRequests = await EditRequest.filter(
            { event_id: event.id },
            '-created_date'
          );
          editRequestsMap[event.id] = eventEditRequests;

          for (const booking of eventBookings) {
            if (booking.enabler_id && !enablersMap[booking.enabler_id]) {
              const enabler = await Enabler.filter({ id: booking.enabler_id });
              if (enabler[0]) enablersMap[booking.enabler_id] = enabler[0];
            }
            if (booking.package_id && !packagesMap[booking.package_id]) {
              const pkg = await Package.filter({ id: booking.package_id });
              if (pkg[0]) packagesMap[booking.package_id] = pkg[0];
            }
          }

          for (const offer of eventOffers) {
            if (offer.enabler_id && !enablersMap[offer.enabler_id]) {
              const enabler = await Enabler.filter({ id: offer.enabler_id });
              if (enabler[0]) enablersMap[offer.enabler_id] = enabler[0];
            }
          }
        } catch (error) {
          console.warn(`Could not load data for event ${event.id}:`, error);
        }
      }

      setBookings(allBookings);
      setOffers(allOffers);
      setEnablers(enablersMap);
      setPackages(packagesMap);
      setEditRequests(editRequestsMap);

      generateEventImagesInBackground(eventsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generateEventImagesInBackground = async (eventsData) => {
    setLoadingImages(true);

    for (const event of eventsData) {
      if (event.image) {
        setEventImages((prev) => ({ ...prev, [event.id]: event.image }));
      } else {
        setEventImages((prev) => ({ ...prev, [event.id]: null }));

        try {
          const imageGenerator = (
            await import('../components/OptimizedImageGenerator')
          ).default;
          const imagePrompt = `Professional ${event.type} event illustration. ${
            event.name
          }. ${
            event.theme || 'elegant and modern'
          }. High quality, realistic photography style.`;

          const result = await imageGenerator.generateImage(imagePrompt, {
            cacheKey: `event_${event.id}`,
            timeout: 10000,
          });

          if (result.success) {
            setEventImages((prev) => ({ ...prev, [event.id]: result.url }));
            await Event.update(event.id, { image: result.url });
          } else {
            const fallback = imageGenerator.getFallbackImage(event.type);
            setEventImages((prev) => ({ ...prev, [event.id]: fallback }));
          }
        } catch (error) {
          console.warn(
            `Failed to generate image for event ${event.id}:`,
            error.message
          );
          const imageGenerator = (
            await import('../components/OptimizedImageGenerator')
          ).default;
          const fallback = imageGenerator.getFallbackImage(event.type);
          setEventImages((prev) => ({ ...prev, [event.id]: fallback }));
        }
      }
    }

    setLoadingImages(false);
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Date not set';

    try {
      const date =
        typeof dateString === 'string'
          ? parseISO(dateString)
          : new Date(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await Event.delete(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);

      if (
        error.response?.status === 404 ||
        error.message?.includes('not found') ||
        error.message?.includes('404')
      ) {
        setEvents(events.filter((e) => e.id !== eventId));
        console.log('Event was already deleted, removed from UI');
      } else {
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleUpdateOffer = async (offerId) => {
    try {
      await BookingOffer.update(offerId, offerEditData);
      setEditingOffer(null);
      setOfferEditData({});
      await loadData();
    } catch (error) {
      console.error('Error updating offer:', error);
      alert('Failed to update offer');
    }
  };

  const handleRemoveOffer = async (offerId) => {
    if (!confirm('Remove this enabler from your event?')) return;

    try {
      await BookingOffer.delete(offerId);
      await loadData();
    } catch (error) {
      console.error('Error removing offer:', error);
      alert('Failed to remove enabler');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEventIcon = (type) => {
    const icons = {
      wedding: '💍',
      birthday: '🎂',
      corporate: '🏢',
      conference: '🎤',
      product_launch: '🚀',
      baby_shower: '👶',
      dinner: '🍽️',
    };
    return icons[type] || '✨';
  };

  const filteredEvents = events.filter((event) => {
    if (activeTab === 'planning') return event.status === 'planning';
    if (activeTab === 'confirmed') return event.status === 'confirmed';
    if (activeTab === 'completed') return event.status === 'completed';
    return true;
  });

  const getEventStats = (eventId) => {
    const eventBookings = bookings.filter((b) => b.event_id === eventId);
    const eventOffers = offers.filter((o) => o.event_id === eventId);

    const confirmedCount = eventBookings.filter(
      (b) => b.status === 'confirmed'
    ).length;
    const pendingCount = eventOffers.filter(
      (o) => o.status === 'pending' || o.status === 'counter_offered'
    ).length;

    return {
      confirmed: confirmedCount,
      pending: pendingCount,
      total: confirmedCount + pendingCount,
    };
  };

  const hasBookedEnablers = (eventId) => {
    return (
      bookings.filter((b) => b.event_id === eventId && b.status === 'confirmed')
        .length > 0
    );
  };

  const handleEditRequest = async (eventId, fieldData) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const lock = eventLocks[eventId];
      if (lock) {
        alert(
          `Event is currently locked due to: ${lock.lock_reason}. Please wait for validation to complete.`
        );
        return;
      }

      const confirmedBookings = bookings.filter(
        (b) => b.event_id === eventId && b.status === 'confirmed'
      );

      let successCount = 0;
      let pendingCount = 0;
      let failureCount = 0;

      if (confirmedBookings.length === 0) {
        try {
          await handleDirectEdit(
            eventId,
            fieldData.fieldName,
            fieldData.newValue
          );

          await DependencyTracker.triggerDependencyRevalidation(
            eventId,
            `${fieldData.fieldName}_changed`,
            {
              field_name: fieldData.fieldName,
              old_value: fieldData.oldValue,
              new_value: fieldData.newValue,
              new_location:
                fieldData.fieldName === 'location'
                  ? fieldData.newValue
                  : event.location,
              new_date:
                fieldData.fieldName === 'date'
                  ? fieldData.newValue
                  : event.date,
            },
            currentUser.id
          );
          alert('Event updated successfully!');
        } catch (e) {
          alert(e.message);
        } finally {
          setEditRequestModal(null);
          await loadData();
          await loadEventLocks();
        }
        return;
      }

      for (const booking of confirmedBookings) {
        const enabler = enablers[booking.enabler_id];
        if (!enabler || !enabler.user_id) {
          console.warn(
            `Enabler not found or user_id missing for booking ${booking.id}`
          );
          failureCount++;
          continue;
        }

        let complianceCheckResult;
        try {
          complianceCheckResult = await checkComplianceWithFramework(
            enabler.id,
            fieldData.fieldName,
            fieldData.oldValue,
            fieldData.newValue
          );
        } catch (checkError) {
          console.error(
            `Error checking framework compliance for enabler ${enabler.id}:`,
            checkError
          );
          complianceCheckResult = {
            is_compliant: false,
            conflict_reason: 'Error checking compliance: ' + checkError.message,
            applied_fees: 0,
            framework_conditions: [],
          };
        }

        try {
          const editRequest = await EditRequest.create({
            event_id: eventId,
            enabler_id: enabler.id,
            host_id: currentUser.id,
            booking_id: booking.id,
            field_name: fieldData.fieldName,
            old_value: String(fieldData.oldValue),
            new_value: String(fieldData.newValue),
            status: complianceCheckResult.is_compliant
              ? 'auto_approved'
              : 'pending',
            compliance_check: complianceCheckResult,
          });

          if (complianceCheckResult.is_compliant) {
            await applyEditRequest(
              eventId,
              fieldData.fieldName,
              fieldData.newValue
            );

            await Notification.create({
              user_id: enabler.user_id,
              enabler_id: enabler.id,
              type: 'edit_request_auto_approved',
              title: 'Edit Request Auto-Approved',
              message: `Host has changed ${fieldData.fieldName.replace(
                /_/g,
                ' '
              )} for event "${
                event.name
              }". Change was automatically approved per your framework.${
                complianceCheckResult.applied_fees > 0
                  ? ` Change fee: $${complianceCheckResult.applied_fees}`
                  : ''
              }`,
              link: createPageUrl('EnablerBookings') + '?tab=confirmed',
            });
            successCount++;
          } else {
            await Notification.create({
              user_id: enabler.user_id,
              enabler_id: enabler.id,
              type: 'edit_request_pending',
              title: 'Edit Request Requires Review',
              message: `Host has requested to change ${fieldData.fieldName.replace(
                /_/g,
                ' '
              )} for event "${event.name}". Please review and respond.`,
              link: createPageUrl('EnablerBookings') + '?tab=requests',
            });
            pendingCount++;
          }
        } catch (createError) {
          console.error(
            `Error creating edit request or notification for enabler ${enabler.id}:`,
            createError
          );
          failureCount++;
        }
      }

      await DependencyTracker.triggerDependencyRevalidation(
        eventId,
        `${fieldData.fieldName}_changed`,
        {
          field_name: fieldData.fieldName,
          old_value: fieldData.oldValue,
          new_value: fieldData.newValue,
          new_location:
            fieldData.fieldName === 'location'
              ? fieldData.newValue
              : event.location,
          new_date:
            fieldData.fieldName === 'date' ? fieldData.newValue : event.date,
        },
        currentUser.id
      );

      await loadData();
      await loadEventLocks();
      setEditRequestModal(null);

      let alertMessage = 'Edit request submitted!';
      if (successCount > 0) {
        alertMessage += ` ${successCount} enabler(s) auto-approved the change.`;
      }
      if (pendingCount > 0) {
        alertMessage += ` ${pendingCount} enabler(s) will review your request.`;
      }
      if (failureCount > 0) {
        alertMessage += ` Failed to process for ${failureCount} enabler(s).`;
      }
      alert(alertMessage);
    } catch (error) {
      console.error('Error submitting edit request:', error);
      alert('Failed to submit edit request due to an unexpected error.');
    }
  };

  const checkComplianceWithFramework = async (
    enablerId,
    fieldName,
    oldValue,
    newValue
  ) => {
    try {
      const frameworks = await NegotiationFramework.filter({
        enabler_id: enablerId,
        status: 'active',
      });

      if (frameworks.length === 0) {
        return {
          is_compliant: false,
          conflict_reason:
            'No active negotiation framework found for enabler. Request requires manual review.',
          applied_fees: 0,
          framework_conditions: [],
        };
      }

      const framework = frameworks[0];

      if (fieldName === 'date' && framework.schedule_flexibility) {
        const {
          allow_date_changes,
          lead_time_days,
          blackout_dates,
          surge_pricing_dates,
        } = framework.schedule_flexibility;

        if (!allow_date_changes) {
          return {
            is_compliant: false,
            conflict_reason: 'Enabler does not allow date changes.',
            applied_fees: 0,
            framework_conditions: ['Date changes not allowed.'],
          };
        }

        const newDate = parseISO(newValue);
        const today = new Date();
        const daysUntilEvent = Math.ceil(
          (newDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilEvent < lead_time_days) {
          return {
            is_compliant: false,
            conflict_reason: `Changes require at least ${lead_time_days} days notice.`,
            applied_fees: 0,
            framework_conditions: [`${lead_time_days} days notice required.`],
          };
        }

        if (blackout_dates && blackout_dates.includes(newValue)) {
          return {
            is_compliant: false,
            conflict_reason:
              'Requested date is a blackout date and not available.',
            applied_fees: 0,
            framework_conditions: ['Requested date is a blackout date.'],
          };
        }

        let changeFee = 0;
        if (surge_pricing_dates) {
          const surgeDateEntry = surge_pricing_dates.find(
            (d) => d.date === newValue
          );
          if (surgeDateEntry) {
            changeFee = surgeDateEntry.fee || 50;
          }
        }

        return {
          is_compliant: true,
          conflict_reason: null,
          applied_fees: changeFee,
          framework_conditions: [
            'Date change accepted',
            changeFee > 0 ? `Change fee: $${changeFee}` : null,
          ].filter(Boolean),
        };
      }

      if (fieldName === 'guest_count' && framework.guest_count_pricing) {
        const { enabled, max_guests } = framework.guest_count_pricing;

        if (!enabled) {
          return {
            is_compliant: true,
            conflict_reason: null,
            applied_fees: 0,
            framework_conditions: [
              'Guest count changes accepted (no pricing rules).',
            ],
          };
        }

        if (parseInt(newValue) > max_guests) {
          return {
            is_compliant: false,
            conflict_reason: `Maximum guest count is ${max_guests}.`,
            applied_fees: 0,
            framework_conditions: [`Max guests: ${max_guests}`],
          };
        }

        return {
          is_compliant: true,
          conflict_reason: null,
          applied_fees: 0,
          framework_conditions: ['Guest count change accepted.'],
        };
      }

      return {
        is_compliant: false,
        conflict_reason: `No specific framework rule for ${fieldName}. Requires manual review.`,
        applied_fees: 0,
        framework_conditions: [],
      };
    } catch (error) {
      console.error('Error checking framework compliance:', error);
      return {
        is_compliant: false,
        conflict_reason: 'Internal error checking compliance: ' + error.message,
        applied_fees: 0,
        framework_conditions: [],
      };
    }
  };

  const applyEditRequest = async (eventId, fieldName, newValue) => {
    const updateData = { [fieldName]: newValue };
    await Event.update(eventId, updateData);
  };

  const handleDirectEdit = async (eventId, fieldName, newValue) => {
    try {
      await Event.update(eventId, { [fieldName]: newValue });
    } catch (error) {
      console.error('Error updating event directly:', error);
      throw new Error('Failed to update event directly.');
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      setSelectedForComparison(new Set());
      setShowComparisonModal(false);
    }
  };

  const toggleEventForComparison = (eventId) => {
    const newSelected = new Set(selectedForComparison);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      if (newSelected.size < 3) {
        newSelected.add(eventId);
      } else {
        alert('You can compare up to 3 events at a time');
        return;
      }
    }
    setSelectedForComparison(newSelected);
  };

  const getComparisonEvents = () => {
    return events.filter((e) => selectedForComparison.has(e.id));
  };

  const getComparisonSummary = () => {
    const comparedEvents = getComparisonEvents();
    if (comparedEvents.length < 2) return null;

    const budgets = comparedEvents.map((e) => e.budget || 0);
    const guestCounts = comparedEvents.map((e) => e.guest_count || 0);
    const dates = comparedEvents.map((e) => e.date);
    const locations = comparedEvents.map((e) => e.location);

    const budgetDiff = Math.max(...budgets) - Math.min(...budgets);
    const guestDiff = Math.max(...guestCounts) - Math.min(...guestCounts);
    const uniqueLocations = [...new Set(locations.filter(Boolean))].length;

    const allValidDates = dates.filter(Boolean);
    const hasDateConflicts =
      allValidDates.length > 1 &&
      new Set(allValidDates).size < allValidDates.length;

    return {
      budgetDiff,
      guestDiff,
      uniqueLocations,
      hasDateConflicts,
      avgBudget: Math.round(
        budgets.reduce((a, b) => a + b, 0) / budgets.length
      ),
      totalGuests: guestCounts.reduce((a, b) => a + b, 0),
      totalEnablers: comparedEvents.reduce(
        (sum, e) => sum + getEventStats(e.id).total,
        0
      ),
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Header - REMOVED px-4 */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50">
        <div className="max-w-md mx-auto py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-light text-gray-900 tracking-tight">
              My Events
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCompareMode}
                className={`p-2 rounded-full transition-all ${
                  compareMode
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'hover:bg-emerald-50 text-gray-600'
                }`}
              >
                <GitCompare className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <Link to={createPageUrl('GuidedEventCreation')}>
                <button className="p-2 hover:bg-emerald-50 rounded-full transition-colors">
                  <Plus
                    className="w-5 h-5 text-emerald-600"
                    strokeWidth={1.5}
                  />
                </button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Settings
                      className="w-4 h-4 text-gray-600"
                      strokeWidth={1.5}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveTab('completed')}>
                    History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {compareMode && (
            <div className="mb-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
              <p className="text-xs text-emerald-700 text-center font-medium">
                Select up to 3 events to compare • {selectedForComparison.size}
                /3 selected
              </p>
            </div>
          )}

          <div className="flex gap-8 border-b border-emerald-100">
            <button
              onClick={() => setActiveTab('planning')}
              className={`pb-2.5 text-sm font-light tracking-wide transition-all relative ${
                activeTab === 'planning'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Planning
              {activeTab === 'planning' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`pb-2.5 text-sm font-light tracking-wide transition-all relative ${
                activeTab === 'confirmed'
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Confirmed
              {activeTab === 'confirmed' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - REMOVED px-4 */}
      <div className="max-w-md mx-auto pt-32 pb-32">
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No ${activeTab} events`}
            description={
              activeTab === 'planning'
                ? "Start creating your dream event with Blink's AI-powered planning"
                : `You don't have any ${activeTab} events yet`
            }
            actionLabel={
              activeTab === 'planning' ? 'Create Your First Event' : null
            }
            onAction={
              activeTab === 'planning'
                ? () =>
                    (window.location.href = createPageUrl(
                      'GuidedEventCreation'
                    ))
                : null
            }
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const eventImage = eventImages[event.id];
                const stats = getEventStats(event.id);
                const isExpanded = expandedEvent === event.id;
                const eventBookings = bookings.filter(
                  (b) => b.event_id === event.id
                );
                const isEditLocked = hasBookedEnablers(event.id);
                const eventEditRequests = editRequests[event.id] || [];
                const isSelectedForComparison = selectedForComparison.has(
                  event.id
                );

                const venueStatusDisplay = getVenueStatusDisplay(
                  event.venue_status || 'pending_venue'
                );
                const isPendingVenue = event.venue_status === 'pending_venue';

                const eventLock = eventLocks[event.id];
                const hasPendingChanges = pendingChanges[event.id];

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative overflow-hidden rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: isSelectedForComparison
                        ? '2px solid rgba(16, 185, 129, 0.5)'
                        : eventLock
                        ? '2px solid rgba(245, 158, 11, 0.5)'
                        : '1px solid rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    {compareMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEventForComparison(event.id);
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelectedForComparison
                              ? 'bg-emerald-500 border-2 border-emerald-500'
                              : 'bg-white/80 border-2 border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {isSelectedForComparison && (
                            <Check
                              className="w-4 h-4 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      </div>
                    )}

                    {eventLock && (
                      <div className="absolute top-2 right-2 z-20">
                        <ChangeDetectionIndicator
                          show={true}
                          message="Validating changes..."
                          onClick={() => {
                            alert(`Event locked: ${eventLock.lock_reason}`);
                          }}
                        />
                      </div>
                    )}

                    <div
                      onClick={() =>
                        !compareMode &&
                        setExpandedEvent(isExpanded ? null : event.id)
                      }
                      className={compareMode ? '' : 'cursor-pointer'}
                    >
                      <div className="relative h-32 overflow-hidden">
                        {eventImage ? (
                          <img
                            src={eventImage}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-4xl"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))',
                            }}
                          >
                            {getEventIcon(event.type)}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                        <div className="absolute top-2 right-2">
                          <Badge
                            className={`${getStatusColor(
                              event.status
                            )} border backdrop-blur-md font-light text-[10px]`}
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <div className="absolute bottom-2 left-3 right-3">
                          <h3 className="text-base font-semibold text-white line-clamp-1 drop-shadow-lg">
                            {event.display_name || event.name}
                          </h3>
                          {event.event_uid && (
                            <code className="text-[9px] text-gray-200 font-mono block drop-shadow-lg">
                              {event.event_uid}
                            </code>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {event.venue_status && (
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${venueStatusDisplay.bgColor} ${venueStatusDisplay.color} border ${venueStatusDisplay.borderColor}`}
                            >
                              <span className="text-sm">
                                {venueStatusDisplay.icon}
                              </span>
                              <span>{venueStatusDisplay.text}</span>
                            </div>
                          )}
                          {event.type && (
                            <Badge
                              variant="outline"
                              className="capitalize text-[10px] font-medium px-2 py-0.5"
                            >
                              {event.type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar
                                className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                                strokeWidth={1.5}
                              />
                              <span className="text-xs font-light text-gray-700 truncate">
                                {formatEventDate(event.date)}
                              </span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin
                                  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                                  strokeWidth={1.5}
                                />
                                <span className="text-xs font-light text-gray-700 truncate">
                                  {event.location}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {event.guest_count && (
                              <div className="flex items-center gap-2">
                                <Users
                                  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                                  strokeWidth={1.5}
                                />
                                <span className="text-xs font-light text-gray-700">
                                  {event.guest_count} guests
                                </span>
                              </div>
                            )}
                            {event.budget && (
                              <div className="flex items-center gap-2">
                                <DollarSign
                                  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                                  strokeWidth={1.5}
                                />
                                <span className="text-xs font-light text-gray-700">
                                  ${event.budget}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isPendingVenue && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('EventBooking'), {
                                state: {
                                  eventId: event.id,
                                  openVenueDialog: true,
                                },
                              });
                            }}
                            className="mt-3 flex items-center justify-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-100 w-full"
                            style={{
                              background:
                                'linear-gradient(135deg, #3b82f6 0%, #d946ef 100%)',
                              color: 'white',
                            }}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Add Venue</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-emerald-100/50 mt-3">
                          <div className="flex items-center gap-4">
                            {stats.confirmed > 0 && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2
                                  className="w-4 h-4 text-green-500"
                                  strokeWidth={2}
                                />
                                <span className="text-xs font-medium text-green-700">
                                  {stats.confirmed} Booked
                                </span>
                              </div>
                            )}
                            {stats.pending > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Clock
                                  className="w-4 h-4 text-yellow-500"
                                  strokeWidth={2}
                                />
                                <span className="text-xs font-medium text-yellow-700">
                                  {stats.pending} Pending
                                </span>
                              </div>
                            )}
                            {stats.total === 0 && (
                              <span className="text-xs text-gray-400 font-light">
                                No enablers yet
                              </span>
                            )}
                          </div>

                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown
                              className="w-5 h-5 text-gray-400"
                              strokeWidth={1.5}
                            />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-emerald-100/50 overflow-hidden"
                        >
                          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                            <EventNameDisplay
                              event={event}
                              onUpdate={(updatedEvent) => {
                                setEvents(
                                  events.map((e) =>
                                    e.id === updatedEvent.id ? updatedEvent : e
                                  )
                                );
                              }}
                              showUID={true}
                              editable={true}
                            />

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-gray-900 tracking-wide">
                                  EVENT DETAILS
                                </h4>
                                {isEditLocked && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-amber-600 font-medium">
                                      EDIT REQUESTS ONLY
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div
                                className="p-3 rounded-lg border"
                                style={{
                                  background: isEditLocked
                                    ? 'rgba(245, 158, 11, 0.05)'
                                    : 'rgba(16, 185, 129, 0.05)',
                                  borderColor: isEditLocked
                                    ? 'rgba(245, 158, 11, 0.1)'
                                    : 'rgba(16, 185, 129, 0.1)',
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar
                                      className="w-3 h-3 text-emerald-500"
                                      strokeWidth={1.5}
                                    />
                                    <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                                      EVENT DATE
                                    </p>
                                  </div>
                                  {isEditLocked ? (
                                    <button
                                      onClick={() =>
                                        setEditRequestModal({
                                          eventId: event.id,
                                          fieldName: 'date',
                                          currentValue: event.date,
                                          enablerName: eventBookings[0]
                                            ? enablers[
                                                eventBookings[0].enabler_id
                                              ]?.business_name
                                            : 'Enabler',
                                        })
                                      }
                                      className="text-[10px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Request Edit
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        setEditRequestModal({
                                          eventId: event.id,
                                          fieldName: 'date',
                                          currentValue: event.date,
                                          enablerName: null,
                                        })
                                      }
                                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Edit
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 font-light">
                                  {formatEventDate(event.date)}
                                </p>
                              </div>

                              {event.location && (
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    background: isEditLocked
                                      ? 'rgba(245, 158, 11, 0.05)'
                                      : 'rgba(16, 185, 129, 0.05)',
                                    borderColor: isEditLocked
                                      ? 'rgba(245, 158, 11, 0.1)'
                                      : 'rgba(16, 185, 129, 0.1)',
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <MapPin
                                        className="w-3 h-3 text-emerald-500"
                                        strokeWidth={1.5}
                                      />
                                      <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                                        LOCATION
                                      </p>
                                    </div>
                                    {isEditLocked ? (
                                      <button
                                        onClick={() =>
                                          setEditRequestModal({
                                            eventId: event.id,
                                            fieldName: 'location',
                                            currentValue: event.location,
                                            enablerName: eventBookings[0]
                                              ? enablers[
                                                  eventBookings[0].enabler_id
                                                ]?.business_name
                                              : 'Enabler',
                                          })
                                        }
                                        className="text-[10px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Request Edit
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setEditRequestModal({
                                            eventId: event.id,
                                            fieldName: 'location',
                                            currentValue: event.location,
                                            enablerName: null,
                                          })
                                        }
                                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-700 font-light">
                                    {event.location}
                                  </p>
                                </div>
                              )}

                              {event.guest_count && (
                                <div
                                  className="p-3 rounded-lg border"
                                  style={{
                                    background: isEditLocked
                                      ? 'rgba(245, 158, 11, 0.05)'
                                      : 'rgba(16, 185, 129, 0.05)',
                                    borderColor: isEditLocked
                                      ? 'rgba(245, 158, 11, 0.1)'
                                      : 'rgba(16, 185, 129, 0.1)',
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Users
                                        className="w-3 h-3 text-emerald-500"
                                        strokeWidth={1.5}
                                      />
                                      <p className="text-[10px] text-gray-500 font-medium tracking-wide">
                                        GUEST COUNT
                                      </p>
                                    </div>
                                    {isEditLocked ? (
                                      <button
                                        onClick={() =>
                                          setEditRequestModal({
                                            eventId: event.id,
                                            fieldName: 'guest_count',
                                            currentValue: event.guest_count,
                                            enablerName: eventBookings[0]
                                              ? enablers[
                                                  eventBookings[0].enabler_id
                                                ]?.business_name
                                              : 'Enabler',
                                          })
                                        }
                                        className="text-[10px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Request Edit
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setEditRequestModal({
                                            eventId: event.id,
                                            fieldName: 'guest_count',
                                            currentValue: event.guest_count,
                                            enablerName: null,
                                          })
                                        }
                                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-700 font-light">
                                    {event.guest_count} guests
                                  </p>
                                </div>
                              )}

                              {event.theme && (
                                <div
                                  className="p-3 rounded-lg"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    border: '1px solid rgba(16, 185, 129, 0.1)',
                                  }}
                                >
                                  <p className="text-[10px] text-gray-500 font-medium mb-1 tracking-wide">
                                    THEME
                                  </p>
                                  <p className="text-xs text-gray-700 font-light">
                                    {event.theme}
                                  </p>
                                </div>
                              )}

                              {eventEditRequests.length > 0 && (
                                <button
                                  onClick={() =>
                                    setShowEditHistory(
                                      showEditHistory === event.id
                                        ? null
                                        : event.id
                                    )
                                  }
                                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  {showEditHistory === event.id ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  View Edit History ({eventEditRequests.length})
                                </button>
                              )}

                              {showEditHistory === event.id && (
                                <EditHistoryView
                                  editRequests={eventEditRequests}
                                  enablers={enablers}
                                />
                              )}
                            </div>

                            {eventBookings.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2
                                    className="w-4 h-4 text-green-500"
                                    strokeWidth={2}
                                  />
                                  <h4 className="text-xs font-semibold text-gray-900 tracking-wide">
                                    CONFIRMED ENABLERS
                                  </h4>
                                </div>

                                {eventBookings.map((booking) => {
                                  const enabler = enablers[booking.enabler_id];
                                  const pkg = packages[booking.package_id];

                                  if (!enabler) return null;

                                  const hasValidId =
                                    enabler.id &&
                                    String(enabler.id) !== 'null' &&
                                    String(enabler.id) !== 'undefined' &&
                                    String(enabler.id).trim() !== '';

                                  return (
                                    <div
                                      key={booking.id}
                                      className="p-3 rounded-xl"
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        border:
                                          '1px solid rgba(16, 185, 129, 0.15)',
                                      }}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                          {enabler.profile_image ? (
                                            <img
                                              src={enabler.profile_image}
                                              alt={enabler.business_name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">
                                              👤
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-900 truncate">
                                            {enabler.business_name}
                                          </p>
                                          <p className="text-xs text-gray-500 capitalize">
                                            {enabler.category.replace(
                                              /_/g,
                                              ' '
                                            )}
                                          </p>
                                          {pkg && (
                                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                                              {pkg.name} • $
                                              {booking.total_amount}
                                            </p>
                                          )}
                                        </div>

                                        {hasValidId ? (
                                          <Link
                                            to={`${createPageUrl(
                                              'EnablerProfile'
                                            )}?id=${enabler.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                                          >
                                            <ChevronRight className="w-4 h-4" />
                                          </Link>
                                        ) : (
                                          <div className="w-4 h-4" />
                                        )}
                                      </div>

                                      {booking.status === 'confirmed' && (
                                        <div className="mt-2 pt-2 border-t border-emerald-100/30">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditRequestModal({
                                                eventId: event.id,
                                                fieldName: 'booking_details',
                                                currentValue: `Booking with ${enabler.business_name}`,
                                                enablerName:
                                                  enabler.business_name,
                                                bookingId: booking.id,
                                              });
                                            }}
                                            className="text-xs text-gray-500 hover:text-yellow-600 transition-colors flex items-center gap-1"
                                          >
                                            <AlertCircle className="w-3 h-3" />
                                            Request Changes
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {offers.filter((o) => o.event_id === event.id)
                              .length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Clock
                                    className="w-4 h-4 text-yellow-500"
                                    strokeWidth={2}
                                  />
                                  <h4 className="text-xs font-semibold text-gray-900 tracking-wide">
                                    PENDING ENABLERS
                                  </h4>
                                </div>

                                {offers
                                  .filter((o) => o.event_id === event.id)
                                  .map((offer) => {
                                    const enabler = enablers[offer.enabler_id];
                                    const isEditing = editingOffer === offer.id;

                                    if (!enabler) return null;

                                    return (
                                      <div
                                        key={offer.id}
                                        className="p-3 rounded-xl"
                                        style={{
                                          background:
                                            'rgba(245, 158, 11, 0.05)',
                                          border:
                                            '1px solid rgba(245, 158, 11, 0.2)',
                                        }}
                                      >
                                        <div className="flex items-start gap-3 mb-2">
                                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                            {enabler.profile_image ? (
                                              <img
                                                src={enabler.profile_image}
                                                alt={enabler.business_name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center text-lg">
                                                👤
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">
                                              {enabler.business_name}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">
                                              {enabler.category.replace(
                                                /_/g,
                                                ' '
                                              )}
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1 font-medium">
                                              {offer.status ===
                                              'counter_offered'
                                                ? `Counter: ${offer.counter_offer_amount}`
                                                : `Offer: ${offer.offered_amount}`}
                                            </p>
                                          </div>
                                        </div>

                                        {offer.status === 'counter_offered' && (
                                          <div className="mb-2 p-2 bg-yellow-50 rounded-lg">
                                            <p className="text-xs text-yellow-800">
                                              {offer.counter_offer_message}
                                            </p>
                                          </div>
                                        )}

                                        {isEditing ? (
                                          <div
                                            className="space-y-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Input
                                              type="number"
                                              placeholder="Amount"
                                              value={
                                                offerEditData.offered_amount ||
                                                offer.offered_amount
                                              }
                                              onChange={(e) =>
                                                setOfferEditData({
                                                  ...offerEditData,
                                                  offered_amount:
                                                    e.target.value,
                                                })
                                              }
                                              className="h-8 text-xs"
                                            />
                                            <Textarea
                                              placeholder="Custom requirements..."
                                              value={
                                                offerEditData.custom_requirements ||
                                                offer.custom_requirements
                                              }
                                              onChange={(e) =>
                                                setOfferEditData({
                                                  ...offerEditData,
                                                  custom_requirements:
                                                    e.target.value,
                                                })
                                              }
                                              rows={2}
                                              className="text-xs"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() =>
                                                  handleUpdateOffer(offer.id)
                                                }
                                                className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                              >
                                                <Save className="w-3 h-3" />
                                                Save
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setEditingOffer(null)
                                                }
                                                className="flex-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            className="flex gap-2 pt-2 border-t border-yellow-200/50"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              onClick={() => {
                                                setEditingOffer(offer.id);
                                                setOfferEditData({
                                                  offered_amount:
                                                    offer.offered_amount,
                                                  custom_requirements:
                                                    offer.custom_requirements ||
                                                    '',
                                                });
                                              }}
                                              className="flex-1 py-1.5 border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                              Modify
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleRemoveOffer(offer.id)
                                              }
                                              className="flex-1 py-1.5 border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                              <X className="w-3 h-3" />
                                              Remove
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}

                            <Link
                              to={`${createPageUrl('Browse')}?event_id=${
                                event.id
                              }`}
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <button
                                className="w-full py-3 rounded-xl text-sm font-medium text-emerald-700 flex items-center justify-center gap-2 transition-all"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.08)',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                }}
                              >
                                <Plus className="w-4 h-4" strokeWidth={2} />
                                Add More Enablers
                              </button>
                            </Link>

                            {stats.total > 0 && (
                              <Link
                                to={`${createPageUrl(
                                  'EventBooking'
                                )}?event_id=${event.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block"
                              >
                                <button
                                  className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02]"
                                  style={{
                                    background:
                                      'linear-gradient(135deg, #10b981, #06b6d4)',
                                  }}
                                >
                                  <Sparkles
                                    className="w-5 h-5"
                                    strokeWidth={2}
                                  />
                                  Finalize Event Booking
                                </button>
                              </Link>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Delete "${event.name}"? This cannot be undone.`
                                  )
                                ) {
                                  handleDeleteEvent(event.id);
                                }
                              }}
                              className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Delete Event
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {compareMode && selectedForComparison.size >= 2 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setShowComparisonModal(true)}
            className="fixed bottom-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 182, 212, 0.95))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-white" strokeWidth={2} />
              <span className="text-white font-semibold">
                Compare {selectedForComparison.size} Events
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComparisonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowComparisonModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl h-[85vh] rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 60px rgba(16, 185, 129, 0.15)',
              }}
            >
              <div
                className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                    <GitCompare
                      className="w-4 h-4 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Event Comparison
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedForComparison.size} events selected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {(() => {
                const summary = getComparisonSummary();
                if (!summary || selectedForComparison.size < 2) return null;

                return (
                  <div
                    className="flex-shrink-0 px-6 py-3 border-b border-gray-100"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(147, 51, 234, 0.03))',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 mb-1">
                          Key Differences
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {summary.budgetDiff > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              💰 ${summary.budgetDiff.toLocaleString()} budget
                              range
                            </span>
                          )}
                          {summary.guestDiff > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                              👥 {summary.guestDiff} guest difference
                            </span>
                          )}
                          {summary.uniqueLocations > 1 && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                              📍 {summary.uniqueLocations} different locations
                            </span>
                          )}
                          {summary.hasDateConflicts && (
                            <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                              ⚠️ Same date conflict
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${selectedForComparison.size}, minmax(0, 1fr))`,
                  }}
                >
                  {getComparisonEvents().map((event) => {
                    const eventStats = getEventStats(event.id);
                    const eventImage = eventImages[event.id];

                    return (
                      <div key={event.id} className="flex flex-col">
                        <div className="rounded-xl overflow-hidden border border-emerald-100 bg-white flex flex-col h-full">
                          <div className="relative h-24 overflow-hidden flex-shrink-0">
                            {eventImage ? (
                              <img
                                src={eventImage}
                                alt={event.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-2xl"
                                style={{
                                  background:
                                    'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))',
                                }}
                              >
                                {getEventIcon(event.type)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <Badge
                              className={`absolute top-1 right-1 ${getStatusColor(
                                event.status
                              )} text-[9px] py-0 px-1.5`}
                            >
                              {event.status}
                            </Badge>
                          </div>

                          <div className="p-3 space-y-2 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-900 text-xs line-clamp-2 leading-tight">
                              {event.display_name || event.name}
                            </h3>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                <span className="text-[10px] text-gray-700 truncate">
                                  {formatEventDate(event.date)}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700 truncate">
                                    {event.location}
                                  </span>
                                </div>
                              )}
                              {event.guest_count && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700">
                                    {event.guest_count} guests
                                  </span>
                                </div>
                              )}
                              {event.budget && (
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span className="text-[10px] font-semibold text-gray-900">
                                    ${event.budget.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5">
                              <div className="text-center">
                                <p className="text-[9px] text-gray-400 uppercase">
                                  Pros
                                </p>
                                <p className="text-xs font-bold text-gray-900">
                                  {eventStats.total}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-gray-400 uppercase">
                                  Confirmed
                                </p>
                                <p className="text-xs font-bold text-green-600">
                                  {eventStats.confirmed}
                                </p>
                              </div>
                            </div>

                            {event.theme && (
                              <div className="pt-1.5 border-t border-gray-50">
                                <p className="text-[9px] text-gray-700 line-clamp-1 italic">
                                  "{event.theme}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const summary = getComparisonSummary();
                if (!summary || selectedForComparison.size < 2) return null;

                return (
                  <div
                    className="flex-shrink-0 px-6 py-3 border-t border-gray-100"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(16, 185, 129, 0.03), rgba(6, 182, 212, 0.03))',
                    }}
                  >
                    <div className="grid grid-cols-3 gap-3 text-[10px]">
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Avg Budget</p>
                        <p className="font-bold text-gray-900">
                          ${summary.avgBudget.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Total Guests</p>
                        <p className="font-bold text-gray-900">
                          {summary.totalGuests}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Total Pros</p>
                        <p className="font-bold text-gray-900">
                          {summary.totalEnablers}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {editRequestModal && (
        <EditRequestModal
          isOpen={!!editRequestModal}
          onClose={() => setEditRequestModal(null)}
          fieldName={editRequestModal.fieldName}
          currentValue={editRequestModal.currentValue}
          enablerName={editRequestModal.enablerName}
          onSubmit={(message, newValue) =>
            handleEditRequest(editRequestModal.eventId, {
              fieldName: editRequestModal.fieldName,
              oldValue: editRequestModal.currentValue,
              newValue: newValue,
              message: message,
            })
          }
        />
      )}
    </div>
  );
}
