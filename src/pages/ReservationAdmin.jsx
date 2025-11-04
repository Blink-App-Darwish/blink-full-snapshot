import React, { useState, useEffect } from "react";
import { Reservation, ReservationAuditLog, ReservationMetrics, Enabler, User } from "@/api/entities";
import { RefreshCw, X, CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import ReservationService from "../components/ReservationService";
import BackgroundJobScheduler from "../components/BackgroundJobScheduler";

export default function ReservationAdmin() {
  const [reservations, setReservations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobsRunning, setJobsRunning] = useState(false);

  useEffect(() => {
    loadAdminData();
    setJobsRunning(BackgroundJobScheduler.isRunning);
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const allReservations = await Reservation.filter({}, "-created_date", 100);
      setReservations(allReservations);

      const today = new Date().toISOString().split('T')[0];
      const todayMetrics = await ReservationMetrics.filter({ metric_date: today });
      setMetrics(todayMetrics[0] || null);

      if (allReservations.length > 0) {
        const logs = await ReservationAuditLog.filter({ 
          reservation_id: allReservations[0].id 
        }, "-timestamp", 10);
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceConfirm = async (reservationId) => {
    const confirmed = window.confirm("Force confirm this reservation? This will skip payment verification.");
    if (!confirmed) return;

    try {
      await ReservationService.completeReservation(reservationId, {
        payment_id: `manual_${Date.now()}`,
        signature_id: `manual_sig_${Date.now()}`
      });
      await loadAdminData();
      alert("Reservation force-confirmed");
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleForceExpire = async (reservationId) => {
    const confirmed = window.confirm("Force expire this reservation?");
    if (!confirmed) return;

    try {
      await ReservationService.handleExpiry(reservationId);
      await loadAdminData();
      alert("Reservation force-expired");
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleRetryCalendarSync = async (reservationId) => {
    try {
      const CalendarSyncService = (await import("../components/CalendarSyncService")).default;
      const result = await CalendarSyncService.syncReservation(reservationId);
      if (result.success) {
        alert("Calendar sync successful");
        await loadAdminData();
      } else {
        alert(`Calendar sync failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const toggleBackgroundJobs = () => {
    if (jobsRunning) {
      BackgroundJobScheduler.stop();
      setJobsRunning(false);
    } else {
      BackgroundJobScheduler.start();
      setJobsRunning(true);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      HOLD: "bg-yellow-100 text-yellow-800 border-yellow-200",
      CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      FAILED: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const activeHolds = reservations.filter(r => r.status === "HOLD");
  const confirmedToday = reservations.filter(r => 
    r.status === "CONFIRMED" && r.created_date.startsWith(new Date().toISOString().split('T')[0])
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservation Admin</h1>
            <p className="text-gray-600 mt-1">Monitor and manage all reservations</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={toggleBackgroundJobs}
              variant={jobsRunning ? "destructive" : "default"}
              size="sm"
            >
              {jobsRunning ? "Stop Jobs" : "Start Jobs"}
            </Button>
            <Button onClick={loadAdminData} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Holds</p>
                <p className="text-3xl font-bold text-yellow-600">{activeHolds.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed Today</p>
                <p className="text-3xl font-bold text-emerald-600">{confirmedToday.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics ? `${(metrics.preauth_success_rate * 100).toFixed(0)}%` : "N/A"}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${metrics ? metrics.total_revenue.toLocaleString() : "0"}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Active Reservations List */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Reservations</h2>
          <div className="space-y-3">
            {reservations.slice(0, 20).map((reservation) => {
              const minutesLeft = reservation.expires_at ? 
                Math.max(0, Math.floor((new Date(reservation.expires_at) - new Date()) / 1000 / 60)) : 0;
              
              return (
                <div key={reservation.id} className="border border-gray-200 p-4 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(reservation.status)}>
                          {reservation.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          ID: {reservation.id.substring(0, 8)}...
                        </span>
                        {reservation.status === "HOLD" && (
                          <span className="text-sm text-gray-600">
                            ⏱️ {minutesLeft}m left
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        Event: {reservation.metadata?.event_name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {format(new Date(reservation.created_date), "PPp")}
                      </p>
                      {reservation.preauth_status && (
                        <Badge className="mt-2 text-xs" variant="outline">
                          Pre-auth: {reservation.preauth_status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {reservation.status === "HOLD" && (
                        <>
                          <Button
                            onClick={() => handleForceConfirm(reservation.id)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            onClick={() => handleForceExpire(reservation.id)}
                            size="sm"
                            variant="outline"
                            className="text-xs text-red-600"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Expire
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleRetryCalendarSync(reservation.id)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Sync
                      </Button>
                      <Button
                        onClick={() => setSelectedReservation(reservation)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Audit Logs */}
        {selectedReservation && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
              <Button
                onClick={() => setSelectedReservation(null)}
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="text-sm border-l-2 border-gray-300 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {log.action}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), "PPp")}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}