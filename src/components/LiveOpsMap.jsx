import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Zap
} from "lucide-react";
import { format } from "date-fns";

export default function LiveOpsMap({ engineMetrics }) {
  const [realtimeData, setRealtimeData] = useState({
    activeBookings: [],
    activeHolds: [],
    activeDisputes: [],
    recentPayouts: [],
    activeContracts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRealtimeData();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadRealtimeData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadRealtimeData = async () => {
    try {
      const { Booking, Reservation, Dispute, EscrowAccount, SmartContract } = await import("@/api/entities");

      const [bookings, holds, disputes, escrows, contracts] = await Promise.all([
        Booking.filter({ status: ["confirmed", "in_progress"] }, "-created_date", 10),
        Reservation.filter({ status: "HOLD" }, "-created_date", 10),
        Dispute.filter({ status: ["OPEN", "UNDER_REVIEW"] }, "-created_date", 10),
        EscrowAccount.filter({ status: ["RELEASED", "PARTIAL_RELEASE"] }, "-released_at", 10),
        SmartContract.filter({ status: "ACTIVE" }, "-created_date", 10)
      ]);

      setRealtimeData({
        activeBookings: bookings,
        activeHolds: holds,
        activeDisputes: disputes,
        recentPayouts: escrows,
        activeContracts: contracts
      });
    } catch (error) {
      console.error("Error loading realtime data:", error);
    } finally {
      setIsLoading(false);
    }
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
      {/* Real-time Activity Stream */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          Real-Time Activity Stream
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active Bookings */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Active Bookings
              </h4>
              <Badge className="bg-blue-500 text-white text-xs">{realtimeData.activeBookings.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realtimeData.activeBookings.map(booking => (
                <div key={booking.id} className="bg-gray-800 rounded p-2 text-xs">
                  <p className="text-gray-300 font-mono">#{booking.id.slice(0, 8)}</p>
                  <p className="text-gray-500">{format(new Date(booking.created_date), "MMM d, HH:mm")}</p>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px] mt-1">{booking.status}</Badge>
                </div>
              ))}
              {realtimeData.activeBookings.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No active bookings</p>
              )}
            </div>
          </div>

          {/* Active Holds */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Active Holds
              </h4>
              <Badge className="bg-amber-500 text-white text-xs">{realtimeData.activeHolds.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realtimeData.activeHolds.map(hold => (
                <div key={hold.id} className="bg-gray-800 rounded p-2 text-xs">
                  <p className="text-gray-300 font-mono">#{hold.id.slice(0, 8)}</p>
                  <p className="text-gray-500">
                    Expires: {format(new Date(hold.expires_at), "MMM d, HH:mm")}
                  </p>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px] mt-1">HOLD</Badge>
                </div>
              ))}
              {realtimeData.activeHolds.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No active holds</p>
              )}
            </div>
          </div>

          {/* Active Disputes */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Active Disputes
              </h4>
              <Badge className="bg-red-500 text-white text-xs">{realtimeData.activeDisputes.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realtimeData.activeDisputes.map(dispute => (
                <div key={dispute.id} className="bg-gray-800 rounded p-2 text-xs">
                  <p className="text-gray-300 font-mono">#{dispute.id.slice(0, 8)}</p>
                  <p className="text-gray-500">{dispute.reason.replace(/_/g, ' ')}</p>
                  <Badge className="bg-red-100 text-red-700 text-[10px] mt-1">{dispute.status}</Badge>
                </div>
              ))}
              {realtimeData.activeDisputes.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No active disputes</p>
              )}
            </div>
          </div>

          {/* Recent Payouts */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Recent Payouts
              </h4>
              <Badge className="bg-emerald-500 text-white text-xs">{realtimeData.recentPayouts.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realtimeData.recentPayouts.map(escrow => (
                <div key={escrow.id} className="bg-gray-800 rounded p-2 text-xs">
                  <p className="text-gray-300 font-mono">#{escrow.id.slice(0, 8)}</p>
                  <p className="text-emerald-400 font-semibold">${((escrow.enabler_payout_cents || 0) / 100).toFixed(2)}</p>
                  <p className="text-gray-500">{format(new Date(escrow.released_at), "MMM d, HH:mm")}</p>
                </div>
              ))}
              {realtimeData.recentPayouts.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No recent payouts</p>
              )}
            </div>
          </div>

          {/* Active Contracts */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Active Contracts
              </h4>
              <Badge className="bg-purple-500 text-white text-xs">{realtimeData.activeContracts.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realtimeData.activeContracts.map(contract => (
                <div key={contract.id} className="bg-gray-800 rounded p-2 text-xs">
                  <p className="text-gray-300 font-mono">#{contract.id.slice(0, 8)}</p>
                  <p className="text-gray-500">v{contract.version}</p>
                  <Badge className="bg-purple-100 text-purple-700 text-[10px] mt-1">ACTIVE</Badge>
                </div>
              ))}
              {realtimeData.activeContracts.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">No active contracts</p>
              )}
            </div>
          </div>

          {/* System Metrics */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                System Metrics
              </h4>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Engines Active</p>
                <p className="text-xl font-bold text-white">{Object.keys(engineMetrics).length}/20</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Response Time</p>
                <p className="text-xl font-bold text-emerald-400">127ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Success Rate</p>
                <p className="text-xl font-bold text-emerald-400">98.7%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Engine Health Grid */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Engine Health Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.entries(engineMetrics).map(([code, metric]) => (
            <div key={code} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-gray-300">{code}</p>
                {metric.status === 'healthy' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : metric.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className="text-xs text-gray-500">{metric.metric_type}</p>
              <p className="text-sm font-semibold text-white mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}