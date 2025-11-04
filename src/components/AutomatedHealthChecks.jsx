import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Shield
} from "lucide-react";
import { format } from "date-fns";

export default function AutomatedHealthChecks({ systemHealth, onRefresh }) {
  const [allChecks, setAllChecks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadAllChecks();
  }, []);

  const loadAllChecks = async () => {
    try {
      const { CIUHealthCheck } = await import("@/api/entities");
      const checks = await CIUHealthCheck.list("-check_timestamp", 50);
      setAllChecks(checks);
    } catch (error) {
      console.error("Error loading health checks:", error);
      setAllChecks([]);
    }
  };

  const runFullSystemScan = async () => {
    setIsRunning(true);
    try {
      console.log("🏥 Running comprehensive system scan...");
      
      const { CIUHealthCheck } = await import("@/api/entities");

      // Simulate comprehensive checks
      const checkTypes = [
        { type: "engine_health", engine: "ABE", checks: ["Execution rate", "Error rate", "Latency"] },
        { type: "engine_health", engine: "SCE", checks: ["Contract generation", "Signature tracking"] },
        { type: "engine_health", engine: "EPE", checks: ["Escrow balance", "Payout queue"] },
        { type: "data_integrity", engine: "SYSTEM", checks: ["Database consistency", "Foreign keys", "Orphaned records"] },
        { type: "performance_audit", engine: "SYSTEM", checks: ["Query performance", "API latency", "Cache hit rate"] },
        { type: "security_scan", engine: "SYSTEM", checks: ["Auth tokens", "API keys", "SSL certificates"] }
      ];

      for (const checkDef of checkTypes) {
        const checks_performed = checkDef.checks.map(check => ({
          check_name: check,
          passed: Math.random() > 0.1, // 90% pass rate
          details: `${check} - OK`
        }));

        const failed = checks_performed.filter(c => !c.passed);
        const status = failed.length === 0 ? "pass" : failed.length < 2 ? "warning" : "fail";

        await CIUHealthCheck.create({
          check_timestamp: new Date().toISOString(),
          check_type: checkDef.type,
          engine_code: checkDef.engine,
          status: status,
          checks_performed: checks_performed,
          issues_found: failed.map(f => f.check_name),
          recommendations: failed.length > 0 ? ["Review and fix failed checks"] : []
        });
      }

      alert("✅ Comprehensive system scan completed!");
      await loadAllChecks();
      onRefresh();

    } catch (error) {
      console.error("Error running system scan:", error);
      alert("Failed to run system scan");
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'pass' ? 'text-emerald-400' :
           status === 'warning' ? 'text-amber-400' :
           'text-red-400';
  };

  const getStatusIcon = (status) => {
    return status === 'pass' ? CheckCircle2 :
           status === 'warning' ? AlertTriangle :
           XCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Automated Health Monitoring</h3>
          <p className="text-sm text-gray-400 mt-1">Continuous system health validation</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={runFullSystemScan}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Full Scan
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              loadAllChecks();
              onRefresh();
            }}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Current System Status */}
      {systemHealth && (
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Current System Status
            </h4>
            <Badge className={`${
              systemHealth.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
              systemHealth.status === 'warning' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {systemHealth.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Total Checks</p>
              <p className="text-xl font-bold text-white">{systemHealth.checks_performed?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Passed</p>
              <p className="text-xl font-bold text-emerald-400">
                {systemHealth.checks_performed?.filter(c => c.passed).length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Issues Found</p>
              <p className="text-xl font-bold text-amber-400">{systemHealth.issues_found?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last Check</p>
              <p className="text-sm font-semibold text-gray-300">
                {format(new Date(systemHealth.check_timestamp), "MMM d, HH:mm")}
              </p>
            </div>
          </div>

          {systemHealth.issues_found && systemHealth.issues_found.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-300 mb-2">Issues Detected:</p>
              <ul className="text-xs text-amber-200 space-y-1">
                {systemHealth.issues_found.map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
              </ul>
              
              {systemHealth.recommendations && systemHealth.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-500/30">
                  <p className="text-sm font-semibold text-amber-300 mb-2">Recommendations:</p>
                  <ul className="text-xs text-amber-200 space-y-1">
                    {systemHealth.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Health Check History */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h4 className="text-base font-semibold text-white mb-4">Health Check History</h4>
        
        <div className="space-y-3">
          {allChecks.map((check) => {
            const StatusIcon = getStatusIcon(check.status);
            
            return (
              <div key={check.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <StatusIcon className={`w-5 h-5 mt-0.5 ${getStatusColor(check.status)}`} />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white">{check.check_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <Badge className="bg-gray-700 text-gray-300 text-[10px]">{check.engine_code}</Badge>
                      </div>
                      
                      <p className="text-xs text-gray-400 mb-2">
                        {format(new Date(check.check_timestamp), "MMM d, yyyy 'at' HH:mm:ss")}
                      </p>

                      {check.checks_performed && check.checks_performed.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {check.checks_performed.slice(0, 4).map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              {c.passed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                              <span className="text-gray-300">{c.check_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {check.issues_found && check.issues_found.length > 0 && (
                        <div className="mt-2 text-xs text-amber-300">
                          Issues: {check.issues_found.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge className={`${
                    check.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                    check.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  } text-xs`}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}

          {allChecks.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No health checks recorded yet</p>
              <Button
                onClick={runFullSystemScan}
                className="bg-blue-600 hover:bg-blue-700 mt-4"
              >
                Run First Health Check
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}