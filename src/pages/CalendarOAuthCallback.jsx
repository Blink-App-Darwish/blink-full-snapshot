import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";

export default function CalendarOAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Connecting your calendar...");

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        throw new Error(error);
      }

      if (!code) {
        throw new Error("No authorization code received");
      }

      // Get enabler ID from localStorage (stored before OAuth redirect)
      const enablerId = localStorage.getItem('calendar_oauth_enabler_id');

      // Call backend to exchange code for tokens
      const response = await fetch('/api/calendar/google/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          enabler_id: enablerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect calendar');
      }

      const result = await response.json();

      setStatus("success");
      setMessage("Calendar connected successfully!");

      // Clean up
      localStorage.removeItem('calendar_oauth_enabler_id');

      // Redirect back to calendar setup or calendar page
      setTimeout(() => {
        navigate(createPageUrl("EnablerCalendar"));
      }, 2000);

    } catch (error) {
      console.error("OAuth callback error:", error);
      setStatus("error");
      setMessage(error.message || "Failed to connect calendar. Please try again.");

      setTimeout(() => {
        navigate(createPageUrl("CalendarSetupWizard"));
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <BlinkLogo size="lg" className="mx-auto mb-8" />

        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
            <h2 className="text-2xl font-bold mb-2">Connecting Calendar</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2 text-green-900">Success!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2 text-red-900">Connection Failed</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting back...</p>
          </>
        )}
      </div>
    </div>
  );
}