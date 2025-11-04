import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { NegotiationSession, Package, Enabler, Event, User } from "@/api/entities";
import { ArrowLeft, Sparkles, Clock, CheckCircle2, XCircle, DollarSign, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import BlinkLogo from "../components/BlinkLogo";

export default function NegotiationDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [packagesMap, setPackagesMap] = useState({});
  const [enablersMap, setEnablersMap] = useState({});
  const [eventsMap, setEventsMap] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      // Load sessions based on user type
      let sessionsData;
      if (userData.user_type === "enabler") {
        const enablers = await Enabler.filter({ user_id: userData.id });
        if (enablers[0]) {
          sessionsData = await NegotiationSession.filter({ enabler_id: enablers[0].id });
        }
      } else {
        sessionsData = await NegotiationSession.filter({ host_id: userData.id });
      }

      setSessions(sessionsData || []);

      // Load related data
      const pkgIds = [...new Set(sessionsData.map(s => s.package_id))];
      const enablerIds = [...new Set(sessionsData.map(s => s.enabler_id))];
      const eventIds = [...new Set(sessionsData.map(s => s.event_id))];

      const [pkgs, enablers, events] = await Promise.all([
        Promise.all(pkgIds.map(id => Package.filter({ id }))),
        Promise.all(enablerIds.map(id => Enabler.filter({ id }))),
        Promise.all(eventIds.map(id => Event.filter({ id })))
      ]);

      const pkgsMap = {};
      pkgs.forEach(arr => { if (arr[0]) pkgsMap[arr[0].id] = arr[0]; });
      setPackagesMap(pkgsMap);

      const enablersMap = {};
      enablers.forEach(arr => { if (arr[0]) enablersMap[arr[0].id] = arr[0]; });
      setEnablersMap(enablersMap);

      const eventsMap = {};
      events.forEach(arr => { if (arr[0]) eventsMap[arr[0].id] = arr[0]; });
      setEventsMap(eventsMap);

    } catch (error) {
      console.error("Error loading negotiations:", error);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      draft: { icon: Clock, color: "bg-gray-100 text-gray-800", label: "Draft" },
      proposed: { icon: Sparkles, color: "bg-blue-100 text-blue-800", label: "Proposed" },
      counter_offered: { icon: DollarSign, color: "bg-amber-100 text-amber-800", label: "Counter Offer" },
      accepted: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800", label: "Accepted" },
      declined: { icon: XCircle, color: "bg-red-100 text-red-800", label: "Declined" },
      expired: { icon: Clock, color: "bg-gray-100 text-gray-600", label: "Expired" }
    };
    return configs[status] || configs.draft;
  };

  const hasRevisions = (session) => {
    if (!session.revised_terms || !session.original_terms) return false;
    return (
      session.revised_terms.price !== session.original_terms.price ||
      session.revised_terms.duration !== session.original_terms.duration ||
      (session.revised_terms.inclusions && session.revised_terms.inclusions.length > 0)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Smart Negotiations</h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage your negotiations</p>
            </div>
            <BlinkLogo size="sm" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {sessions.filter(s => ["proposed", "counter_offered"].includes(s.status)).length === 0 ? (
              <Card className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-500">No active negotiations</p>
              </Card>
            ) : (
              sessions
                .filter(s => ["proposed", "counter_offered"].includes(s.status))
                .map((session) => {
                  const pkg = packagesMap[session.package_id];
                  const enabler = enablersMap[session.enabler_id];
                  const event = eventsMap[session.event_id];
                  const statusConfig = getStatusConfig(session.status);

                  return (
                    <Card key={session.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900">{pkg?.name || "Package"}</h3>
                            <Badge className={statusConfig.color}>
                              <statusConfig.icon className="w-3 h-3 mr-1" strokeWidth={2} />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{enabler?.business_name || "Enabler"}</p>
                          <p className="text-xs text-gray-500 mt-1">Event: {event?.name || "Unnamed Event"}</p>
                        </div>
                        {session.revised_terms && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              ${session.revised_terms.price || session.original_terms?.price}
                            </p>
                            {hasRevisions(session) && (
                              <Badge className="mt-2 bg-amber-100 text-amber-700">
                                <FileText className="w-3 h-3 mr-1" strokeWidth={2} />
                                Revised Terms
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {hasRevisions(session) && session.revised_terms && (
                        <div className="bg-amber-50 rounded-lg p-4 mt-4 border border-amber-200">
                          <p className="text-xs font-semibold text-amber-900 mb-2">PROPOSED CHANGES:</p>
                          <div className="space-y-1 text-xs text-amber-800">
                            {session.revised_terms.price !== session.original_terms.price && (
                              <div className="flex justify-between">
                                <span>Price:</span>
                                <span className="font-medium">
                                  ${session.original_terms.price} → ${session.revised_terms.price}
                                </span>
                              </div>
                            )}
                            {session.revised_terms.duration && (
                              <div className="flex justify-between">
                                <span>Duration:</span>
                                <span className="font-medium">{session.revised_terms.duration}</span>
                              </div>
                            )}
                            {session.revised_terms.inclusions && session.revised_terms.inclusions.length > 0 && (
                              <div>
                                <span>Add-ons:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {session.revised_terms.inclusions.map((inc, idx) => (
                                    <span key={idx} className="bg-white px-2 py-0.5 rounded text-xs">
                                      {inc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {session.expires_at && (
                        <p className="text-xs text-gray-500 mt-4">
                          Expires {format(new Date(session.expires_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </Card>
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {sessions.filter(s => s.status === "accepted").length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-500">No accepted negotiations yet</p>
              </Card>
            ) : (
              sessions
                .filter(s => s.status === "accepted")
                .map((session) => {
                  const pkg = packagesMap[session.package_id];
                  const enabler = enablersMap[session.enabler_id];
                  const event = eventsMap[session.event_id];

                  return (
                    <Card key={session.id} className="p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900">{pkg?.name || "Package"}</h3>
                            <Badge className="bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={2} />
                              Accepted
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{enabler?.business_name || "Enabler"}</p>
                          <p className="text-xs text-gray-600 mt-1">Event: {event?.name || "Unnamed Event"}</p>
                          {session.host_signed_at && (
                            <p className="text-xs text-emerald-600 mt-2">
                              ✓ Signed {format(new Date(session.host_signed_at), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        {session.revised_terms && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-700">
                              ${session.revised_terms.price || session.original_terms?.price}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {sessions.filter(s => ["declined", "expired"].includes(s.status)).length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-500">No negotiation history</p>
              </Card>
            ) : (
              sessions
                .filter(s => ["declined", "expired"].includes(s.status))
                .map((session) => {
                  const pkg = packagesMap[session.package_id];
                  const enabler = enablersMap[session.enabler_id];
                  const statusConfig = getStatusConfig(session.status);

                  return (
                    <Card key={session.id} className="p-6 opacity-75">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{pkg?.name || "Package"}</h3>
                            <Badge className={statusConfig.color}>
                              <statusConfig.icon className="w-3 h-3 mr-1" strokeWidth={2} />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{enabler?.business_name || "Enabler"}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}