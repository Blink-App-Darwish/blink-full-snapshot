
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FinancialEntry, Event, User } from "@/api/entities";
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Receipt, Tag, X, Upload, Trash2, Edit2, Filter } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from "date-fns";
import { UploadFile } from "@/api/integrations";
import BlinkLogo from "../components/BlinkLogo";

const entryTypeConfig = {
  expense: { label: "Expense", icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-50" },
  income: { label: "Income", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
  deposit: { label: "Deposit", icon: DollarSign, color: "text-blue-600", bgColor: "bg-blue-50" },
  payment: { label: "Payment", icon: DollarSign, color: "text-purple-600", bgColor: "bg-purple-50" },
  refund: { label: "Refund", icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-50" }
};

const categoryIcons = {
  venue: "🏛️",
  catering: "🍽️",
  entertainment: "🎵",
  decor: "✨",
  photography: "📸",
  beauty: "💄",
  transportation: "🚗",
  gifts: "🎁",
  invitations: "💌",
  other: "📋"
};

const paymentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800"
};

export default function FinanceTracker() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    event_id: "",
    event_name: "",
    entry_type: "expense",
    category: "other",
    vendor_name: "",
    description: "",
    amount: "",
    currency: "USD",
    payment_method: "credit_card",
    payment_status: "pending",
    due_date: "",
    paid_date: "",
    receipt_url: "",
    notes: "",
    tags: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const eventsData = await Event.filter({ host_id: user.id }, "-created_date");
      setEvents(eventsData);
      
      const entriesData = await FinancialEntry.filter({ user_id: user.id }, "-created_date");
      setEntries(entriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      const selectedEventData = events.find(ev => ev.id === formData.event_id);
      
      await FinancialEntry.create({
        ...formData,
        user_id: currentUser.id,
        event_name: selectedEventData?.name || formData.event_name,
        amount: parseFloat(formData.amount),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      });
      
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating entry:", error);
      alert("Failed to create entry. Please try again.");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const selectedEventData = events.find(ev => ev.id === formData.event_id);
      
      await FinancialEntry.update(editingEntry.id, {
        ...formData,
        event_name: selectedEventData?.name || formData.event_name,
        amount: parseFloat(formData.amount),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      });
      
      setShowEditModal(false);
      setEditingEntry(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update entry. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        await FinancialEntry.delete(id);
        loadData();
      } catch (error) {
        console.error("Error deleting entry:", error);
      }
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      event_id: entry.event_id || "",
      event_name: entry.event_name || "",
      entry_type: entry.entry_type || "expense",
      category: entry.category || "other",
      vendor_name: entry.vendor_name || "",
      description: entry.description || "",
      amount: entry.amount?.toString() || "",
      currency: entry.currency || "USD",
      payment_method: entry.payment_method || "credit_card",
      payment_status: entry.payment_status || "pending",
      due_date: entry.due_date || "",
      paid_date: entry.paid_date || "",
      receipt_url: entry.receipt_url || "",
      notes: entry.notes || "",
      tags: entry.tags?.join(', ') || ""
    });
    setShowEditModal(true);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: result.file_url }));
    } catch (error) {
      console.error("Error uploading receipt:", error);
      alert("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      event_id: "",
      event_name: "",
      entry_type: "expense",
      category: "other",
      vendor_name: "",
      description: "",
      amount: "",
      currency: "USD",
      payment_method: "credit_card",
      payment_status: "pending",
      due_date: "",
      paid_date: "",
      receipt_url: "",
      notes: "",
      tags: ""
    });
  };

  const filteredEntries = selectedEvent === "all" 
    ? entries 
    : entries.filter(e => e.event_id === selectedEvent);

  const calculateTotals = (eventId = null) => {
    const relevantEntries = eventId 
      ? entries.filter(e => e.event_id === eventId)
      : entries;
    
    const expenses = relevantEntries
      .filter(e => e.entry_type === "expense")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const income = relevantEntries
      .filter(e => e.entry_type === "income" || e.entry_type === "refund")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const pending = relevantEntries
      .filter(e => e.payment_status === "pending" || e.payment_status === "overdue")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return { expenses, income, pending, balance: income - expenses };
  };

  const totals = calculateTotals(selectedEvent === "all" ? null : selectedEvent);

  // Group entries by event
  const entriesByEvent = {};
  entries.forEach(entry => {
    if (!entriesByEvent[entry.event_id]) {
      entriesByEvent[entry.event_id] = [];
    }
    entriesByEvent[entry.event_id].push(entry);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10" style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-light text-gray-900">Financial Tracker</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-20 pb-32">
        {/* Financial Overview */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-red-50 to-orange-50 border-red-200/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-700 font-medium">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-red-700">${totals.expenses.toLocaleString()}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-700 font-medium">Total Income</p>
            </div>
            <p className="text-2xl font-bold text-green-700">${totals.income.toLocaleString()}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-700 font-medium">Pending</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">${totals.pending.toLocaleString()}</p>
          </Card>

          <Card className={`p-4 bg-gradient-to-br ${totals.balance >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200/50' : 'from-red-50 to-pink-50 border-red-200/50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-4 h-4 ${totals.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              <p className="text-xs text-gray-700 font-medium">Balance</p>
            </div>
            <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              ${Math.abs(totals.balance).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entries by Event */}
        {selectedEvent === "all" ? (
          <div className="space-y-6">
            {Object.entries(entriesByEvent).map(([eventId, eventEntries]) => {
              const event = events.find(e => e.id === eventId);
              const eventTotals = calculateTotals(eventId);
              
              return (
                <div key={eventId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">{event?.name || "Unknown Event"}</h3>
                    <Badge variant="outline" className="text-xs">
                      {eventEntries.length} entries
                    </Badge>
                  </div>
                  
                  <Card className="p-3 bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200/50">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Expenses</p>
                        <p className="font-bold text-red-700">${eventTotals.expenses.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Income</p>
                        <p className="font-bold text-green-700">${eventTotals.income.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Balance</p>
                        <p className={`font-bold ${eventTotals.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                          ${Math.abs(eventTotals.balance).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                  
                  <div className="space-y-2">
                    {eventEntries.slice(0, 3).map(entry => (
                      <EntryCard 
                        key={entry.id} 
                        entry={entry} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <Card className="p-8 text-center bg-white/60 backdrop-blur-md border-emerald-200/50">
                <DollarSign className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-3">No entries for this event</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Entry
                </Button>
              </Card>
            ) : (
              filteredEntries.map(entry => (
                <EntryCard 
                  key={entry.id} 
                  entry={entry} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all active:scale-95"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}>
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {showEditModal ? "Edit Entry" : "Add Financial Entry"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="p-6 space-y-4">
              {/* Event Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Event *</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_id: value }))}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entry Type & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">Type *</Label>
                  <Select
                    value={formData.entry_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, entry_type: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(entryTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-900">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryIcons).map(([key, icon]) => (
                        <SelectItem key={key} value={key}>
                          {icon} {key.charAt(0).toUpperCase() + key.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Vendor/Payee</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                  placeholder="e.g., Venue Name, Caterer"
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this for?"
                  required
                  className="mt-2"
                  rows={2}
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm font-semibold text-gray-900">Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-900">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Method & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-900">Status</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-900">Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-900">Paid Date</Label>
                  <Input
                    type="date"
                    value={formData.paid_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, paid_date: e.target.value }))}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Receipt/Invoice</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  {formData.receipt_url && (
                    <a 
                      href={formData.receipt_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <Receipt className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Tags</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="urgent, priority, negotiable (comma separated)"
                  className="mt-2"
                />
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm font-semibold text-gray-900">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details..."
                  className="mt-2"
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-6 text-base font-semibold rounded-xl"
              >
                {showEditModal ? "Update Entry" : "Add Entry"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Entry Card Component
function EntryCard({ entry, onEdit, onDelete }) {
  const config = entryTypeConfig[entry.entry_type];
  const Icon = config.icon;

  return (
    <Card className={`p-4 ${config.bgColor} border-${entry.entry_type === 'expense' ? 'red' : 'green'}-200/50`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 text-sm">
                {entry.description}
              </h4>
              <p className={`font-bold text-lg ${config.color} flex-shrink-0`}>
                {entry.entry_type === 'expense' ? '-' : '+'} ${entry.amount?.toLocaleString()}
              </p>
            </div>
            {entry.vendor_name && (
              <p className="text-xs text-gray-600 mb-2">{entry.vendor_name}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={paymentStatusColors[entry.payment_status]} variant="secondary">
                {entry.payment_status}
              </Badge>
              <span className="text-xs text-gray-500">
                {categoryIcons[entry.category]} {entry.category}
              </span>
              {entry.due_date && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(entry.due_date), 'MMM d')}
                </span>
              )}
              {entry.receipt_url && (
                <a 
                  href={entry.receipt_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <Receipt className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(entry)}
            className="h-8 w-8"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(entry.id)}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
