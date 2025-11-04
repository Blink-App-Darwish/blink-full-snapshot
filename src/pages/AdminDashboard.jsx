
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Activity,
  FileText,
  Shield,
  Settings,
  Bell,
  ChevronDown,
  BarChart3,
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  LogOut,
  Menu,
  X as XIcon,
  ArrowLeftRight,
  Home as HomeIcon,
  Store,
  Bug,
  Brain,
  Rocket,
  Calculator // New import for Blink-onomics icon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlinkLogo from "../components/BlinkLogo";
import { base44 } from "@/api/base44Client";
import AdminOperationsConsole from "../components/AdminOperationsConsole";
import DisputeResolutionSystem from "../components/DisputeResolutionSystem";
import EnablerRelationsCRM from "../components/EnablerRelationsCRM";
import HostRelationsCRM from "../components/HostRelationsCRM";
import FinancialReconciliationDashboard from "../components/FinancialReconciliationDashboard";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import WorkflowAutomationEngine from "../components/WorkflowAutomationEngine";
import AdminNotificationCenter from "../components/AdminNotificationCenter";
import ExportReportingTools from "../components/ExportReportingTools";
import EventFlowDebugger from "../components/EventFlowDebugger";
import IntelligenceConsole from "../components/IntelligenceConsole";
import MonetizationManagement from "../components/MonetizationManagement";
import BlinkonomicsDashboard from "../components/BlinkonomicsDashboard";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    activeHolds: 0,
    escrowBalance: 0,
    pendingDisputes: 0,
    revenue30d: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    systemHealth: 100
  });

  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    initializeAdmin();
  }, []);

  const initializeAdmin = async () => {
    try {
      setIsLoading(true);
      const user = await base44.auth.me();

      if (user.role !== 'admin') {
        alert("⛔ Access Denied: Admin privileges required");
        navigate(createPageUrl("Home"), { replace: true });
        return;
      }

      setCurrentUser(user);

      try {
        const { AdminUser } = await import("@/api/entities");
        const adminUsers = await AdminUser.filter({ user_id: user.id });
        if (adminUsers[0]) {
          setAdminRole(adminUsers[0]);
        }
      } catch (error) {
        console.warn("AdminUser entity not available yet");
      }

      await loadDashboardData();
    } catch (error) {
      console.error("Error initializing admin dashboard:", error);
      alert("Failed to load admin dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [bookingsData, escrowData, disputesData] = await Promise.all([
        loadBookingMetrics(),
        loadEscrowMetrics(),
        loadDisputeMetrics()
      ]);

      setMetrics({
        ...bookingsData,
        ...disputesData,
        ...escrowData,
        systemHealth: 98.5
      });

      await loadAlerts();
      await loadRecentActivity();

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const loadBookingMetrics = async () => {
    try {
      const { Booking, Reservation } = await import("@/api/entities");

      const allBookings = await Booking.list("-created_date", 1000);
      const activeReservations = await Reservation.filter({ status: "HOLD" });

      const totalBookings = allBookings.length;
      const activeHolds = activeReservations.length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = allBookings.filter(b => new Date(b.created_date) > thirtyDaysAgo);
      const revenue30d = recent.reduce((sum, b) => sum + (b.total_amount || 0), 0);

      return {
        totalBookings,
        activeHolds,
        revenue30d,
        conversionRate: recent.length > 0 ? (recent.filter(b => b.status === 'confirmed').length / recent.length * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error("Error loading booking metrics:", error);
      return { totalBookings: 0, activeHolds: 0, revenue30d: 0, conversionRate: 0 };
    }
  };

  const loadEscrowMetrics = async () => {
    try {
      const { EscrowAccount } = await import("@/api/entities");
      const escrowAccounts = await EscrowAccount.filter({ status: "HOLD" });

      const escrowBalance = escrowAccounts.reduce((sum, acc) => sum + (acc.amount_cents || 0), 0) / 100;

      return { escrowBalance };
    } catch (error) {
      console.error("Error loading escrow metrics:", error);
      return { escrowBalance: 0 };
    }
  };

  const loadDisputeMetrics = async () => {
    try {
      const { Dispute } = await import("@/api/entities");
      const disputes = await Dispute.filter({ status: ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE"] });

      return { pendingDisputes: disputes.length };
    } catch (error) {
      console.error("Error loading dispute metrics:", error);
      return { pendingDisputes: 0 };
    }
  };

  const loadAlerts = async () => {
    try {
      const { AdminNotification } = await import("@/api/entities");
      const notifications = await AdminNotification.filter({
        read: false
      }, "-created_date", 10);

      setAlerts(notifications);
      setNotificationCount(notifications.length);
    } catch (error) {
      console.error("Error loading alerts:", error);
      setAlerts([]);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { AuditLog } = await import("@/api/entities");
      const logs = await AuditLog.list("-created_date", 15);
      setRecentActivity(logs);
    } catch (error) {
      console.error("Error loading recent activity:", error);
      setRecentActivity([]);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await base44.auth.logout();
      navigate(createPageUrl("Home"));
    }
  };

  const switchToPortal = (portal) => {
    if (portal === 'host') {
      localStorage.setItem('last_active_portal', 'host');
      localStorage.setItem('portal_explicit_choice', 'true');
      localStorage.setItem('portal_choice_timestamp', Date.now().toString());
      navigate(createPageUrl("Home"));
    } else if (portal === 'enabler') {
      if (currentUser?.user_type === 'enabler' || currentUser?.user_type === 'both') {
        localStorage.setItem('last_active_portal', 'enabler');
        localStorage.setItem('portal_explicit_choice', 'true');
        localStorage.setItem('portal_choice_timestamp', Date.now().toString());
        navigate(createPageUrl("EnablerDashboard"));
      } else {
        alert("You don't have enabler access");
      }
    }
    setShowRoleSwitcher(false);
  };

  const menuItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "intelligence", icon: Brain, label: "Intelligence Unit" },
    { id: "operations", icon: Zap, label: "Operations" },
    { id: "disputes", icon: Shield, label: "Disputes", badge: metrics.pendingDisputes },
    { id: "enablers", icon: Briefcase, label: "Enabler Relations" },
    { id: "hosts", icon: Users, label: "Host Relations" },
    { id: "finance", icon: DollarSign, label: "Finance & Reconciliation" },
    { id: "monetization", icon: DollarSign, label: "Monetization Management" },
    { id: "blinkonomics", icon: Calculator, label: "Blink-onomics", staticBadge: "NEW", staticBadgeColor: "bg-emerald-500" },
    { id: "analytics", icon: TrendingUp, label: "Analytics" },
    { id: "automation", icon: Settings, label: "Automation" },
    { id: "notifications", icon: Bell, label: "Notifications", badge: notificationCount },
    { id: "export", icon: FileText, label: "Reports & Export" },
    { id: "debugger", icon: Bug, label: "Event Debugger" },
    { id: "production", icon: Rocket, label: "Production Readiness", staticBadge: "NEW", staticBadgeColor: "bg-amber-500" }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BlinkLogo size="md" className="animate-breath mb-4" />
          <p className="text-sm text-gray-400">Loading Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transition-transform duration-300`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <BlinkLogo size="sm" />
              <div>
                <h1 className="text-lg font-bold text-white">Blink Admin</h1>
                <p className="text-xs text-gray-400">Operations Console</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden absolute top-4 right-4 p-2 rounded-lg text-gray-300 hover:bg-gray-700"
            >
              {sidebarOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const currentBadge = item.badge !== undefined && item.badge > 0 ? item.badge : (item.staticBadge || null);
                const currentBadgeColor = item.staticBadgeColor || "bg-red-500";

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {currentBadge && (
                      <Badge className={`${currentBadgeColor} text-white text-[10px] px-1.5 py-0.5`}>
                        {currentBadge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <div className="relative mb-3">
              <button
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-gray-200">Switch Portal</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {showRoleSwitcher && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10">
                  <button
                    onClick={() => switchToPortal('host')}
                    className="w-full px-3 py-2.5 hover:bg-gray-700 flex items-center gap-3 transition-colors border-b border-gray-700"
                  >
                    <HomeIcon className="w-4 h-4 text-blue-400" />
                    <div className="text-left flex-1">
                      <p className="text-xs font-medium text-gray-200">Host Portal</p>
                      <p className="text-[10px] text-gray-400">Plan & book events</p>
                    </div>
                  </button>

                  {(currentUser?.user_type === 'enabler' || currentUser?.user_type === 'both') && (
                    <button
                      onClick={() => switchToPortal('enabler')}
                      className="w-full px-3 py-2.5 hover:bg-gray-700 flex items-center gap-3 transition-colors border-b border-gray-700"
                    >
                      <Store className="w-4 h-4 text-emerald-400" />
                      <div className="text-left flex-1">
                        <p className="text-xs font-medium text-gray-200">Enabler Portal</p>
                        <p className="text-[10px] text-gray-400">Manage services</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setShowRoleSwitcher(false)}
                    className="w-full px-3 py-2.5 hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-purple-400" />
                    <div className="text-left flex-1">
                      <p className="text-xs font-medium text-gray-200">Admin Portal</p>
                      <p className="text-[10px] text-emerald-400">• Current</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser?.full_name}</p>
                <p className="text-[10px] text-gray-400">{adminRole?.role || "Admin"}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-red-600 hover:text-white hover:border-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-40 bg-gray-800/80 backdrop-blur-xl border-b border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {menuItems.find(item => item.id === activeSection)?.label || "Dashboard"}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">
                    {activeSection === "overview" && "System overview and key metrics"}
                    {activeSection === "operations" && "Smart contracts and escrow management"}
                    {activeSection === "disputes" && "Dispute resolution and case management"}
                    {activeSection === "enablers" && "Enabler relations and performance"}
                    {activeSection === "hosts" && "Host relations and analytics"}
                    {activeSection === "finance" && "Financial reconciliation and payouts"}
                    {activeSection === "monetization" && "Manage monetization channels and partnerships"}
                    {activeSection === "blinkonomics" && "Simulate and manage platform economy levers"}
                    {activeSection === "analytics" && "Business intelligence and insights"}
                    {activeSection === "automation" && "Workflow automation and rules"}
                    {activeSection === "intelligence" && "Centralized intelligence unit"}
                    {activeSection === "notifications" && "System notifications and alerts"}
                    {activeSection === "export" && "Data export and reporting"}
                    {activeSection === "debugger" && "Event flow debugging and diagnostics"}
                    {activeSection === "production" && "Track and manage production readiness"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={loadDashboardData}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <div className="relative">
                  <button 
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors relative"
                    onClick={() => setActiveSection("notifications")}
                  >
                    <Bell className="w-5 h-5 text-gray-300" />
                    {notificationCount > 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Bookings"
                  value={metrics.totalBookings}
                  icon={Calendar}
                  trend="+12%"
                  trendUp={true}
                  color="blue"
                />
                <MetricCard
                  title="Active Holds"
                  value={metrics.activeHolds}
                  icon={Clock}
                  subtitle="Real-time"
                  color="amber"
                />
                <MetricCard
                  title="Escrow Balance"
                  value={`$${metrics.escrowBalance.toLocaleString()}`}
                  icon={DollarSign}
                  trend="+8%"
                  trendUp={true}
                  color="emerald"
                />
                <MetricCard
                  title="Pending Disputes"
                  value={metrics.pendingDisputes}
                  icon={AlertTriangle}
                  color={metrics.pendingDisputes > 5 ? "red" : "gray"}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-800 border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Critical Alerts</h3>
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/30">
                      {alerts.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {alerts.length > 0 ? (
                      alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              alert.severity === 'CRITICAL' ? 'bg-red-500/10' :
                              alert.severity === 'URGENT' ? 'bg-amber-500/10' :
                              'bg-blue-500/10'
                            }`}>
                              <AlertTriangle className={`w-4 h-4 ${
                                alert.severity === 'CRITICAL' ? 'text-red-400' :
                                alert.severity === 'URGENT' ? 'text-amber-400' :
                                'text-blue-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{alert.title}</p>
                              <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-8">No critical alerts</p>
                    )}
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2"></div>
                          <div>
                            <p className="text-gray-200">{activity.action}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="bg-gray-800 border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickActionButton
                    icon={FileText}
                    label="Review Contracts"
                    count={0}
                    onClick={() => setActiveSection("operations")}
                  />
                  <QuickActionButton
                    icon={AlertTriangle}
                    label="Handle Disputes"
                    count={metrics.pendingDisputes}
                    onClick={() => setActiveSection("disputes")}
                  />
                  <QuickActionButton
                    icon={Briefcase}
                    label="Enabler Relations"
                    onClick={() => setActiveSection("enablers")}
                  />
                  <QuickActionButton
                    icon={Users}
                    label="Host Relations"
                    onClick={() => setActiveSection("hosts")}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeSection === "operations" && <AdminOperationsConsole />}
          {activeSection === "disputes" && <DisputeResolutionSystem />}
          {activeSection === "enablers" && <EnablerRelationsCRM />}
          {activeSection === "hosts" && <HostRelationsCRM />}
          {activeSection === "finance" && <FinancialReconciliationDashboard />}
          {activeSection === "monetization" && <MonetizationManagement />}
          {activeSection === "blinkonomics" && <BlinkonomicsDashboard />}
          {activeSection === "analytics" && <AnalyticsDashboard />}
          {activeSection === "automation" && <WorkflowAutomationEngine />}
          {activeSection === "intelligence" && <IntelligenceConsole />}
          {activeSection === "notifications" && <AdminNotificationCenter />}
          {activeSection === "export" && <ExportReportingTools />}
          {activeSection === "debugger" && (
            <div className="h-full">
              <EventFlowDebugger />
            </div>
          )}
          {activeSection === "production" && (
            <div className="h-full">
              <iframe
                src={createPageUrl("ProductionReadiness")}
                className="w-full h-[calc(100vh-200px)] border-0 rounded-lg bg-gray-800"
                title="Production Readiness Tracker"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendUp, subtitle, color = "gray" }) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/30",
    emerald: "bg-emerald-500/10 border-emerald-500/30",
    amber: "bg-amber-500/10 border-amber-500/30",
    red: "bg-red-500/10 border-red-500/30",
    gray: "bg-gray-700/50 border-gray-600"
  };

  const iconColorClasses = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    gray: "text-gray-400"
  };

  return (
    <Card className={`${colorClasses[color]} border p-6 bg-gray-800`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[0]}`}>
          <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp className="w-3 h-3" />
          <span>{trend} from last period</span>
        </div>
      )}
    </Card>
  );
}

function QuickActionButton({ icon: Icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-all group"
    >
      <Icon className="w-6 h-6 text-gray-400 group-hover:text-gray-200 mb-2 transition-colors" />
      <p className="text-sm font-medium text-gray-200">{label}</p>
      {count !== undefined && count > 0 && (
        <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs">
          {count}
        </Badge>
      )}
    </button>
  );
}
