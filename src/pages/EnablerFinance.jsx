
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Enabler, 
  User, 
  FinancialTransaction, 
  Invoice, 
  Payout, 
  FinancialJournal,
  ExpenseCategory,
  Booking 
} from "@/api/entities";
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Sparkles,
  Plus,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  BarChart3,
  Zap,
  Send,
  Copy,
  Eye,
  Bell,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  ChevronRight,
  Activity,
  Target,
  TrendingDown,
  Wallet,
  Upload
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import BlinkLogo from "../components/BlinkLogo";
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Minimal InvoiceDetailModal component
const InvoiceDetailModal = ({ invoice, isOpen, onClose, onUpdate }) => {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl relative animate-in zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-5 h-5 rotate-45" /> {/* Using Plus rotated for 'x' */}
        </button>

        <div className="space-y-3 text-sm text-gray-700">
          <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
          <p><strong>Client:</strong> {invoice.host_id}</p>
          <p><strong>Amount:</strong> ${invoice.total_amount?.toLocaleString()}</p>
          <p><strong>Status:</strong> <span className={`font-medium ${invoice.status === 'paid' ? 'text-emerald-600' : invoice.status === 'overdue' ? 'text-red-600' : 'text-blue-600'}`}>{invoice.status.toUpperCase()}</span></p>
          <p><strong>Issue Date:</strong> {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : 'N/A'}</p>
          <p><strong>Due Date:</strong> {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : 'N/A'}</p>
          {invoice.event_name && <p><strong>Event:</strong> {invoice.event_name}</p>}
          {invoice.event_date && <p><strong>Event Date:</strong> {format(new Date(invoice.event_date), "MMM d, yyyy")}</p>}
          {invoice.auto_generated && <p className="text-purple-600 font-medium">Auto-generated Invoice</p>}
          {invoice.mismatch_warning && <p className="text-amber-600 font-medium">Data Mismatch Warning</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { 
            // In a real application, this would trigger an API call to update the invoice status
            // For now, we'll just simulate an update and re-fetch data.
            console.log("Simulating invoice update for:", invoice.id);
            onUpdate(); 
          }}>Mark as Paid</Button>
        </div>
      </Card>
    </div>
  );
};


