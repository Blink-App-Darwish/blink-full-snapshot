import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ConflictReport, RepairSnapshot, AutoRepairSettings } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Clock, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RepairCard from "../components/RepairCard";
import RollbackTimer from "../components/RollbackTimer";
import AutoRepairOrchestrator from "../components/AutoRepairOrchestrator";

export default function ConflictInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [conflicts, setConflicts] = useState([]);
  const [activeConflict, setActiveConflict] = useState(null);
  const [repairSnapshot, setRepairSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const userData = await base44.auth.me();
      setUser(userData);

      // Load conflicts for user's events
      const conflictsData = await ConflictReport.filter({}, "-created_date", 50);
      setConflicts(conflictsData);

      // Check if specific conflict requested
      const reportId = searchParams.get('report');
      const snapshotId = searchParams.get('snapshot');

      if (reportId) {
        const conflict = conflictsData.find(c => c.id === reportId);
        if (conflict) {
          setActiveConflict(conflict);
          const snapshots = await RepairSnapshot.filter({ conflict_report_id: reportId });
          if (snapshots[0]) {
            setRepairSnapshot(snapshots[0]);
          }
        }
      } else if (snapshotId) {
        const snapshots = await RepairSnapshot.filter({ id: snapshotId });
        if (snapshots[0]) {
          setRepairSnapshot(snapshots[0]);
          const conflictsForSnapshot = await ConflictReport.filter({ id: snapshots[0].conflict_report_id });
          if (conflictsForSnapshot[0]) {
            setActiveConflict(conflictsForSnapshot[0]);
          }
        }
      } else if (conflictsData.length > 0) {
        // Show first unresolved conflict
        const unresolved = conflictsData.find(c => c.status !== "resolved");
        if (unresolved) {
          setActiveConflict(unresolved);
          const snapshots = await RepairSnapshot.filter({ conflict_report_id: unresolved.id });
          if (snapshots[0]) {
            setRepairSnapshot(snapshots[0]);
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading conflicts:", error);
      setIsLoading(false);
    }
  };

  const handleApplyRepair = async (repair) => {
    try {
      setIsApplying(true);
      
      // Apply the repair changes
      await AutoRepairOrchestrator.applyRepairChanges(repair.changes_to_apply, activeConflict.event_id);
      
      // Update repair snapshot
      await RepairSnapshot.update(repairSnapshot.id, {
        applied_option_rank: repair.rank,
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        application_mode: "manual",
        status: "applied"
      });

      // Update conflict status
      await ConflictReport.update(activeConflict.id, {
        status: "resolved"
      });

      // Reload data
      await loadData();
      
      setIsApplying(false);
      
      // Show success and navigate
      setTimeout(() => {
        navigate(createPageUrl("MyEvents"));
      }, 1500);

    } catch (error) {
      console.error("Error applying repair:", error);
      alert("Failed to apply fix. Please try again.");
      setIsApplying(false);
    }
  };

  const handleRejectRepair = async (repair) => {
    console.log("Repair rejected:", repair.title);
  };

  const handleRollback = async () => {
    try {
      await AutoRepairOrchestrator.rollbackRepair(repairSnapshot.id);
      await loadData();
    } catch (error) {
      console.error("Error rolling back:", error);
      alert("Failed to undo fix. " + error.message);
    }
  };

  const handleAcceptAutoFix = async () => {
    try {
      await RepairSnapshot.update(repairSnapshot.id, {
        status: "accepted"
      });
      await ConflictReport.update(activeConflict.id, {
        status: "resolved"
      });
      await loadData();
    } catch (error) {
      console.error("Error accepting fix:", error);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 70) return "text-red-600 bg-red-50";
    if (score >= 40) return "text-amber-600 bg-amber-50";
    return "text-blue-600 bg-blue-50";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Clock className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Clear! 🎉</h2>
            <p className="text-gray-600 mb-6">No conflicts detected. Your events are running smoothly.</p>
            <Button onClick={() => navigate(createPageUrl("MyEvents"))}>
              Back to My Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Conflict Inbox</h1>
              <p className="text-xs text-gray-500">{conflicts.filter(c => c.status !== "resolved").length} active issues</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        {/* Active Conflict */}
        {activeConflict && (
          <div className="mb-6">
            {/* Conflict Summary */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-900">
                      {activeConflict.event_snapshot.name}
                    </h3>
                    <Badge className={getSeverityColor(activeConflict.severity_score)}>
                      {activeConflict.severity_score >= 70 ? "Critical" : 
                       activeConflict.severity_score >= 40 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {activeConflict.affected_enablers.length} service provider(s) affected by {activeConflict.trigger_type.replace(/_/g, ' ')}
                  </p>
                  
                  {/* Conflict Flags */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(activeConflict.conflict_flags).map(([key, value]) => 
                      value && (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key.replace(/_/g, ' ')}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Rollback Timer (if auto-applied) */}
            {repairSnapshot && repairSnapshot.status === "applied" && repairSnapshot.application_mode === "auto_apply_minor" && !repairSnapshot.rollback_completed && (
              <RollbackTimer
                repairSnapshot={repairSnapshot}
                onRollback={handleRollback}
                onAccept={handleAcceptAutoFix}
              />
            )}

            {/* Repair Options */}
            {repairSnapshot && repairSnapshot.repair_options && repairSnapshot.status === "proposed" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Suggested Fixes</h3>
                {repairSnapshot.repair_options.map((repair) => (
                  <RepairCard
                    key={repair.rank}
                    repair={repair}
                    onApply={handleApplyRepair}
                    onReject={handleRejectRepair}
                    isApplying={isApplying}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other Conflicts List */}
        {conflicts.filter(c => c.id !== activeConflict?.id && c.status !== "resolved").length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Other Issues</h3>
            <div className="space-y-2">
              {conflicts
                .filter(c => c.id !== activeConflict?.id && c.status !== "resolved")
                .map((conflict) => (
                  <button
                    key={conflict.id}
                    onClick={() => {
                      setActiveConflict(conflict);
                      navigate(`?report=${conflict.id}`);
                    }}
                    className="w-full bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{conflict.event_snapshot.name}</h4>
                        <p className="text-xs text-gray-500">
                          {conflict.affected_enablers.length} affected • {conflict.trigger_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge className={getSeverityColor(conflict.severity_score)}>
                        {conflict.severity_score}
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}