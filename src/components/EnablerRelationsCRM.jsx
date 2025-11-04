
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Briefcase,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  Target,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  MessageSquare,
  Eye,
  Send,
  Download,
  RefreshCw,
  Zap,
  Shield
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

export default function EnablerRelationsCRM() {
  const [enablers, setEnablers] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [qualityAlerts, setQualityAlerts] = useState([]);
  const [selectedEnabler, setSelectedEnabler] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEnablerData();
  }, [filterStatus]);

  const loadEnablerData = async () => {
    setIsLoading(true);
    try {
      // Load enablers
      const { Enabler } = await import("@/api/entities");
      const enablersData = await Enabler.list("-created_date", 100);
      setEnablers(enablersData);

      // Load performance metrics for each enabler
      await loadPerformanceMetrics(enablersData);

      // Load quality alerts
      await loadQualityAlerts();

    } catch (error) {
      console.error("Error loading enabler data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPerformanceMetrics = async (enablersList) => {
    try {
      const { EnablerPerformanceMetrics } = await import("@/api/entities");
      
      const metricsMap = {};
      for (const enabler of enablersList) {
        try {
          const metrics = await EnablerPerformanceMetrics.filter({
            enabler_id: enabler.id
          }, "-period_end", 1);
          
          if (metrics[0]) {
            metricsMap[enabler.id] = metrics[0];
          }
        } catch (error) {
          console.log(`No metrics for enabler ${enabler.id}`);
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
        user_type: "enabler",
        status: ["OPEN", "INVESTIGATING"]
      }, "-created_date", 50);
      
      setQualityAlerts(alerts);
    } catch (error) {
      console.error("Error loading quality alerts:", error);
      setQualityAlerts([]);
    }
  };

  const generatePerformanceReport = async (enabler) => {
    try {
      console.log("📊 Generating performance report for", enabler.business_name);
      
      const metrics = performanceMetrics[enabler.id];
      
      if (!metrics) {
        alert("No performance data available for this enabler yet.");
        return;
      }

      const prompt = `Generate a comprehensive performance analysis report for this enabler:

**Enabler Profile:**
- Business Name: ${enabler.business_name}
- Category: ${enabler.category}
- Years of Experience: ${enabler.years_experience || 'N/A'}
- Average Rating: ${enabler.average_rating || 'N/A'}/5

**Performance Metrics (Last 30 Days):**
- Total Bookings: ${metrics.total_bookings}
- Completed: ${metrics.completed_bookings}
- Cancelled: ${metrics.cancelled_bookings}
- Cancellation Rate: ${metrics.cancellation_rate}%
- On-Time Fulfillment: ${metrics.on_time_fulfillment_rate}%
- Acceptance Rate: ${metrics.acceptance_rate}%
- Average Response Time: ${metrics.average_response_time_minutes} minutes
- Revenue: $${(metrics.revenue_cents / 100).toFixed(2)}
- Quality Score: ${metrics.quality_score}/100
- Disputes: ${metrics.disputes_count} (Won: ${metrics.disputes_won})

**Your Task:**
Provide a detailed analysis with:
1. Overall performance assessment (Excellent/Good/Needs Improvement/Critical)
2. Key strengths (3-5 points)
3. Areas for improvement (3-5 points)
4. Specific actionable recommendations (5-7 items)
5. Risk level (Low/Medium/High) with reasoning
6. Coaching priorities (top 3)`;

      const report = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            performance_grade: { type: "string" },
            key_strengths: { type: "array", items: { type: "string" } },
            areas_for_improvement: { type: "array", items: { type: "string" } },
            actionable_recommendations: { type: "array", items: { type: "string" } },
            risk_level: { type: "string" },
            risk_reasoning: { type: "string" },
            coaching_priorities: { type: "array", items: { type: "string" } }
          },
          required: ["overall_assessment", "performance_grade", "key_strengths"]
        }
      });

      console.log("✅ Performance report generated:", report);

      // Store coaching recommendations
      const { CoachingRecommendation } = await import("@/api/entities");
      
      for (const recommendation of report.actionable_recommendations || []) {
        await CoachingRecommendation.create({
          user_id: enabler.user_id,
          user_type: "enabler",
          recommendation_type: "PERFORMANCE_IMPROVEMENT",
          priority: report.risk_level === "High" ? "URGENT" : "MEDIUM",
          title: recommendation,
          description: `Based on performance analysis: ${report.overall_assessment}`,
          actionable_steps: [recommendation],
          ai_generated: true,
          based_on_metrics: ["quality_score", "fulfillment_rate", "cancellation_rate"]
        });
      }

      alert(`✅ Performance report generated!\n\nGrade: ${report.performance_grade}\nRisk Level: ${report.risk_level}\n\nCoaching recommendations have been created.`);

    } catch (error) {
      console.error("Error generating performance report:", error);
      alert("Failed to generate performance report");
    }
  };

  const detectUnderperformers = async () => {
    try {
      console.log("🔍 Detecting underperforming enablers...");
      
      const underperformers = enablers.filter(enabler => {
        const metrics = performanceMetrics[enabler.id];
        if (!metrics) return false;
        
        return (
          metrics.quality_score < 70 ||
          metrics.cancellation_rate > 15 ||
          metrics.on_time_fulfillment_rate < 80 ||
          metrics.average_rating < 3.5
        );
      });

      if (underperformers.length === 0) {
        alert("✅ No underperforming enablers detected! All are performing well.");
        return;
      }

      // Create quality alerts
      const { QualityAlert } = await import("@/api/entities");
      
      for (const enabler of underperformers) {
        const metrics = performanceMetrics[enabler.id];
        
        const issues = [];
        if (metrics.quality_score < 70) issues.push("Low quality score");
        if (metrics.cancellation_rate > 15) issues.push("High cancellation rate");
        if (metrics.on_time_fulfillment_rate < 80) issues.push("Low fulfillment rate");
        if (metrics.average_rating < 3.5) issues.push("Low rating");
        
        await QualityAlert.create({
          user_id: enabler.user_id,
          user_type: "enabler",
          alert_type: "UNDERPERFORMANCE",
          severity: metrics.quality_score < 50 ? "CRITICAL" : "WARNING",
          title: `Performance Issues Detected: ${enabler.business_name}`,
          description: `Issues: ${issues.join(", ")}`,
          triggering_metrics: {
            quality_score: metrics.quality_score,
            cancellation_rate: metrics.cancellation_rate,
            fulfillment_rate: metrics.on_time_fulfillment_rate,
            rating: metrics.average_rating
          },
          action_required: true,
          suggested_actions: [
            "Review recent bookings and feedback",
            "Schedule performance review call",
            "Provide targeted coaching",
            "Consider temporary suspension if critical"
          ]
        });
      }

      alert(`⚠️ Detected ${underperformers.length} underperforming enablers.\n\nQuality alerts have been created. Please review in the Alerts tab.`);
      
      await loadQualityAlerts();

    } catch (error) {
      console.error("Error detecting underperformers:", error);
      alert("Failed to detect underperformers");
    }
  };

  const getQualityScoreColor = (score) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getPerformanceGrade = (metrics) => {
    if (!metrics) return "N/A";
    
    const score = metrics.quality_score;
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "B+";
    if (score >= 75) return "B";
    if (score >= 70) return "C+";
    if (score >= 65) return "C";
    return "D";
  };

  const filteredEnablers = enablers.filter(enabler => {
    const matchesSearch = enabler.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         enabler.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === "all") return true;
    
    const metrics = performanceMetrics[enabler.id];
    if (!metrics) return filterStatus === "no_data";
    
    if (filterStatus === "excellent") return metrics.quality_score >= 85;
    if (filterStatus === "good") return metrics.quality_score >= 70 && metrics.quality_score < 85;
    if (filterStatus === "needs_improvement") return metrics.quality_score >= 50 && metrics.quality_score < 70;
    if (filterStatus === "critical") return metrics.quality_score < 50;
    
    return true;
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
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search enablers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-gray-800 border-gray-700 text-white"
          />
          
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Enablers</option>
            <option value="excellent">Excellent (85+)</option>
            <option value="good">Good (70-84)</option>
            <option value="needs_improvement">Needs Improvement (50-69)</option>
            <option value="critical">Critical (&lt;50)</option>
            <option value="no_data">No Data</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={detectUnderperformers}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Detect Issues
          </Button>
          
          <Button
            onClick={loadEnablerData}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:// ... keep existing code (state and functions) ...
col-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Enablers</p>
              <p className="text-2xl font-bold text-white">{enablers.length}</p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Top Performers</p>
              <p className="text-2xl font-bold text-white">
                {enablers.filter(e => performanceMetrics[e.id]?.quality_score >= 85).length}
              </p>
            </div>
            <Award className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Need Attention</p>
              <p className="text-2xl font-bold text-white">
                {enablers.filter(e => performanceMetrics[e.id]?.quality_score < 70).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold text-white">{qualityAlerts.length}</p>
            </div>
            <Shield className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Enablers List */}
      <div className="space-y-4">
        {filteredEnablers.map((enabler) => {
          const metrics = performanceMetrics[enabler.id];
          const grade = getPerformanceGrade(metrics);
          
          return (
            <Card key={enabler.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                    {grade}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold text-lg">{enabler.business_name}</h4>
                      <Badge className="bg-blue-100 text-teal-700 text-xs">
                        {enabler.category?.replace(/_/g, ' ')}
                      </Badge>
                      {metrics && (
                        <Badge className={`${
                          metrics.quality_score >= 85 ? 'bg-emerald-100 text-emerald-700' :
                          metrics.quality_score >= 70 ? 'bg-blue-100 text-teal-700' :
                          metrics.quality_score >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        } text-xs`}>
                          Score: {metrics.quality_score}/100
                        </Badge>
                      )}
                    </div>
                    
                    {/* Metrics Display */}
                    {metrics ? (
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400">Bookings</p>
                          <p className="text-white font-semibold">{metrics.total_bookings}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Fulfillment</p>
                          <p className="text-white font-semibold">{metrics.on_time_fulfillment_rate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Rating</p>
                          <p className="text-white font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            {metrics.average_rating?.toFixed(1) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Revenue</p>
                          <p className="text-white font-semibold">${(metrics.revenue_cents / 100).toLocaleString()}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No performance data available yet</p>
                    )}

                    {/* Performance Indicators */}
                    {metrics && (
                      <div className="mt-3 flex gap-2">
                        {metrics.cancellation_rate > 15 && (
                          <Badge className="bg-red-100 text-red-700 text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            High Cancellations
                          </Badge>
                        )}
                        {metrics.average_response_time_minutes > 120 && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Slow Response
                          </Badge>
                        )}
                        {metrics.disputes_count > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {metrics.disputes_count} Disputes
                          </Badge>
                        )}
                        {metrics.quality_score >= 90 && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Top Performer
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={() => setSelectedEnabler(enabler)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                  
                  {metrics && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => generatePerformanceReport(enabler)}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      AI Report
                    </Button>
                  )}
                </div>
              </div>

              {/* Quality Score Progress Bar */}
              {metrics && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Quality Score</span>
                    <span className={getQualityScoreColor(metrics.quality_score)}>
                      {metrics.quality_score}/100
                    </span>
                  </div>
                  <Progress 
                    value={metrics.quality_score} 
                    className="h-2"
                  />
                </div>
              )}
            </Card>
          );
        })}

        {filteredEnablers.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No enablers found matching your criteria</p>
          </Card>
        )}
      </div>

      {/* Enabler Detail Modal */}
      {selectedEnabler && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedEnabler.business_name}
                  </h3>
                  <p className="text-sm text-gray-400">{selectedEnabler.category?.replace(/_/g, ' ')}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedEnabler(null)}
                >
                  ✕
                </Button>
              </div>

              {/* Detailed metrics would go here */}
              <div className="space-y-4">
                <p className="text-gray-300">
                  Full detailed view with performance charts, booking history, reviews, etc.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
