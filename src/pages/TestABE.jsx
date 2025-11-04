
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import BookingConfirmationHandler from "../components/BookingConfirmationHandler";
import ABE from "../components/ABEEngine";

export default function TestABE() {
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTestConfirmation = async () => {
    if (!bookingId.trim()) {
      setError("Please enter a booking ID");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log("🧪 Testing ABE with booking:", bookingId);
      
      const confirmResult = await BookingConfirmationHandler.confirmBooking(bookingId);
      
      setResult(confirmResult);
      console.log("✅ Test complete:", confirmResult);

    } catch (err) {
      console.error("❌ Test failed:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectABEExecution = async () => {
    if (!bookingId.trim()) {
      setError("Please enter a booking ID");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log("🚀 Direct ABE execution for booking:", bookingId);
      
      const abeResult = await ABE.execute(bookingId);
      
      setResult({ abe_result: abeResult, direct_execution: true });
      console.log("✅ Direct ABE execution complete:", abeResult);

    } catch (err) {
      console.error("❌ Direct ABE execution failed:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const createTestBooking = () => {
    navigate(createPageUrl("CreateEvent"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ABE Engine Test Console</h1>
              <p className="text-sm text-gray-400">Test After Booking Engine execution</p>
            </div>
          </div>
        </div>

        {/* Test Form */}
        <Card className="bg-gray-800 border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Booking ID</Label>
              <Input
                placeholder="Enter booking ID to test..."
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white"
                disabled={isProcessing}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleTestConfirmation}
                disabled={isProcessing || !bookingId.trim()}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Full Confirmation Flow
                  </>
                )}
              </Button>

              <Button
                onClick={handleDirectABEExecution}
                disabled={isProcessing || !bookingId.trim()}
                variant="outline"
                className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Direct ABE Only
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={createTestBooking}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Or create a new test booking
            </Button>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-900/20 border-red-500 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-300 text-sm ml-2">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <Card className="bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border-emerald-500/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">
                {result.direct_execution ? "Direct ABE Execution Complete" : "Booking Confirmed Successfully"}
              </h3>
            </div>

            {result.abe_result && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Execution Status</p>
                  <p className="text-sm text-white font-medium">{result.abe_result.status}</p>
                </div>

                {result.abe_result.steps && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Execution Steps:</p>
                    {result.abe_result.steps.map((step, idx) => (
                      <div key={idx} className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {step.status === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-sm text-white">{step.step}</span>
                        </div>
                        <Badge className={`text-[10px] ${
                          step.status === "success" 
                            ? "bg-emerald-500/20 text-emerald-300" 
                            : "bg-red-500/20 text-red-300"
                        }`}>
                          {step.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-[10px] text-gray-500 mb-1">Full Response:</p>
                  <pre className="text-[10px] text-gray-400 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-800/50 border-gray-700 p-6 mt-6">
          <h3 className="text-sm font-semibold text-white mb-3">How to Test:</h3>
          <ol className="text-xs text-gray-400 space-y-2">
            <li className="flex gap-2">
              <span className="text-emerald-400">1.</span>
              <span>Create a booking through the normal flow (or use existing booking ID)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">2.</span>
              <span>Enter the booking ID above</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">3.</span>
              <span>Choose "Full Confirmation Flow" to test the complete process</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">4.</span>
              <span>Or choose "Direct ABE Only" to test just the engine execution</span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
