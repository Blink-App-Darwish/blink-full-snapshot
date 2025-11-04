
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Zap, // Used for new Monetization section
  Brain,
  Shield,
  DollarSign,
  TrendingUp,
  Users,
  Settings,
  Clock,
  Database,
  Cloud,
  Lock
} from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";

export default function ProductionReadiness() {
  const [expandedSection, setExpandedSection] = useState(null);

  const phases = [
    {
      id: "phase-a",
      name: "Phase A: Core Escrow Logic",
      status: "completed",
      icon: DollarSign,
      color: "emerald",
      items: [
        { name: "Enhanced escrow states (7 states)", completed: true },
        { name: "Auto-release timer (72h SLA)", completed: true },
        { name: "Dispute freeze mechanism", completed: true },
        { name: "State transition audit trail", completed: true },
        { name: "Final settlement (7-day window)", completed: true },
        { name: "Double-entry ledger", completed: true }
      ]
    },
    {
      id: "phase-b",
      name: "Phase B: AI & Automation Layer ⚠️ REQUIRED FOR PRODUCTION",
      status: "pending",
      icon: Brain,
      color: "amber",
      priority: "CRITICAL",
      items: [
        { 
          name: "Predictive Risk Model", 
          completed: false,
          description: "85% dispute prediction before they occur",
          implementation: "Use booking patterns, communication delays, repeat complaints"
        },
        { 
          name: "AI Escalation Bot", 
          completed: false,
          description: "Auto-triage incidents, categorize disputes, draft mediation",
          implementation: "Use InvokeLLM with dispute context"
        },
        { 
          name: "Performance Optimizer", 
          completed: false,
          description: "Personalized improvement paths for enablers",
          implementation: "Benchmark globally, suggest training & incentives"
        },
        { 
          name: "AI Review Analyzer", 
          completed: false,
          description: "Detect patterns in feedback (tone, sentiment, context)",
          implementation: "InvokeLLM sentiment analysis + pattern detection"
        },
        { 
          name: "Smart Notification Engine", 
          completed: false,
          description: "Contextual alerts - only relevant updates",
          implementation: "Rule-based filtering + user preferences"
        }
      ]
    },
    {
      id: "phase-c",
      name: "Phase C: Analytics & Metrics",
      status: "completed",
      icon: TrendingUp,
      color: "emerald",
      items: [
        { name: "Enhanced EnablerPerformanceMetrics", completed: true },
        { name: "Enhanced HostPerformanceMetrics", completed: true },
        { name: "Global/Category/Region leaderboards", completed: true },
        { name: "Composite performance scoring", completed: true },
        { name: "Badge & achievement system", completed: true },
        { name: "Trust score calculation", completed: true }
      ]
    },
    {
      id: "integrations",
      name: "External Integrations",
      status: "partial",
      icon: Cloud,
      color: "blue",
      items: [
        { name: "Stripe Connect (Escrow)", completed: false, required: true },
        { name: "DocuSign API (Contracts)", completed: false, required: true },
        { name: "Calendar Sync (Google/Outlook)", completed: true },
        { name: "SMS Notifications (Twilio)", completed: false, required: false },
        { name: "Email Service (SendGrid)", completed: false, required: true },
        { name: "Monitoring (Sentry/Datadog)", completed: false, required: true }
      ]
    },
    {
      id: "compliance",
      name: "Compliance & Trust",
      status: "partial",
      icon: Shield,
      color: "purple",
      items: [
        { name: "Immutable audit trail", completed: true },
        { name: "Proof-of-service (geo + timestamp)", completed: true },
        { name: "Anti-fraud detection", completed: false, required: true },
        { name: "Escrow regulation compliance", completed: false, required: true },
        { name: "7-year data retention", completed: true },
        { name: "GDPR/Data protection compliance", completed: false, required: true }
      ]
    },
    {
      id: "scale",
      name: "Global Scale & Governance",
      status: "pending",
      icon: Users,
      color: "indigo",
      items: [
        { name: "Time-zone awareness", completed: false },
        { name: "Multi-currency support", completed: false },
        { name: "Localization (contracts, UI)", completed: false },
        { name: "Follow-the-sun Ops model", completed: false },
        { name: "Quarterly KPI reporting", completed: false }
      ]
    },
    // New section for Monetization Management - Advanced Features
    {
      id: "monetization",
      name: "Phase 2B: Monetization Management - Advanced Features",
      status: "pending",
      icon: Zap, // Using Zap icon for advanced features
      color: "rose", // Using a distinct color for this new phase
      priority: "medium", // As per the outline, though not visually highlighted by default
      items: [
        {
          name: "CIU Integration for Revenue Tracking",
          completed: false,
          description: "Sync monetization data with Central Intelligence Unit for AI-driven optimization",
          implementation: "Requires CIU metrics endpoints and real-time data sync"
        },
        {
          name: "Advanced Reporting & Analytics",
          completed: false,
          description: "Build comprehensive monetization insights dashboard with forecasting",
          implementation: "AI-generated trend forecasts, underperforming channel alerts, export options"
        },
        {
          name: "Open-Source Extensibility",
          completed: false,
          description: "Enable JSON schema uploads and custom field definitions",
          implementation: "Sandbox editor for testing, external API integrations (Stripe Connect, PayPal)"
        },
        {
          name: "Security & Audit Enhancement",
          completed: false,
          description: "MFA for financial actions, comprehensive audit logging",
          implementation: "Immutable logs with before/after snapshots, compliance engine integration"
        },
        {
          name: "AI Governance Mode",
          completed: false,
          description: "Auto-optimize pricing, visibility, and incentives via CIU",
          implementation: "Dynamic pricing, performance-based bonuses, intelligent boosting. (Blocked by 'CIU Integration for Revenue Tracking')" // Added blocker info to notes
        }
      ]
    },
    {
      id: "security",
      name: "Security & Infrastructure",
      status: "pending",
      icon: Lock,
      color: "red",
      items: [
        { name: "Rate limiting & DDoS protection", completed: false, required: true },
        { name: "API authentication & JWT tokens", completed: false, required: true },
        { name: "Encrypted data at rest", completed: false, required: true },
        { name: "Secure file upload (S3/IPFS)", completed: false, required: true },
        { name: "Webhook signature verification", completed: true },
        { name: "Automated backups", completed: false, required: true }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "partial": return "bg-blue-100 text-blue-700 border-blue-200";
      case "pending": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getIconColor = (color) => {
    const colors = {
      emerald: "text-emerald-500 bg-emerald-50",
      amber: "text-amber-500 bg-amber-50",
      blue: "text-blue-500 bg-blue-50",
      purple: "text-purple-500 bg-purple-50",
      indigo: "text-indigo-500 bg-indigo-50",
      red: "text-red-500 bg-red-50",
      rose: "text-rose-500 bg-rose-50" // Added color for the new phase
    };
    return colors[color] || colors.blue;
  };

  const calculateProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    phases.forEach(phase => {
      phase.items.forEach(item => {
        totalItems++;
        if (item.completed) completedItems++;
      });
    });

    return {
      completed: completedItems,
      total: totalItems,
      percentage: Math.round((completedItems / totalItems) * 100)
    };
  };

  const progress = calculateProgress();

  const criticalBlockers = phases
    .flatMap(phase => 
      phase.items
        .filter(item => !item.completed && (item.required || phase.priority === "CRITICAL"))
        .map(item => ({ ...item, phaseName: phase.name }))
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BlinkLogo size="md" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Production Readiness</h1>
              <p className="text-sm text-gray-500 mt-1">Pre-launch checklist & requirements</p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2">
            v1.0 Pre-Production
          </Badge>
        </div>

        {/* Overall Progress */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Overall Progress</h2>
              <p className="text-sm text-gray-600 mt-1">
                {progress.completed} of {progress.total} items completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-emerald-600">{progress.percentage}%</div>
              <p className="text-xs text-gray-500">Complete</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </Card>

        {/* Critical Blockers */}
        {criticalBlockers.length > 0 && (
          <Card className="p-6 mb-6 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-amber-900">Critical Blockers ({criticalBlockers.length})</h2>
                <p className="text-sm text-amber-700 mt-1">
                  These must be completed before production launch
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {criticalBlockers.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                  <Circle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.phaseName}</p>
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Phase Details */}
        <div className="space-y-4">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const isExpanded = expandedSection === phase.id;
            const completedCount = phase.items.filter(i => i.completed).length;
            const totalCount = phase.items.length;

            return (
              <Card key={phase.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : phase.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${getIconColor(phase.color)} flex items-center justify-center`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{phase.name}</h3>
                        {phase.priority === "CRITICAL" && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            CRITICAL
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {completedCount} / {totalCount} completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={`${getStatusColor(phase.status)} border`}>
                      {phase.status}
                    </Badge>
                    <div className="text-2xl font-bold text-gray-400">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="space-y-3">
                      {phase.items.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {item.name}
                              </p>
                              {item.required && !item.completed && (
                                <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">
                                  REQUIRED
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                            )}
                            {item.implementation && (
                              <p className="text-xs text-blue-600 mt-1">
                                💡 {item.implementation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Phase B Reminder */}
        <Card className="mt-6 p-6 border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">
                ⚠️ Phase B: AI & Automation - ON HOLD
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                Phase B implementation is currently <strong>deferred</strong> but is <strong>CRITICAL FOR PRODUCTION</strong>. 
                This phase includes predictive risk models, AI escalation, performance optimization, and smart notifications.
              </p>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  MUST COMPLETE BEFORE LAUNCH
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                  Estimated: 2-3 days implementation
                </Badge>
              </div>
              <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">📝 Implementation Note:</p>
                <p className="text-xs text-gray-600">
                  When ready to implement Phase B, use <code className="bg-gray-100 px-1 py-0.5 rounded">InvokeLLM</code> for 
                  AI features (dispute triage, sentiment analysis) combined with rule-based logic for risk scoring to balance 
                  intelligence with cost efficiency.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p className="mt-2">🎯 Target launch: Complete all CRITICAL & REQUIRED items</p>
        </div>
      </div>
    </div>
  );
}
