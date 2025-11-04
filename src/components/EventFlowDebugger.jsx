import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bug, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Database,
  ArrowRight,
  RefreshCw,
  Trash2,
  Copy,
  Download
} from "lucide-react";

/**
 * EVENT FLOW DEBUGGER
 * Deep analysis tool for guided event creation process
 * Checks: data flow, storage, validation, compatibility
 */
export default function EventFlowDebugger({ onClose }) {
  const [debugData, setDebugData] = useState({
    step1_categories: null,
    step2_eventDetails: null,
    step3_enablerSelection: null,
    step4_reviewData: null,
    storageAnalysis: null,
    issues: [],
    warnings: [],
    recommendations: []
  });

  useEffect(() => {
    runDeepAnalysis();
  }, []);

  const runDeepAnalysis = () => {
    console.log("🔍 STARTING DEEP DEBUGGING ANALYSIS");
    
    const issues = [];
    const warnings = [];
    const recommendations = [];

    // ============================================================================
    // STEP 1: Analyze Category Selection Storage
    // ============================================================================
    console.log("📋 STEP 1: Analyzing category selection...");
    
    const step1Data = {
      localStorage: localStorage.getItem('guidedEventCategories'),
      sessionStorage: sessionStorage.getItem('guidedEventCategories'),
      urlParams: new URLSearchParams(window.location.search).get('categories'),
      blinkReview: sessionStorage.getItem('blink_review_data')
    };

    if (!step1Data.localStorage && !step1Data.sessionStorage) {
      issues.push({
        severity: "CRITICAL",
        step: "1",
        issue: "No category data in storage",
        impact: "User cannot proceed past Step 1",
        fix: "Ensure saveCategories() writes to BOTH localStorage and sessionStorage"
      });
    }

    if (step1Data.localStorage) {
      try {
        const parsed = JSON.parse(step1Data.localStorage);
        if (!parsed.categories || !Array.isArray(parsed.categories)) {
          issues.push({
            severity: "ERROR",
            step: "1",
            issue: "Invalid categories data structure",
            impact: "Categories not properly formatted",
            fix: "Ensure data is saved as {categories: [...], venue_status: '...'}"
          });
        } else if (parsed.categories.length === 0) {
          warnings.push({
            severity: "WARNING",
            step: "1",
            issue: "Empty categories array",
            impact: "User selected no categories"
          });
        }
      } catch (e) {
        issues.push({
          severity: "CRITICAL",
          step: "1",
          issue: "Cannot parse category data: " + e.message,
          impact: "Data corruption detected",
          fix: "Clear storage and restart flow"
        });
      }
    }

    // ============================================================================
    // STEP 2: Analyze Event Details Collection
    // ============================================================================
    console.log("📝 STEP 2: Analyzing event details collection...");
    
    const step2Keys = [
      'guidedEventCategories',
      'event_flow_active',
      'event_flow_stage'
    ];

    const step2Data = {};
    step2Keys.forEach(key => {
      step2Data[key] = {
        localStorage: localStorage.getItem(key),
        sessionStorage: sessionStorage.getItem(key)
      };
    });

    // Check if event details are properly enriched
    if (step1Data.localStorage) {
      try {
        const eventData = JSON.parse(step1Data.localStorage);
        
        // Required fields for event creation
        const requiredFields = [
          'event_name',
          'event_date',
          'location',
          'guest_min',
          'budget_max',
          'categories'
        ];

        const missingFields = requiredFields.filter(field => !eventData[field]);
        
        if (missingFields.length > 0) {
          warnings.push({
            severity: "WARNING",
            step: "2",
            issue: `Missing fields: ${missingFields.join(', ')}`,
            impact: "Event may fail to create",
            fix: "Ensure EventDetailsCollection saves all required fields"
          });
        }

        // Validate venue_status
        if (!eventData.venue_status || !['with_venue', 'without_venue', 'pending_venue'].includes(eventData.venue_status)) {
          issues.push({
            severity: "ERROR",
            step: "2",
            issue: "Invalid or missing venue_status",
            impact: "Enabler compatibility checks will fail",
            fix: "Set venue_status based on selected categories"
          });
        }

      } catch (e) {
        // Already handled above
      }
    }

    // ============================================================================
    // STEP 3: Analyze Enabler Selection
    // ============================================================================
    console.log("👥 STEP 3: Analyzing enabler selection...");
    
    const step3Data = {
      pendingBooking: sessionStorage.getItem('pendingEventBooking'),
      blinkReview: sessionStorage.getItem('blink_review_data'),
      localBackup: localStorage.getItem('pendingEventBooking')
    };

    if (!step3Data.pendingBooking && !step3Data.blinkReview) {
      issues.push({
        severity: "CRITICAL",
        step: "3",
        issue: "No enabler selection data in session",
        impact: "Review page will show 'No session data found'",
        fix: "GuidedEnablerSelection must save to sessionStorage before navigation"
      });
    }

    if (step3Data.pendingBooking) {
      try {
        const bookingData = JSON.parse(step3Data.pendingBooking);
        
        if (!bookingData.enablers || bookingData.enablers.length === 0) {
          issues.push({
            severity: "ERROR",
            step: "3",
            issue: "No enablers in booking data",
            impact: "Review page will be empty",
            fix: "Ensure selectedEnablers are properly saved"
          });
        }

        if (!bookingData.eventDetails && !bookingData.variation) {
          issues.push({
            severity: "ERROR",
            step: "3",
            issue: "Missing event details in booking data",
            impact: "Cannot create event",
            fix: "Include full eventDetails in bookingData"
          });
        }

        // Check enabler data structure
        if (bookingData.enablers && bookingData.enablers.length > 0) {
          bookingData.enablers.forEach((enabler, idx) => {
            if (!enabler.id && !enabler.enabler_id) {
              issues.push({
                severity: "ERROR",
                step: "3",
                issue: `Enabler ${idx} missing ID`,
                impact: "Cannot identify enabler",
                fix: "Ensure enabler.id is included"
              });
            }

            if (!enabler.business_name) {
              warnings.push({
                severity: "WARNING",
                step: "3",
                issue: `Enabler ${idx} missing business_name`,
                impact: "Display issues in review"
              });
            }

            if (enabler.suggested_price === undefined || enabler.suggested_price === null) {
              warnings.push({
                severity: "WARNING",
                step: "3",
                issue: `Enabler ${idx} missing suggested_price`,
                impact: "Total cost calculation will fail"
              });
            }
          });
        }

      } catch (e) {
        issues.push({
          severity: "CRITICAL",
          step: "3",
          issue: "Cannot parse booking data: " + e.message,
          impact: "Data corruption in enabler selection",
          fix: "Clear sessionStorage and restart"
        });
      }
    }

    // ============================================================================
    // STEP 4: Analyze Review/Booking Page
    // ============================================================================
    console.log("✅ STEP 4: Analyzing review/booking page...");
    
    const flowMarkers = {
      flowActive: sessionStorage.getItem('event_flow_active'),
      flowStage: sessionStorage.getItem('event_flow_stage')
    };

    if (flowMarkers.flowActive !== 'true') {
      warnings.push({
        severity: "WARNING",
        step: "4",
        issue: "event_flow_active not set",
        impact: "Flow state tracking broken",
        fix: "Set event_flow_active=true when entering flow"
      });
    }

    // ============================================================================
    // CROSS-STEP DATA CONSISTENCY
    // ============================================================================
    console.log("🔄 Analyzing cross-step data consistency...");
    
    if (step1Data.localStorage && step3Data.pendingBooking) {
      try {
        const step1 = JSON.parse(step1Data.localStorage);
        const step3 = JSON.parse(step3Data.pendingBooking);
        
        // Check if categories match
        const step1Categories = step1.categories || [];
        const step3Categories = step3.eventDetails?.categories || step3.eventDetails?.selected_categories || [];
        
        if (JSON.stringify(step1Categories.sort()) !== JSON.stringify(step3Categories.sort())) {
          warnings.push({
            severity: "WARNING",
            step: "Cross-step",
            issue: "Categories mismatch between Step 1 and Step 3",
            impact: "Data inconsistency",
            fix: "Ensure categories are preserved through all steps"
          });
        }

        // Check if venue_status is consistent
        if (step1.venue_status !== step3.eventDetails?.venue_status) {
          warnings.push({
            severity: "WARNING",
            step: "Cross-step",
            issue: "venue_status mismatch",
            impact: "Compatibility checks may be wrong",
            fix: "Preserve venue_status through flow"
          });
        }

      } catch (e) {
        // Parsing errors already caught above
      }
    }

    // ============================================================================
    // STORAGE ANALYSIS
    // ============================================================================
    const storageAnalysis = {
      localStorage: {
        size: JSON.stringify(localStorage).length,
        keys: Object.keys(localStorage),
        quotaUsed: (JSON.stringify(localStorage).length / (5 * 1024 * 1024) * 100).toFixed(2) + '%'
      },
      sessionStorage: {
        size: JSON.stringify(sessionStorage).length,
        keys: Object.keys(sessionStorage),
        quotaUsed: (JSON.stringify(sessionStorage).length / (5 * 1024 * 1024) * 100).toFixed(2) + '%'
      }
    };

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================
    recommendations.push({
      priority: "HIGH",
      recommendation: "Implement checkpoints with validation at each step",
      benefit: "Catch data issues early before user proceeds"
    });

    recommendations.push({
      priority: "HIGH",
      recommendation: "Add data recovery mechanism if session is lost",
      benefit: "Better user experience, no data loss"
    });

    recommendations.push({
      priority: "MEDIUM",
      recommendation: "Add visual progress indicators with data status",
      benefit: "User knows data is being saved properly"
    });

    recommendations.push({
      priority: "MEDIUM",
      recommendation: "Implement auto-save at each step",
      benefit: "Prevent data loss from page refresh"
    });

    recommendations.push({
      priority: "LOW",
      recommendation: "Add debug mode toggle in UI for testing",
      benefit: "Easier debugging for developers"
    });

    // ============================================================================
    // SET RESULTS
    // ============================================================================
    setDebugData({
      step1_categories: step1Data,
      step2_eventDetails: step2Data,
      step3_enablerSelection: step3Data,
      step4_reviewData: flowMarkers,
      storageAnalysis,
      issues,
      warnings,
      recommendations
    });

    console.log("✅ DEBUGGING ANALYSIS COMPLETE");
    console.log("Issues:", issues);
    console.log("Warnings:", warnings);
    console.log("Recommendations:", recommendations);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: "bg-red-500 text-white",
      ERROR: "bg-orange-500 text-white",
      WARNING: "bg-yellow-500 text-gray-900",
      INFO: "bg-blue-500 text-white"
    };
    return colors[severity] || colors.INFO;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: "bg-red-500 text-white",
      MEDIUM: "bg-yellow-500 text-gray-900",
      LOW: "bg-blue-500 text-white"
    };
    return colors[priority] || colors.LOW;
  };

  const clearAllData = () => {
    if (!confirm("⚠️ This will clear ALL event flow data. Continue?")) return;

    const keysToRemove = [
      'guidedEventCategories',
      'pendingEventBooking',
      'blink_review_data',
      'event_flow_active',
      'event_flow_stage'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    alert("✅ All event flow data cleared");
    runDeepAnalysis();
  };

  const exportDebugReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      ...debugData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blink-debug-report-${Date.now()}.json`;
    a.click();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    alert("✅ Copied to clipboard");
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] overflow-y-auto p-4">
      <div className="max-w-6xl mx-auto my-8">
        <Card className="bg-gray-900 border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-b border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-red-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Event Flow Debugger</h2>
                  <p className="text-sm text-gray-400">Deep analysis of guided event creation</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={runDeepAnalysis}
                  variant="outline"
                  className="border-gray-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-analyze
                </Button>
                <Button
                  onClick={exportDebugReport}
                  variant="outline"
                  className="border-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={clearAllData}
                  variant="outline"
                  className="border-red-700 text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-gray-400"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Critical Issues</span>
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {debugData.issues.filter(i => i.severity === 'CRITICAL').length}
                </p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Errors</span>
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {debugData.issues.filter(i => i.severity === 'ERROR').length}
                </p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Warnings</span>
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {debugData.warnings.length}
                </p>
              </Card>

              <Card className="bg-gray-800 border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Storage Used</span>
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {debugData.storageAnalysis?.localStorage.quotaUsed || '0%'}
                </p>
              </Card>
            </div>

            {/* Issues List */}
            {debugData.issues.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  Issues Detected ({debugData.issues.length})
                </h3>
                <div className="space-y-2">
                  {debugData.issues.map((issue, idx) => (
                    <Card key={idx} className="bg-gray-800 border-red-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">Step {issue.step}</span>
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                            <span className="text-sm font-semibold text-white">{issue.issue}</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">Impact: {issue.impact}</p>
                          {issue.fix && (
                            <p className="text-xs text-emerald-400 font-mono">Fix: {issue.fix}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => copyToClipboard(issue)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings List */}
            {debugData.warnings.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Warnings ({debugData.warnings.length})
                </h3>
                <div className="space-y-2">
                  {debugData.warnings.map((warning, idx) => (
                    <Card key={idx} className="bg-gray-800 border-yellow-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-yellow-500 text-gray-900">
                          WARNING
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">Step {warning.step}</span>
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                            <span className="text-sm font-semibold text-white">{warning.issue}</span>
                          </div>
                          <p className="text-xs text-gray-400">Impact: {warning.impact}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {debugData.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Recommendations ({debugData.recommendations.length})
                </h3>
                <div className="space-y-2">
                  {debugData.recommendations.map((rec, idx) => (
                    <Card key={idx} className="bg-gray-800 border-emerald-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white mb-1">{rec.recommendation}</p>
                          <p className="text-xs text-gray-400">Benefit: {rec.benefit}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Storage Analysis */}
            {debugData.storageAnalysis && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  Storage Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">localStorage</h4>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-400">Size: {(debugData.storageAnalysis.localStorage.size / 1024).toFixed(2)} KB</p>
                      <p className="text-gray-400">Keys: {debugData.storageAnalysis.localStorage.keys.length}</p>
                      <p className="text-gray-400">Quota: {debugData.storageAnalysis.localStorage.quotaUsed}</p>
                    </div>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700 p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">sessionStorage</h4>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-400">Size: {(debugData.storageAnalysis.sessionStorage.size / 1024).toFixed(2)} KB</p>
                      <p className="text-gray-400">Keys: {debugData.storageAnalysis.sessionStorage.keys.length}</p>
                      <p className="text-gray-400">Quota: {debugData.storageAnalysis.sessionStorage.quotaUsed}</p>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Raw Data Inspection */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">Raw Data Inspection</h3>
              <Card className="bg-gray-800 border-gray-700 p-4">
                <pre className="text-xs text-gray-300 overflow-x-auto max-h-96">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}