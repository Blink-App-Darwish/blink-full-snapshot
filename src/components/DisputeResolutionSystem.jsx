
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  FileText,
  MessageSquare,
  Eye,
  Send,
  Upload,
  Download,
  Shield,
  Zap,
  User,
  DollarSign,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";

export default function DisputeResolutionSystem() {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [resolutionForm, setResolutionForm] = useState({
    type: "full_refund",
    amount_to_host_cents: 0,
    amount_to_enabler_cents: 0,
    resolution_notes: ""
  });
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [filterStatus]);

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const { Dispute } = await import("@/api/entities");
      
      let disputesData;
      if (filterStatus === "all") {
        disputesData = await Dispute.list("-created_date", 100);
      } else {
        disputesData = await Dispute.filter({ status: filterStatus }, "-created_date", 100);
      }
      
      setDisputes(disputesData);
    } catch (error) {
      console.error("Error loading disputes:", error);
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDisputeWithAI = async (dispute) => {
    setAiAnalyzing(true);
    try {
      console.log("🤖 Analyzing dispute with AI...");
      
      // Get related data
      const { Booking, User, Enabler } = await import("@/api/entities");
      const booking = await Booking.filter({ id: dispute.booking_id }).then(b => b[0]);
      const host = await User.filter({ id: dispute.opened_by }).then(u => u[0]);
      
      const prompt = `Analyze this dispute and provide a recommended resolution:

**Dispute Details:**
- ID: ${dispute.id}
- Reason: ${dispute.reason}
- Description: ${dispute.description}
- Amount Disputed: $${(dispute.amount_disputed_cents / 100).toFixed(2)}
- Opened by: ${dispute.opened_by_role} (${host?.full_name || 'Unknown'})
- Status: ${dispute.status}
- Priority: ${dispute.priority}

**Context:**
- Booking ID: ${booking?.id || 'Unknown'}
- Event Type: ${booking?.event_type || 'Unknown'}
- Original Amount: $${booking?.total_amount || 0}

**Your Task:**
Provide a fair resolution recommendation based on:
1. The dispute reason and description
2. Amount involved
3. Who opened the dispute
4. Platform policies

Return a JSON with:
- suggested_action: One of [full_refund, partial_refund, no_refund, enabler_payout, split]
- confidence_score: 0-1 how confident you are
- reasoning: Brief explanation (2-3 sentences)
- amount_to_host_cents: Recommended amount to host
- amount_to_enabler_cents: Recommended amount to enabler
- similar_precedents: Array of similar case descriptions`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_action: { type: "string" },
            confidence_score: { type: "number" },
            reasoning: { type: "string" },
            amount_to_host_cents: { type: "number" },
            amount_to_enabler_cents: { type: "number" },
            similar_precedents: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["suggested_action", "confidence_score", "reasoning"]
        }
      });

      console.log("✅ AI Analysis complete:", aiResponse);

      // Update dispute with AI recommendation
      const { Dispute } = await import("@/api/entities");
      await Dispute.update(dispute.id, {
        ai_recommendation: {
          suggested_action: aiResponse.suggested_action,
          confidence_score: aiResponse.confidence_score,
          reasoning: aiResponse.reasoning,
          similar_cases: aiResponse.similar_precedents || []
        }
      });

      // Update local state
      setSelectedDispute(prev => ({
        ...prev,
        ai_recommendation: {
          suggested_action: aiResponse.suggested_action,
          confidence_score: aiResponse.confidence_score,
          reasoning: aiResponse.reasoning,
          similar_cases: aiResponse.similar_precedents || []
        }
      }));

      // Pre-fill resolution form with AI recommendation
      setResolutionForm({
        type: aiResponse.suggested_action,
        amount_to_host_cents: aiResponse.amount_to_host_cents || 0,
        amount_to_enabler_cents: aiResponse.amount_to_enabler_cents || 0,
        resolution_notes: `AI Recommended: ${aiResponse.reasoning}`
      });

      alert("✅ AI analysis complete! Review the recommendation below.");
    } catch (error) {
      console.error("Error analyzing dispute:", error);
      alert("Failed to analyze dispute with AI. Please try again.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const resolveDispute = async () => {
    if (!selectedDispute) return;
    
    if (!resolutionForm.resolution_notes.trim()) {
      alert("Please provide resolution notes");
      return;
    }

    try {
      const { Dispute, EscrowAccount, AuditLog } = await import("@/api/entities");
      const user = await base44.auth.me();

      // Update dispute status
      await Dispute.update(selectedDispute.id, {
        status: "RESOLVED",
        resolution: {
          type: resolutionForm.type,
          amount_to_host_cents: resolutionForm.amount_to_host_cents,
          amount_to_enabler_cents: resolutionForm.amount_to_enabler_cents,
          resolution_notes: resolutionForm.resolution_notes,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        }
      });

      // Add timeline entry
      const newTimeline = [
        ...(selectedDispute.timeline || []),
        {
          timestamp: new Date().toISOString(),
          actor: user.id,
          action: "RESOLVED",
          notes: resolutionForm.resolution_notes
        }
      ];
      
      await Dispute.update(selectedDispute.id, { timeline: newTimeline });

      // Process escrow based on resolution
      if (selectedDispute.escrow_id) {
        const escrow = await EscrowAccount.filter({ id: selectedDispute.escrow_id }).then(e => e[0]);
        
        if (escrow && escrow.status === "DISPUTED") {
          if (resolutionForm.type === "full_refund") {
            await EscrowAccount.update(escrow.id, {
              status: "REFUNDED",
              refunded_at: new Date().toISOString(),
              manual_action_by: user.id,
              manual_action_reason: `Dispute resolved: ${resolutionForm.resolution_notes}`
            });
          } else if (resolutionForm.type === "enabler_payout") {
            await EscrowAccount.update(escrow.id, {
              status: "RELEASED",
              released_at: new Date().toISOString(),
              manual_action_by: user.id,
              manual_action_reason: `Dispute resolved: ${resolutionForm.resolution_notes}`
            });
          } else if (resolutionForm.type === "split" || resolutionForm.type === "partial_refund") {
            await EscrowAccount.update(escrow.id, {
              status: "PARTIAL_RELEASE",
              manual_action_by: user.id,
              manual_action_reason: `Dispute resolved with split: ${resolutionForm.resolution_notes}`
            });
          }
        }
      }

      // Create audit log
      await AuditLog.create({
        action: "dispute_resolved",
        entity_type: "Dispute",
        entity_id: selectedDispute.id,
        actor_id: user.id,
        actor_role: "admin",
        reason: resolutionForm.resolution_notes,
        severity: "CRITICAL",
        changes: {
          before: { status: selectedDispute.status },
          after: { status: "RESOLVED", resolution: resolutionForm }
        }
      });

      alert("✅ Dispute resolved successfully!");
      setSelectedDispute(null);
      setResolutionForm({
        type: "full_refund",
        amount_to_host_cents: 0,
        amount_to_enabler_cents: 0,
        resolution_notes: ""
      });
      
      await loadDisputes();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute. Please try again.");
    }
  };

  const escalateDispute = async (dispute) => {
    try {
      const { Dispute, AdminNotification, AuditLog } = await import("@/api/entities");
      const user = await base44.auth.me();

      await Dispute.update(dispute.id, {
        status: "ESCALATED",
        escalated_to: "senior_admin",
        escalated_at: new Date().toISOString(),
        priority: "CRITICAL"
      });

      // Create notification for senior admins
      await AdminNotification.create({
        type: "DISPUTE_OPENED",
        severity: "URGENT",
        title: "Dispute Escalated",
        message: `Dispute #${dispute.id.slice(0, 8)} has been escalated and requires immediate attention.`,
        entity_type: "Dispute",
        entity_id: dispute.id,
        action_required: true,
        action_url: `/AdminDashboard?tab=disputes&dispute_id=${dispute.id}`
      });

      // Create audit log
      await AuditLog.create({
        action: "dispute_escalated",
        entity_type: "Dispute",
        entity_id: dispute.id,
        actor_id: user.id,
        actor_role: "admin",
        severity: "WARNING"
      });

      alert("✅ Dispute escalated to senior management");
      await loadDisputes();
    } catch (error) {
      console.error("Error escalating dispute:", error);
      alert("Failed to escalate dispute");
    }
  };

  const getSLAStatus = (dispute) => {
    if (!dispute.sla_deadline) return null;
    
    const deadline = new Date(dispute.sla_deadline);
    const now = new Date();
    const hoursRemaining = differenceInHours(deadline, now);
    
    if (hoursRemaining < 0) {
      return { status: "breached", color: "text-red-500", text: "SLA Breached" };
    } else if (hoursRemaining < 24) {
      return { status: "critical", color: "text-amber-500", text: `${hoursRemaining}h remaining` };
    } else {
      return { status: "on_track", color: "text-emerald-500", text: `${Math.floor(hoursRemaining / 24)}d remaining` };
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      OPEN: { color: "bg-blue-100 text-teal-700", icon: AlertCircle },
      UNDER_REVIEW: { color: "bg-purple-100 text-purple-700", icon: Eye },
      AWAITING_RESPONSE: { color: "bg-amber-100 text-amber-700", icon: Clock },
      RESOLVED: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      ESCALATED: { color: "bg-red-100 text-red-700", icon: TrendingUp },
      CLOSED: { color: "bg-gray-100 text-teal-700", icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config.OPEN;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = {
      LOW: "bg-gray-100 text-teal-700",
      MEDIUM: "bg-blue-100 text-teal-700",
      HIGH: "bg-amber-100 text-amber-700",
      CRITICAL: "bg-red-100 text-red-700"
    };
    return <Badge className={config[priority] || config.MEDIUM}>{priority}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Open Disputes</p>
              <p className="text-2xl font-bold text-white">
                {disputes.filter(d => d.status === 'OPEN').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Under Review</p>
              <p className="text-2xl font-bold text-white">
                {disputes.filter(d => d.status === 'UNDER_REVIEW').length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">SLA Breached</p>
              <p className="text-2xl font-bold text-white">
                {disputes.filter(d => {
                  const sla = getSLAStatus(d);
                  return sla?.status === 'breached';
                }).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Resolved (30d)</p>
              <p className="text-2xl font-bold text-white">
                {disputes.filter(d => d.status === 'RESOLVED').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
          <TabsTrigger value="OPEN">Open ({disputes.filter(d => d.status === 'OPEN').length})</TabsTrigger>
          <TabsTrigger value="UNDER_REVIEW">Under Review ({disputes.filter(d => d.status === 'UNDER_REVIEW').length})</TabsTrigger>
          <TabsTrigger value="ESCALATED">Escalated ({disputes.filter(d => d.status === 'ESCALATED').length})</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved ({disputes.filter(d => d.status === 'RESOLVED').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-400">No disputes found</p>
          </Card>
        ) : (
          disputes.map((dispute) => {
            const slaStatus = getSLAStatus(dispute);
            
            return (
              <Card 
                key={dispute.id} 
                className={`bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors cursor-pointer ${
                  slaStatus?.status === 'breached' ? 'border-red-500/50' : ''
                }`}
                onClick={() => setSelectedDispute(dispute)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">Dispute #{dispute.id.slice(0, 8)}</h4>
                      {getStatusBadge(dispute.status)}
                      {getPriorityBadge(dispute.priority)}
                      {slaStatus && (
                        <Badge className={`${slaStatus.color} bg-transparent border`}>
                          <Clock className="w-3 h-3 mr-1" />
                          {slaStatus.text}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                      <div>Reason: {dispute.reason.replace(/_/g, ' ')}</div>
                      <div>Amount: ${(dispute.amount_disputed_cents / 100).toLocaleString()}</div>
                      <div>Opened by: {dispute.opened_by_role}</div>
                      <div>Created: {format(new Date(dispute.created_date), "MMM d, yyyy")}</div>
                    </div>
                    
                    <p className="text-sm text-gray-300 line-clamp-2">{dispute.description}</p>
                    
                    {dispute.ai_recommendation && (
                      <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-semibold text-purple-300">AI Recommendation</span>
                          <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">
                            {(dispute.ai_recommendation.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                        <p className="text-xs text-purple-200">{dispute.ai_recommendation.reasoning}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {dispute.status === 'OPEN' && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeDisputeWithAI(dispute);
                        }}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        AI Analyze
                      </Button>
                    )}
                    
                    {['OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE'].includes(dispute.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Escalate this dispute to senior management?")) {
                            escalateDispute(dispute);
                          }
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Escalate
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Dispute #{selectedDispute.id.slice(0, 8)}
                  </h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedDispute.status)}
                    {getPriorityBadge(selectedDispute.priority)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedDispute(null)}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Reason</p>
                  <p className="text-sm text-white">{selectedDispute.reason.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Amount Disputed</p>
                  <p className="text-sm text-white font-semibold">
                    ${(selectedDispute.amount_disputed_cents / 100).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Opened By</p>
                  <p className="text-sm text-white">{selectedDispute.opened_by_role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Created</p>
                  <p className="text-sm text-white">
                    {format(new Date(selectedDispute.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-xs text-gray-400 mb-2">Description</p>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-300">{selectedDispute.description}</p>
                </div>
              </div>

              {/* AI Recommendation */}
              {selectedDispute.ai_recommendation && (
                <div className="mb-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-semibold text-purple-300">AI Analysis & Recommendation</h4>
                    <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">
                      {(selectedDispute.ai_recommendation.confidence_score * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-200 mb-3">
                    {selectedDispute.ai_recommendation.reasoning}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-300">Suggested Action:</span>
                    <Badge className="bg-purple-600 text-white">
                      {selectedDispute.ai_recommendation.suggested_action.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {selectedDispute.timeline && selectedDispute.timeline.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white mb-3">Activity Timeline</h4>
                  <div className="space-y-3">
                    {selectedDispute.timeline.map((entry, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white">{entry.action}</p>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-gray-400">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Form */}
              {['OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE'].includes(selectedDispute.status) && (
                <div className="border-t border-gray-800 pt-6">
                  <h4 className="text-sm font-semibold text-white mb-4">Resolve Dispute</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Resolution Type</Label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                        value={resolutionForm.type}
                        onChange={(e) => setResolutionForm({...resolutionForm, type: e.target.value})}
                      >
                        <option value="full_refund">Full Refund to Host</option>
                        <option value="partial_refund">Partial Refund</option>
                        <option value="no_refund">No Refund</option>
                        <option value="enabler_payout">Release to Enabler</option>
                        <option value="split">Split Amount</option>
                        <option value="custom">Custom Resolution</option>
                      </select>
                    </div>

                    {resolutionForm.type === 'split' || resolutionForm.type === 'partial_refund' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300 mb-2 block">Amount to Host ($)</Label>
                          <Input
                            type="number"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={resolutionForm.amount_to_host_cents / 100}
                            onChange={(e) => setResolutionForm({
                              ...resolutionForm,
                              amount_to_host_cents: parseFloat(e.target.value) * 100
                            })}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 mb-2 block">Amount to Enabler ($)</Label>
                          <Input
                            type="number"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={resolutionForm.amount_to_enabler_cents / 100}
                            onChange={(e) => setResolutionForm({
                              ...resolutionForm,
                              amount_to_enabler_cents: parseFloat(e.target.value) * 100
                            })}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <Label className="text-gray-300 mb-2 block">Resolution Notes (Required)</Label>
                      <Textarea
                        className="bg-gray-800 border-gray-700 text-white h-24"
                        placeholder="Explain the reasoning for this resolution..."
                        value={resolutionForm.resolution_notes}
                        onChange={(e) => setResolutionForm({...resolutionForm, resolution_notes: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={resolveDispute}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Resolve Dispute
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-700 text-gray-300"
                        onClick={() => setSelectedDispute(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Already Resolved */}
              {selectedDispute.status === 'RESOLVED' && selectedDispute.resolution && (
                <div className="border-t border-gray-800 pt-6">
                  <h4 className="text-sm font-semibold text-white mb-4">Resolution Details</h4>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-300">
                        {selectedDispute.resolution.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-200 mb-2">
                      {selectedDispute.resolution.resolution_notes}
                    </p>
                    <p className="text-xs text-emerald-300">
                      Resolved by {selectedDispute.resolution.resolved_by} on{' '}
                      {format(new Date(selectedDispute.resolution.resolved_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* AI Analyzing Overlay */}
      {aiAnalyzing && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-gray-900 border-purple-500/50 p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Analyzing Dispute...</h3>
            <p className="text-sm text-gray-400">
              Processing dispute details, evidence, and similar cases to provide an optimal resolution recommendation.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
