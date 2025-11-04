import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

export default function AIOpsAdvisor({ insights, onRefresh }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);

  const generateAIInsights = async () => {
    setIsGenerating(true);
    try {
      console.log("🤖 Generating AI-powered operational insights...");
      
      const { CIUAIInsight, CIUMetric, Booking, Dispute, EnablerPerformanceMetrics } = await import("@/api/entities");

      // Gather system data
      const [recentMetrics, bookings, disputes, performanceData] = await Promise.all([
        CIUMetric.list("-metric_timestamp", 100),
        Booking.list("-created_date", 100),
        Dispute.filter({ status: ["OPEN", "UNDER_REVIEW"] }),
        EnablerPerformanceMetrics.list("-period_end", 50)
      ]);

      // Prepare analysis prompt
      const analysisPrompt = `As Blink's AI Operations Advisor, analyze the following system data and provide actionable insights:

**System Metrics:**
- Total engines monitored: 20
- Recent bookings: ${bookings.length}
- Active disputes: ${disputes.length}
- Performance data points: ${performanceData.length}

**Recent Trends:**
- Booking status distribution: ${JSON.stringify(bookings.reduce((acc, b) => {
  acc[b.status] = (acc[b.status] || 0) + 1;
  return acc;
}, {}))}
- Dispute reasons: ${JSON.stringify(disputes.reduce((acc, d) => {
  acc[d.reason] = (acc[d.reason] || 0) + 1;
  return acc;
}, {}))}

**Your Task:**
Provide 5-7 specific, actionable insights covering:
1. Efficiency improvements
2. Conversion optimization opportunities
3. Risk predictions
4. Anomaly detection
5. Performance suggestions
6. Trend forecasts

For each insight, specify:
- insight_type
- engine_code (target engine)
- title (concise)
- description (detailed)
- suggested_actions (array of 2-3 specific actions)
- expected_impact
- priority (low/medium/high/critical)
- confidence_score (0-1)`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_type: { type: "string" },
                  engine_code: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  suggested_actions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  expected_impact: { type: "string" },
                  priority: { type: "string" },
                  confidence_score: { type: "number" }
                },
                required: ["insight_type", "engine_code", "title", "description", "suggested_actions", "priority"]
              }
            }
          },
          required: ["insights"]
        }
      });

      console.log("✅ AI generated", aiResponse.insights.length, "insights");

      // Store insights
      for (const insight of aiResponse.insights) {
        await CIUAIInsight.create({
          insight_timestamp: new Date().toISOString(),
          insight_type: insight.insight_type,
          engine_code: insight.engine_code,
          title: insight.title,
          description: insight.description,
          ai_analysis: JSON.stringify(insight),
          suggested_actions: insight.suggested_actions,
          expected_impact: insight.expected_impact,
          confidence_score: insight.confidence_score || 0.85,
          priority: insight.priority,
          status: "pending_review"
        });
      }

      alert(`✅ AI Ops Advisor generated ${aiResponse.insights.length} insights!`);
      onRefresh();

    } catch (error) {
      console.error("Error generating AI insights:", error);
      alert("Failed to generate AI insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsightAction = async (insightId, action) => {
    try {
      const { CIUAIInsight } = await import("@/api/entities");
      const user = await base44.auth.me();

      await CIUAIInsight.update(insightId, {
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });

      alert(`✅ Insight ${action}`);
      onRefresh();
      setSelectedInsight(null);

    } catch (error) {
      console.error("Error updating insight:", error);
      alert("Failed to update insight");
    }
  };

  const getPriorityColor = (priority) => {
    return priority === 'critical' ? 'bg-red-100 text-red-700' :
           priority === 'high' ? 'bg-amber-100 text-amber-700' :
           priority === 'medium' ? 'bg-blue-100 text-blue-700' :
           'bg-gray-100 text-gray-700';
  };

  const getInsightTypeIcon = (type) => {
    return type.includes('efficiency') ? TrendingUp :
           type.includes('conversion') ? Target :
           type.includes('risk') ? AlertTriangle :
           type.includes('anomaly') ? Zap :
           Brain;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Ops Advisor
          </h3>
          <p className="text-sm text-gray-400 mt-1">AI-powered operational intelligence and recommendations</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={generateAIInsights}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>

          <Button
            onClick={onRefresh}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* AI Insights Grid */}
      <div className="grid grid-cols-1 gap-4">
        {insights.map((insight) => {
          const Icon = getInsightTypeIcon(insight.insight_type);
          
          return (
            <Card 
              key={insight.id} 
              className={`bg-gray-900 border-gray-800 p-6 hover:border-purple-500/50 transition-all cursor-pointer ${
                selectedInsight?.id === insight.id ? 'border-purple-500' : ''
              }`}
              onClick={() => setSelectedInsight(insight)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-semibold text-white">{insight.title}</h4>
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      <Badge className="bg-gray-700 text-gray-300 text-[10px]">{insight.engine_code}</Badge>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-3">{insight.description}</p>

                    {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-purple-300 mb-2">Suggested Actions:</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {insight.suggested_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.expected_impact && (
                      <div className="flex items-center gap-2 text-xs">
                        <Target className="w-3 h-3 text-emerald-400" />
                        <span className="text-gray-400">Expected Impact:</span>
                        <span className="text-emerald-300">{insight.expected_impact}</span>
                      </div>
                    )}

                    {insight.confidence_score && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>AI Confidence</span>
                          <span className="text-purple-400">{(insight.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${insight.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {insight.status === 'pending_review' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsightAction(insight.id, 'accepted');
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsightAction(insight.id, 'dismissed');
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  
                  {insight.status === 'accepted' && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Accepted
                    </Badge>
                  )}
                  
                  {insight.status === 'implemented' && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Implemented
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Generated: {format(new Date(insight.insight_timestamp), "MMM d, yyyy 'at' HH:mm")}
              </div>
            </Card>
          );
        })}

        {insights.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No AI insights generated yet</p>
            <Button
              onClick={generateAIInsights}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate First Insights
                </>
              )}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}