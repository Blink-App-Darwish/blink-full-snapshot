
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { EventWishlist, Wishlist, User, Enabler, Event, BookingOffer } from "@/api/entities";
import { ArrowLeft, Heart, Trash2, Plus, Calendar, MapPin, Users, DollarSign, ChevronDown, Filter, Bell, Star, TrendingUp, Grid3x3, List, CalendarPlus, GitCompare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlinkLogo from "../components/BlinkLogo";
import { motion, AnimatePresence } from "framer-motion";

export default function WishlistView() {
  const navigate = useNavigate();
  const [eventWishlist, setEventWishlist] = useState([]);
  const [enablerWishlist, setEnablerWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("date_added");
  const [groupBy, setGroupBy] = useState("none");
  const [showFilters, setShowFilters] = useState(false);
  
  // Add to Event modal
  const [showAddToEventModal, setShowAddToEventModal] = useState(false);
  const [selectedEnablerForEvent, setSelectedEnablerForEvent] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [isAddingToEvent, setIsAddingToEvent] = useState(false);

  // Comparison states
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  useEffect(() => {
    loadWishlist();
    loadUserEvents();
  }, []);

  const loadWishlist = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      // Load event wishlist
      const eventItems = await EventWishlist.filter(
        { user_id: userData.id },
        "-created_date"
      );
      setEventWishlist(eventItems);

      // Load enabler wishlist
      const enablerItems = await Wishlist.filter(
        { user_id: userData.id },
        "-created_date"
      );
      
      // Enrich enabler data
      const enrichedEnablers = await Promise.all(
        enablerItems.map(async (item) => {
          try {
            const enabler = await Enabler.filter({ id: item.enabler_id });
            if (enabler[0]) {
              return {
                ...item,
                enabler_name: enabler[0].business_name || enabler[0].brand_name,
                enabler_category: enabler[0].category,
                enabler_image: enabler[0].profile_image,
                base_price: enabler[0].base_price,
                location: enabler[0].location,
                average_rating: enabler[0].average_rating
              };
            }
            return item;
          } catch (error) {
            console.error("Error loading enabler data:", error);
            return item;
          }
        })
      );
      
      setEnablerWishlist(enrichedEnablers);
    } catch (error) {
      console.error("Error loading wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserEvents = async () => {
    try {
      const userData = await User.me();
      const events = await Event.filter(
        { host_id: userData.id },
        "-date",
        20
      );
      // Filter out completed/cancelled events
      const activeEvents = events.filter(e => 
        e.status !== 'completed' && e.status !== 'cancelled'
      );
      setUserEvents(activeEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleDeleteEvent = async (itemId) => {
    if (!confirm("Remove this event from your wishlist?")) return;
    try {
      await EventWishlist.delete(itemId);
      await loadWishlist();
      setSelectedForComparison(prev => {
        const newSet = new Set(prev);
        newSet.delete(`event-${itemId}`);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleDeleteEnabler = async (itemId) => {
    if (!confirm("Remove this enabler from your wishlist?")) return;
    try {
      await Wishlist.delete(itemId);
      await loadWishlist();
      setSelectedForComparison(prev => {
        const newSet = new Set(prev);
        newSet.delete(`enabler-${itemId}`);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting enabler:", error);
    }
  };

  const handleCreateEvent = async (item) => {
    try {
      const { Event } = await import("@/api/entities");
      const eventData = item.event_data ? JSON.parse(item.event_data) : {};
      
      const newEvent = await Event.create({
        host_id: user.id,
        name: item.event_name,
        type: item.event_type,
        date: item.date || "",
        location: item.location || "",
        guest_count: item.guest_count || 0,
        budget: item.budget || 0,
        theme: item.event_theme || "",
        status: "planning",
        image: item.event_image || ""
      });

      if (eventData.bookings && eventData.bookings.length > 0) {
        const { BookingOffer } = await import("@/api/entities");
        for (const booking of eventData.bookings) {
          await BookingOffer.create({
            event_id: newEvent.id,
            enabler_id: booking.enabler_id,
            host_id: user.id,
            package_id: booking.package_id || "",
            offered_amount: booking.total_amount,
            status: "pending"
          });
        }
      }

      navigate(`${createPageUrl("EventDetail")}?id=${newEvent.id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
    }
  };

  const toggleNotification = async (item, type, notificationType) => {
    try {
      const currentValue = item[notificationType];
      if (type === 'event') {
        await EventWishlist.update(item.id, { [notificationType]: !currentValue });
      } else {
        await Wishlist.update(item.id, { [notificationType]: !currentValue });
      }
      await loadWishlist();
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  const sortItems = (items, type) => {
    let sorted = [...items];
    switch (sortBy) {
      case "date_added":
        sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case "price_low":
        sorted.sort((a, b) => (a.total_cost || a.base_price || 0) - (b.total_cost || b.base_price || 0));
        break;
      case "price_high":
        sorted.sort((a, b) => (b.total_cost || b.base_price || 0) - (a.total_cost || a.base_price || 0));
        break;
      case "popularity":
        if (type === 'enabler') {
          sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        }
        break;
      case "alphabetical":
        sorted.sort((a, b) => {
          const nameA = a.event_name || a.enabler_name || "";
          const nameB = b.event_name || b.enabler_name || "";
          return nameA.localeCompare(nameB);
        });
        break;
    }
    return sorted;
  };

  const groupItems = (items, type) => {
    if (groupBy === "none") return { "All Items": items };
    
    const grouped = {};
    items.forEach(item => {
      let key;
      if (groupBy === "type") {
        key = type === 'event' ? 
          (item.event_type || "Other").replace(/_/g, ' ') : 
          (item.enabler_category || "Other").replace(/_/g, ' ');
      } else if (groupBy === "price_range") {
        const price = item.total_cost || item.base_price || 0;
        if (price === 0) key = "No Price Set";
        else if (price < 500) key = "Under $500";
        else if (price < 1000) key = "$500 - $1,000";
        else if (price < 5000) key = "$1,000 - $5,000";
        else key = "$5,000+";
      } else if (groupBy === "date") {
        if (type === 'event' && item.date) {
          const eventDate = new Date(item.date);
          const today = new Date();
          const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) key = "Past Events";
          else if (diffDays < 30) key = "Within 30 Days";
          else if (diffDays < 90) key = "Within 3 Months";
          else key = "Future Events";
        } else {
          key = "No Date Set";
        }
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const getFilteredItems = () => {
    let events = eventWishlist;
    let enablers = enablerWishlist;

    if (activeTab === "events") {
      return { events: sortItems(events, 'event'), enablers: [] };
    } else if (activeTab === "enablers") {
      return { events: [], enablers: sortItems(enablers, 'enabler') };
    }
    return { 
      events: sortItems(events, 'event'), 
      enablers: sortItems(enablers, 'enabler') 
    };
  };

  const handleAddToEvent = async (eventId) => {
    if (!selectedEnablerForEvent || !eventId) return;
    
    setIsAddingToEvent(true);
    try {
      await BookingOffer.create({
        event_id: eventId,
        enabler_id: selectedEnablerForEvent.enabler_id,
        host_id: user.id,
        offered_amount: selectedEnablerForEvent.base_price || 0,
        custom_requirements: `Added from favorites - ${selectedEnablerForEvent.enabler_category?.replace(/_/g, ' ')}`,
        status: "pending"
      });
      
      setShowAddToEventModal(false);
      setSelectedEnablerForEvent(null);
      
      // Show success feedback
      alert(`${selectedEnablerForEvent.enabler_name} added to your event!`);
    } catch (error) {
      console.error("Error adding to event:", error);
      alert("Failed to add to event. Please try again.");
    } finally {
      setIsAddingToEvent(false);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) { // If turning off compare mode
      setSelectedForComparison(new Set());
      setShowComparisonModal(false);
    }
  };

  const toggleItemForComparison = (itemId, itemType) => {
    const key = `${itemType}-${itemId}`;
    const newSelected = new Set(selectedForComparison);
    
    // Allow deselection
    if (newSelected.has(key)) {
      newSelected.delete(key);
      setSelectedForComparison(newSelected);
      return;
    }
    
    // Check max limit
    const MAX_COMPARISON_ITEMS = 4;
    if (newSelected.size >= MAX_COMPARISON_ITEMS) {
      alert(`You can compare up to ${MAX_COMPARISON_ITEMS} items at a time.`);
      return;
    }
    
    // Get the item being selected
    let selectedItem;
    if (itemType === 'event') {
      selectedItem = eventWishlist.find(e => e.id === itemId);
    } else {
      selectedItem = enablerWishlist.find(e => e.id === itemId);
    }
    
    if (!selectedItem) return;
    
    // Check compatibility with already selected items
    if (newSelected.size > 0) {
      const firstSelectedKey = Array.from(newSelected)[0];
      const [firstType, firstId] = firstSelectedKey.split('-');
      
      // Must be same base type (event vs enabler)
      if (firstType !== itemType) {
        alert("You can only compare items of the same type (events with events, or pros with pros).");
        return;
      }
      
      // Get first selected item for detailed type/category comparison
      let firstItem;
      if (firstType === 'event') {
        firstItem = eventWishlist.find(e => e.id === firstId);
        // Check if event types match
        if (firstItem && selectedItem.event_type !== firstItem.event_type) {
          const firstTypeName = (firstItem.event_type || 'Other').replace(/_/g, ' ');
          const selectedTypeName = (selectedItem.event_type || 'Other').replace(/_/g, ' ');
          alert(`You can only compare events of the same type. You've selected "${firstTypeName}", but you're trying to add "${selectedTypeName}".`);
          return;
        }
      } else { // firstType === 'enabler'
        firstItem = enablerWishlist.find(e => e.id === firstId);
        // Check if enabler categories match
        if (firstItem && selectedItem.enabler_category !== firstItem.enabler_category) {
          const firstCategoryName = (firstItem.enabler_category || 'Professional').replace(/_/g, ' ');
          const selectedCategoryName = (selectedItem.enabler_category || 'Professional').replace(/_/g, ' ');
          alert(`You can only compare pros of the same category. You've selected "${firstCategoryName}", but you're trying to add "${selectedCategoryName}".`);
          return;
        }
      }
    }
    
    // All checks passed, add to selection
    newSelected.add(key);
    setSelectedForComparison(newSelected);
  };

  const getComparisonItems = () => {
    const items = [];
    selectedForComparison.forEach(key => {
      const [type, id] = key.split('-');
      if (type === 'event') {
        const item = eventWishlist.find(e => e.id === id);
        if (item) items.push({ ...item, _type: 'event' });
      } else {
        const item = enablerWishlist.find(e => e.id === id);
        if (item) items.push({ ...item, _type: 'enabler' });
      }
    });
    return items;
  };

  const getComparisonSummary = () => {
    const items = getComparisonItems();
    if (items.length < 2) return null;

    const prices = items.map(item => item.total_cost || item.base_price || 0);
    const locations = items.map(item => item.location).filter(Boolean);
    const dates = items.map(item => item.date).filter(Boolean);

    const priceDiff = Math.max(...prices) - Math.min(...prices);
    const uniqueLocations = [...new Set(locations)].length;
    
    // Check for date conflicts only if there are multiple dates and at least one is the same
    const hasDateConflicts = dates.length > 1 && new Set(dates).size !== dates.length;
    
    const eventCount = items.filter(i => i._type === 'event').length;
    const enablerCount = items.filter(i => i._type === 'enabler').length;

    return {
      priceDiff,
      uniqueLocations,
      hasDateConflicts,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      totalPrice: prices.reduce((a, b) => a + b, 0),
      eventCount,
      enablerCount
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  const { events, enablers } = getFilteredItems();
  const totalItems = eventWishlist.length + enablerWishlist.length;

  let paddingTopClass = 'pt-[56px]'; // Default pt-14 (56px) for base header (40px) + 16px buffer
  if (compareMode && !showFilters) {
      // Base header (40px) + compare banner (~30px) + 16px buffer = 86px
      paddingTopClass = 'pt-[86px]'; 
  }
  if (showFilters) { // Filters always take precedence and cover more height
      if (compareMode) {
          // Base header (40px) + compare banner (~30px) + filters (~100px) + 16px buffer = 186px
          paddingTopClass = 'pt-[186px]'; 
      } else {
          // Base header (40px) + filters (~100px) + 16px buffer = 156px
          paddingTopClass = 'pt-[156px]'; 
      }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Ultra-Minimal Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 z-10">
        <div className="max-w-md mx-auto px-4 py-1.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full h-7 w-7"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-light text-gray-900">Your Loved Events</h1>
            <p className="text-[9px] text-gray-500">{totalItems} saved</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCompareMode}
            className={`rounded-full h-7 w-7 ${compareMode ? 'bg-emerald-100 text-emerald-700' : ''}`}
          >
            <GitCompare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-full h-7 w-7"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Compare Mode Banner */}
        {compareMode && (
          <div className="max-w-md mx-auto px-4 py-2 bg-emerald-50/50 border-t border-emerald-100/50">
            <p className="text-xs text-emerald-700 text-center font-medium">
              Select up to 4 items of the same type to compare • {selectedForComparison.size}/4 selected
            </p>
          </div>
        )}

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-emerald-100/50 overflow-hidden"
            >
              <div className="max-w-md mx-auto px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-gray-500 tracking-wide mb-1 block">SORT BY</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 text-xs bg-white/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_added">Recently Added</SelectItem>
                        <SelectItem value="price_low">💰 Price: Low to High</SelectItem>
                        <SelectItem value="price_high">💎 Price: High to Low</SelectItem>
                        <SelectItem value="popularity">⭐ Most Popular</SelectItem>
                        <SelectItem value="alphabetical">🔤 A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[9px] text-gray-500 tracking-wide mb-1 block">GROUP BY</label>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger className="h-8 text-xs bg-white/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grouping</SelectItem>
                        <SelectItem value="type">📋 Type</SelectItem>
                        <SelectItem value="price_range">💵 Price Range</SelectItem>
                        <SelectItem value="date">📅 Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className={`max-w-md mx-auto px-4 pb-32 transition-all duration-300 ${paddingTopClass}`}>
        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="w-full grid grid-cols-3 bg-white/60 backdrop-blur-md p-1 rounded-xl">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              All ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Events ({eventWishlist.length})
            </TabsTrigger>
            <TabsTrigger value="enablers" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Pros ({enablerWishlist.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {totalItems === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-light text-gray-900 mb-2">No Saved Items Yet</h2>
              <p className="text-sm text-gray-600">
                Save events and enablers to create your dream setup
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-emerald-200 rounded-2xl p-6 text-center">
              <Link to={createPageUrl("Blink")}>
                <Button className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white py-3 text-sm shadow-md hover:shadow-lg transition-all rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Explore Blink
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Event Cards */}
            {(activeTab === "all" || activeTab === "events") && events.length > 0 && (
              <div className="space-y-3">
                {groupBy === "none" ? (
                  <EventCards 
                    items={events} 
                    expandedCard={expandedCard}
                    setExpandedCard={setExpandedCard}
                    onDelete={handleDeleteEvent}
                    onCreate={handleCreateEvent}
                    onToggleNotification={toggleNotification}
                    compareMode={compareMode}
                    selectedForComparison={selectedForComparison}
                    onToggleComparison={toggleItemForComparison}
                  />
                ) : (
                  Object.entries(groupItems(events, 'event')).map(([groupName, groupItems]) => (
                    <div key={groupName} className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-700 tracking-wide uppercase px-2">{groupName}</h3>
                      <EventCards 
                        items={groupItems} 
                        expandedCard={expandedCard}
                        setExpandedCard={setExpandedCard}
                        onDelete={handleDeleteEvent}
                        onCreate={handleCreateEvent}
                        onToggleNotification={toggleNotification}
                        compareMode={compareMode}
                        selectedForComparison={selectedForComparison}
                        onToggleComparison={toggleItemForComparison}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Enabler Cards */}
            {(activeTab === "all" || activeTab === "enablers") && enablers.length > 0 && (
              <div className="space-y-3">
                {groupBy === "none" ? (
                  <EnablerCards 
                    items={enablers} 
                    expandedCard={expandedCard}
                    setExpandedCard={setExpandedCard}
                    onDelete={handleDeleteEnabler}
                    onToggleNotification={toggleNotification}
                    navigate={navigate}
                    onAddToEvent={(enabler) => {
                      setSelectedEnablerForEvent(enabler);
                      setShowAddToEventModal(true);
                    }}
                    compareMode={compareMode}
                    selectedForComparison={selectedForComparison}
                    onToggleComparison={toggleItemForComparison}
                  />
                ) : (
                  Object.entries(groupItems(enablers, 'enabler')).map(([groupName, groupItems]) => (
                    <div key={groupName} className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-700 tracking-wide uppercase px-2">{groupName}</h3>
                      <EnablerCards 
                        items={groupItems} 
                        expandedCard={expandedCard}
                        setExpandedCard={setExpandedCard}
                        onDelete={handleDeleteEnabler}
                        onToggleNotification={toggleNotification}
                        navigate={navigate}
                        onAddToEvent={(enabler) => {
                          setSelectedEnablerForEvent(enabler);
                          setShowAddToEventModal(true);
                        }}
                        compareMode={compareMode}
                        selectedForComparison={selectedForComparison}
                        onToggleComparison={toggleItemForComparison}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Compare Button */}
      <AnimatePresence>
        {compareMode && selectedForComparison.size >= 2 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setShowComparisonModal(true)}
            className="fixed bottom-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 182, 212, 0.95))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-white" strokeWidth={2} />
              <span className="text-white font-semibold">Compare {selectedForComparison.size} Items</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Comparison Modal - Ultra Compact */}
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
              className="w-full max-w-6xl h-[85vh] rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 0 60px rgba(16, 185, 129, 0.15)'
              }}
            >
              {/* Compact Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))'
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                    <GitCompare className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Favorites Comparison</h2>
                    <p className="text-xs text-gray-500">{selectedForComparison.size} items selected</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500 rotate-45" />
                </button>
              </div>

              {/* Differences Summary */}
              {(() => {
                const summary = getComparisonSummary();
                if (!summary) return null;
                
                return (
                  <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100" style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(147, 51, 234, 0.03))'
                  }}>
                    <div className="flex items-start gap-3">
                      <Heart className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0 fill-pink-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Key Differences</p>
                        <div className="flex flex-wrap gap-2">
                          {summary.priceDiff > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                              💰 ${summary.priceDiff.toLocaleString()} price range
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
                          {summary.eventCount > 0 && summary.enablerCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                              🎯 Mixed: {summary.eventCount} events, {summary.enablerCount} pros
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Compact Comparison Grid - Now supports up to 4 columns */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div 
                  className="grid gap-3" 
                  style={{
                    gridTemplateColumns: selectedForComparison.size <= 2 
                      ? `repeat(${selectedForComparison.size}, minmax(0, 1fr))`
                      : selectedForComparison.size === 3
                      ? 'repeat(3, minmax(0, 1fr))'
                      : 'repeat(2, minmax(0, 1fr))'
                  }}
                >
                  {getComparisonItems().map((item) => {
                    const isEvent = item._type === 'event';
                    
                    return (
                      <div key={item.id} className="flex flex-col">
                        {/* Compact Card */}
                        <div className="rounded-xl overflow-hidden border bg-white flex flex-col h-full" style={{
                          borderColor: isEvent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(168, 85, 247, 0.3)'
                        }}>
                          {/* Mini Image */}
                          <div className="relative h-24 overflow-hidden flex-shrink-0">
                            {(isEvent ? item.event_image : item.enabler_image) ? (
                              <img 
                                src={isEvent ? item.event_image : item.enabler_image} 
                                alt={isEvent ? item.event_name : item.enabler_name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl" style={{
                                background: isEvent 
                                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1))'
                                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))'
                              }}>
                                {isEvent ? (item.event_type === "wedding" ? "💍" : item.event_type === "birthday" ? "🎂" : "✨") : "👤"}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <Badge className={`absolute top-1 right-1 text-[9px] py-0 px-1.5 ${isEvent ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'} border-0`}>
                              {isEvent ? item.event_type?.replace(/_/g, ' ') : item.enabler_category?.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          {/* Compact Info */}
                          <div className="p-3 space-y-2 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-900 text-xs line-clamp-2 leading-tight">
                              {isEvent ? item.event_name : item.enabler_name}
                            </h3>

                            <div className="space-y-1.5 flex-1">
                              {item.date && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700 truncate">
                                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              {item.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700 truncate">{item.location}</span>
                                </div>
                              )}
                              {isEvent && item.guest_count && item.guest_count > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700">{item.guest_count} guests</span>
                                </div>
                              )}
                              {(item.total_cost || item.base_price) && (
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span className="text-[10px] font-semibold text-gray-900">
                                    ${(item.total_cost || item.base_price).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {!isEvent && item.average_rating > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                  <span className="text-[10px] text-gray-700">{item.average_rating} rating</span>
                                </div>
                              )}
                            </div>

                            {/* Theme/Additional Info */}
                            {isEvent && item.event_theme && (
                              <div className="pt-1.5 border-t border-gray-50">
                                <p className="text-[9px] text-gray-700 line-clamp-1 italic">"{item.event_theme}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compact Summary Footer */}
              {(() => {
                const summary = getComparisonSummary();
                if (!summary) return null;
                
                return (
                  <div className="flex-shrink-0 px-6 py-3 border-t border-gray-100" style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03), rgba(6, 182, 212, 0.03))'
                  }}>
                    <div className="grid grid-cols-3 gap-3 text-[10px]">
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Avg Price</p>
                        <p className="font-bold text-gray-900">${summary.avgPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Total Value</p>
                        <p className="font-bold text-gray-900">${summary.totalPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-0.5">Mix</p>
                        <p className="font-bold text-gray-900">{summary.eventCount}E + {summary.enablerCount}P</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Event Modal */}
      <AnimatePresence>
        {showAddToEventModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAddToEventModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Add to Event</h3>
                  <button
                    onClick={() => setShowAddToEventModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600 rotate-45" />
                  </button>
                </div>

                {userEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-4">No active events yet</p>
                    <Button
                      onClick={() => {
                        setShowAddToEventModal(false);
                        navigate(createPageUrl("GuidedEventCreation"));
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Create Your First Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => handleAddToEvent(event.id)}
                        disabled={isAddingToEvent}
                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all disabled:opacity-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">
                              {event.type === "wedding" ? "💍" :
                               event.type === "birthday" ? "🎂" :
                               event.type === "corporate" ? "🏢" : "✨"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {event.date && new Date(event.date).toLocaleDateString()}
                              {event.location && ` • ${event.location}`}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Event Cards Component
function EventCards({ items, expandedCard, setExpandedCard, onDelete, onCreate, onToggleNotification, compareMode, selectedForComparison, onToggleComparison }) {
  return (
    <AnimatePresence>
      {items.map((item) => {
        const isExpanded = expandedCard === `event-${item.id}`;
        const isSelected = selectedForComparison?.has(`event-${item.id}`);
        
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border border-emerald-200 hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
              {/* Comparison Checkbox */}
              {compareMode && (
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComparison(item.id, 'event');
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-2 border-emerald-500'
                        : 'bg-white/80 border-2 border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                </div>
              )}

              <div className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex-shrink-0 shadow-md">
                    {item.event_image ? (
                      <img src={item.event_image} alt={item.event_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl">
                        {item.event_type === "wedding" ? "💍" :
                         item.event_type === "birthday" ? "🎂" :
                         item.event_type === "corporate" ? "🏢" : "✨"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate text-base">{item.event_name}</h3>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                      <Badge variant="secondary" className="text-[9px] capitalize bg-emerald-100 text-emerald-700 border-0">
                        {item.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : `event-${item.id}`)}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-2"
                    >
                      <span>{isExpanded ? 'Less' : 'More'} Details</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="bg-white/40 backdrop-blur-lg rounded-xl p-3 border border-emerald-100/50">
                        <div className="space-y-2 text-xs text-gray-700">
                          {item.date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="font-medium">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.guest_count > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span>{item.guest_count} guests expected</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {(item.event_theme || item.event_vibe) && (
                        <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-lg rounded-xl p-3 border border-purple-100/50">
                          {item.event_theme && (
                            <p className="text-xs text-gray-700 mb-1">
                              <span className="font-semibold">Theme:</span> {item.event_theme}
                            </p>
                          )}
                          {item.event_vibe && (
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">Vibe:</span> {item.event_vibe}
                            </p>
                          )}
                        </div>
                      )}

                      {item.total_cost > 0 && (
                        <div className="bg-emerald-50/70 backdrop-blur-lg rounded-xl p-3 border border-emerald-200/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-500 font-light">Estimated Total</p>
                              <p className="text-lg font-bold text-emerald-600">${item.total_cost.toLocaleString()}</p>
                            </div>
                            {item.enabler_count > 0 && (
                              <div className="text-right">
                                <p className="text-[10px] text-gray-500">Services</p>
                                <p className="text-sm font-semibold text-gray-700">{item.enabler_count} pros</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notification Settings */}
                      <div className="bg-blue-50/50 backdrop-blur-lg rounded-xl p-3 border border-blue-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="w-3 h-3 text-blue-600" />
                          <span className="text-[10px] font-semibold text-blue-900 tracking-wide">NOTIFICATIONS</span>
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.notify_on_price_drop || false}
                              onChange={() => onToggleNotification(item, 'event', 'notify_on_price_drop')}
                              className="rounded border-gray-300"
                            />
                            <span>Notify on price drops</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.notify_on_similar || false}
                              onChange={() => onToggleNotification(item, 'event', 'notify_on_similar')}
                              className="rounded border-gray-300"
                            />
                            <span>Similar event recommendations</span>
                          </label>
                        </div>
                      </div>

                      <Button
                        onClick={() => onCreate(item)}
                        className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white py-2.5 text-sm shadow-md hover:shadow-lg transition-all rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create This Event
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

// Enabler Cards Component
function EnablerCards({ items, expandedCard, setExpandedCard, onDelete, onToggleNotification, navigate, onAddToEvent, compareMode, selectedForComparison, onToggleComparison }) {
  return (
    <AnimatePresence>
      {items.map((item) => {
        const isExpanded = expandedCard === `enabler-${item.id}`;
        const isSelected = selectedForComparison?.has(`enabler-${item.id}`);
        
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-md border border-purple-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300">
              {/* Comparison Checkbox */}
              {compareMode && (
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComparison(item.id, 'enabler');
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-purple-500 border-2 border-purple-500'
                        : 'bg-white/80 border-2 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                </div>
              )}

              <div className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 flex-shrink-0 shadow-md">
                    {item.enabler_image ? (
                      <img src={item.enabler_image} alt={item.enabler_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl">
                        👤
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate text-base">{item.enabler_name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Add to Event Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToEvent(item);
                            }}
                            className="p-1 hover:bg-purple-50 rounded-full transition-colors"
                            title="Add to event"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-purple-600" />
                          </button>
                          
                          {/* Delete Icon */}
                          <button
                            onClick={() => onDelete(item.id)}
                            className="p-1 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] capitalize bg-purple-100 text-purple-700 border-0">
                        {item.enabler_category?.replace(/_/g, ' ') || 'Professional'}
                      </Badge>
                    </div>

                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : `enabler-${item.id}`)}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium mt-2"
                    >
                      <span>{isExpanded ? 'Less' : 'More'} Details</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="bg-white/40 backdrop-blur-lg rounded-xl p-3 border border-purple-100/50">
                        <div className="space-y-2 text-xs text-gray-700">
                          {item.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.average_rating > 0 && (
                            <div className="flex items-center gap-2">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              <span className="font-medium">{item.average_rating} rating</span>
                            </div>
                          )}
                          {item.base_price > 0 && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                              <span>Starting from ${item.base_price}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notification Settings */}
                      <div className="bg-blue-50/50 backdrop-blur-lg rounded-xl p-3 border border-blue-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="w-3 h-3 text-blue-600" />
                          <span className="text-[10px] font-semibold text-blue-900 tracking-wide">NOTIFICATIONS</span>
                        </div>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.notify_on_price_drop || false}
                              onChange={() => onToggleNotification(item, 'enabler', 'notify_on_price_drop')}
                              className="rounded border-gray-300"
                            />
                            <span>Notify on price drops</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.notify_on_availability || false}
                              onChange={() => onToggleNotification(item, 'enabler', 'notify_on_availability')}
                              className="rounded border-gray-300"
                            />
                            <span>Notify on availability changes</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.notify_on_similar || false}
                              onChange={() => onToggleNotification(item, 'enabler', 'notify_on_similar')}
                              className="rounded border-gray-300"
                            />
                            <span>Similar professional recommendations</span>
                          </label>
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate(`${createPageUrl("EnablerProfile")}?id=${item.enabler_id}`)}
                        className="w-full bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white py-2.5 text-sm shadow-md hover:shadow-lg transition-all rounded-xl"
                      >
                        View Profile
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
