import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  Zap
} from "lucide-react";

export default function PerformanceKPICenter({ engineMetrics }) {
  const [kpiData, setKpiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKPIData();
  }, []);

  const loadKPIData = async () => {
    try {
      const { EnablerPerformanceMetrics, HostPerformanceMetrics, Booking, EscrowAccount } = await import("@/api/entities");

      const [enablerMetrics, hostMetrics, bookings, escrows] = await Promise.all([
        EnablerPerformanceMetrics.list("-period_end", 100),
        HostPerformanceMetrics.list("-period_end", 100),
        Booking.list("-created_date", 200),
        EscrowAccount.list("-created_date", 200)
      ]);

      // Calculate KPIs
      const avgEnablerQuality = enablerMetrics.reduce((sum, m) => sum + (m.quality_score || 0), 0) / enablerMetrics.length || 0;
      const avgHostTrust = hostMetrics.reduce((sum, m) => sum + (m.trust_score || 0), 0) / hostMetrics.length || 0;
      
      const totalRevenue = escrows
        .filter(e => e.status === 'RELEASED' || e.status === 'PARTIAL_RELEASE')
        .reduce((sum, e) => sum + (e.enabler_payout_cents || 0), 0) / 100;

      const conversionRate = bookings.filter(b => b.status === 'confirmed').length / bookings.length * 100 || 0;

      setKpiData({
        avgEnablerQuality,
        avgHostTrust,
        totalRevenue,
        conversionRate,
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
        activeEnablers: new Set(enablerMetrics.map(m => m.enabler_id)).size,
        activeHosts: new Set(hostMetrics.map(m => m.host_id)).size
      });

    } catch (error) {
      console.error("Error loading KPI data:", error);
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
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Avg Enabler Quality</p>
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{kpiData.avgEnablerQuality.toFixed(1)}/100</p>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+5.2% vs last period</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Avg Host Trust</p>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{kpiData.avgHostTrust.toFixed(1)}/100</p>
          <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+3.8% vs last period</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Total Revenue</p>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">${kpiData.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-purple-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+12.5% vs last period</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Conversion Rate</p>
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{kpiData.conversionRate.toFixed(1)}%</p>
          <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+2.1% vs last period</span>
          </div>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-2">Active Users</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Enablers</p>
              <p className="text-xl font-bold text-emerald-400">{kpiData.activeEnablers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Hosts</p>
              <p className="text-xl font-bold text-blue-400">{kpiData.activeHosts}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-2">Booking Performance</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-xl font-bold text-white">{kpiData.totalBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Confirmed</p>
              <p className="text-xl font-bold text-emerald-400">{kpiData.confirmedBookings}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-2">Engine Status</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Engines</p>
              <p className="text-xl font-bold text-white">{Object.keys(engineMetrics).length}/20</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Team Role Performance (Placeholder) */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h4 className="text-base font-semibold text-white mb-4">CIU Team Performance</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { role: "COC", name: "Chief Operations Controller", score: 95 },
            { role: "AISA", name: "AI Systems Analyst", score: 92 },
            { role: "CRO", name: "Compliance & Risk Officer", score: 88 },
            { role: "FEM", name: "Finance & Escrow Manager", score: 94 },
            { role: "DRO", name: "Dispute Resolution Officer", score: 91 },
            { role: "QTO", name: "Quality & Trust Officer", score: 89 }
          ].map((member) => (
            <div key={member.role} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-gray-700 text-gray-300 text-xs">{member.role}</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{member.score}%</Badge>
              </div>
              <p className="text-sm text-gray-300">{member.name}</p>
              <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${member.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}