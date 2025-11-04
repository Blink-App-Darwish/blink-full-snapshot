import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Upload,
  Camera,
  MapPin,
  MessageSquare,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function EnablerWorkflowTracker({ bookingId }) {
  const [workflow, setWorkflow] = useState(null);
  const [booking, setBooking] = useState(null);
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    timeline: true,
    checklist: true,
    performance: false
  });

  useEffect(() => {
    if (bookingId) {
      loadWorkflow();
    }
  }, [bookingId]);

  const loadWorkflow = async () => {
    try {
      setIsLoading(true);
      const { BookingWorkflow, Booking, Event } = await import("@/api/entities");

      const workflows = await BookingWorkflow.filter({ booking_id: bookingId });
      const workflowData = workflows[0];

      const bookingData = await Booking.filter({ id: bookingId }).then(b => b[0]);
      const eventData = await Event.filter({ id: bookingData.event_id }).then(e => e[0]);

      setWorkflow(workflowData);
      setBooking(bookingData);
      setEvent(eventData);
    } catch (error) {
      console.error("Error loading workflow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateLiveStatus = async (newStatus) => {
    try {
      const { BookingWorkflow } = await import("@/api/entities");

      await BookingWorkflow.update(workflow.id, {
        live_status: {
          ...workflow.live_status,
          enabler_status: newStatus,
          last_update: new Date().toISOString()
        }
      });

      alert(`✅ Status updated to: ${newStatus}`);
      await loadWorkflow();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const completeChecklistItem = async (index) => {
    try {
      const { BookingWorkflow } = await import("@/api/entities");

      const updatedChecklist = [...workflow.enabler_checklist];
      updatedChecklist[index] = {
        ...updatedChecklist[index],
        completed: true,
        completed_at: new Date().toISOString()
      };

      await BookingWorkflow.update(workflow.id, {
        enabler_checklist: updatedChecklist
      });

      await loadWorkflow();
    } catch (error) {
      console.error("Error completing checklist item:", error);
    }
  };

  const uploadProof = async (index) => {
    alert("📸 Proof upload feature - Coming soon!\nWill integrate with camera/file upload");
  };

  const getStageProgress = () => {
    if (!workflow) return 0;

    const stages = {
      CONFIRMED: 20,
      PRE_EVENT: 40,
      EVENT_EXECUTION: 70,
      POST_EVENT: 90,
      COMPLETED: 100
    };

    return stages[workflow.workflow_stage] || 0;
  };

  const getStageColor = () => {
    if (!workflow) return "text-gray-400";

    const colors = {
      CONFIRMED: "text-blue-500",
      PRE_EVENT: "text-purple-500",
      EVENT_EXECUTION: "text-emerald-500",
      POST_EVENT: "text-amber-500",
      COMPLETED: "text-green-500"
    };

    return colors[workflow.workflow_stage] || "text-gray-400";
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-gray-100 text-gray-700 border-gray-200",
      on_the_way: "bg-blue-100 text-blue-700 border-blue-200",
      setup: "bg-purple-100 text-purple-700 border-purple-200",
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      wrapping_up: "bg-amber-100 text-amber-700 border-amber-200",
      done: "bg-green-100 text-green-700 border-green-200"
    };

    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No workflow data found</p>
        <p className="text-sm text-gray-400 mt-2">Workflow will be created when booking is confirmed</p>
      </Card>
    );
  }

  const daysToEvent = event ? differenceInDays(new Date(event.date), new Date()) : 0;
  const completedTasks = workflow.enabler_checklist?.filter(t => t.completed).length || 0;
  const totalTasks = workflow.enabler_checklist?.length || 0;
  const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${workflow.workflow_stage === 'COMPLETED' ? 'bg-green-500' : 'bg-emerald-500'} animate-pulse`}></div>
              {workflow.workflow_stage.replace(/_/g, ' ')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {event?.name} • {daysToEvent > 0 ? `${daysToEvent} days away` : 'Today!'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{getStageProgress()}%</p>
            <p className="text-xs text-gray-500">Overall Progress</p>
          </div>
        </div>

        <Progress value={getStageProgress()} className="h-2 bg-white/50" />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Tasks</p>
            <p className="text-lg font-bold text-gray-900">{completedTasks}/{totalTasks}</p>
            <Progress value={taskCompletion} className="h-1 mt-2" />
          </div>

          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Performance</p>
            <p className="text-lg font-bold text-emerald-600">
              {workflow.performance_score?.overall || 0}%
            </p>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full ${
                    i < Math.floor((workflow.performance_score?.overall || 0) / 20) 
                      ? 'bg-emerald-500' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Live Status Control */}
      {workflow.workflow_stage === 'EVENT_EXECUTION' && (
        <Card className="p-4 bg-gradient-to-r from-emerald-500 to-cyan-500">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <p className="text-sm font-semibold text-white">LIVE EVENT MODE</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {workflow.live_status?.enabler_status || 'pending'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['on_the_way', 'setup', 'active', 'wrapping_up', 'done'].map((status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => updateLiveStatus(status)}
                className={`${
                  workflow.live_status?.enabler_status === status
                    ? 'bg-white text-emerald-600 hover:bg-white/90'
                    : 'bg-white/20 text-white hover:bg-white/30'
                } text-[10px] h-8`}
              >
                {status.replace(/_/g, ' ').toUpperCase()}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline Section */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('timeline')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">EVENT TIMELINE</h3>
          </div>
          {expandedSections.timeline ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.timeline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-3">
                {workflow.timeline?.map((milestone, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      milestone.status === 'completed' 
                        ? 'bg-emerald-500' 
                        : milestone.status === 'overdue'
                        ? 'bg-red-500'
                        : 'bg-gray-200'
                    }`}>
                      {milestone.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : milestone.status === 'overdue' ? (
                        <AlertTriangle className="w-4 h-4 text-white" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        milestone.status === 'completed' 
                          ? 'text-gray-900' 
                          : 'text-gray-600'
                      }`}>
                        {milestone.milestone}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {milestone.due_date ? format(new Date(milestone.due_date), 'MMM d, h:mm a') : 'No deadline'}
                      </p>
                      {milestone.completed_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                          ✓ Completed {format(new Date(milestone.completed_at), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>

                    {milestone.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">
                        Upcoming
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Checklist Section */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('checklist')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">YOUR CHECKLIST</h3>
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              {completedTasks}/{totalTasks}
            </Badge>
          </div>
          {expandedSections.checklist ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.checklist && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-2">
                {workflow.enabler_checklist?.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-all ${
                      item.completed
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => !item.completed && completeChecklistItem(index)}
                        disabled={item.completed}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          item.completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 hover:border-emerald-500'
                        }`}
                      >
                        {item.completed && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </button>

                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          item.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {item.task}
                        </p>
                        {item.completed_at && (
                          <p className="text-xs text-emerald-600 mt-1">
                            ✓ {format(new Date(item.completed_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>

                      {item.required && !item.completed && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          Required
                        </Badge>
                      )}
                    </div>

                    {!item.completed && item.required && (
                      <div className="flex gap-2 mt-3 ml-8">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => uploadProof(index)}
                          className="text-xs h-7"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          Add Proof
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Performance Score Section */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('performance')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">PERFORMANCE TRACKING</h3>
          </div>
          {expandedSections.performance ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.performance && workflow.performance_score && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-3">
                {Object.entries(workflow.performance_score).map(([key, value]) => {
                  if (key === 'overall') return null;
                  
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-gray-700 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs font-bold text-emerald-600">{value}%</p>
                      </div>
                      <Progress value={value} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Risk Flags */}
      {workflow.risk_flags && workflow.risk_flags.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900 mb-2">Risk Alerts</h4>
              <div className="space-y-2">
                {workflow.risk_flags.map((flag, index) => (
                  <div key={index} className="text-xs text-red-700">
                    <p className="font-medium">{flag.flag_type.replace(/_/g, ' ').toUpperCase()}</p>
                    {flag.ai_recommendation && (
                      <p className="text-red-600 mt-1">💡 {flag.ai_recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}