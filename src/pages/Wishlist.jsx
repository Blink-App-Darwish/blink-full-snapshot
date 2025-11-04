import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Wishlist as WishlistEntity, EventWishlist, Enabler, User } from "@/api/entities";
import { Heart, Trash2, Star, Users, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Wishlist() {
  const navigate = useNavigate();
  const [enablerWishlist, setEnablerWishlist] = useState([]);
  const [eventWishlist, setEventWishlist] = useState([]);
  const [enablers, setEnablers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [selectedIndustry, setSelectedIndustry] = useState("all");

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const enablerItems = await WishlistEntity.filter({ user_id: user.id }, "-created_date");
      setEnablerWishlist(enablerItems);
      
      const enablerIds = enablerItems.map(item => item.enabler_id);
      const enablersData = [];
      for (const id of enablerIds) {
        const enabler = await Enabler.filter({ id });
        if (enabler[0]) {
          enablersData.push(enabler[0]);
        }
      }
      setEnablers(enablersData);
      
      const eventItems = await EventWishlist.filter({ user_id: user.id }, "-created_date");
      setEventWishlist(eventItems);
    } catch (error) {
      console.error("Error loading wishlist:", error);
    }
  };

  const removeEnablerFromWishlist = async (itemId) => {
    await WishlistEntity.delete(itemId);
    loadWishlist();
  };

  const removeEventFromWishlist = async (itemId) => {
    await EventWishlist.delete(itemId);
    loadWishlist();
  };

  const recreateEvent = (eventItem) => {
    try {
      const eventData = JSON.parse(eventItem.event_data);
      sessionStorage.setItem('recreateEvent', JSON.stringify(eventData));
      navigate(createPageUrl("CreateEvent"));
    } catch (error) {
      console.error("Error recreating event:", error);
    }
  };

  // Get unique industries from enablers
  const industries = ["all", ...new Set(enablers.map(e => e.industry || e.category).filter(Boolean))];
  
  // Filter enablers by industry
  const filteredEnablers = selectedIndustry === "all" 
    ? enablerWishlist 
    : enablerWishlist.filter(item => {
        const enabler = enablers.find(e => e.id === item.enabler_id);
        return enabler && (enabler.industry === selectedIndustry || enabler.category === selectedIndustry);
      });

  // Group events by type
  const groupedEvents = eventWishlist.reduce((acc, event) => {
    const type = event.event_type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-current" />
            My Wishlist
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {eventWishlist.length + enablerWishlist.length} saved items
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="events" className="flex-1">
              Events ({eventWishlist.length})
            </TabsTrigger>
            <TabsTrigger value="enablers" className="flex-1">
              Enablers ({enablerWishlist.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {eventWishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No saved events</p>
                <Link to={createPageUrl("Home")}>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    Discover Events
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([type, events]) => (
                  <div key={type}>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      {type.replace(/_/g, ' ')} ({events.length})
                    </h3>
                    <div className="space-y-3">
                      {events.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                          {item.event_image && (
                            <div className="relative h-32 bg-gradient-to-br from-emerald-100 via-cyan-50 to-purple-100">
                              <img
                                src={item.event_image}
                                alt={item.event_name}
                                className="w-full h-full object-cover"
                              />
                              <Badge className="absolute top-2 right-2 bg-white/90 text-gray-900 backdrop-blur-sm">
                                {item.event_vibe}
                              </Badge>
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-bold text-gray-900 mb-1">
                                  {item.event_name}
                                </h3>
                                <p className="text-xs text-gray-600 capitalize mb-2">
                                  {item.event_type.replace(/_/g, ' ')}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                  {item.enabler_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {item.enabler_count} pros
                                    </span>
                                  )}
                                  {item.total_cost > 0 && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      ${item.total_cost.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEventFromWishlist(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2"
                              >
                                <Heart className="w-5 h-5 fill-current" />
                              </Button>
                            </div>
                            <Button
                              onClick={() => recreateEvent(item)}
                              className="w-full bg-emerald-500 hover:bg-emerald-600"
                              size="sm"
                            >
                              Create This Event
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enablers">
            {enablerWishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No saved enablers</p>
                <Link to={createPageUrl("Browse")}>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    Discover Enablers
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Industry Filter */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                  {industries.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => setSelectedIndustry(industry)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        selectedIndustry === industry
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {industry === "all" ? "All Industries" : industry.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredEnablers.map((item) => {
                    const enabler = enablers.find(e => e.id === item.enabler_id);
                    if (!enabler) return null;

                    return (
                      <Card key={item.id} className="p-4">
                        <div className="flex gap-4">
                          <Link
                            to={`${createPageUrl("EnablerProfile")}?id=${enabler.id}`}
                            className="flex-1 flex gap-4"
                          >
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                              {enabler.profile_image ? (
                                <img
                                  src={enabler.profile_image}
                                  alt={enabler.business_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                  👤
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate">
                                {enabler.business_name}
                              </h3>
                              <p className="text-sm text-gray-600 truncate">
                                {enabler.tagline}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {enabler.industry || enabler.category}
                              </Badge>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="ml-1 text-sm font-semibold">
                                    {enabler.average_rating || 0}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  ({enabler.total_reviews || 0})
                                </span>
                              </div>
                            </div>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEnablerFromWishlist(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}