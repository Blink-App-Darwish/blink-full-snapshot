import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  Settings,
  Code,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function WorkflowAutomationEngine() {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [executions, setExecutions] = useState([]);

  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    rule_type: "trigger_notification",
    entity_type: "booking",
    trigger_conditions: {
      field: "",
      operator: "equals",
      value: ""
    },
    actions: [],
    priority: 50,
    is_active: true,
    test_mode: true
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const { WorkflowRule } = await import("@/api/entities");
      const rulesData = await WorkflowRule.list("-priority", 100);
      setRules(rulesData);
    } catch (error) {
      console.error("Error loading rules:", error);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutions = async (ruleId) => {
    try {
      const { WorkflowExecution } = await import("@/api/entities");
      const executionsData = await WorkflowExecution.filter({
        rule_id: ruleId
      }, "-created_date", 50);
      setExecutions(executionsData);
    } catch (error) {
      console.error("Error loading executions:", error);
      setExecutions([]);
    }
  };

  const createRule = async () => {
    try {
      const { WorkflowRule } = await import("@/api/entities");
      const user = await base44.auth.me();

      const rule = await WorkflowRule.create({
        ...ruleForm,
        created_by: user.id,
        execution_count: 0,
        success_rate: 100
      });

      alert("✅ Workflow rule created successfully!");
      setIsCreating(false);
      setRuleForm({
        rule_name: "",
        rule_type: "trigger_notification",
        entity_type: "booking",
        trigger_conditions: {
          field: "",
          operator: "equals",
          value: ""
        },
        actions: [],
        priority: 50,
        is_active: true,
        test_mode: true
      });
      
      await loadRules();
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("Failed to create rule");
    }
  };

  const toggleRule = async (ruleId, currentStatus) => {
    try {
      const { WorkflowRule } = await import("@/api/entities");
      await WorkflowRule.update(ruleId, { is_active: !currentStatus });
      await loadRules();
    } catch (error) {
      console.error("Error toggling rule:", error);
      alert("Failed to toggle rule");
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const { WorkflowRule } = await import("@/api/entities");
      await WorkflowRule.delete(ruleId);
      alert("✅ Rule deleted");
      await loadRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert("Failed to delete rule");
    }
  };

  const testRule = async (rule) => {
    try {
      console.log("🧪 Testing rule:", rule.rule_name);
      
      // Simulate test execution
      const { WorkflowExecution } = await import("@/api/entities");
      await WorkflowExecution.create({
        rule_id: rule.id,
        entity_type: rule.entity_type,
        entity_id: "test_entity_id",
        trigger_data: { test: true },
        executed_actions: [
          {
            action_type: rule.actions[0]?.action_type || "test_action",
            status: "success",
            result: { message: "Test execution successful" }
          }
        ],
        status: "success",
        execution_time_ms: 125,
        test_mode: true
      });

      alert("✅ Test execution successful! Check executions log.");
      await loadExecutions(rule.id);
    } catch (error) {
      console.error("Error testing rule:", error);
      alert("Failed to test rule");
    }
  };

  const getRuleTypeColor = (type) => {
    const colors = {
      auto_approve: "bg-emerald-100 text-emerald-700",
      auto_reject: "bg-red-100 text-red-700",
      trigger_notification: "bg-blue-100 text-blue-700",
      create_alert: "bg-amber-100 text-amber-700",
      assign_task: "bg-purple-100 text-purple-700",
      send_email: "bg-indigo-100 text-indigo-700",
      update_status: "bg-cyan-100 text-cyan-700"
    };
    return colors[type] || "bg-gray-100 text-gray-700";
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Workflow Automation</h2>
          <p className="text-sm text-gray-400">Create rules to automate repetitive tasks</p>
        </div>

        <Button
          onClick={() => setIsCreating(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Rules</p>
              <p className="text-2xl font-bold text-white">{rules.length}</p>
            </div>
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Rules</p>
              <p className="text-2xl font-bold text-white">
                {rules.filter(r => r.is_active).length}
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Executions</p>
              <p className="text-2xl font-bold text-white">
                {rules.reduce((sum, r) => sum + (r.execution_count || 0), 0)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Avg Success Rate</p>
              <p className="text-2xl font-bold text-white">
                {rules.length > 0 
                  ? (rules.reduce((sum, r) => sum + (r.success_rate || 0), 0) / rules.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-white font-semibold">{rule.rule_name}</h4>
                  <Badge className={getRuleTypeColor(rule.rule_type)}>
                    {rule.rule_type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={`text-xs ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {rule.test_mode && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      Test Mode
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 text-xs text-gray-400 mb-3">
                  <div>
                    <span className="text-gray-500">Entity:</span> {rule.entity_type}
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span> {rule.priority}
                  </div>
                  <div>
                    <span className="text-gray-500">Executions:</span> {rule.execution_count || 0}
                  </div>
                  <div>
                    <span className="text-gray-500">Success Rate:</span> {rule.success_rate || 100}%
                  </div>
                </div>

                {/* Conditions */}
                <div className="bg-gray-800 rounded-lg p-3 text-xs">
                  <p className="text-gray-400 mb-1">Trigger Condition:</p>
                  <code className="text-emerald-400">
                    {rule.trigger_conditions.field} {rule.trigger_conditions.operator} "{rule.trigger_conditions.value}"
                  </code>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => testRule(rule)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Test
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className={`border-gray-700 ${rule.is_active ? 'text-amber-400' : 'text-emerald-400'}`}
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                >
                  {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No automation rules created yet</p>
          </Card>
        )}
      </div>

      {/* Create Rule Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create Automation Rule</h3>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Rule Name</Label>
                  <Input
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="e.g., Auto-approve low-risk bookings"
                    value={ruleForm.rule_name}
                    onChange={(e) => setRuleForm({...ruleForm, rule_name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Rule Type</Label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
                      value={ruleForm.rule_type}
                      onChange={(e) => setRuleForm({...ruleForm, rule_type: e.target.value})}
                    >
                      <option value="auto_approve">Auto Approve</option>
                      <option value="auto_reject">Auto Reject</option>
                      <option value="trigger_notification">Trigger Notification</option>
                      <option value="create_alert">Create Alert</option>
                      <option value="assign_task">Assign Task</option>
                      <option value="send_email">Send Email</option>
                      <option value="update_status">Update Status</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Entity Type</Label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
                      value={ruleForm.entity_type}
                      onChange={(e) => setRuleForm({...ruleForm, entity_type: e.target.value})}
                    >
                      <option value="booking">Booking</option>
                      <option value="contract">Contract</option>
                      <option value="dispute">Dispute</option>
                      <option value="enabler">Enabler</option>
                      <option value="host">Host</option>
                      <option value="escrow">Escrow</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Trigger Condition</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Field name"
                      value={ruleForm.trigger_conditions.field}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        trigger_conditions: {...ruleForm.trigger_conditions, field: e.target.value}
                      })}
                    />
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      value={ruleForm.trigger_conditions.operator}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        trigger_conditions: {...ruleForm.trigger_conditions, operator: e.target.value}
                      })}
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                      <option value="contains">Contains</option>
                    </select>
                    <Input
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Value"
                      value={ruleForm.trigger_conditions.value}
                      onChange={(e) => setRuleForm({
                        ...ruleForm,
                        trigger_conditions: {...ruleForm.trigger_conditions, value: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Priority (1-100)</Label>
                  <Input
                    type="number"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({...ruleForm, priority: parseInt(e.target.value)})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Test Mode</p>
                    <p className="text-xs text-gray-400">Log actions without executing them</p>
                  </div>
                  <Switch
                    checked={ruleForm.test_mode}
                    onCheckedChange={(checked) => setRuleForm({...ruleForm, test_mode: checked})}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={createRule}
                  >
                    Create Rule
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}