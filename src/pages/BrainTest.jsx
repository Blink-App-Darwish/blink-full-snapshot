import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BrainTest() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🧪 ========================================');
    console.log('🧪 BRAIN TEST PAGE LOADED');
    console.log('🧪 This page is used to test Brain routing');
    console.log('🧪 ========================================');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <span className="text-4xl">🧪</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brain Test</h1>
        <p className="text-gray-600 mb-8">
          Testing Brain routing functionality
        </p>

        <div className="space-y-4">
          <button
            onClick={() => {
              console.log('🧪 Navigating to BrainOrientation');
              navigate(createPageUrl('BrainOrientation'));
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            Go to Brain Orientation
          </button>

          <button
            onClick={() => {
              console.log('🧪 Navigating to HostBrain');
              navigate(createPageUrl('HostBrain'));
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all"
          >
            Go to Host Brain
          </button>

          <button
            onClick={() => {
              console.log('🧪 Navigating to Home');
              navigate(createPageUrl('Home'));
            }}
            className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Back to Home
          </button>
        </div>

        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700 font-mono">
            ✅ Brain Test Route Active
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Check console for navigation logs
          </p>
        </div>
      </div>
    </div>
  );
}
