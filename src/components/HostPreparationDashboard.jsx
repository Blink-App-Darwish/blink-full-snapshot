import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  MapPin,
  Users,
  Calendar,
  Eye,
  MessageSquare,
  Zap,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  Bell,
  Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function HostPreparationDashboard({ eventId }) {
  const [event, setEvent] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [preparationBoard, setPreparationBoard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    responsibilities: true,
    enablers: true,
    timeline: false
  });

  useEffect(() => {
    if (eventId) {
      loadPreparationData();
    }
  }, [eventId]);

  const loadPreparationData = async () => {
    try {
      setIsLoading(true);
      const { 
        Event, 
        BookingWorkflow, 
        Booking,
        Enabler,
        HostPreparationBoard 
      } = await import("@/api/entities");

      // Load event
      const eventData = await Event.filter({ id: eventId }).then(e => e[0]);
      setEvent(eventData);

      // Load all workflows for this event
      const bookings = await Booking.filter({ event_id: eventId, status: "confirmed" });
      
      const workflowPromises = bookings.map(async (booking) => {
        const workflows = await BookingWorkflow.filter({ booking_id: booking.id });
        const workflow = workflows[0];
        
        if (workflow) {
          const enabler = await Enabler.filter({ id: booking.enabler_id }).then(e => e[0]);
          return { ...workflow, booking, enabler };
        }
        return null;
      });

      const workflowsData = (await Promise.all(workflowPromises)).filter(Boolean);
      setWorkflows(workflowsData);

      // Load or create preparation board
      const boards = await HostPreparationBoard.filter({ event_id: eventId });
      if (boards[0]) {
        setPreparationBoard(boards[0]);
      } else {
        // Create default preparation board
        const newBoard = await HostPreparationBoard.create({
          event_id: eventId,
          host_id: eventData.host_id,
          event_summary: {
            name: eventData.display_name || eventData.name,
            date: eventData.date,
            location: eventData.location,
            guest_count: eventData.guest_count
          },
          responsibilities: [
            {
              task: "Confirm venue access and parking",
              due_date: new Date(new Date(eventData.date).setDate(new Date(eventData.date).getDate() - 7)).toISOString(),
              completed: false,
              priority: "high",
              category: "venue_access"
            },
            {
              task: "Ensure power outlets and extension cords available",
              due_date: new Date(new Date(eventData.date).setDate(new Date(eventData.date).getDate() - 3)).toISOString(),
              completed: false,
              priority: "high",
              category: "power"
            },
            {
              task: "Coordinate setup timing with enablers",
              due_date: new Date(new Date(eventData.date).setDate(new Date(eventData.date).getDate() - 2)).toISOString(),
              completed: false,
              priority: "medium",
              category: "coordination"
            },
            {
              task: "Obtain necessary permits or permissions",
              due_date: new Date(new Date(eventData.date).setDate(new Date(eventData.date).getDate() - 14)).toISOString(),
              completed: false,
              priority: "critical",
              category: "permissions"
            }
          ],
          enabler_readiness_status: {
            overall_status: "not_started",
            last_update: new Date().toISOString(),
            milestones_completed: 0,
            milestones_total: workflowsData.length * 3
          }
        });
        setPreparationBoard(newBoard);
      }

    } catch (error) {
      console.error("Error loading preparation data:", error);
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

  const completeResponsibility = async (index) => {
    try {
      const { HostPreparationBoard } = await import("@/api/entities");

      const updatedResponsibilities = [...preparationBoard.responsibilities];
      updatedResponsibilities[index] = {
        ...updatedResponsibilities[index],
        completed: true
      };

      await HostPreparationBoard.update(preparationBoard.id, {
        responsibilities: updatedResponsibilities
      });

      await loadPreparationData();
    } catch (error) {
      console.error("Error completing responsibility:", error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: "bg-red-100 text-red-700 border-red-200",
      high: "bg-amber-100 text-amber-700 border-amber-200",
      medium: "bg-blue-100 text-blue-700 border-blue-200",
      low: "bg-gray-100 text-gray-700 border-gray-200"
    };
    return colors[priority] || colors.medium;
  };

  const getEnablerReadinessColor = (status) => {
    const colors = {
      not_started: "text-gray-500",
      in_progress: "text-blue-500",
      ready: "text-emerald-500",
      delayed: "text-red-500"
    };
    return colors[status] || colors.not_started;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!event || !preparationBoard) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load preparation dashboard</p>
      </Card>
    );
  }

  const daysToEvent = differenceInDays(new Date(event.date), new Date());
  const hoursToEvent = differenceInHours(new Date(event.date), new Date());
  const completedTasks = preparationBoard.responsibilities.filter(r => r.completed).length;
  const totalTasks = preparationBoard.responsibilities.length;
  const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;

  const overdueCount = preparationBoard.responsibilities.filter(r => 
    !r.completed && new Date(r.due_date) < new Date()
  ).length;

  return (
    <div className="space-y-4">
      {/* Event Overview Header */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {event.display_name || event.name}
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(event.date), 'MMM d, yyyy')}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.guest_count && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{event.guest_count} guests</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className={`text-4xl font-bold ${
              daysToEvent <= 3 ? 'text-red-600' : 
              daysToEvent <= 7 ? 'text-amber-600' : 
              'text-blue-600'
            }`}>
              {daysToEvent}
            </div>
            <p className="text-xs text-gray-500 mt-1">days away</p>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Your Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{completedTasks}/{totalTasks}</p>
            <Progress value={taskCompletion} className="h-1.5 mt-2" />
          </div>

          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Team Ready</p>
            <p className="text-2xl font-bold text-emerald-600">
              {workflows.filter(w => w.enabler_checklist?.every(i => i.completed)).length}/{workflows.length}
            </p>
            <Progress 
              value={workflows.length > 0 ? (workflows.filter(w => w.enabler_checklist?.every(i => i.completed)).length / workflows.length * 100) : 0} 
              className="h-1.5 mt-2" 
            />
          </div>

          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {overdueCount}
            </p>
            {overdueCount > 0 && (
              <p className="text-[10px] text-red-600 mt-1">Action needed</p>
            )}
          </div>
        </div>

        {/* Urgent Alert */}
        {daysToEvent <= 3 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <Bell className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Event is in {daysToEvent} days!</p>
              <p className="text-xs text-red-700 mt-1">Complete all preparations and coordinate final details with your team.</p>
            </div>
          </div>
        )}
      </Card>

      {/* Your Responsibilities */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('responsibilities')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">YOUR RESPONSIBILITIES</h3>
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">
                {overdueCount} Overdue
              </Badge>
            )}
          </div>
          {expandedSections.responsibilities ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.responsibilities && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-2">
                {preparationBoard.responsibilities
                  .sort((a, b) => {
                    // Sort by: overdue first, then by priority, then by due date
                    const aOverdue = !a.completed && new Date(a.due_date) < new Date();
                    const bOverdue = !b.completed && new Date(b.due_date) < new Date();
                    
                    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
                    
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    
                    return new Date(a.due_date) - new Date(b.due_date);
                  })
                  .map((task, index) => {
                    const isOverdue = !task.completed && new Date(task.due_date) < new Date();
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all ${
                          task.completed
                            ? 'bg-green-50 border-green-200'
                            : isOverdue
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => !task.completed && completeResponsibility(preparationBoard.responsibilities.indexOf(task))}
                            disabled={task.completed}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500'
                                : isOverdue
                                ? 'border-red-400 hover:border-red-500'
                                : 'border-gray-300 hover:border-blue-500'
                            }`}
                          >
                            {task.completed && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm font-medium ${
                                task.completed 
                                  ? 'text-gray-500 line-through' 
                                  : isOverdue
                                  ? 'text-red-900'
                                  : 'text-gray-900'
                              }`}>
                                {task.task}
                              </p>

                              <Badge 
                                variant="outline" 
                                className={`text-[10px] flex-shrink-0 ${getPriorityColor(task.priority)}`}
                              >
                                {task.priority.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className={isOverdue && !task.completed ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                Due {format(new Date(task.due_date), 'MMM d, h:mm a')}
                                {isOverdue && !task.completed && ' (Overdue)'}
                              </span>
                            </div>

                            <Badge variant="outline" className="mt-2 text-[9px] bg-gray-50 text-gray-600 border-gray-200">
                              {task.category.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Enabler Readiness Status */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('enablers')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-900">TEAM READINESS</h3>
            <Badge className={`text-xs ${
              preparationBoard.enabler_readiness_status?.overall_status === 'ready'
                ? 'bg-emerald-100 text-emerald-700'
                : preparationBoard.enabler_readiness_status?.overall_status === 'delayed'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {preparationBoard.enabler_readiness_status?.overall_status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
          {expandedSections.enablers ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.enablers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 space-y-3">
                {workflows.map((workflow) => {
                  const enabler = workflow.enabler;
                  const completedTasks = workflow.enabler_checklist?.filter(i => i.completed).length || 0;
                  const totalTasks = workflow.enabler_checklist?.length || 0;
                  const progress = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;
                  const isReady = progress === 100;

                  return (
                    <div key={workflow.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                            {enabler.business_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{enabler.business_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{enabler.category.replace(/_/g, ' ')}</p>
                          </div>
                        </div>

                        {isReady ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {completedTasks}/{totalTasks}
                          </Badge>
                        )}
                      </div>

                      <Progress value={progress} className="h-1.5 mb-2" />

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Preparation Progress</span>
                        <span className={`font-medium ${isReady ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>

                      {workflow.live_status?.last_update && (
                        <p className="text-xs text-gray-400 mt-2">
                          Last updated: {format(new Date(workflow.live_status.last_update), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  );
                })}

                {workflows.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No confirmed bookings yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Smart Reminders */}
      {preparationBoard.smart_reminders && preparationBoard.smart_reminders.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900 mb-2">Smart Reminders</h4>
              <div className="space-y-2">
                {preparationBoard.smart_reminders.map((reminder, index) => (
                  <div key={index} className="text-xs text-amber-800">
                    <p className="font-medium">{reminder.message}</p>
                    <p className="text-amber-600 mt-0.5">
                      {format(new Date(reminder.sent_at), 'MMM d, h:mm a')}
                    </p>
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