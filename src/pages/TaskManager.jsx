
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Task, User, Event } from "@/api/entities";
import { ArrowLeft, Plus, Calendar, Clock, AlertCircle, CheckCircle2, Circle, Loader, X, Trash2, Edit2, Paperclip, Tag, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, isValid, isPast, differenceInDays } from "date-fns";
import BlinkLogo from "../components/BlinkLogo";

const statusConfig = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    color: "from-gray-400 to-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200"
  },
  in_progress: {
    label: "In Progress",
    icon: Loader,
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    color: "from-emerald-400 to-cyan-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const categoryIcons = {
  planning: "📋",
  booking: "📅",
  coordination: "🤝",
  payment: "💰",
  communication: "💬",
  other: "📌"
};

export default function TaskManager() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "not_started",
    priority: "medium",
    deadline: "",
    event_id: "",
    assignee: "",
    follow_up_date: "",
    follow_up_notes: "",
    category: "other",
    tags: "",
    notes: ""
  });
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const tasksData = await Task.filter({ user_id: user.id }, "-created_date");
      setTasks(tasksData);
      
      const eventsData = await Event.filter({ host_id: user.id }, "-created_date");
      setEvents(eventsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleCreateTask = async () => {
    try {
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
      
      await Task.create({
        user_id: currentUser.id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        deadline: formData.deadline || null,
        event_id: formData.event_id || null,
        assignee: formData.assignee || currentUser.full_name,
        follow_up_date: formData.follow_up_date || null,
        follow_up_notes: formData.follow_up_notes,
        category: formData.category,
        tags: tagsArray,
        notes: formData.notes,
        subtasks: subtasks,
        attachments: []
      });
      
      resetForm();
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task. Please try again.");
    }
  };

  const handleUpdateTask = async () => {
    try {
      const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        deadline: formData.deadline || null,
        event_id: formData.event_id || null,
        assignee: formData.assignee,
        follow_up_date: formData.follow_up_date || null,
        follow_up_notes: formData.follow_up_notes,
        category: formData.category,
        tags: tagsArray,
        notes: formData.notes,
        subtasks: subtasks
      };
      
      if (formData.status === "done" && editingTask.status !== "done") {
        updateData.completed_at = new Date().toISOString();
      }
      
      await Task.update(editingTask.id, updateData);
      
      resetForm();
      setShowEditModal(false);
      setEditingTask(null);
      loadData();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    
    try {
      await Task.delete(taskId);
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "medium",
      deadline: task.deadline ? task.deadline.split('T')[0] : "",
      event_id: task.event_id || "",
      assignee: task.assignee || "",
      follow_up_date: task.follow_up_date || "",
      follow_up_notes: task.follow_up_notes || "",
      category: task.category || "other",
      tags: task.tags?.join(", ") || "",
      notes: task.notes || ""
    });
    setSubtasks(task.subtasks || []);
    setShowEditModal(true);
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (newStatus === "done") {
        updateData.completed_at = new Date().toISOString();
      }
      await Task.update(task.id, updateData);
      loadData();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { title: newSubtask, completed: false }]);
      setNewSubtask("");
    }
  };

  const toggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].completed = !updated[index].completed;
    setSubtasks(updated);
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "not_started",
      priority: "medium",
      deadline: "",
      event_id: "",
      assignee: "",
      follow_up_date: "",
      follow_up_notes: "",
      category: "other",
      tags: "",
      notes: ""
    });
    setSubtasks([]);
    setNewSubtask("");
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  const isOverdue = (task) => {
    if (!task.deadline) return false;
    try {
      const deadline = parseISO(task.deadline);
      return isValid(deadline) && isPast(deadline) && task.status !== "done";
    } catch {
      return false;
    }
  };

  const getDaysUntilDeadline = (task) => {
    if (!task.deadline) return null;
    try {
      const deadline = parseISO(task.deadline);
      if (!isValid(deadline)) return null;
      return differenceInDays(deadline, new Date());
    } catch {
      return null;
    }
  };

  const firstName = currentUser?.full_name?.split(' ')[0] || "Your";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl("HostBrain"))}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-light text-gray-900">{firstName}'s Task Manager</h1>
                <p className="text-xs text-gray-500 mt-0.5">Organize and track your event tasks</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              const count = getTasksByStatus(status).length;
              return (
                <div key={status} className={`${config.bgColor} border ${config.borderColor} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Columns */}
      <div className="max-w-md mx-auto px-4 pt-20 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const statusTasks = getTasksByStatus(status);
            
            return (
              <div key={status} className="flex flex-col">
                <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-2xl p-4 mb-4`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5" />
                    <h2 className="font-semibold text-gray-900">{config.label}</h2>
                  </div>
                  <p className="text-xs text-gray-600">{statusTasks.length} tasks</p>
                </div>

                <div className="space-y-3 flex-1">
                  {statusTasks.length === 0 ? (
                    <Card className="p-8 text-center bg-white/60 backdrop-blur-sm border-gray-200/50">
                      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No tasks</p>
                    </Card>
                  ) : (
                    statusTasks.map((task) => {
                      const daysUntil = getDaysUntilDeadline(task);
                      const overdue = isOverdue(task);
                      const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
                      const totalSubtasks = task.subtasks?.length || 0;
                      
                      return (
                        <Card
                          key={task.id}
                          className="p-4 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer border-l-4"
                          style={{ borderLeftColor: overdue ? '#EF4444' : '#E5E7EB' }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                              {task.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={priorityColors[task.priority]}>
                                  {task.priority}
                                </Badge>
                                {task.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {categoryIcons[task.category]} {task.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>

                          {/* Deadline */}
                          {task.deadline && (
                            <div className={`flex items-center gap-2 text-xs mb-2 ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                              <Calendar className="w-3 h-3" />
                              <span>
                                {overdue ? "Overdue: " : "Due: "}
                                {format(parseISO(task.deadline), 'MMM d, yyyy')}
                                {daysUntil !== null && !overdue && (
                                  <span className="ml-1">({daysUntil}d left)</span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Subtasks Progress */}
                          {totalSubtasks > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Subtasks</span>
                                <span>{completedSubtasks}/{totalSubtasks}</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all"
                                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {task.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{task.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Status Buttons */}
                          <div className="flex gap-2 pt-3 border-t border-gray-200">
                            {status !== "not_started" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "not_started")}
                                className="flex-1 text-xs"
                              >
                                <Circle className="w-3 h-3 mr-1" />
                                Not Started
                              </Button>
                            )}
                            {status !== "in_progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "in_progress")}
                                className="flex-1 text-xs"
                              >
                                <Loader className="w-3 h-3 mr-1" />
                                In Progress
                              </Button>
                            )}
                            {status !== "done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "done")}
                                className="flex-1 text-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Done
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}
          onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            resetForm();
            setEditingTask(null);
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white/80 backdrop-blur-2xl border border-blue-200/50 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
                setEditingTask(null);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-white/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-light text-gray-900 mb-2">
                {showEditModal ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-sm text-gray-600">Stay organized and on schedule</p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Task Title *
                </Label>
                <Input
                  placeholder="e.g., Confirm venue booking"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Description
                </Label>
                <Textarea
                  placeholder="Add details about this task..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Status, Priority, Category */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Status
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Priority
                  </Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Category
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">📋 Planning</SelectItem>
                      <SelectItem value="booking">📅 Booking</SelectItem>
                      <SelectItem value="coordination">🤝 Coordination</SelectItem>
                      <SelectItem value="payment">💰 Payment</SelectItem>
                      <SelectItem value="communication">💬 Communication</SelectItem>
                      <SelectItem value="other">📌 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deadline & Follow-up */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Follow-up Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Assignee & Event */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Assignee
                  </Label>
                  <Input
                    placeholder="Who's responsible?"
                    value={formData.assignee}
                    onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Link to Event
                  </Label>
                  <Select value={formData.event_id} onValueChange={(value) => setFormData({...formData, event_id: value})}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Select event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Subtasks / Checklist
                </Label>
                <div className="space-y-2">
                  {subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => toggleSubtask(idx)}
                        className="w-4 h-4 rounded border-blue-300"
                      />
                      <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => removeSubtask(idx)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add subtask..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubtask()}
                      className="border-blue-200 focus:border-blue-400"
                    />
                    <Button
                      onClick={addSubtask}
                      size="sm"
                      variant="outline"
                      className="border-blue-300"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Follow-up Notes */}
              {formData.follow_up_date && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Follow-up Notes
                  </Label>
                  <Textarea
                    placeholder="What to check on follow-up..."
                    value={formData.follow_up_notes}
                    onChange={(e) => setFormData({...formData, follow_up_notes: e.target.value})}
                    rows={2}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              )}

              {/* Tags */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </Label>
                <Input
                  placeholder="Separate with commas: urgent, vendor, payment"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Additional Notes
                </Label>
                <Textarea
                  placeholder="Any extra information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                  setEditingTask(null);
                }}
                variant="outline"
                className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Cancel
              </Button>
              <Button
                onClick={showEditModal ? handleUpdateTask : handleCreateTask}
                disabled={!formData.title}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {showEditModal ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
