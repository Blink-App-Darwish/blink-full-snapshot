import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Pause, 
  Eye, 
  BarChart3, 
  Cpu, 
  Database, 
  Sparkles,
  Zap,
  Clock,
  Target,
  AlertTriangle,
  XCircle,
  FileText,
  DollarSign,
  MessageSquare,
  Shield,
  Users,
  Calendar,
  Camera,
  Globe,
  Search,
  Award,
  Flag,
  ThumbsUp,
  AlertCircle,
  TrendingDown,
  Settings,
  Bell,
  Filter,
  Loader2,
  Link2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import CIUDashboard from "./CIUDashboard";

// 20 Core Engines Definition
const CORE_ENGINES = [
  {
    code: "ABE",
    name: "After Booking Engine",
    description: "Handles post-booking lifecycle: confirmations, payments, contracts, communications, status changes",
    category: "booking",
    icon: Zap,
    color: "emerald",
    priority: 100,
    key_logic: "Event-driven, triggers based on booking state (CONFIRMED → IN_PROGRESS → COMPLETED)",
    dependencies: ["SCE", "EPE", "NRE", "CAE"]
  },
  {
    code: "SCE",
    name: "Smart Contracts Engine",
    description: "Creates, manages, and tracks contract lifecycles between Enablers and Hosts",
    category: "booking",
    icon: FileText,
    color: "blue",
    priority: 95,
    key_logic: "Template-based generation + signature logic + auto-execution hooks (escrow release)",
    dependencies: ["EPE", "IRE"]
  },
  {
    code: "EPE",
    name: "Escrow & Payout Engine",
    description: "Holds and releases funds after booking completion and approvals",
    category: "payment",
    icon: DollarSign,
    color: "emerald",
    priority: 98,
    key_logic: "Works tightly with ABE and SCE; automated disbursements after event completion",
    dependencies: ["ABE", "SCE", "DRE"]
  },
  {
    code: "SNE",
    name: "Smart Negotiations Engine",
    description: "Applies Enabler-defined rules for price, time, and service negotiations",
    category: "booking",
    icon: MessageSquare,
    color: "purple",
    priority: 85,
    key_logic: "Dynamic pricing, distance thresholds, or timing constraints",
    dependencies: ["SCE", "RTE"]
  },
  {
    code: "AECE",
    name: "AI Event Creation Engine",
    description: "AI-driven event generator using preferences, availability, and trends",
    category: "ai",
    icon: Sparkles,
    color: "pink",
    priority: 80,
    key_logic: "Uses ML logic to produce packages, recommend combinations, and match compatibilities",
    dependencies: ["RDE", "FGE", "CAE"]
  },
  {
    code: "CAE",
    name: "Calendar & Availability Engine",
    description: "Real-time sync of schedules, availability, and booking prevention",
    category: "scheduling",
    icon: Calendar,
    color: "blue",
    priority: 90,
    key_logic: "Double-booking prevention, mirror sync, and AI-based rescheduling suggestions",
    dependencies: ["ABE", "NRE"]
  },
  {
    code: "NRE",
    name: "Notification & Realtime Engine",
    description: "Pushes updates, reminders, warnings, and messages in real-time",
    category: "communication",
    icon: Bell,
    color: "amber",
    priority: 92,
    key_logic: "WebSocket or Pusher-based. Event-driven",
    dependencies: []
  },
  {
    code: "PVE",
    name: "Proof & Verification Engine",
    description: "Handles photo/video proof uploads, verification, and authenticity checks",
    category: "quality",
    icon: Camera,
    color: "indigo",
    priority: 87,
    key_logic: "Supports escrow release validation",
    dependencies: ["EPE", "QAE"]
  },
  {
    code: "AKE",
    name: "Analytics & KPI Engine",
    description: "Collects behavioral, operational, and performance analytics",
    category: "analytics",
    icon: BarChart3,
    color: "cyan",
    priority: 85,
    key_logic: "Powers dashboards and forecasting",
    dependencies: ["FGE"]
  },
  {
    code: "IRE",
    name: "Identity & Role Engine",
    description: "Manages Host/Enabler/Admin roles under one identity",
    category: "security",
    icon: Shield,
    color: "red",
    priority: 99,
    key_logic: "Resolves same login across portals issue",
    dependencies: ["RCE"]
  },
  {
    code: "RTE",
    name: "Reputation & Trust Engine",
    description: "Manages trust scores based on reviews, completion rates, and reliability",
    category: "quality",
    icon: Award,
    color: "yellow",
    priority: 88,
    key_logic: "Dynamic trust scores, fraud detection, predictive flagging",
    dependencies: ["QAE", "FDBE", "FEE"]
  },
  {
    code: "QAE",
    name: "Quality Assurance Engine",
    description: "Evaluates Enabler performance using data, feedback, and proof",
    category: "quality",
    icon: CheckCircle2,
    color: "green",
    priority: 86,
    key_logic: "AI-driven rating normalization, service consistency metrics",
    dependencies: ["PVE", "FEE", "RTE"]
  },
  {
    code: "DRE",
    name: "Dispute Resolution Engine",
    description: "Automates dispute workflows with escrow and contract integration",
    category: "operations",
    icon: AlertTriangle,
    color: "orange",
    priority: 94,
    key_logic: "Evidence ingestion, AI-based mediation suggestions, admin escalation panel",
    dependencies: ["EPE", "SCE", "PVE"]
  },
  {
    code: "RCE",
    name: "Risk & Compliance Engine",
    description: "Monitors compliance with laws, KYC, AML, and service standards",
    category: "security",
    icon: Shield,
    color: "red",
    priority: 96,
    key_logic: "Automated KYC checks, region-based compliance gates",
    dependencies: ["IRE", "FDBE"]
  },
  {
    code: "RDE",
    name: "Recommendation & Discovery Engine",
    description: "AI that recommends Enablers, packages, and upgrades to Hosts",
    category: "ai",
    icon: Search,
    color: "purple",
    priority: 82,
    key_logic: "Predictive analytics, smart matching, upselling, and cross-selling",
    dependencies: ["AKE", "RTE", "FGE"]
  },
  {
    code: "FEE",
    name: "Feedback & Experience Engine",
    description: "Collects and processes user feedback with sentiment analysis",
    category: "analytics",
    icon: ThumbsUp,
    color: "blue",
    priority: 81,
    key_logic: "Sentiment analysis, heatmaps, NPS tracking, churn prediction",
    dependencies: ["AKE", "QAE"]
  },
  {
    code: "FDBE",
    name: "Fraud Detection & Behavior Engine",
    description: "Identifies anomalies, duplicate accounts, and suspicious patterns",
    category: "security",
    icon: Flag,
    color: "red",
    priority: 93,
    key_logic: "ML-based fraud patterns, device fingerprinting, behavior scoring",
    dependencies: ["RTE", "RCE"]
  },
  {
    code: "FGE",
    name: "Forecasting & Growth Engine",
    description: "Predictive intelligence for supply/demand, trends, and cash flow",
    category: "analytics",
    icon: TrendingUp,
    color: "emerald",
    priority: 79,
    key_logic: "Predictive ML models, forecasting dashboards",
    dependencies: ["AKE", "RDE"]
  },
  {
    code: "CMCE",
    name: "Content Moderation & Curation Engine",
    description: "Ensures media, descriptions, and communications comply with standards",
    category: "quality",
    icon: Eye,
    color: "indigo",
    priority: 84,
    key_logic: "AI-based moderation for uploaded content, images, and reviews",
    dependencies: ["RCE"]
  },
  {
    code: "GOWE",
    name: "Global Operations & Workforce Engine",
    description: "Automates admin, operations, and support workforce allocation",
    category: "operations",
    icon: Globe,
    color: "cyan",
    priority: 83,
    key_logic: "Smart task routing, workload balancing, 24/7 global scheduling",
    dependencies: ["NRE"]
  }
];