export default function EnablerFinance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [enabler, setEnabler] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({
    pending: 0,
    paid: 0,
    overdue: 0,
    upcoming: 0,
    mtd_earnings: 0,
    avg_payment_time: 0,
    recurring_income: 0
  });
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState(null);


  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const user = await User.me();
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      
      let enablerData;
      if (selectedProfileId) {
        const profiles = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
        enablerData = profiles[0];
      } else {
        const profiles = await Enabler.filter({ user_id: user.id });
        enablerData = profiles[0];
      }
      
      if (enablerData) {
        setEnabler(enablerData);
        
        const [invoicesData, transactionsData] = await Promise.all([
          Invoice.filter({ enabler_id: enablerData.id }, "-issue_date"),
          FinancialTransaction.filter({ enabler_id: enablerData.id }, "-processed_date")
        ]);
        
        setInvoices(invoicesData);
        setTransactions(transactionsData);
        
        calculateMetrics(invoicesData, transactionsData);
        generateRecentActivity(invoicesData);
        generateAIRecommendations(invoicesData);
      }
    } catch (error) {
      console.error("Error loading financial data:", error);
    }
  };

  const calculateMetrics = (invoicesData, transactionsData) => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    const pending = invoicesData.filter(inv => inv.status === "sent").reduce((sum, inv) => sum + inv.total_amount, 0);
    const paid = invoicesData.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdue = invoicesData.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.total_amount, 0);
    const upcoming = invoicesData.filter(inv => inv.status === "draft").length;

    const mtdIncome = transactionsData
      .filter(t => 
        t.transaction_type === "income" && 
        t.status === "completed" &&
        new Date(t.processed_date) >= monthStart
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const paidInvoices = invoicesData.filter(inv => inv.status === "paid" && inv.paid_date && inv.issue_date);
    const avgPaymentTime = paidInvoices.length > 0
      ? paidInvoices.reduce((sum, inv) => {
          const days = Math.floor((new Date(inv.paid_date) - new Date(inv.issue_date)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / paidInvoices.length
      : 0;

    setMetrics({
      pending,
      paid,
      overdue,
      upcoming,
      mtd_earnings: mtdIncome,
      avg_payment_time: avgPaymentTime,
      recurring_income: 3400
    });
  };

  const generateRecentActivity = (invoicesData) => {
    const activities = invoicesData.slice(0, 5).map(inv => ({
      id: inv.id,
      type: inv.status === "paid" ? "payment" : "invoice",
      message: inv.status === "paid" 
        ? `Invoice #${inv.invoice_number} marked as paid`
        : `Invoice #${inv.invoice_number} created`,
      timestamp: inv.status === "paid" ? inv.paid_date : inv.issue_date,
      amount: inv.total_amount
    }));
    setRecentActivity(activities);
  };

  const generateAIRecommendations = (invoicesData) => {
    const recommendations = [];
    
    const overdueCount = invoicesData.filter(inv => inv.status === "overdue").length;
    if (overdueCount > 0) {
      recommendations.push({
        id: 1,
        message: `${overdueCount} invoice${overdueCount > 1 ? 's are' : ' is'} overdue. Would you like to send gentle reminders?`,
        action: "send_reminders",
        priority: "high"
      });
    }

    const draftCount = invoicesData.filter(inv => inv.status === "draft").length;
    if (draftCount > 2) {
      recommendations.push({
        id: 2,
        message: `You have ${draftCount} draft invoices. Shall I help you finalize and send them?`,
        action: "finalize_drafts",
        priority: "medium"
      });
    }

    recommendations.push({
      id: 3,
      message: "Based on your booking patterns, I can auto-generate invoices upon booking confirmation. Enable this?",
      action: "enable_auto_invoice",
      priority: "low"
    });

    setAiRecommendations(recommendations);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "sent":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-300";
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-3 h-3" strokeWidth={2} />;
      case "sent":
        return <Send className="w-3 h-3" strokeWidth={2} />;
      case "overdue":
        return <AlertCircle className="w-3 h-3" strokeWidth={2} />;
      case "draft":
        return <FileText className="w-3 h-3" strokeWidth={2} />;
      default:
        return <FileText className="w-3 h-3" strokeWidth={2} />;
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoiceForDetail(invoice);
    setShowInvoiceDetailModal(true);
  };

  const handleInvoiceUpdate = async () => {
    await loadFinancialData();
    setShowInvoiceDetailModal(false);
  };


  const filteredInvoices = invoices.filter(inv => 
    searchQuery === "" || 
    inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.host_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.event_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!enabler) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs tracking-widest text-gray-400">LOADING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-24">
      {/* Ultra-Minimal Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-base font-light tracking-tight text-gray-900">Smart Finance</h1>
                <div className="h-px w-32 bg-gradient-to-r from-emerald-500/30 to-transparent mt-0.5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-100 bg-white/60 backdrop-blur-sm sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-transparent border-0 h-auto p-0">
              <TabsTrigger 
                value="dashboard"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 pb-3 text-[10px] tracking-wider flex flex-col items-center gap-1"
              >
                <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
                DASHBOARD
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 pb-3 text-[10px] tracking-wider flex flex-col items-center gap-1"
              >
                <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                INVOICES
              </TabsTrigger>
              <TabsTrigger 
                value="automation"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 pb-3 text-[10px] tracking-wider flex flex-col items-center gap-1"
              >
                <Zap className="w-4 h-4" strokeWidth={1.5} />
                AUTO
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 pb-3 text-[10px] tracking-wider flex flex-col items-center gap-1"
              >
                <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                REPORTS
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 pb-3 text-[10px] tracking-wider flex flex-col items-center gap-1"
              >
                <SettingsIcon className="w-4 h-4" strokeWidth={1.5} />
                SETTINGS
              </TabsTrigger>
            </TabsList>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
              {/* DASHBOARD TAB */}
              <TabsContent value="dashboard" className="mt-0 space-y-6">
                {/* AI Invoice Summary - Side by Side Squares */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setActiveTab("invoices")}
                    className="cursor-pointer"
                  >
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative p-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                          <Clock className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-[9px] tracking-widest text-blue-700 mb-1">PENDING</p>
                        <p className="text-2xl font-light text-blue-900">${metrics.pending.toLocaleString()}</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => setActiveTab("invoices")}
                    className="cursor-pointer"
                  >
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative p-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-[9px] tracking-widest text-emerald-700 mb-1">PAID</p>
                        <p className="text-2xl font-light text-emerald-900">${metrics.paid.toLocaleString()}</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => setActiveTab("invoices")}
                    className="cursor-pointer"
                  >
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-orange-50 border-red-100">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative p-4">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                          <AlertCircle className="w-4 h-4 text-red-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-[9px] tracking-widest text-red-700 mb-1">OVERDUE</p>
                        <p className="text-2xl font-light text-red-900">${metrics.overdue.toLocaleString()}</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => setActiveTab("invoices")}
                    className="cursor-pointer"
                  >
                    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative p-4">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                          <Calendar className="w-4 h-4 text-purple-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-[9px] tracking-widest text-purple-700 mb-1">UPCOMING</p>
                        <p className="text-2xl font-light text-purple-900">{metrics.upcoming}</p>
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Smart Financial Overview - Circular Progress */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100">
                    <h3 className="text-[10px] tracking-widest text-gray-400 mb-6">EARNINGS OVERVIEW</h3>
                    
                    <div className="flex flex-col items-center mb-6">
                      {/* Circular Progress Ring */}
                      <div className="relative w-40 h-40 mb-4">
                        <svg className="transform -rotate-90 w-40 h-40">
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="#f3f4f6"
                            strokeWidth="12"
                            fill="none"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${(metrics.mtd_earnings / 15000) * 439.6} 439.6`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-[9px] text-gray-400 tracking-wide">THIS MONTH</p>
                          <p className="text-2xl font-bold text-gray-900">${metrics.mtd_earnings.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">of $15,000 goal</p>
                        </div>
                      </div>

                      {/* Stats Below Circle */}
                      <div className="w-full grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-[9px] text-gray-400 tracking-wider mb-1">AVG PAYMENT TIME</p>
                          <p className="text-lg font-semibold text-gray-900">{metrics.avg_payment_time.toFixed(1)} days</p>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                          <p className="text-[9px] text-emerald-600 tracking-wider mb-1">RECURRING INCOME</p>
                          <p className="text-lg font-semibold text-emerald-900">${metrics.recurring_income}/mo</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* AI Recommendations Panel */}
                {aiRecommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Card className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-purple-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="text-[10px] tracking-widest text-purple-700 mb-0.5">AI RECOMMENDATIONS</h3>
                          <p className="text-[9px] text-gray-600">Smart suggestions for your business</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {aiRecommendations.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100 hover:border-purple-200 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                rec.priority === 'high' ? 'bg-red-100' :
                                rec.priority === 'medium' ? 'bg-yellow-100' :
                                'bg-green-100'
                              }`}>
                                <Target className={`w-3 h-3 ${
                                  rec.priority === 'high' ? 'text-red-600' :
                                  rec.priority === 'medium' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`} strokeWidth={2} />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-gray-700 leading-relaxed mb-3">{rec.message}</p>
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700">
                                    Yes, Do It
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-[10px]">
                                    Not Now
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Recent Activity Feed */}
                {recentActivity.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100">
                      <h3 className="text-[10px] tracking-widest text-gray-400 mb-4">RECENT ACTIVITY</h3>
                      
                      <div className="space-y-3">
                        {recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.type === 'payment' ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}>
                              {activity.type === 'payment' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-600" strokeWidth={2} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 font-medium">{activity.message}</p>
                              <p className="text-[10px] text-gray-500">
                                {format(new Date(activity.timestamp), "MMM d, yyyy")}
                              </p>
                            </div>
                            <p className="text-xs font-semibold text-gray-900">
                              ${activity.amount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* INVOICES TAB */}
              <TabsContent value="invoices" className="mt-0 space-y-4">
                {/* Search and Create */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <Input
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-emerald-500"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowInvoiceModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
                    Create
                  </Button>
                </div>

                {/* Invoice List */}
                <div className="space-y-3">
                  {filteredInvoices.map((invoice) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group"
                    >
                      <Card className="p-4 hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-emerald-200 cursor-pointer"
                            onClick={() => handleViewInvoice(invoice)}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                              #{invoice.invoice_number?.slice(-3) || "..."}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">Invoice #{invoice.invoice_number}</p>
                              <p className="text-[10px] text-gray-500">
                                {invoice.event_name || "Event"} • {invoice.host_id?.slice(0, 8)}...
                              </p>
                              {invoice.auto_generated && (
                                <Badge className="mt-1 bg-purple-100 text-purple-700 border-purple-200 text-[8px] px-2 py-0.5">
                                  AUTO-GENERATED
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <Badge className={`${getStatusColor(invoice.status)} border text-[9px] tracking-wider flex items-center gap-1`}>
                            {getStatusIcon(invoice.status)}
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs mb-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-[9px] text-gray-400 tracking-wider mb-0.5">AMOUNT</p>
                              <p className="font-semibold text-gray-900">${invoice.total_amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 tracking-wider mb-0.5">DUE DATE</p>
                              <p className="text-gray-700">{format(new Date(invoice.due_date), "MMM d")}</p>
                            </div>
                            {invoice.event_date && (
                              <div>
                                <p className="text-[9px] text-gray-400 tracking-wider mb-0.5">EVENT</p>
                                <p className="text-gray-700">{format(new Date(invoice.event_date), "MMM d")}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {invoice.mismatch_warning && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0" strokeWidth={2} />
                            <p className="text-[10px] text-amber-700">Data sync required</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 h-8 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(invoice);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" strokeWidth={2} />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 h-8 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Send className="w-3 h-3 mr-1" strokeWidth={2} />
                            Send
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 h-8 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3 mr-1" strokeWidth={2} />
                            PDF
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <Card className="p-12 text-center bg-white/60 backdrop-blur-sm">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" strokeWidth={1.5} />
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No invoices found</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        {searchQuery ? "Try a different search term" : "Invoices will be auto-generated when bookings are confirmed"}
                      </p>
                      {!searchQuery && (
                        <Button onClick={() => setShowInvoiceModal(true)} className="bg-emerald-500 hover:bg-emerald-600">
                          <Plus className="w-4 h-4 mr-2" strokeWidth={2} />
                          Create Manual Invoice
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* AUTOMATION TAB */}
              <TabsContent value="automation" className="mt-0">
                <Card className="p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-amber-100">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Automation Studio</h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                      Set up intelligent rules to automatically generate invoices, send reminders, and optimize your cashflow
                    </p>
                    <div className="space-y-3 max-w-md mx-auto">
                      <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 text-left">
                        <h4 className="text-xs font-semibold text-gray-900 mb-2">🔄 Auto-Invoice on Booking</h4>
                        <p className="text-[10px] text-gray-600">Automatically create invoice when booking is confirmed</p>
                      </div>
                      <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 text-left">
                        <h4 className="text-xs font-semibold text-gray-900 mb-2">⏰ Smart Reminders</h4>
                        <p className="text-[10px] text-gray-600">Send gentle reminders 2 days before due date</p>
                      </div>
                      <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 text-left">
                        <h4 className="text-xs font-semibold text-gray-900 mb-2">💰 Early Payment Discount</h4>
                        <p className="text-[10px] text-gray-600">Apply 5% discount if paid within 24 hours</p>
                      </div>
                    </div>
                    <Button className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                      <Sparkles className="w-4 h-4 mr-2" strokeWidth={2} />
                      Configure Automation
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* REPORTS TAB */}
              <TabsContent value="reports" className="mt-0">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100">
                  <h3 className="text-[10px] tracking-widest text-gray-400 mb-6">FINANCIAL INSIGHTS</h3>
                  
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" strokeWidth={1.5} />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Analytics Dashboard</h3>
                    <p className="text-xs text-gray-500">View earnings trends, revenue breakdowns, and export reports</p>
                  </div>
                </Card>
              </TabsContent>

              {/* SETTINGS TAB */}
              <TabsContent value="settings" className="mt-0 space-y-4">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100">
                  <h3 className="text-[10px] tracking-widest text-gray-400 mb-4">BRANDING</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-2">Business Logo</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors cursor-pointer">
                        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" strokeWidth={1.5} />
                        <p className="text-xs text-gray-500">Upload your logo</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-gray-100">
                  <h3 className="text-[10px] tracking-widest text-gray-400 mb-4">TAX & PAYMENT</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-2">Tax Rate (%)</label>
                      <Input type="number" placeholder="0" className="border-gray-200 focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-2">Payment Terms</label>
                      <select className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                        <option>Net 30 days</option>
                        <option>Net 15 days</option>
                        <option>Due on receipt</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Powered by Blink */}
                <div className="flex items-center justify-end gap-2 pt-4">
                  <p className="text-[9px] text-gray-400 tracking-wider">POWERED BY</p>
                  <BlinkLogo size="xs" />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForDetail}
        isOpen={showInvoiceDetailModal}
        onClose={() => {
          setShowInvoiceDetailModal(false);
          setSelectedInvoiceForDetail(null);
        }}
        onUpdate={handleInvoiceUpdate}
      />
    </div>
  );
}
