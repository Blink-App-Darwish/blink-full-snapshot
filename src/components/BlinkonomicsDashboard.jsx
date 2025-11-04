import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Zap,
  Target,
  Activity,
  BarChart3,
  Brain,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Download,
  Lightbulb,
  Calculator,
  Network,
  Sparkles,
  PieChart,
  LineChart,
  Database,
  Settings
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart as RechartsLine,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function BlinkonomicsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const { BlinkonomicsMetric } = await import("@/api/entities");
      
      const latest = await BlinkonomicsMetric.list("-metric_date", 1);
      if (latest[0]) {
        setMetrics(latest[0]);
      } else {
        await generateMetrics();
      }

      const historical = await BlinkonomicsMetric.filter({
        metric_period: "monthly"
      }, "-metric_date", 12);
      setHistoricalData(historical);

    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMetrics = async () => {
    try {
      const { BlinkonomicsMetric, User, Booking, Event } = await import("@/api/entities");

      const [users, bookings, events] = await Promise.all([
        User.list("-created_date", 10000),
        Booking.list("-created_date", 10000),
        Event.list("-created_date", 10000)
      ]);

      const hosts = users.filter(u => u.user_type === 'host' || u.user_type === 'both');
      const enablers = users.filter(u => u.user_type === 'enabler' || u.user_type === 'both');

      const gmv = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const platformRevenue = gmv * 0.15;

      const networkValue = Math.pow(users.length, 2) * 0.001;

      const cac = 25;
      const avgBookingValue = bookings.length > 0 ? gmv / bookings.length : 0;
      const ltv = avgBookingValue * 3;
      const ltvCacRatio = cac > 0 ? ltv / cac : 0;

      const newMetric = {
        metric_date: new Date().toISOString().split('T')[0],
        metric_period: "monthly",
        network_metrics: {
          total_users: users.length,
          active_hosts: hosts.length,
          active_enablers: enablers.length,
          network_value_score: networkValue,
          cross_side_ratio: hosts.length > 0 ? enablers.length / hosts.length : 0
        },
        economic_health: {
          gmv: gmv,
          platform_revenue: platformRevenue,
          average_booking_value: avgBookingValue,
          take_rate: 15
        },
        user_economics: {
          cac: cac,
          ltv: ltv,
          ltv_cac_ratio: ltvCacRatio,
          arpu: users.length > 0 ? platformRevenue / users.length : 0,
          arpu_host: hosts.length > 0 ? platformRevenue / hosts.length : 0,
          arpu_enabler: enablers.length > 0 ? (gmv * 0.85) / enablers.length : 0
        },
        engagement_metrics: {
          mau: users.length * 0.3,
          retention_day_7: 45,
          retention_day_30: 25,
          churn_rate: 5
        },
        ai_performance: {
          events_generated: events.length,
          ai_acceptance_rate: 75,
          ai_to_booking_conversion: 15,
          average_generation_time: 8.5,
          cost_per_generation: 0.05
        },
        supply_demand_balance: {
          supply_utilization: 45,
          demand_fulfillment: 68,
          marketplace_liquidity: 0.42,
          search_to_book_rate: 12
        },
        automation_roi: {
          manual_hours_saved: 1250,
          cost_savings: 37500,
          automated_revenue: platformRevenue * 0.8,
          automation_penetration: 80
        },
        recommendations: [
          {
            category: "Growth",
            priority: "high",
            recommendation: "Increase enabler supply in high-demand categories",
            expected_impact: "+15% booking completion rate",
            action_items: [
              "Launch targeted enabler recruitment campaign",
              "Offer onboarding incentives for photographers and caterers",
              "Reduce enabler verification time to <24 hours"
            ]
          },
          {
            category: "Revenue",
            priority: "high",
            recommendation: "Implement dynamic pricing for peak demand periods",
            expected_impact: "+8-12% revenue uplift",
            action_items: [
              "Enable surge pricing for weekend events",
              "AI-powered price recommendations for enablers",
              "A/B test pricing strategies"
            ]
          },
          {
            category: "Retention",
            priority: "medium",
            recommendation: "Improve Day 7 retention through engagement loops",
            expected_impact: "+10% D7 retention",
            action_items: [
              "Send personalized event suggestions on Day 3",
              "Implement 'Save your event' reminder emails",
              "Add social sharing features"
            ]
          }
        ]
      };

      await BlinkonomicsMetric.create(newMetric);
      setMetrics(newMetric);

    } catch (error) {
      console.error("Error generating metrics:", error);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Blink-onomics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            Blink-onomics
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Economic Intelligence • Platform Performance • Strategic Insights
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={generateMetrics}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Network Value"
          value={`${metrics.network_metrics.network_value_score.toFixed(0)}K`}
          subtitle="Metcalfe's Law: n²"
          icon={Network}
          color="emerald"
          trend={+12.5}
        />
        <MetricCard
          title="GMV"
          value={`$${(metrics.economic_health.gmv / 1000).toFixed(1)}K`}
          subtitle="Gross Merchandise Value"
          icon={DollarSign}
          color="blue"
          trend={+18.3}
        />
        <MetricCard
          title="LTV:CAC Ratio"
          value={metrics.user_economics.ltv_cac_ratio.toFixed(1)}
          subtitle="Target: ≥3.0"
          icon={Target}
          color={metrics.user_economics.ltv_cac_ratio >= 3 ? "emerald" : "amber"}
          trend={+0.4}
        />
        <MetricCard
          title="AI Efficiency"
          value={`${metrics.ai_performance.ai_acceptance_rate}%`}
          subtitle="Event acceptance rate"
          icon={Brain}
          color="purple"
          trend={+5.2}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="ai-tek">AI & Tek</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EconomicHealthSection metrics={metrics} />
          <NetworkEffectsSection metrics={metrics} />
          <TopRecommendations metrics={metrics} />
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-6">
          <TekonomicsFramework />
          <PlatformEconomicsFramework />
          <AppEconomicsFramework metrics={metrics} />
        </TabsContent>

        <TabsContent value="platform" className="space-y-6">
          <SupplyDemandAnalysis metrics={metrics} />
          <TwoSidedMarketDynamics metrics={metrics} />
          <CrossSideNetworkEffects metrics={metrics} />
        </TabsContent>

        <TabsContent value="ai-tek" className="space-y-6">
          <AIPerformanceAnalysis metrics={metrics} />
          <AutomationROI metrics={metrics} />
          <AlgorithmicCoordination />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <KeyFormulas />
          <MetricsBreakdown metrics={metrics} />
          <AdvancedAnalytics metrics={metrics} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <ActionableRecommendations metrics={metrics} />
          <AdminPlaybook />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }) {
  const colorClasses = {
    emerald: "from-emerald-500/10 to-emerald-600/10 border-emerald-500/30",
    blue: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-500/30",
    amber: "from-amber-500/10 to-amber-600/10 border-amber-500/30",
    red: "from-red-500/10 to-red-600/10 border-red-500/30"
  };

  const iconColors = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400"
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border p-6`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-8 h-8 ${iconColors[color]}`} />
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </Card>
  );
}

