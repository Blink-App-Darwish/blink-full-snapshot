
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  Target,
  BarChart3,
  DollarSign,
  Calendar,
  MessageSquare,
  Eye,
  Send,
  Download,
  RefreshCw,
  Zap,
  Shield,
  FileText,
  XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export default function HostRelationsCRM() {
  const [hosts, setHosts] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [qualityAlerts, setQualityAlerts] = useState([]);
  const [selectedHost, setSelectedHost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadHostData();
  }, [filterStatus]);

  const loadHostData = async () => {
    setIsLoading(true);
    try {
      // Load all users who have created events (hosts)
      const { User, Event } = await import("@/api/entities");
      const allUsers = await User.list("-created_date", 200);
      
      // Filter to only users who have created events
      const hostsWithEvents = [];
      for (const user of allUsers) {
        const events = await Event.filter({ host_id: user.id }, "-created_date", 1);
        if (events.length > 0) {
          hostsWithEvents.push(user);
        }
      }
      
      setHosts(hostsWithEvents);

      // Load performance metrics
      await loadPerformanceMetrics(hostsWithEvents);

      // Load quality alerts
      await loadQualityAlerts();

    } catch (error) {
      console.error("Error loading host data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPerformanceMetrics = async (hostsList) => {
    try {
      const { HostPerformanceMetrics } = await import("@/api/entities");
      
      const metricsMap = {};
      for (const host of hostsList) {
        try {
          const metrics = await HostPerformanceMetrics.filter({
            host_id: host.id
          }, "-period_end", 1);
          
          if (metrics[0]) {
            metricsMap[host.id] = metrics[0];
          }
        } catch (error) {
          console.log(`No metrics for host ${host.id}`);
        }
      }
      
      setPerformanceMetrics(metricsMap);
    } catch (error) {
      console.error("Error loading performance metrics:", error);
    }
  };

  const loadQualityAlerts = async () => {
    try {
      const { QualityAlert } = await import("@/api/entities");
      const alerts = await QualityAlert.filter({
        user_type: "host",
        status: ["OPEN", "INVESTIGATING"]
      }, "-created_date", 50);
      
      setQualityAlerts(alerts);
    } catch (error) {
      console.error("Error loading quality alerts:", error);
      setQualityAlerts([]);
    }
  };

  const generateHostReport = async (host) => {
    try {
      const metrics = performanceMetrics[host.id];
      
      if (!metrics) {
        alert("No performance data available for this host yet.");
        return;
      }

      const prompt = `Generate a comprehensive host performance analysis:

**Host Profile:**
- Name: ${host.full_name}
- Email: ${host.email}
- Member since: ${format(new Date(host.created_date), "MMMM yyyy")}

**Performance Metrics (Last 30 Days):**
- Events Created: ${metrics.total_events_created}
- Events Completed: ${metrics.events_completed}
- Events Cancelled: ${metrics.events_cancelled}
- Cancellation Rate: ${metrics.cancellation_rate}%
- Total Spent: $${(metrics.total_spent_cents / 100).toFixed(2)}
- Average Event Value: $${(metrics.average_event_value_cents / 100).toFixed(2)}
- Payment Timeliness: ${metrics.payment_timeliness_score}/100
- Enabler Satisfaction: ${metrics.enabler_satisfaction_rating}/5
- Disputes Initiated: ${metrics.disputes_initiated}
- Trust Score: ${metrics.trust_score}/100

**Your Task:**
Provide analysis with:
1. Overall assessment (Excellent/Good/Needs Improvement/Critical)
2. Host tier recommendation (Platinum/Gold/Silver/Bronze)
3. Key strengths
4. Areas for improvement
5. Actionable recommendations
6. Risk assessment`;

      const report = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            tier_recommendation: { type: "string" },
            key_strengths: { type: "array", items: { type: "string" } },
            areas_for_improvement: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            risk_level: { type: "string" }
          },
          required: ["overall_assessment", "tier_recommendation"]
        }
      });

      alert(`✅ Host Report Generated!\n\nTier: ${report.tier_recommendation}\nRisk: ${report.risk_level}\n\nRecommendations have been created.`);

      // Store coaching recommendations
      const { CoachingRecommendation } = await import("@/api/entities");
      for (const rec of report.recommendations || []) {
        await CoachingRecommendation.create({
          user_id: host.id,
          user_type: "host",
          recommendation_type: "BEST_PRACTICES",
          priority: "MEDIUM",
          title: rec,
          description: report.overall_assessment,
          actionable_steps: [rec],
          ai_generated: true
        });
      }

    } catch (error) {
      console.error("Error generating host report:", error);
      alert("Failed to generate report");
    }
  };

  const getTrustScoreColor = (score) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const filteredHosts = hosts.filter(host => {
    return host.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           host.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search hosts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 bg-gray-800 border-gray-700 text-white"
        />

        <Button
          onClick={loadHostData}
          variant="outline"
          className="border-gray-700 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Hosts</p>
              <p className="text-2xl font-bold text-white">{hosts.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active This Month</p>
              <p className="text-2xl font-bold text-white">
                {hosts.filter(h => performanceMetrics[h.id]?.total_events_created > 0).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">High Value</p>
              <p className="text-2xl font-bold text-white">
                {hosts.filter(h => performanceMetrics[h.id]?.total_spent_cents > 500000).length}
              </p>
            </div>
            <Award className="w-8 h-8 text-amber-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">At Risk</p>
              <p className="text-2xl font-bold text-white">
                {hosts.filter(h => performanceMetrics[h.id]?.trust_score < 50).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Hosts List */}
      <div className="space-y-4">
        {filteredHosts.map((host) => {
          const metrics = performanceMetrics[host.id];
          
          return (
            <Card key={host.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {host.full_name?.[0] || host.email[0].toUpperCase()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">{host.full_name || host.email}</h4>
                      {metrics && metrics.trust_score >= 85 && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          Trusted
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-3">{host.email}</p>
                    
                    {metrics ? (
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400">Events</p>
                          <p className="text-white font-semibold">{metrics.total_events_created}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Total Spent</p>
                          <p className="text-white font-semibold">${(metrics.total_spent_cents / 100).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Trust Score</p>
                          <p className={`font-semibold ${getTrustScoreColor(metrics.trust_score)}`}>
                            {metrics.trust_score}/100
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Cancellations</p>
                          <p className="text-white font-semibold">{metrics.cancellation_rate}%</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No performance data available</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                    onClick={() => setSelectedHost(host)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {metrics && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => generateHostReport(host)}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      AI Report
                    </Button>
                  )}
                </div>
              </div>

              {/* Trust Score Progress */}
              {metrics && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Trust Score</span>
                    <span className={getTrustScoreColor(metrics.trust_score)}>
                      {metrics.trust_score}/100
                    </span>
                  </div>
                  <Progress value={metrics.trust_score} className="h-2" />
                </div>
              )}
            </Card>
          );
        })}

        {filteredHosts.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hosts found</p>
          </Card>
        )}
      </div>
    </div>
  );
}
