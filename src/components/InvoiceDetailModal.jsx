import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Send, CheckCircle2, AlertCircle, Eye, FileText, Calendar, MapPin, DollarSign, Edit2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Invoice, Event, User, Enabler } from "@/api/entities";
import { format } from "date-fns";
import BlinkLogo from "./BlinkLogo";
import InvoiceAutoGenerationService from "./InvoiceAutoGenerationService";

export default function InvoiceDetailModal({ invoice, isOpen, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(invoice);
  const [event, setEvent] = useState(null);
  const [host, setHost] = useState(null);
  const [enabler, setEnabler] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (invoice) {
      setEditedInvoice(invoice);
      loadRelatedData();
    }
  }, [invoice]);

  const loadRelatedData = async () => {
    try {
      if (invoice.event_id) {
        const events = await Event.filter({ id: invoice.event_id });
        if (events[0]) setEvent(events[0]);
      }

      if (invoice.host_id) {
        const users = await User.filter({ id: invoice.host_id });
        if (users[0]) setHost(users[0]);
      }

      if (invoice.enabler_id) {
        const enablers = await Enabler.filter({ id: invoice.enabler_id });
        if (enablers[0]) setEnabler(enablers[0]);
      }
    } catch (error) {
      console.error("Error loading related data:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Recalculate totals
      const totals = InvoiceAutoGenerationService.calculateTotals(
        editedInvoice.line_items,
        editedInvoice.tax_rate || 0,
        editedInvoice.discount_amount || 0
      );

      await Invoice.update(invoice.id, {
        ...editedInvoice,
        ...totals
      });

      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssue = async () => {
    try {
      await Invoice.update(invoice.id, {
        status: "issued",
        issue_date: format(new Date(), "yyyy-MM-dd")
      });
      onUpdate();
    } catch (error) {
      console.error("Error issuing invoice:", error);
    }
  };

  const handleMarkAsPaid = async () => {
    await InvoiceAutoGenerationService.markAsPaid(invoice.id);
    onUpdate();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "issued":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-300";
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Invoice #{invoice.invoice_number}</h2>
                <p className="text-xs text-gray-500">
                  {invoice.auto_generated && "Auto-generated • "}
                  {format(new Date(invoice.created_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(invoice.status)} border text-[10px] tracking-wider px-3 py-1`}>
                {invoice.status.toUpperCase()}
              </Badge>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Mismatch Warning */}
            {invoice.mismatch_warning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">Data Mismatch Detected</p>
                  <p className="text-xs text-amber-700">{invoice.mismatch_warning}</p>
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-[10px] bg-amber-600 hover:bg-amber-700"
                    onClick={async () => {
                      await InvoiceAutoGenerationService.syncInvoiceWithBooking(invoice.id, invoice.booking_id);
                      onUpdate();
                    }}
                  >
                    Sync with Booking
                  </Button>
                </div>
              </div>
            )}

            {/* Party Information */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-gray-50">
                <p className="text-[9px] tracking-wider text-gray-400 mb-2">FROM</p>
                {enabler && (
                  <>
                    <p className="font-semibold text-sm text-gray-900">{enabler.business_name}</p>
                    <p className="text-xs text-gray-600">{enabler.location}</p>
                  </>
                )}
              </Card>

              <Card className="p-4 bg-gray-50">
                <p className="text-[9px] tracking-wider text-gray-400 mb-2">TO</p>
                {host && (
                  <>
                    <p className="font-semibold text-sm text-gray-900">{host.full_name}</p>
                    <p className="text-xs text-gray-600">{host.email}</p>
                  </>
                )}
              </Card>
            </div>

            {/* Event Details */}
            {event && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 mb-1">{event.name}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 flex items-center gap-2">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-600 flex items-center gap-2">
                          <MapPin className="w-3 h-3" strokeWidth={1.5} />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[9px] tracking-wider text-gray-400 mb-1">ISSUED</p>
                <p className="text-sm font-medium text-gray-900">
                  {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "Not issued"}
                </p>
              </div>
              <div>
                <p className="text-[9px] tracking-wider text-gray-400 mb-1">DUE</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(invoice.due_date), "MMM d, yyyy")}
                </p>
              </div>
              {invoice.paid_date && (
                <div>
                  <p className="text-[9px] tracking-wider text-gray-400 mb-1">PAID</p>
                  <p className="text-sm font-medium text-emerald-600">
                    {format(new Date(invoice.paid_date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] tracking-wider text-gray-400">LINE ITEMS</h3>
                {!isEditing && invoice.status === "draft" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" strokeWidth={2} />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {(isEditing ? editedInvoice.line_items : invoice.line_items)?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-sm text-gray-900">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">${invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discount_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-gray-900">-${invoice.discount_amount.toFixed(2)}</span>
                </div>
              )}

              {invoice.tax_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax ({invoice.tax_rate}%)</span>
                  <span className="font-medium text-gray-900">${invoice.tax_amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-600">${invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <p className="text-[9px] tracking-wider text-gray-400 mb-2">NOTES</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
              </div>
            )}

            {/* Powered by Blink */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100">
              <p className="text-[9px] text-gray-400 tracking-wider">POWERED BY</p>
              <BlinkLogo size="xs" />
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-100 flex gap-3">
            {isEditing ? (
              <>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedInvoice(invoice);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isSaving}
                >
                  <XCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" strokeWidth={2} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {invoice.status === "draft" && (
                  <Button
                    onClick={handleIssue}
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                  >
                    <Send className="w-4 h-4 mr-2" strokeWidth={2} />
                    Issue Invoice
                  </Button>
                )}

                {(invoice.status === "issued" || invoice.status === "overdue") && (
                  <Button
                    onClick={handleMarkAsPaid}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={2} />
                    Mark as Paid
                  </Button>
                )}

                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}