export default function IntelligenceConsole() {
  const [dbEngines, setDbEngines] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    total_workflows: 0,
    active_workflows: 0,
    completed_today: 0,
    success_rate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [togglingEngine, setTogglingEngine] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInitializeModal, setShowInitializeModal] = useState(false);
  const [ciuView, setCiuView] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load database engines
      try {
        const { IntelligenceEngine } = await import("@/api/entities");
        const enginesData = await IntelligenceEngine.list("-created_date", 50);
        setDbEngines(enginesData);
      } catch (error) {
        console.warn("IntelligenceEngine entity not available yet:", error);
        setDbEngines([]);
      }

      // Load workflows for metrics
      try {
        const { BookingWorkflow } = await import("@/api/entities");
        const workflows = await BookingWorkflow.filter({
          workflow_stage: ["CONFIRMED", "PRE_EVENT", "EVENT_EXECUTION"]
        }, "-created_date", 100);
        setActiveWorkflows(workflows);

        const allWorkflows = await BookingWorkflow.list("-created_date", 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const completedToday = allWorkflows.filter(w => 
          w.workflow_stage === "COMPLETED" && 
          new Date(w.updated_date) >= today
        ).length;

        const successfulWorkflows = allWorkflows.filter(w => 
          w.workflow_stage === "COMPLETED" && 
          (!w.incidents || w.incidents.length === 0)
        ).length;

        const successRate = allWorkflows.length > 0 
          ? (successfulWorkflows / allWorkflows.length * 100).toFixed(1)
          : 0;

        setSystemMetrics({
          total_workflows: allWorkflows.length,
          active_workflows: workflows.length,
          completed_today: completedToday,
          success_rate: parseFloat(successRate)
        });
      } catch (error) {
        console.warn("BookingWorkflow not available yet:", error);
      }

    } catch (error) {
      console.error("Error loading intelligence data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // MERGE LOGIC: Combine CORE_ENGINES with database engines
  const mergedEngines = CORE_ENGINES.map(coreEngine => {
    const dbEngine = dbEngines.find(db => db.engine_code === coreEngine.code);
    
    if (dbEngine) {
      return {
        ...coreEngine,
        ...dbEngine,
        icon: coreEngine.icon,
        color: coreEngine.color,
        dependencies: coreEngine.dependencies,
        initialized: true
      };
    } else {
      return {
        ...coreEngine,
        id: null,
        status: 'not_initialized',
        engine_version: '1.0.0',
        initialized: false,
        metrics: {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          average_execution_time_ms: 0
        },
        enabled_features: [],
        configuration: {}
      };
    }
  });

  // STEP 2: Post-Initialization Auto-Refresh
  const initializeAllEngines = async () => {
    try {
      setIsInitializing(true);
      const { IntelligenceEngine } = await import("@/api/entities");

      let created = 0;
      let skipped = 0;

      for (const engineDef of CORE_ENGINES) {
        const existing = await IntelligenceEngine.filter({ engine_code: engineDef.code });
        
        if (existing.length === 0) {
          await IntelligenceEngine.create({
            engine_code: engineDef.code,
            engine_name: engineDef.name,
            engine_version: "1.0.0",
            status: engineDef.code === "ABE" ? "active" : "inactive",
            description: engineDef.description,
            category: engineDef.category,
            priority: engineDef.priority,
            key_logic: engineDef.key_logic,
            configuration: {},
            enabled_features: [],
            metrics: {
              total_executions: 0,
              successful_executions: 0,
              failed_executions: 0,
              average_execution_time_ms: 0
            }
          });
          created++;
        } else {
          skipped++;
        }
      }

      // STEP 2: Immediate state refresh
      const updatedEngines = await IntelligenceEngine.list("-created_date", 50);
      setDbEngines(updatedEngines);
      
      toast.success(`✅ Engine Initialization Complete!`, {
        description: `${created} engines created, ${skipped} already exist`
      });
      
      setShowInitializeModal(false);

    } catch (error) {
      console.error("Error initializing engines:", error);
      toast.error("Failed to initialize engines", {
        description: error.message
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // STEP 3: Toggle with Optimistic Update & Toast
  const toggleEngineStatus = async (engine) => {
    if (!engine.initialized) {
      toast.error("Engine not initialized", {
        description: "Click 'Initialize All Engines' to set it up first"
      });
      return;
    }

    try {
      setTogglingEngine(engine.code);
      const newStatus = engine.status === 'active' ? 'inactive' : 'active';
      
      // Optimistic update
      setDbEngines(prev => prev.map(e => 
        e.engine_code === engine.code 
          ? { ...e, status: newStatus }
          : e
      ));

      const { IntelligenceEngine } = await import("@/api/entities");
      await IntelligenceEngine.update(engine.id, { status: newStatus });
      
      toast.success(`${engine.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`, {
        description: `Engine status updated successfully`
      });

      // Refresh to confirm
      const updatedEngines = await IntelligenceEngine.list("-created_date", 50);
      setDbEngines(updatedEngines);

    } catch (error) {
      console.error("Error toggling engine:", error);
      toast.error("Failed to toggle engine status", {
        description: error.message
      });
      // Revert optimistic update
      await loadData();
    } finally {
      setTogglingEngine(null);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      emerald: "from-emerald-500/10 to-emerald-600/10 border-emerald-500/30",
      blue: "from-blue-500/10 to-blue-600/10 border-blue-500/30",
      purple: "from-purple-500/10 to-purple-600/10 border-purple-500/30",
      pink: "from-pink-500/10 to-pink-600/10 border-pink-500/30",
      amber: "from-amber-500/10 to-amber-600/10 border-amber-500/30",
      indigo: "from-indigo-500/10 to-indigo-600/10 border-indigo-500/30",
      cyan: "from-cyan-500/10 to-cyan-600/10 border-cyan-500/30",
      red: "from-red-500/10 to-red-600/10 border-red-500/30",
      yellow: "from-yellow-500/10 to-yellow-600/10 border-yellow-500/30",
      green: "from-green-500/10 to-green-600/10 border-green-500/30",
      orange: "from-orange-500/10 to-orange-600/10 border-orange-500/30"
    };
    return colors[color] || colors.emerald;
  };

  const filteredEngines = mergedEngines.filter(engine => {
    const matchesCategory = filterCategory === "all" || engine.category === filterCategory;
    const matchesSearch = engine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         engine.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ["all", "booking", "payment", "ai", "scheduling", "communication", "quality", "analytics", "security", "operations"];

  const uninitializedCount = mergedEngines.filter(e => !e.initialized).length;
  const activeCount = mergedEngines.filter(e => e.status === 'active').length;

  // STEP 4: Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(6)].map((_, idx) => (
        <Card key={idx} className="bg-gray-900 border-gray-800 p-6 animate-pulse">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gray-800"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-800 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-4/5"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800">
            <div className="h-3 bg-gray-800 rounded"></div>
            <div className="h-3 bg-gray-800 rounded"></div>
            <div className="h-3 bg-gray-800 rounded"></div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              Central Intelligence Unit
            </h2>
            <p className="text-sm text-gray-400 mt-2">Loading system...</p>
          </div>
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            Central Intelligence Unit
          </h2>
          <p className="text-sm text-gray-400 mt-2">20 Core AI-Powered Engines Orchestrating Blink Operations</p>
        </div>

        <div className="flex gap-2">
          {uninitializedCount > 0 && !ciuView && (
            <Button 
              onClick={() => setShowInitializeModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isInitializing}
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Initialize {uninitializedCount} Engines
                </>
              )}
            </Button>
          )}
          
          <Button onClick={loadData} variant="outline" className="border-gray-700 text-gray-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toggle between Engines and CIU Dashboard */}
      <div className="flex gap-2">
        <Button
          onClick={() => setCiuView(false)}
          variant={!ciuView ? "default" : "outline"}
          className={!ciuView ? "bg-emerald-600 hover:bg-emerald-700" : "border-gray-700 text-gray-300 hover:bg-gray-800"}
        >
          <Zap className="w-4 h-4 mr-2" />
          20 Engines
        </Button>
        <Button
          onClick={() => setCiuView(true)}
          variant={ciuView ? "default" : "outline"}
          className={ciuView ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700 text-gray-300 hover:bg-gray-800"}
        >
          <Brain className="w-4 h-4 mr-2" />
          CIU Dashboard
        </Button>
      </div>

      {!ciuView ? (
        <>
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-8 h-8 text-emerald-400" />
                <Badge className="bg-emerald-500/20 text-emerald-300">Live</Badge>
              </div>
              <p className="text-xs text-emerald-300 mb-1">Active Workflows</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.active_workflows}</p>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle2 className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs text-blue-300 mb-1">Completed Today</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.completed_today}</p>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-xs text-purple-300 mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.success_rate}%</p>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30 p-6">
              <div className="flex items-center justify-between mb-3">
                <Cpu className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-xs text-amber-300 mb-1">Active Engines</p>
              <p className="text-3xl font-bold text-white">{activeCount}/20</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center flex-wrap">
            <Input
              placeholder="Search engines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs bg-gray-800 border-gray-700 text-white"
            />

            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={filterCategory === cat ? "default" : "outline"}
                  className={filterCategory === cat ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700 text-gray-300 hover:bg-gray-800"}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Engines Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEngines.map((engine) => {
              const Icon = engine.icon;
              const color = engine.color;
              const isToggling = togglingEngine === engine.code;

              return (
                <Card 
                  key={engine.code} 
                  className={`bg-gradient-to-br ${getColorClasses(color)} border p-6 hover:shadow-lg transition-all duration-300 ${
                    !engine.initialized ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        engine.status === 'active' ? 'bg-emerald-500/20' : 
                        engine.status === 'not_initialized' ? 'bg-gray-700' :
                        'bg-gray-700'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          engine.status === 'active' ? 'text-emerald-400' : 'text-gray-400'
                        }`} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-white">{engine.name}</h4>
                          <Badge className={`text-[10px] ${
                            engine.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            engine.status === 'not_initialized' ? 'bg-gray-700 text-gray-400' :
                            engine.status === 'beta' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {engine.status === 'not_initialized' ? 'NOT INITIALIZED' : engine.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{engine.code} v{engine.engine_version || '1.0.0'}</p>
                        <p className="text-sm text-gray-300">{engine.description}</p>
                        {engine.key_logic && (
                          <p className="text-xs text-gray-500 mt-2">💡 {engine.key_logic}</p>
                        )}
                      </div>
                    </div>

                    {/* STEP 3 & 4: Toggle button with loading state */}
                    {engine.initialized && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700"
                        onClick={() => toggleEngineStatus(engine)}
                        disabled={isToggling}
                      >
                        {isToggling ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ...
                          </>
                        ) : engine.status === 'active' ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* STEP 6: Metrics with placeholder state */}
                  {engine.initialized && engine.metrics && (
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Executions</p>
                        <p className="text-sm font-semibold text-white">
                          {engine.metrics.total_executions === 0 ? (
                            <span className="text-gray-600 text-xs">Not yet executed</span>
                          ) : (
                            engine.metrics.total_executions
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Success</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {engine.metrics.successful_executions || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Health</p>
                        <p className="text-sm font-semibold text-gray-400">
                          {engine.status === 'active' ? 'Ready' : 'Idle'}
                        </p>
                      </div>
                    </div>
                  )}

                  {!engine.initialized && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        This engine needs to be initialized before use
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-300 flex-1"
                      onClick={() => setSelectedEngine(engine)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                    {engine.initialized && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-gray-300 flex-1"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Analytics
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <CIUDashboard />
      )}

      {/* Initialize Modal */}
      {showInitializeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Initialize Intelligence Engines</h3>
            <p className="text-gray-300 mb-6">
              This will create database records for all {uninitializedCount} uninitialized engines.
              Each engine can be activated/deactivated independently after initialization.
            </p>

            <div className="bg-gray-800 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-semibold text-white mb-3">Engines to be initialized:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                {mergedEngines.filter(e => !e.initialized).map(engine => (
                  <div key={engine.code} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-gray-300">{engine.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={initializeAllEngines}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Initialize {uninitializedCount} Engines
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300"
                onClick={() => setShowInitializeModal(false)}
                disabled={isInitializing}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 7: Enhanced Engine Detail Modal */}
      {selectedEngine && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedEngine.name}</h3>
                  <p className="text-sm text-gray-400">{selectedEngine.code} v{selectedEngine.engine_version}</p>
                </div>
                <Button variant="ghost" onClick={() => setSelectedEngine(null)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Description</p>
                  <p className="text-sm text-white">{selectedEngine.description}</p>
                </div>

                {/* Key Logic */}
                {selectedEngine.key_logic && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Key Logic</p>
                    <p className="text-sm text-white bg-gray-800 rounded-lg p-3">{selectedEngine.key_logic}</p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Status</p>
                  <Badge className={`${
                    selectedEngine.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedEngine.status === 'not_initialized' ? 'bg-gray-700 text-gray-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {selectedEngine.status === 'not_initialized' ? 'NOT INITIALIZED' : selectedEngine.status.toUpperCase()}
                  </Badge>
                </div>

                {/* STEP 7: Dependencies */}
                {selectedEngine.dependencies && selectedEngine.dependencies.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold flex items-center gap-2">
                      <Link2 className="w-3 h-3" />
                      Dependencies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEngine.dependencies.map((dep) => {
                        const depEngine = mergedEngines.find(e => e.code === dep);
                        return (
                          <Badge 
                            key={dep} 
                            className={`${
                              depEngine?.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {dep}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 7: Recent Activity */}
                {selectedEngine.initialized && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Recent Activity</p>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Last Execution:</span>
                          <span className="text-gray-300">
                            {selectedEngine.metrics?.total_executions === 0 
                              ? 'Not yet executed' 
                              : 'Recently'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Average Response Time:</span>
                          <span className="text-gray-300">
                            {selectedEngine.metrics?.average_execution_time_ms || 0}ms
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Success Rate:</span>
                          <span className="text-emerald-400">
                            {selectedEngine.metrics?.total_executions > 0
                              ? `${((selectedEngine.metrics.successful_executions / selectedEngine.metrics.total_executions) * 100).toFixed(1)}%`
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 7: Health History */}
                {selectedEngine.initialized && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Health Status</p>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          selectedEngine.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                        }`}></div>
                        <div>
                          <p className="text-sm text-white">
                            {selectedEngine.status === 'active' ? 'Operational' : 'Idle'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {selectedEngine.status === 'active' 
                              ? 'Engine is running and processing requests' 
                              : 'Engine is paused'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration */}
                {selectedEngine.initialized && selectedEngine.configuration && Object.keys(selectedEngine.configuration).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Configuration</p>
                    <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(selectedEngine.configuration, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Features */}
                {selectedEngine.initialized && selectedEngine.enabled_features && selectedEngine.enabled_features.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Enabled Features</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEngine.enabled_features.map((feature, idx) => (
                        <Badge key={idx} className="bg-emerald-500/20 text-emerald-300 text-xs">
                          {feature.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not Initialized Warning */}
                {!selectedEngine.initialized && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-300 mb-1">Not Initialized</p>
                        <p className="text-xs text-amber-200">
                          This engine needs to be initialized before it can be used. Click "Initialize Engines" to set it up.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}