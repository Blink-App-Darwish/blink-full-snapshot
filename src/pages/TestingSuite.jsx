import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Play, Trash2 } from "lucide-react";
import TestUtils from "../components/TestUtils";
import RetryService from "../components/RetryService";
import CircuitBreaker from "../components/CircuitBreaker";
import SecurityValidator from "../components/SecurityValidator";

export default function TestingSuite() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results = [];

    // Test 1: Data Seeding
    results.push(await runTest("Data Seeding", async () => {
      const data = await TestUtils.seedTestData();
      return data.users.length > 0 && data.events.length > 0;
    }));

    // Test 2: Retry Service
    results.push(await runTest("Retry Logic", async () => {
      let attempts = 0;
      const result = await RetryService.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) throw new Error("Simulated failure");
        return "success";
      }, { maxRetries: 3 });
      return result.success && attempts === 2;
    }));

    // Test 3: Circuit Breaker
    results.push(await runTest("Circuit Breaker", async () => {
      // Trigger failures
      for (let i = 0; i < 5; i++) {
        try {
          await CircuitBreaker.execute("test-service", async () => {
            throw new Error("Service down");
          });
        } catch (e) {}
      }
      const status = CircuitBreaker.getStatus("test-service");
      return status.state === "OPEN";
    }));

    // Test 4: Input Validation
    results.push(await runTest("Input Validation", async () => {
      const emailTest = SecurityValidator.validateEmail("test@example.com");
      const phoneTest = SecurityValidator.validatePhone("+1234567890");
      const numberTest = SecurityValidator.validateNumber(100, { min: 0, max: 1000 });
      return emailTest.valid && phoneTest.valid && numberTest.valid;
    }));

    // Test 5: Transaction Rollback
    results.push(await runTest("Transaction Rollback", async () => {
      // Simulate transaction that should rollback
      const { default: TransactionManager } = await import("../components/TransactionManager");
      let rolledBack = false;
      
      const result = await TransactionManager.executeTransaction("test-tx", [
        {
          name: "Step 1",
          execute: async () => ({ id: "test1" }),
          rollback: async () => { rolledBack = true; }
        },
        {
          name: "Step 2 (Fails)",
          execute: async () => { throw new Error("Forced failure"); },
          rollback: async () => {}
        }
      ]);
      
      return !result.success && rolledBack;
    }));

    setTestResults(results);
    setIsRunning(false);
  };

  const runTest = async (name, testFn) => {
    const startTime = Date.now();
    try {
      const passed = await testFn();
      return {
        name,
        status: passed ? "passed" : "failed",
        duration: Date.now() - startTime,
        error: passed ? null : "Test assertion failed"
      };
    } catch (error) {
      return {
        name,
        status: "failed",
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  };

  const cleanData = async () => {
    await TestUtils.cleanTestData();
    alert("Test data cleaned!");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Testing Suite</h1>
        <p className="text-gray-600">Run automated tests and seed test data</p>
      </div>

      <div className="flex gap-3 mb-6">
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Play className="w-4 h-4 mr-2" />
          Run All Tests
        </Button>
        <Button
          onClick={cleanData}
          variant="outline"
          className="border-red-500 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clean Test Data
        </Button>
      </div>

      {isRunning && (
        <Card className="p-6 mb-6 text-center">
          <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Running tests...</p>
        </Card>
      )}

      {testResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Test Results</h2>
          {testResults.map((result, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {result.status === "passed" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium">{result.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{result.duration}ms</span>
                  <Badge className={result.status === "passed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {result.status}
                  </Badge>
                </div>
              </div>
              {result.error && (
                <p className="text-sm text-red-600 mt-2">{result.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}