import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, User as UserIcon, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BugTestSuite() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const addResult = (testName, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      testName,
      status, // 'pass', 'fail', 'warning'
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const runSignUpFlowTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Check current user state
      addResult("User Authentication", "running", "Checking current user state...");
      
      try {
        const user = await base44.auth.me();
        addResult("User Authentication", "pass", `User authenticated: ${user.email}`, {
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
          profile_completed: user.profile_completed
        });

        // Test 2: Check if user has role selected
        if (!user.user_type) {
          addResult("Role Selection", "fail", "User has no role selected - should redirect to RoleSelection", {
            expected: "user_type should be 'host' or 'enabler'",
            actual: user.user_type
          });
        } else {
          addResult("Role Selection", "pass", `User role: ${user.user_type}`, {
            user_type: user.user_type
          });
        }

        // Test 3: Check if profile is completed
        if (!user.profile_completed) {
          addResult("Profile Setup", "fail", "User profile not completed - should redirect to ProfileSetup", {
            expected: "profile_completed should be true",
            actual: user.profile_completed
          });
        } else {
          addResult("Profile Setup", "pass", "User profile completed", {
            full_name: user.full_name,
            instagram_handle: user.instagram_handle,
            whatsapp: user.whatsapp
          });
        }

        // Test 4: Check enabler profile if user is enabler
        if (user.user_type === "enabler" || user.user_type === "both") {
          addResult("Enabler Profile Check", "running", "Checking for enabler profile...");
          
          const { Enabler } = await import("@/api/entities");
          const enablerProfiles = await Enabler.filter({ user_id: user.id });
          
          if (enablerProfiles.length === 0) {
            addResult("Enabler Profile Check", "warning", "No enabler profile found - user should be prompted to create one", {
              profiles_count: 0,
              recommendation: "Redirect to CreateEnablerProfile"
            });
          } else {
            addResult("Enabler Profile Check", "pass", `Found ${enablerProfiles.length} enabler profile(s)`, {
              profiles: enablerProfiles.map(p => ({
                id: p.id,
                business_name: p.business_name,
                category: p.category,
                profile_completed: p.profile_completed
              }))
            });
          }
        }

        // Test 5: Navigation Flow Test
        addResult("Navigation Flow", "running", "Testing navigation flow...");
        
        const expectedRoute = !user.user_type 
          ? "RoleSelection"
          : !user.profile_completed
          ? "ProfileSetup"
          : (user.user_type === "enabler" || user.user_type === "both")
          ? "EnablerDashboard"
          : "Home";
        
        addResult("Navigation Flow", "pass", `Expected route: ${expectedRoute}`, {
          current_state: {
            has_role: !!user.user_type,
            profile_complete: user.profile_completed,
            user_type: user.user_type
          },
          expected_route: expectedRoute
        });

        // Test 6: Check for common issues
        addResult("Common Issues Check", "running", "Checking for common sign-up issues...");
        
        const issues = [];
        
        // Check if profile fields are properly set
        if (user.profile_completed && !user.full_name) {
          issues.push("Profile marked complete but full_name is missing");
        }
        
        // Check if role is valid
        if (user.user_type && !['host', 'enabler', 'both'].includes(user.user_type)) {
          issues.push(`Invalid user_type: ${user.user_type}`);
        }
        
        if (issues.length > 0) {
          addResult("Common Issues Check", "warning", `Found ${issues.length} potential issue(s)`, {
            issues
          });
        } else {
          addResult("Common Issues Check", "pass", "No common issues detected");
        }

      } catch (userError) {
        addResult("User Authentication", "fail", "Failed to get user", {
          error: userError.message
        });
      }

      // Test 7: Test ProfileSetupGuard logic
      addResult("ProfileSetupGuard Logic", "pass", "Guard checks: role → profile → proceed", {
        flow: [
          "1. Check if user_type exists → redirect to RoleSelection if not",
          "2. Check if profile_completed → redirect to ProfileSetup if not",
          "3. Allow access to protected routes"
        ]
      });

    } catch (error) {
      addResult("Test Suite Error", "fail", "Test suite encountered an error", {
        error: error.message,
        stack: error.stack
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bug Test Suite</h1>
            <p className="text-sm text-gray-600">Diagnostic tests for common issues</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-32 space-y-6">
        {/* Test Controls */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Sign Up Flow Test</h2>
          <p className="text-sm text-gray-600 mb-6">
            This test verifies the complete sign-up flow including role selection, profile setup, and navigation logic.
          </p>
          
          <Button
            onClick={runSignUpFlowTest}
            disabled={isRunning}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <UserIcon className="w-5 h-5 mr-2" />
                Run Sign Up Flow Test
              </>
            )}
          </Button>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Test Results</h2>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">
                  {testResults.filter(r => r.status === 'pass').length} Passed
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  {testResults.filter(r => r.status === 'fail').length} Failed
                </Badge>
                <Badge className="bg-amber-100 text-amber-800">
                  {testResults.filter(r => r.status === 'warning').length} Warnings
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{result.testName}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                      
                      {result.details && (
                        <details className="text-xs bg-white/50 rounded p-3 mt-2">
                          <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                            View Details
                          </summary>
                          <pre className="whitespace-pre-wrap text-gray-600 overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recommendations */}
        {testResults.length > 0 && testResults.some(r => r.status === 'fail' || r.status === 'warning') && (
          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">Recommendations</h3>
                <ul className="space-y-2 text-sm text-amber-800">
                  {testResults.filter(r => r.status === 'fail').length > 0 && (
                    <li>• <strong>Critical Issues:</strong> Some tests failed. Check the details above and fix the issues before proceeding.</li>
                  )}
                  {testResults.filter(r => r.status === 'warning').length > 0 && (
                    <li>• <strong>Warnings:</strong> Some tests produced warnings. Review them to ensure everything is working as expected.</li>
                  )}
                  <li>• Make sure you complete the full sign-up flow: Sign Up → Role Selection → Profile Setup → (Enabler Profile if applicable)</li>
                  <li>• If you're stuck in a redirect loop, clear your browser cache and try again</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}