import React from "react";
import { MessageCircle } from "lucide-react";

export default function Messages() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center px-4">
        <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Messages Coming Soon</h2>
        <p className="text-gray-600">
          Chat with enablers will be available in a future update
        </p>
      </div>
    </div>
  );
}