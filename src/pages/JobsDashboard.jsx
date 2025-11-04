import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import BlinkLogo from "../components/BlinkLogo";

export default function JobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [systemHealth, setSystemHealth] = useState("unknown");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    loadJobStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadJobStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadJobStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/jobs/status');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setSystemHealth(data.system_health || "unknown");
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Error loading job status:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const triggerJob = async (jobName) => {
    try {
      const response = await fetch(`/api/jobs/${jobName}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert(`Job "${jobName}" triggered successfully`);
        setTimeout(loadJobStatus, 2000);
      } else {
        alert(`Failed to trigger job: ${await response.text()}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partial': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BlinkLogo size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Background Jobs</h1>
                <p className="text-sm text-gray-600">Monitor scheduled tasks and system health</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={loadJobStatus}
                disabled={isRefreshing}
                variant="outline"
                size="icon"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* System Health Card */}
        <Card className={`p-6 mb-8 border-2 ${getHealthColor(systemHealth)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="w-12 h-12" />
              <div>
                <h2 className="text-2xl font-bold mb-1">System Status: {systemHealth.toUpperCase()}</h2>
                <p className="text-sm opacity-80">
                  {jobs.length} background jobs monitored
                </p>
              </div>
            </div>
            {systemHealth === 'healthy' && (
              <CheckCircle2 className="w-16 h-16 opacity-50" />
            )}
            {systemHealth === 'unhealthy' && (
              <XCircle className="w-16 h-16 opacity-50" />
            )}
          </div>
        </Card>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job, index) => (
            <motion.div
              key={job.job_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                {/* Job Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.last_status)}
                    <div>
                      <h3 className="font-bold text-gray-900 capitalize">
                        {job.job_name.replace(/-/g, ' ')}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Last run: {new Date(job.last_run).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={job.last_status === 'success' ? 'default' : 'destructive'}>
                    {job.last_status}
                  </Badge>
                </div>

                {/* Job Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                    <p className="text-lg font-bold text-gray-900">{job.success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Runs</p>
                    <p className="text-lg font-bold text-gray-900">{job.total_runs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
                    <p className="text-lg font-bold text-gray-900">{job.avg_duration_ms}ms</p>
                  </div>
                </div>

                {/* Error Display */}
                {job.last_error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs font-bold text-red-900 mb-1">Last Error:</p>
                    <p className="text-xs text-red-800 font-mono">{job.last_error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => triggerJob(job.job_name)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    Trigger Now
                  </Button>
                  <Button
                    onClick={() => window.open(`/api/jobs/${job.job_name}/logs`, '_blank')}
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                  >
                    View Logs
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={() => triggerJob('expire-reservations')} variant="outline">
              Expire Holds
            </Button>
            <Button onClick={() => triggerJob('sync-calendars')} variant="outline">
              Sync Calendars
            </Button>
            <Button onClick={() => triggerJob('send-reminders')} variant="outline">
              Send Reminders
            </Button>
            <Button onClick={() => triggerJob('cleanup-old-data')} variant="outline">
              Cleanup Data
            </Button>
          </div>
        </Card>

        {/* Scheduler Configuration Info */}
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3">🔄 Scheduler Configuration</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>expire-reservations:</strong> Every 1 minute</p>
            <p><strong>sync-calendars:</strong> Every 5 minutes</p>
            <p><strong>send-reminders:</strong> Every 1 hour</p>
            <p><strong>cleanup-old-data:</strong> Daily at 2 AM</p>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              Jobs are triggered via external scheduler (Vercel Cron, GitHub Actions, or cron-job.org).
              See deployment docs for setup instructions.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}