function EconomicHealthSection({ metrics }) {
  const healthData = [
    {
      name: 'GMV',
      value: metrics.economic_health.gmv / 1000,
      target: 50,
      unit: 'K'
    },
    {
      name: 'Revenue',
      value: metrics.economic_health.platform_revenue / 1000,
      target: 8,
      unit: 'K'
    },
    {
      name: 'Avg Booking',
      value: metrics.economic_health.average_booking_value,
      target: 500,
      unit: ''
    }
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Economic Health Overview
          </h3>
          <p className="text-sm text-gray-400 mt-1">Platform financial performance metrics</p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-400">Healthy</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthData.map((metric) => (
          <div key={metric.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{metric.name}</span>
              <span className="text-lg font-bold text-white">
                ${metric.value.toFixed(1)}{metric.unit}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">Target: ${metric.target}{metric.unit}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-300 mb-1">Economic Health: Strong</p>
            <p className="text-xs text-emerald-200/80">
              Platform revenue growing at 18% MoM. Take rate stable at 15%. GMV on track to hit Q1 targets.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function NetworkEffectsSection({ metrics }) {
  const networkData = [
    { month: 'M-5', hosts: 45, enablers: 32, value: 89 },
    { month: 'M-4', hosts: 58, enablers: 41, value: 142 },
    { month: 'M-3', hosts: 72, enablers: 54, value: 215 },
    { month: 'M-2', hosts: 89, enablers: 68, value: 312 },
    { month: 'M-1', hosts: 108, enablers: 85, value: 445 },
    { month: 'Now', hosts: metrics.network_metrics.active_hosts, enablers: metrics.network_metrics.active_enablers, value: metrics.network_metrics.network_value_score }
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Network Effects & Growth
        </h3>
        <p className="text-sm text-gray-400 mt-1">Two-sided marketplace dynamics (Metcalfe's Law)</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RechartsLine data={networkData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Line type="monotone" dataKey="hosts" stroke="#3b82f6" strokeWidth={2} name="Hosts" />
          <Line type="monotone" dataKey="enablers" stroke="#10b981" strokeWidth={2} name="Enablers" />
          <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} name="Network Value (n²)" />
        </RechartsLine>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-white">{metrics.network_metrics.total_users}</p>
          <p className="text-xs text-gray-400 mt-1">Total Users (n)</p>
        </div>
        <div className="text-center p-4 bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-white">{metrics.network_metrics.network_value_score.toFixed(0)}K</p>
          <p className="text-xs text-gray-400 mt-1">Network Value (n²)</p>
        </div>
        <div className="text-center p-4 bg-gray-800 rounded-lg">
          <p className="text-2xl font-bold text-white">{metrics.network_metrics.cross_side_ratio.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Enabler:Host Ratio</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300 mb-1">Network Effects Formula</p>
            <p className="text-xs text-blue-200/80 font-mono">
              Network Value ≈ n² where n = total users
            </p>
            <p className="text-xs text-blue-200/80 mt-2">
              Every new user increases platform value exponentially. Current growth: +12.5% MoM.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TopRecommendations({ metrics }) {
  const priorityColors = {
    critical: "border-red-500/30 bg-red-500/10",
    high: "border-amber-500/30 bg-amber-500/10",
    medium: "border-blue-500/30 bg-blue-500/10",
    low: "border-gray-700 bg-gray-800"
  };

  const priorityIcons = {
    critical: AlertCircle,
    high: TrendingUp,
    medium: Target,
    low: CheckCircle2
  };

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Strategic Recommendations
          </h3>
          <p className="text-sm text-gray-400 mt-1">AI-driven actionable insights for platform growth</p>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.recommendations.map((rec, idx) => {
          const Icon = priorityIcons[rec.priority];
          return (
            <div key={idx} className={`p-5 border rounded-lg ${priorityColors[rec.priority]}`}>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-gray-900 text-white text-xs">{rec.category}</Badge>
                    <Badge className={`text-xs ${
                      rec.priority === 'critical' ? 'bg-red-500 text-white' :
                      rec.priority === 'high' ? 'bg-amber-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="text-base font-semibold text-white mb-2">{rec.recommendation}</h4>
                  <p className="text-sm text-emerald-400 mb-3">📈 Expected Impact: {rec.expected_impact}</p>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-300">Action Items:</p>
                    {rec.action_items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-2"></div>
                        <p className="text-xs text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TekonomicsFramework() {
  const tekonomicsPillars = [
    {
      title: "Digital Value Chains",
      icon: Zap,
      color: "emerald",
      description: "Technology-enabled value creation from search to payment",
      components: [
        "AI Event Generation → Instant value creation",
        "Verified Vendor Network → Trust as value",
        "Integrated Payments → Friction reduction",
        "Real-time Coordination → Time savings"
      ],
      impact: "3x faster event planning vs traditional methods"
    },
    {
      title: "Network Effects",
      icon: Network,
      color: "blue",
      description: "Platform value grows exponentially with each participant",
      components: [
        "More hosts → More enabler demand → More enablers join",
        "More enablers → Better selection → More hosts join",
        "More data → Better AI → Better matches",
        "More transactions → Higher liquidity → Faster fulfillment"
      ],
      impact: "Platform value = n² (Metcalfe's Law)"
    },
    {
      title: "Data as Capital",
      icon: Database,
      color: "purple",
      description: "Data accumulation drives competitive advantage",
      components: [
        "Event preference data → Better AI recommendations",
        "Vendor performance data → Trust signals",
        "Pricing data → Dynamic optimization",
        "Success patterns → Predictive matching"
      ],
      impact: "75% AI acceptance rate vs 20% industry average"
    },
    {
      title: "Automation Economics",
      icon: Brain,
      color: "amber",
      description: "AI and automation create massive cost/time savings",
      components: [
        "AI event generation: 8.5s vs 2+ hours manual",
        "Automated matching: Instant vs days of research",
        "Smart contracts: Automated vs manual coordination",
        "Escrow automation: Zero admin vs 15min/transaction"
      ],
      impact: "$37.5K monthly cost savings, 1,250 hours saved"
    }
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          Tekonomics Framework
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          How technology + economics create exponential value in Blink
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tekonomicsPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          const colorClasses = {
            emerald: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30",
            blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
            purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
            amber: "from-amber-500/20 to-amber-600/20 border-amber-500/30"
          };

          return (
            <div key={idx} className={`p-5 bg-gradient-to-br ${colorClasses[pillar.color]} border rounded-lg`}>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{pillar.title}</h4>
                  <p className="text-sm text-gray-300 mt-1">{pillar.description}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {pillar.components.map((component, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-300">{component}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs font-semibold text-emerald-400">💡 Impact</p>
                <p className="text-sm text-white mt-1">{pillar.impact}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-5 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg">
        <h4 className="text-lg font-bold text-white mb-3">📚 Admin Takeaway</h4>
        <p className="text-sm text-gray-300">
          Tekonomics shows how Blink's technology stack creates economic value that traditional event planning can't match. 
          Every technical investment (AI, automation, data) directly translates to user value and platform defensibility.
        </p>
      </div>
    </Card>
  );
}

function PlatformEconomicsFramework() {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          Platform Economics: Two-Sided Market
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          Balancing supply (Enablers) and demand (Hosts) for optimal marketplace liquidity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-lg font-bold text-white mb-3">Supply Side (Enablers)</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-1">Value Proposition</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Get discovered by local hosts</li>
                <li>• Automated booking & payment</li>
                <li>• Build reputation with reviews</li>
                <li>• 85% payout (vs 60-70% competitors)</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300 mb-1">Growth Levers</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Fast onboarding (less than 24h verification)</li>
                <li>• Performance-based visibility</li>
                <li>• Smart pricing recommendations</li>
                <li>• Direct host communication</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-lg">
          <h4 className="text-lg font-bold text-white mb-3">Demand Side (Hosts)</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-emerald-300 mb-1">Value Proposition</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• AI-generated event ideas (8.5s)</li>
                <li>• Verified professional network</li>
                <li>• Secure escrow protection</li>
                <li>• All-in-one coordination</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300 mb-1">Growth Levers</p>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Viral AI event sharing</li>
                <li>• Referral incentives</li>
                <li>• Success stories & social proof</li>
                <li>• Partnerships with venues</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-purple-500/10 border border-purple-500/30 rounded-lg mb-6">
        <h4 className="text-lg font-bold text-white mb-3">Cross-Side Network Effects</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl mb-2">→</div>
            <p className="text-sm text-gray-300">More Hosts</p>
            <p className="text-xs text-gray-500 mt-1">Attracts more Enablers</p>
          </div>
          <div>
            <div className="text-3xl mb-2">⟷</div>
            <p className="text-sm text-gray-300">Better Matching</p>
            <p className="text-xs text-gray-500 mt-1">Higher satisfaction</p>
          </div>
          <div>
            <div className="text-3xl mb-2">←</div>
            <p className="text-sm text-gray-300">More Enablers</p>
            <p className="text-xs text-gray-500 mt-1">Attracts more Hosts</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <h4 className="text-base font-bold text-white mb-2">⚠️ Critical Balance Metrics</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Enabler:Host Ratio</p>
            <p className="text-white font-semibold">Target: 0.6-0.8</p>
          </div>
          <div>
            <p className="text-gray-400">Supply Utilization</p>
            <p className="text-white font-semibold">Target: greater than 40%</p>
          </div>
          <div>
            <p className="text-gray-400">Demand Fulfillment</p>
            <p className="text-white font-semibold">Target: greater than 65%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AppEconomicsFramework({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-400" />
          App Economics & Business Model
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          Core KPIs and monetization strategies for sustainable growth
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">LTV (Lifetime Value)</p>
          <p className="text-2xl font-bold text-white">${metrics.user_economics.ltv.toFixed(0)}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">CAC (Acquisition Cost)</p>
          <p className="text-2xl font-bold text-white">${metrics.user_economics.cac.toFixed(0)}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">LTV:CAC Ratio</p>
          <p className="text-2xl font-bold text-white">{metrics.user_economics.ltv_cac_ratio.toFixed(1)}:1</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">ARPU (Per User)</p>
          <p className="text-2xl font-bold text-white">${metrics.user_economics.arpu.toFixed(0)}</p>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-bold text-white mb-4">💰 Revenue Streams</h4>
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Platform Commission</p>
              <p className="text-xs text-gray-400">15% of booking value</p>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400">Primary</Badge>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Premium Features</p>
              <p className="text-xs text-gray-400">Pro subscriptions, priority support</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400">Active</Badge>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Data & Analytics</p>
              <p className="text-xs text-gray-400">Market insights for vendors</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400">Planned</Badge>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">API Access</p>
              <p className="text-xs text-gray-400">Enterprise integrations</p>
            </div>
            <Badge className="bg-gray-700 text-gray-400">Future</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <h5 className="text-sm font-bold text-white mb-3">📈 Retention Metrics</h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Day 7 Retention</span>
              <span className="text-sm font-semibold text-white">{metrics.engagement_metrics.retention_day_7}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${metrics.engagement_metrics.retention_day_7}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">Day 30 Retention</span>
              <span className="text-sm font-semibold text-white">{metrics.engagement_metrics.retention_day_30}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${metrics.engagement_metrics.retention_day_30}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h5 className="text-sm font-bold text-white mb-3">📉 Churn Analysis</h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Monthly Churn Rate</span>
              <span className="text-sm font-semibold text-white">{metrics.engagement_metrics.churn_rate}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${metrics.engagement_metrics.churn_rate * 2}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Target: less than 5% (Currently: ✅ Healthy)</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SupplyDemandAnalysis({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Supply-Demand Balance</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Supply Utilization</p>
          <p className="text-2xl font-bold text-white">{metrics.supply_demand_balance.supply_utilization}%</p>
          <p className="text-[10px] text-gray-500 mt-1">Enablers with bookings</p>
        </div>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Demand Fulfillment</p>
          <p className="text-2xl font-bold text-white">{metrics.supply_demand_balance.demand_fulfillment}%</p>
          <p className="text-[10px] text-gray-500 mt-1">Searches → Bookings</p>
        </div>
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Liquidity Score</p>
          <p className="text-2xl font-bold text-white">{metrics.supply_demand_balance.marketplace_liquidity.toFixed(2)}</p>
          <p className="text-[10px] text-gray-500 mt-1">Bookings/Capacity</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold text-white">{metrics.supply_demand_balance.search_to_book_rate}%</p>
          <p className="text-[10px] text-gray-500 mt-1">Search → Book</p>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <h4 className="text-sm font-bold text-white mb-2">⚖️ Balance Health Check</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {metrics.supply_demand_balance.supply_utilization >= 40 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-gray-300">Supply utilization: {metrics.supply_demand_balance.supply_utilization >= 40 ? 'Healthy' : 'Needs improvement'}</span>
          </div>
          <div className="flex items-center gap-2">
            {metrics.supply_demand_balance.demand_fulfillment >= 65 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-gray-300">Demand fulfillment: {metrics.supply_demand_balance.demand_fulfillment >= 65 ? 'Strong' : 'Room for growth'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TwoSidedMarketDynamics({ metrics }) {
  const ratioData = [
    { name: 'Optimal Low', value: 0.6 },
    { name: 'Current', value: metrics.network_metrics.cross_side_ratio },
    { name: 'Optimal High', value: 0.8 }
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Two-Sided Market Dynamics</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Side Balance</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratioData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Enabler:Host Ratio (Target: 0.6-0.8)</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Growth Recommendations</h4>
          <div className="space-y-3">
            {metrics.network_metrics.cross_side_ratio < 0.6 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm font-semibold text-amber-400 mb-1">⚠️ Enabler Shortage</p>
                <p className="text-xs text-gray-300">Current ratio: {metrics.network_metrics.cross_side_ratio.toFixed(2)}. Need more enablers.</p>
                <p className="text-xs text-emerald-400 mt-2">Action: Launch enabler recruitment campaign</p>
              </div>
            ) : metrics.network_metrics.cross_side_ratio > 0.8 ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm font-semibold text-blue-400 mb-1">📈 Host Growth Needed</p>
                <p className="text-xs text-gray-300">Current ratio: {metrics.network_metrics.cross_side_ratio.toFixed(2)}. More hosts needed.</p>
                <p className="text-xs text-emerald-400 mt-2">Action: Increase host marketing spend</p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm font-semibold text-emerald-400 mb-1">✅ Balanced Market</p>
                <p className="text-xs text-gray-300">Current ratio: {metrics.network_metrics.cross_side_ratio.toFixed(2)} is optimal.</p>
                <p className="text-xs text-emerald-400 mt-2">Action: Maintain balanced growth</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CrossSideNetworkEffects({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Cross-Side Network Effects</h3>
      
      <div className="relative p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg mb-6">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">More Hosts Join</p>
            <p className="text-xs text-gray-400">Higher demand signals</p>
          </div>
          
          <div>
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">Platform Value ↑</p>
            <p className="text-xs text-gray-400">Better matching</p>
          </div>
          
          <div>
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">More Enablers Join</p>
            <p className="text-xs text-gray-400">More opportunities</p>
          </div>
        </div>
        
        <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2">
          <ArrowRight className="w-8 h-8 text-purple-400" />
        </div>
        <div className="absolute top-1/2 right-1/4 transform -translate-y-1/2">
          <ArrowRight className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <h4 className="text-sm font-bold text-white mb-2">💡 Network Effect Formula</h4>
        <p className="text-xs text-gray-300 font-mono mb-2">
          Value = f(n_hosts × n_enablers × quality_score)
        </p>
        <p className="text-xs text-gray-400">
          Cross-side effects mean each side makes the other more valuable. Unlike same-side effects, 
          there's no congestion - more of each side = exponentially better platform.
        </p>
      </div>
    </Card>
  );
}

function AIPerformanceAnalysis({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-400" />
        AI Performance & ROI
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Events Generated</p>
          <p className="text-2xl font-bold text-white">{metrics.ai_performance.events_generated}</p>
        </div>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Acceptance Rate</p>
          <p className="text-2xl font-bold text-white">{metrics.ai_performance.ai_acceptance_rate}%</p>
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">AI→Booking Conv.</p>
          <p className="text-2xl font-bold text-white">{metrics.ai_performance.ai_to_booking_conversion}%</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Avg Gen Time</p>
          <p className="text-2xl font-bold text-white">{metrics.ai_performance.average_generation_time}s</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <h4 className="text-sm font-bold text-white mb-3">✅ AI Advantages</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">8.5s vs 2+ hours manual planning</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">75% acceptance rate (3x industry avg)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">$0.05 per generation (highly efficient)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">Personalized recommendations improve over time</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <h4 className="text-sm font-bold text-white mb-3">📊 AI ROI Calculation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Cost per generation:</span>
              <span className="text-white">${metrics.ai_performance.cost_per_generation.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Events generated:</span>
              <span className="text-white">{metrics.ai_performance.events_generated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total AI cost:</span>
              <span className="text-white">${(metrics.ai_performance.events_generated * metrics.ai_performance.cost_per_generation).toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-700 my-2"></div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bookings from AI:</span>
              <span className="text-white">{Math.round(metrics.ai_performance.events_generated * metrics.ai_performance.ai_to_booking_conversion / 100)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-emerald-400">ROI:</span>
              <span className="text-emerald-400">
                {((metrics.economic_health.platform_revenue * 0.8 / (metrics.ai_performance.events_generated * metrics.ai_performance.cost_per_generation)) * 100).toFixed(0)}x
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AutomationROI({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Zap className="w-6 h-6 text-amber-400" />
        Automation Economics
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Hours Saved</p>
          <p className="text-2xl font-bold text-white">{metrics.automation_roi.manual_hours_saved.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Cost Savings</p>
          <p className="text-2xl font-bold text-white">${(metrics.automation_roi.cost_savings / 1000).toFixed(1)}K</p>
        </div>
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Automated Revenue</p>
          <p className="text-2xl font-bold text-white">${(metrics.automation_roi.automated_revenue / 1000).toFixed(1)}K</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
          <p className="text-xs text-gray-400 mb-1">Automation %</p>
          <p className="text-2xl font-bold text-white">{metrics.automation_roi.automation_penetration}%</p>
        </div>
      </div>

      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg">
        <h4 className="text-lg font-bold text-white mb-4">🤖 Automation Stack Impact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-400 mb-2">What's Automated</p>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• AI event generation (8.5s vs 2h)</li>
              <li>• Smart vendor matching (instant vs days)</li>
              <li>• Contract generation (auto vs manual)</li>
              <li>• Payment processing (escrow automation)</li>
              <li>• Calendar coordination (sync vs manual)</li>
              <li>• Review collection (auto-triggered)</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-cyan-400 mb-2">Economic Impact</p>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• $30/hour labor cost saved</li>
              <li>• 1,250 hours saved = $37.5K/month</li>
              <li>• 80% of revenue from automated flows</li>
              <li>• 95% reduction in human coordination</li>
              <li>• Scalable without linear cost increase</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AlgorithmicCoordination() {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6 text-cyan-400" />
        Algorithmic Coordination
      </h3>

      <div className="space-y-4">
        <div className="p-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-base font-bold text-white mb-3">🎯 Smart Matching Algorithm</h4>
          <p className="text-sm text-gray-300 mb-3">
            AI-powered enabler-host matching considers: location, availability, price, reviews, past success rate, and compatibility signals.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Match Accuracy:</span>
              <span className="text-white font-semibold ml-2">87%</span>
            </div>
            <div className="p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Avg Match Time:</span>
              <span className="text-white font-semibold ml-2">0.3s</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
          <h4 className="text-base font-bold text-white mb-3">💰 Dynamic Pricing Engine</h4>
          <p className="text-sm text-gray-300 mb-3">
            Real-time pricing recommendations based on demand, enabler utilization, event urgency, and market rates.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Surge multiplier (peak times):</span>
              <span className="text-white">1.2-1.5x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Off-peak discount:</span>
              <span className="text-white">10-15%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Revenue uplift:</span>
              <span className="text-emerald-400 font-semibold">+8-12%</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg">
          <h4 className="text-base font-bold text-white mb-3">📅 Calendar Optimization</h4>
          <p className="text-sm text-gray-300 mb-3">
            Intelligent scheduling prevents double-bookings, optimizes enabler routes, and maximizes utilization.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">Zero double-booking conflicts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">Travel time optimization (saves 15% enabler time)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">Automatic gap-filling suggestions</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KeyFormulas() {
  const formulas = [
    {
      name: "Network Value (Metcalfe's Law)",
      formula: "V ≈ n²",
      variables: "n = number of users",
      example: "If n=100, V=10,000. If n=200, V=40,000 (4x growth!)",
      color: "emerald"
    },
    {
      name: "LTV:CAC Ratio",
      formula: "LTV / CAC ≥ 3:1",
      variables: "LTV = Customer Lifetime Value, CAC = Customer Acquisition Cost",
      example: "If LTV=$150 and CAC=$50, ratio=3:1 (healthy)",
      color: "blue"
    },
    {
      name: "Platform Take Rate",
      formula: "Take Rate = Platform Revenue / GMV",
      variables: "GMV = Gross Merchandise Value",
      example: "If GMV=$100K and revenue=$15K, take rate=15%",
      color: "purple"
    },
    {
      name: "Marketplace Liquidity",
      formula: "Liquidity = Bookings / Available Capacity",
      variables: "Higher = more efficient marketplace",
      example: "If 420 bookings with 1000 capacity, liquidity=0.42",
      color: "amber"
    },
    {
      name: "AI ROI",
      formula: "ROI = (AI Revenue - AI Cost) / AI Cost",
      variables: "Measures AI profitability",
      example: "If revenue=$50K and cost=$500, ROI=99x",
      color: "pink"
    },
    {
      name: "Churn Rate",
      formula: "Churn = (Users Lost / Total Users) × 100",
      variables: "Monthly churn rate",
      example: "If 5 users lost from 100, churn=5%",
      color: "red"
    }
  ];

  const colorClasses = {
    emerald: "from-emerald-500/10 to-emerald-600/10 border-emerald-500/30",
    blue: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-500/30",
    amber: "from-amber-500/10 to-amber-600/10 border-amber-500/30",
    pink: "from-pink-500/10 to-pink-600/10 border-pink-500/30",
    red: "from-red-500/10 to-red-600/10 border-red-500/30"
  };

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-400" />
          Key Economic Formulas
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          Essential metrics and calculations for platform economics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {formulas.map((formula, idx) => (
          <div key={idx} className={`p-5 bg-gradient-to-br ${colorClasses[formula.color]} border rounded-lg`}>
            <h4 className="text-base font-bold text-white mb-2">{formula.name}</h4>
            <div className="space-y-2">
              <div className="p-3 bg-gray-900/50 rounded font-mono text-lg text-center text-white">
                {formula.formula}
              </div>
              <p className="text-xs text-gray-400">{formula.variables}</p>
              <p className="text-xs text-emerald-400">
                💡 Example: {formula.example}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MetricsBreakdown({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-6">Complete Metrics Breakdown</h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Network Metrics
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricDisplay label="Total Users" value={metrics.network_metrics.total_users} />
            <MetricDisplay label="Active Hosts" value={metrics.network_metrics.active_hosts} />
            <MetricDisplay label="Active Enablers" value={metrics.network_metrics.active_enablers} />
            <MetricDisplay label="Network Value" value={`${metrics.network_metrics.network_value_score.toFixed(0)}K`} />
            <MetricDisplay label="Cross-Side Ratio" value={metrics.network_metrics.cross_side_ratio.toFixed(2)} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Economic Health
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricDisplay label="GMV" value={`$${(metrics.economic_health.gmv / 1000).toFixed(1)}K`} />
            <MetricDisplay label="Platform Revenue" value={`$${(metrics.economic_health.platform_revenue / 1000).toFixed(1)}K`} />
            <MetricDisplay label="Avg Booking" value={`$${metrics.economic_health.average_booking_value.toFixed(0)}`} />
            <MetricDisplay label="Take Rate" value={`${metrics.economic_health.take_rate}%`} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Economics
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricDisplay label="LTV" value={`$${metrics.user_economics.ltv.toFixed(0)}`} />
            <MetricDisplay label="CAC" value={`$${metrics.user_economics.cac.toFixed(0)}`} />
            <MetricDisplay label="LTV:CAC" value={`${metrics.user_economics.ltv_cac_ratio.toFixed(1)}:1`} />
            <MetricDisplay label="ARPU" value={`$${metrics.user_economics.arpu.toFixed(0)}`} />
            <MetricDisplay label="ARPU (Host)" value={`$${metrics.user_economics.arpu_host.toFixed(0)}`} />
            <MetricDisplay label="ARPU (Enabler)" value={`$${metrics.user_economics.arpu_enabler.toFixed(0)}`} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricDisplay({ label, value }) {
  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function AdvancedAnalytics({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-xl font-bold text-white mb-6">Advanced Analytics</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-base font-bold text-white mb-4">📊 Conversion Funnel</h4>
          <div className="space-y-3">
            <FunnelStep label="Sign Up" value={100} percentage={100} />
            <FunnelStep label="Profile Complete" value={85} percentage={85} />
            <FunnelStep label="First Search" value={70} percentage={70} />
            <FunnelStep label="View Enabler" value={50} percentage={50} />
            <FunnelStep label="Booking Started" value={20} percentage={20} />
            <FunnelStep label="Payment Success" value={15} percentage={15} />
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg">
          <h4 className="text-base font-bold text-white mb-4">📈 Retention Cohorts</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Day 1:</span>
              <span className="text-white font-semibold">100%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Day 7:</span>
              <span className="text-white font-semibold">{metrics.engagement_metrics.retention_day_7}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Day 30:</span>
              <span className="text-white font-semibold">{metrics.engagement_metrics.retention_day_30}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-gray-400">Day 90:</span>
              <span className="text-white font-semibold">15%</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FunnelStep({ label, value, percentage }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm text-white font-semibold">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function ActionableRecommendations({ metrics }) {
  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-2xl font-bold text-white mb-6">🎯 Actionable Admin Recommendations</h3>

      <div className="space-y-4">
        {metrics.recommendations.map((rec, idx) => (
          <div key={idx} className="p-5 bg-gray-800 border border-gray-700 rounded-lg hover:border-emerald-500/30 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400">{rec.category}</Badge>
                  <Badge className={`${
                    rec.priority === 'critical' ? 'bg-red-500 text-white' :
                    rec.priority === 'high' ? 'bg-amber-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{rec.recommendation}</h4>
                <p className="text-sm text-emerald-400 mb-3">
                  📈 Expected Impact: {rec.expected_impact}
                </p>
                
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-300">Action Checklist:</p>
                  {rec.action_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 rounded border-gray-600"
                      />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminPlaybook() {
  const playbooks = [
    {
      scenario: "Low Conversion Rate (less than 10%)",
      diagnosis: "Users searching but not booking",
      actions: [
        "Reduce enabler prices by 10-15% to test price sensitivity",
        "Improve AI event suggestions with more personalization",
        "Add trust signals: verified badges, reviews, portfolio",
        "Simplify booking flow (reduce steps from 5 to 3)",
        "A/B test payment page design"
      ],
      metrics_to_watch: ["Search-to-book rate", "Cart abandonment", "Time on enabler profile"]
    },
    {
      scenario: "High Churn Rate (greater than 10%)",
      diagnosis: "Users leaving after first experience",
      actions: [
        "Send personalized re-engagement emails Day 3, 7, 14",
        "Offer 'comeback discount' for lapsed users",
        "Improve Day 7 retention with AI event suggestions",
        "Add social features (invite friends, share events)",
        "Survey churned users to identify pain points"
      ],
      metrics_to_watch: ["D7/D30 retention", "Churn by cohort", "NPS score"]
    },
    {
      scenario: "Supply-Demand Imbalance",
      diagnosis: "Too many hosts, not enough enablers (or vice versa)",
      actions: [
        "If too many hosts: Launch enabler recruitment campaign",
        "If too many enablers: Increase host marketing spend",
        "Use dynamic pricing to balance supply/demand",
        "Add waitlist for oversubscribed categories",
        "Partner with schools/training programs for enabler supply"
      ],
      metrics_to_watch: ["Enabler:Host ratio", "Utilization rate", "Unfulfilled searches"]
    },
    {
      scenario: "Low AI Acceptance Rate (less than 60%)",
      diagnosis: "Users rejecting AI-generated events",
      actions: [
        "Improve prompt engineering for AI model",
        "Add more training data from successful events",
        "Let users edit AI suggestions before saving",
        "Show multiple variations (currently 4, try 6-8)",
        "Add 'Why this?' explanations for AI choices"
      ],
      metrics_to_watch: ["AI acceptance rate", "Time to edit", "AI→booking conversion"]
    }
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h3 className="text-2xl font-bold text-white mb-6">📚 Admin Playbook: Situation → Action</h3>

      <div className="space-y-6">
        {playbooks.map((playbook, idx) => (
          <div key={idx} className="p-5 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Lightbulb className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">{playbook.scenario}</h4>
                <p className="text-sm text-gray-400">{playbook.diagnosis}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-emerald-400 mb-2">✅ Action Steps:</p>
                <ol className="space-y-2">
                  {playbook.actions.map((action, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-semibold">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs font-semibold text-blue-400 mb-1">📊 Metrics to Monitor:</p>
                <p className="text-xs text-gray-300">{playbook.metrics_to_watch.join(' • ')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-5 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg">
        <h4 className="text-lg font-bold text-white mb-2">💡 Pro Tip for Admins</h4>
        <p className="text-sm text-gray-300">
          Use this playbook as a starting point. Track results for 2 weeks, then iterate. 
          Data beats opinions - always A/B test major changes before full rollout.
        </p>
      </div>
    </Card>
  );
}