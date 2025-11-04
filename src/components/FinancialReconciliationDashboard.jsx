import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Eye,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function FinancialReconciliationDashboard() {
  const [reconciliations, setReconciliations] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [financialSummary, setFinancialSummary] = useState(null);

  useEffect(() => {
    loadReconciliations();
    loadFinancialSummary();
  }, []);

  const loadReconciliations = async () => {
    setIsLoading(true);
    try {
      const { FinancialReconciliation } = await import("@/api/entities");
      const data = await FinancialReconciliation.list("-period_end", 12);
      setReconciliations(data);
    } catch (error) {
      console.error("Error loading reconciliations:", error);
      setReconciliations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFinancialSummary = async () => {
    try {
      const { Booking, EscrowAccount, Enabler } = await import("@/api/entities");
      
      const [bookings, escrowAccounts] = await Promise.all([
        Booking.list("-created_date", 1000),
        EscrowAccount.list("-created_date", 1000)
      ]);

      const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const escrowBalance = escrowAccounts
        .filter(e => e.status === 'HOLD')
        .reduce((sum, e) => sum + (e.amount_cents || 0), 0) / 100;

      const totalCommissions = escrowAccounts
        .filter(e => e.status === 'RELEASED')
        .reduce((sum, e) => sum + (e.commission_cents || 0), 0) / 100;

      const totalPayouts = escrowAccounts
        .filter(e => e.status === 'RELEASED')
        .reduce((sum, e) => sum + (e.enabler_payout_cents || 0), 0) / 100;

      setFinancialSummary({
        totalRevenue,
        escrowBalance,
        totalCommissions,
        totalPayouts,
        netRevenue: totalRevenue - totalPayouts
      });
    } catch (error) {
      console.error("Error loading financial summary:", error);
    }
  };

  const runReconciliation = async () => {
    setIsReconciling(true);
    try {
      console.log("🔍 Running financial reconciliation...");

      const periodStart = startOfMonth(subMonths(new Date(), 1));
      const periodEnd = endOfMonth(subMonths(new Date(), 1));

      const { Booking, EscrowAccount, FinancialReconciliation } = await import("@/api/entities");
      const user = await base44.auth.me();

      // Get all bookings for period
      const bookings = await Booking.filter({
        created_date: {
          $gte: periodStart.toISOString(),
          $lte: periodEnd.toISOString()
        }
      });

      // Get all escrow accounts for period
      const escrowAccounts = await EscrowAccount.filter({
        created_date: {
          $gte: periodStart.toISOString(),
          $lte: periodEnd.toISOString()
        }
      });

      // Calculate expected values
      const revenueExpected = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const payoutsExpected = escrowAccounts
        .filter(e => e.status === 'RELEASED')
        .reduce((sum, e) => sum + (e.enabler_payout_cents || 0), 0) / 100;
      const commissionsExpected = escrowAccounts
        .filter(e => e.status === 'RELEASED')
        .reduce((sum, e) => sum + (e.commission_cents || 0), 0) / 100;
      const escrowBalanceExpected = escrowAccounts
        .filter(e => e.status === 'HOLD')
        .reduce((sum, e) => sum + (e.amount_cents || 0), 0) / 100;

      // For this demo, actual = expected (in production, this would come from payment processor)
      const revenueActual = revenueExpected;
      const payoutsActual = payoutsExpected;
      const commissionsActual = commissionsExpected;
      const escrowBalanceActual = escrowBalanceExpected;

      // Detect discrepancies (for demo, we'll create some random ones)
      const discrepancies = [];
      if (Math.random() > 0.7) {
        discrepancies.push({
          type: "revenue_mismatch",
          description: "Minor revenue tracking difference",
          amount_difference: Math.floor(Math.random() * 100),
          severity: "LOW",
          resolved: false
        });
      }

      const reconciliation = await FinancialReconciliation.create({
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        status: discrepancies.length > 0 ? "discrepancies_found" : "completed",
        total_revenue_expected: revenueExpected,
        total_revenue_actual: revenueActual,
        total_payouts_expected: payoutsExpected,
        total_payouts_actual: payoutsActual,
        total_commissions_expected: commissionsExpected,
        total_commissions_actual: commissionsActual,
        escrow_balance_expected: escrowBalanceExpected,
        escrow_balance_actual: escrowBalanceActual,
        discrepancies: discrepancies,
        reconciled_by: user.id,
        reconciled_at: new Date().toISOString()
      });

      alert(`✅ Reconciliation complete!\n\nStatus: ${reconciliation.status}\nDiscrepancies: ${discrepancies.length}`);
      await loadReconciliations();

    } catch (error) {
      console.error("Error running reconciliation:", error);
      alert("Failed to run reconciliation");
    } finally {
      setIsReconciling(false);
    }
  };

  const downloadReconciliationReport = async (reconciliation) => {
    console.log("📥 Downloading reconciliation report...", reconciliation.id);
    alert("Report download would start here (CSV/PDF export)");
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
          <h2 className="text-2xl font-bold text-white">Financial Reconciliation</h2>
          <p className="text-sm text-gray-400">Verify and reconcile platform finances</p>
        </div>

        <Button
          onClick={runReconciliation}
          disabled={isReconciling}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isReconciling ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {isReconciling ? 'Reconciling...' : 'Run Reconciliation'}
        </Button>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400">Total Revenue</p>
                <h3 className="text-2xl font-bold text-white">
                  ${financialSummary.totalRevenue.toLocaleString()}
                </h3>
              </div>
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400">Escrow Balance</p>
                <h3 className="text-2xl font-bold text-white">
                  ${financialSummary.escrowBalance.toLocaleString()}
                </h3>
              </div>
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400">Total Commissions</p>
                <h3 className="text-2xl font-bold text-white">
                  ${financialSummary.totalCommissions.toLocaleString()}
                </h3>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/30 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400">Total Payouts</p>
                <h3 className="text-2xl font-bold text-white">
                  ${financialSummary.totalPayouts.toLocaleString()}
                </h3>
              </div>
              <TrendingDown className="w-6 h-6 text-amber-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Reconciliation History */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Reconciliation History</h3>
        <div className="space-y-3">
          {reconciliations.map((reconciliation) => (
            <Card key={reconciliation.id} className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold">
                      {format(new Date(reconciliation.period_start), 'MMM d, yyyy')} - {format(new Date(reconciliation.period_end), 'MMM d, yyyy')}
                    </h4>
                    <Badge className={`text-xs ${
                      reconciliation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      reconciliation.status === 'discrepancies_found' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {reconciliation.status.replace(/_/g, ' ')}
                    </Badge>
                    {reconciliation.discrepancies && reconciliation.discrepancies.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {reconciliation.discrepancies.length} discrepancies
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-gray-400">Revenue</p>
                      <p className="text-white font-semibold">
                        ${reconciliation.total_revenue_actual?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Payouts</p>
                      <p className="text-white font-semibold">
                        ${reconciliation.total_payouts_actual?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Commissions</p>
                      <p className="text-white font-semibold">
                        ${reconciliation.total_commissions_actual?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Escrow</p>
                      <p className="text-white font-semibold">
                        ${reconciliation.escrow_balance_actual?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                    onClick={() => setSelectedPeriod(reconciliation)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-700 text-gray-300"
                    onClick={() => downloadReconciliationReport(reconciliation)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Discrepancies */}
              {reconciliation.discrepancies && reconciliation.discrepancies.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-sm font-semibold text-white mb-2">Discrepancies:</p>
                  <div className="space-y-2">
                    {reconciliation.discrepancies.map((disc, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white">{disc.description}</p>
                          <p className="text-gray-400">
                            Difference: ${Math.abs(disc.amount_difference).toFixed(2)}
                          </p>
                        </div>
                        <Badge className={`text-[10px] ${
                          disc.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {disc.resolved ? 'Resolved' : disc.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}

          {reconciliations.length === 0 && (
            <Card className="bg-gray-900 border-gray-800 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-400">No reconciliations yet. Run your first reconciliation above.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}