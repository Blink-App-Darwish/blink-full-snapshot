import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, AlertCircle, RefreshCw, Download } from "lucide-react";
import AIEventNamingService from "../components/AIEventNamingService";
import { Event } from "@/api/entities";

export default function EventNamingTest() {
  const [testResults, setTestResults] = useState([]);
  const [isTestingRunning] = useState(false);
  const [singleTestData, setSingleTestData] = useState({
    hostNickname: "Sarah",
    type: "wedding",
    location: "Dubai",
    theme: "Luxury Desert",
    selectedCategories: ["venue", "catering", "photographer"]
  });
  const [singleTestResult, setSingleTestResult] = useState(null);
  const [batchSize, setBatchSize] = useState(10);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unique: 0,
    collisions: 0,
    duplicates: 0
  });

  /**
   * Test single event name generation
   */
  const testSingleGeneration = async () => {
    try {
      console.log("🧪 Testing single name generation...");
      setSingleTestResult({ loading: true });

      const result = await AIEventNamingService.generateCompleteEventIdentity(singleTestData);

      setSingleTestResult({
        success: true,
        ...result,
        isValid: AIEventNamingService.validateUID(result.event_uid),
        parsed: AIEventNamingService.parseUID(result.event_uid)
      });

    } catch (error) {
      console.error("❌ Single test failed:", error);
      setSingleTestResult({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Test batch generation (simulate multiple events)
   */
  const testBatchGeneration = async () => {
    setIsBatchTesting(true);
    setTestResults([]);
    
    const results = [];
    const uids = new Set();
    let collisionCount = 0;

    const testCases = [
      { hostNickname: "Sarah", type: "wedding", location: "Dubai", theme: "Luxury Desert" },
      { hostNickname: "Mike", type: "corporate", location: "New York", theme: "Tech Summit" },
      { hostNickname: "Emma", type: "birthday", location: "Miami", theme: "Beach Party" },
      { hostNickname: "Alex", type: "conference", location: "London", theme: "Innovation" },
      { hostNickname: "Lisa", type: "dinner", location: "Paris", theme: "Fine Dining" },
      { hostNickname: "John", type: "wedding", location: "Bali", theme: "Tropical Paradise" },
      { hostNickname: "Kate", type: "baby_shower", location: "LA", theme: "Sweet Dreams" },
      { hostNickname: "Tom", type: "product_launch", location: "SF", theme: "Tech Launch" },
      { hostNickname: "Nina", type: "wedding", location: "Dubai", theme: "Royal Elegance" },
      { hostNickname: "Sam", type: "birthday", location: "Vegas", theme: "Casino Night" }
    ];

    for (let i = 0; i < batchSize; i++) {
      try {
        const testData = testCases[i % testCases.length];
        
        const result = await AIEventNamingService.generateCompleteEventIdentity({
          ...testData,
          selectedCategories: ["venue", "catering", "photographer"]
        });

        const isUnique = !uids.has(result.event_uid);
        if (!isUnique) {
          collisionCount++;
        }
        uids.add(result.event_uid);

        results.push({
          id: i + 1,
          ...result,
          isUnique,
          isValid: AIEventNamingService.validateUID(result.event_uid)
        });

        setTestResults([...results]);

      } catch (error) {
        console.error(`Test ${i + 1} failed:`, error);
        results.push({
          id: i + 1,
          error: error.message,
          isValid: false,
          isUnique: false
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setStats({
      total: results.length,
      unique: uids.size,
      collisions: collisionCount,
      duplicates: results.length - uids.size
    });

    setIsBatchTesting(false);
  };

  /**
   * Test UID format validation
   */
  const testUIDValidation = () => {
    const testUIDs = [
      { uid: "BLK-1512-WED-GOLD-0001", shouldPass: true },
      { uid: "BLK-0101-COR-SUMM-0042", shouldPass: true },
      { uid: "INVALID-1212-WED-TEST-0001", shouldPass: false },
      { uid: "BLK-1312-WE-GOLD-0001", shouldPass: false },
      { uid: "BLK-1312-WED-GO-0001", shouldPass: false }
    ];

    const validationResults = testUIDs.map(test => ({
      ...test,
      result: AIEventNamingService.validateUID(test.uid),
      passed: AIEventNamingService.validateUID(test.uid) === test.shouldPass
    }));

    console.log("UID Validation Tests:", validationResults);
    alert(`Validation Tests: ${validationResults.filter(r => r.passed).length}/${validationResults.length} passed`);
  };

  /**
   * Export test results as JSON
   */
  const exportResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `event-naming-test-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Event Naming Test Suite</h1>
          </div>
          <p className="text-gray-600">Test and validate the AI event naming and unique ID generation system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Test */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Single Event Test</h2>
            
            <div className="space-y-4 mb-4">
              <div>
                <Label>Host Nickname</Label>
                <Input
                  value={singleTestData.hostNickname}
                  onChange={(e) => setSingleTestData({...singleTestData, hostNickname: e.target.value})}
                />
              </div>
              <div>
                <Label>Event Type</Label>
                <select
                  value={singleTestData.type}
                  onChange={(e) => setSingleTestData({...singleTestData, type: e.target.value})}
                  className="w-full border rounded-md p-2"
                >
                  <option value="wedding">Wedding</option>
                  <option value="birthday">Birthday</option>
                  <option value="corporate">Corporate</option>
                  <option value="conference">Conference</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={singleTestData.location}
                  onChange={(e) => setSingleTestData({...singleTestData, location: e.target.value})}
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Input
                  value={singleTestData.theme}
                  onChange={(e) => setSingleTestData({...singleTestData, theme: e.target.value})}
                />
              </div>
            </div>

            <Button
              onClick={testSingleGeneration}
              disabled={singleTestResult?.loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Name & UID
            </Button>

            {/* Single Test Result */}
            {singleTestResult && !singleTestResult.loading && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {singleTestResult.success ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-900">Generation Successful</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Display Name:</span>
                        <p className="text-gray-900 font-semibold mt-1">{singleTestResult.display_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Unique ID:</span>
                        <code className="block mt-1 p-2 bg-white rounded text-xs font-mono">
                          {singleTestResult.event_uid}
                        </code>
                        <Badge className={`mt-1 ${singleTestResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {singleTestResult.isValid ? 'Valid Format' : 'Invalid Format'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">AI Keywords:</span>
                        <div className="flex gap-2 mt-1">
                          {singleTestResult.ai_keywords?.map((kw, i) => (
                            <Badge key={i} variant="outline">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                      {singleTestResult.parsed && (
                        <div>
                          <span className="font-medium text-gray-700">UID Breakdown:</span>
                          <div className="mt-1 text-xs text-gray-600 space-y-1">
                            <p>Date: Day {singleTestResult.parsed.day}, Month {singleTestResult.parsed.month}</p>
                            <p>Category: {singleTestResult.parsed.categoryCode}</p>
                            <p>Keyword: {singleTestResult.parsed.keyword}</p>
                            <p>Sequential: #{singleTestResult.parsed.sequential}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="w-5 h-5" />
                    <span>Error: {singleTestResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Batch Test */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Batch Test</h2>
            
            <div className="mb-4">
              <Label>Number of Events to Generate</Label>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                onClick={testBatchGeneration}
                disabled={isBatchTesting}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              >
                {isBatchTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Batch Test
                  </>
                )}
              </Button>
              <Button
                onClick={testUIDValidation}
                variant="outline"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Test Validation
              </Button>
            </div>

            {/* Stats */}
            {stats.total > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Test Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Generated:</span>
                    <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Unique UIDs:</span>
                    <p className="text-xl font-bold text-green-600">{stats.unique}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Collisions:</span>
                    <p className="text-xl font-bold text-amber-600">{stats.collisions}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duplicates:</span>
                    <p className="text-xl font-bold text-red-600">{stats.duplicates}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-600">Success Rate:</span>
                  <p className="text-lg font-bold text-emerald-600">
                    {((stats.unique / stats.total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {testResults.length > 0 && (
              <Button
                onClick={exportResults}
                variant="outline"
                className="w-full mb-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            )}
          </Card>
        </div>

        {/* Batch Results Table */}
        {testResults.length > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Batch Test Results</h2>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Display Name</th>
                    <th className="px-4 py-2 text-left">Event UID</th>
                    <th className="px-4 py-2 text-left">Valid</th>
                    <th className="px-4 py-2 text-left">Unique</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result) => (
                    <tr key={result.id} className="border-t border-gray-100">
                      <td className="px-4 py-2">{result.id}</td>
                      <td className="px-4 py-2 font-medium">{result.display_name || 'Error'}</td>
                      <td className="px-4 py-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {result.event_uid || result.error}
                        </code>
                      </td>
                      <td className="px-4 py-2">
                        {result.isValid ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {result.isUnique ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}