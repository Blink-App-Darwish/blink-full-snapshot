import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Zap,
  Users,
  DollarSign,
  Star,
  Clock,
  BarChart3,
  Brain,
  Lightbulb,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export default function PerformanceAnalyticsDashboard({ enablerId = null, hostId = null }) {
  const [analytics, setAnalytics] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'quarter', 'year'

  useEffect(() => {
    loadAnalytics();
  }, [enablerId, hostId, period]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const { 
        BookingWorkflow, 
        PostEventValidation,
        Booking,
        EnablerPerformanceMetrics,
        HostPerformanceMetrics
      } = await import("@/api/entities");

      let metrics = {};

      if (enablerId) {
        // Enabler Analytics
        const workflows = await BookingWorkflow.filter({}).then(ws => 
          ws.filter(w => w.booking?.enabler_id === enablerId)
        );

        const completedWorkflows = workflows.filter(w => w.workflow_stage === 'COMPLETED');
        
        const validations = await PostEventValidation.filter({
          enabler_id: enablerId
        });

        metrics = {
          total_bookings: workflows.length,
          completed_bookings: completedWorkflows.length,
          completion_rate: workflows.length > 0 ? (completedWorkflows.length / workflows.length * 100) : 0,
          
          average_performance: completedWorkflows.reduce((sum, w) => 
            sum + (w.performance_score?.overall || 0), 0) / (completedWorkflows.length || 1),
          
          average_rating: validations.filter(v => v.host_feedback).reduce((sum, v) => 
            sum + ((v.host_feedback.rating_quality + v.host_feedback.rating_satisfaction) / 2), 0) / (validations.filter(v => v.host_feedback).length || 1),
          
          on_time_rate: completedWorkflows.filter(w => 
            w.performance_score?.timeliness >= 90
          ).length / (completedWorkflows.length || 1) * 100,
          
          would_rebook_rate: validations.filter(v => 
            v.host_feedback?.would_rebook
          ).length / (validations.filter(v => v.host_feedback).length || 1) * 100,
          
          total_revenue: completedWorkflows.reduce((sum, w) => 
            sum + (w.booking?.total_amount || 0), 0),
          
          disputes_count: validations.filter(v => 
            v.host_validation_status === 'review_requested'
          ).length,
          
          quality_score: completedWorkflows.reduce((sum, w) => 
            sum + (w.performance_score?.quality || 0), 0) / (completedWorkflows.length || 1),

          communication_score: completedWorkflows.reduce((sum, w) => 
            sum + (w.performance_score?.communication || 0), 0) / (completedWorkflows.length || 1),
        };

        // Generate AI insights for enabler
        aiInsights.push(...await generateEnablerInsights(metrics, workflows, validations));

      } else if (hostId) {
        // Host Analytics
        const workflows = await BookingWorkflow.filter({}).then(ws => 
          ws.filter(w => w.host_id === hostId)
        );

        const completedWorkflows = workflows.filter(w => w.workflow_stage === 'COMPLETED');

        metrics = {
          total_events: new Set(workflows.map(w => w.event_id)).size,
          completed_events: new Set(completedWorkflows.map(w => w.event_id)).size,
          total_bookings: workflows.length,
          completed_bookings: completedWorkflows.length,
          
          total_spent: completedWorkflows.reduce((sum, w) => 
            sum + (w.booking?.total_amount || 0), 0),
          
          average_event_value: completedWorkflows.reduce((sum, w) => 
            sum + (w.booking?.total_amount || 0), 0) / (completedWorkflows.length || 1),
          
          enabler_satisfaction: completedWorkflows.filter(w => 
            w.enabler_feedback?.rating_fairness >= 4
          ).length / (completedWorkflows.length || 1) * 100,
          
          on_time_payment_rate: 95, // Mock for now
          
          repeat_booking_rate: 0, // Calculate from unique enablers
        };

        aiInsights.push(...await generateHostInsights(metrics, workflows));
      }

      setAnalytics(metrics);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEnablerInsights = async (metrics, workflows, validations) => {
    const insights = [];

    // Performance Insight
    if (metrics.average_performance < 80) {
      insights.push({
        type: 'warning',
        category: 'performance',
        title: 'Performance Below Standard',
        message: `Your average performance score is ${metrics.average_performance.toFixed(1)}%. Focus on punctuality and quality to improve.`,
        action: 'Review checklist completion times',
        priority: 'high'
      });
    } else if (metrics.average_performance >= 95) {
      insights.push({
        type: 'success',
        category: 'performance',
        title: 'Excellent Performance!',
        message: `You're in the top 10% of performers with ${metrics.average_performance.toFixed(1)}% average score.`,
        action: 'Maintain this excellence',
        priority: 'low'
      });
    }

    // Rating Insight
    if (metrics.average_rating < 4.0) {
      insights.push({
        type: 'warning',
        category: 'ratings',
        title: 'Rating Improvement Needed',
        message: `Average rating is ${metrics.average_rating.toFixed(1)}/5. Focus on communication and quality.`,
        action: 'Review recent feedback',
        priority: 'high'
      });
    }

    // Revenue Insight
    if (workflows.length >= 5) {
      const trend = metrics.total_revenue / workflows.length;
      insights.push({
        type: 'info',
        category: 'revenue',
        title: 'Revenue Analysis',
        message: `Average booking value: $${trend.toFixed(2)}. ${trend > 1000 ? 'Above market average!' : 'Consider premium packages.'}`,
        action: 'Explore pricing strategies',
        priority: 'medium'
      });
    }

    // Rebook Rate Insight
    if (metrics.would_rebook_rate < 70) {
      insights.push({
        type: 'warning',
        category: 'retention',
        title: 'Client Retention Low',
        message: `Only ${metrics.would_rebook_rate.toFixed(1)}% of clients would rebook. Improve experience quality.`,
        action: 'Analyze negative reviews',
        priority: 'high'
      });
    } else if (metrics.would_rebook_rate >= 90) {
      insights.push({
        type: 'success',
        category: 'retention',
        title: 'High Client Loyalty',
        message: `${metrics.would_rebook_rate.toFixed(1)}% rebook rate! Clients love your service.`,
        action: 'Leverage testimonials',
        priority: 'low'
      });
    }

    return insights;
  };

  const generateHostInsights = async (metrics, workflows) => {
    const insights = [];

    // Spending Insight
    if (metrics.total_spent > 10000) {
      insights.push({
        type: 'info',
        category: 'spending',
        title: 'High Event Investment',
        message: `You've spent $${metrics.total_spent.toFixed(2)} on events. Consider our premium host benefits.`,
        action: 'Explore loyalty rewards',
        priority: 'medium'
      });
    }

    // Organization Insight
    if (metrics.enabler_satisfaction >= 90) {
      insights.push({
        type: 'success',
        category: 'organization',
        title: 'Excellent Event Organization',
        message: `Enablers rate you ${metrics.enabler_satisfaction.toFixed(1)}% satisfaction. You're a preferred host!`,
        action: 'Share your planning tips',
        priority: 'low'
      });
    }

    // Event Completion Insight
    if (metrics.completed_events < metrics.total_events * 0.7) {
      insights.push({
        type: 'warning',
        category: 'completion',
        title: 'Many Pending Events',
        message: `${metrics.total_events - metrics.completed_events} events still in progress. Stay on top of preparations.`,
        action: 'Review preparation dashboard',
        priority: 'medium'
      });
    }

    return insights;
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info': return <Lightbulb className="w-5 h-5 text-blue-600" />;
      default: return <Brain className="w-5 h-5 text-gray-600" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available yet</p>
        <p className="text-sm text-gray-400 mt-2">Complete more bookings to see insights</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.completed_bookings || 0}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">
              {analytics.average_performance >= 90 ? '+' : ''}{((analytics.average_performance || 0) - 85).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(analytics.average_performance || 0).toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Performance</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-amber-500" />
            <div className="flex">
              {[...Array(Math.round(analytics.average_rating || 0))].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(analytics.average_rating || 0).toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg Rating</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${(analytics.total_revenue || analytics.total_spent || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">{enablerId ? 'Revenue' : 'Spent'}</p>
        </Card>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
            <Badge className="bg-purple-100 text-purple-700 text-xs">
              {aiInsights.length} insights
            </Badge>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-xs text-gray-700 mb-2">{insight.message}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {insight.category.toUpperCase()}
                      </Badge>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        {insight.action} →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4 mt-4">
          {enablerId && (
            <>
              <Card className="p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Performance Breakdown</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">On-Time Rate</span>
                      <span className="text-xs font-bold text-emerald-600">{(analytics.on_time_rate || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.on_time_rate || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Quality Score</span>
                      <span className="text-xs font-bold text-emerald-600">{(analytics.quality_score || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.quality_score || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Communication</span>
                      <span className="text-xs font-bold text-emerald-600">{(analytics.communication_score || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.communication_score || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Would Rebook</span>
                      <span className="text-xs font-bold text-emerald-600">{(analytics.would_rebook_rate || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.would_rebook_rate || 0} className="h-2" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Completion Metrics</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.completion_rate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Completion Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.disputes_count || 0}</p>
                    <p className="text-xs text-gray-500">Disputes</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {hostId && (
            <>
              <Card className="p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Event Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.total_events || 0}</p>
                    <p className="text-xs text-gray-500">Total Events</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{analytics.completed_events || 0}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${(analytics.average_event_value || 0).toFixed(0)}</p>
                    <p className="text-xs text-gray-500">Avg Event Value</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{(analytics.enabler_satisfaction || 0).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Enabler Satisfaction</p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-4 mt-4">
          <Card className="p-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Quality Indicators</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Average Rating</span>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${
                        i < Math.round(analytics.average_rating || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`} />
                    ))}
                  </div>
                  <span className="font-bold">{(analytics.average_rating || 0).toFixed(1)}</span>
                </div>
              </div>
              
              {enablerId && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Client Loyalty</span>
                    <Badge className={`${
                      (analytics.would_rebook_rate || 0) >= 80 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {(analytics.would_rebook_rate || 0).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Quality Consistency</span>
                    <Badge className={`${
                      (analytics.quality_score || 0) >= 90 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {(analytics.quality_score || 0).toFixed(1)}%
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 mt-4">
          <Card className="p-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Growth Trends</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Monthly Growth</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-bold text-green-600">+12%</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Performance Trend</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-bold text-green-600">Improving</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Client Retention</span>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-blue-600">High</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}