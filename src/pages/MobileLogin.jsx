import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BlinkLogo from '../components/BlinkLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

// ============================================
// 🔥 FIREBASE IMPORT SECTION - ADD THIS
// ============================================
let FirebaseAuthService = null;
let firebaseAvailable = false;

try {
  FirebaseAuthService = require('../components/FirebaseAuthService');
  firebaseAvailable = FirebaseAuthService.isFirebaseAvailable();
  console.log('📱 Firebase available:', firebaseAvailable);
} catch (error) {
  console.warn('⚠️ Firebase service not available:', error.message);
  firebaseAvailable = false;
}
// ============================================

export default function MobileLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(null);

  // ============================================
  // 🔥 CHECK FOR OAUTH REDIRECT - ADD THIS
  // ============================================
  useEffect(() => {
    if (firebaseAvailable && FirebaseAuthService) {
      checkOAuthRedirect();
    }
  }, []);

  const checkOAuthRedirect = async () => {
    try {
      const result = await FirebaseAuthService.handleOAuthRedirect();
      if (result) {
        console.log('✅ OAuth redirect handled:', result);

        if (result.needsBase44Setup) {
          alert(
            `Welcome! Please complete your registration.\n\nEmail: ${result.user.email}`
          );
          navigate(createPageUrl('RoleSelection'));
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('❌ OAuth redirect error:', error);
      setError(error.message);
    }
  };
  // ============================================

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting email/password login...');

      const result = await base44.auth.login(email, password);

      console.log('✅ Login successful:', result);

      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user_id', result.user.id);
      localStorage.setItem('user_email', result.user.email);

      console.log('💾 Credentials stored');

      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error('❌ Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  // ============================================
  // 🔥 GOOGLE SIGN-IN HANDLER - ADD THIS
  // ============================================
  const handleGoogleLogin = async () => {
    if (!firebaseAvailable || !FirebaseAuthService) {
      setError(
        'Google Sign-In is temporarily unavailable. Please use email/password login.'
      );
      return;
    }

    setOauthLoading('google');
    setError('');

    try {
      console.log('🔵 Initiating Google sign-in...');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const result = await FirebaseAuthService.signInWithGoogle(isMobile);

      if (result.pending) {
        console.log('🔄 Redirecting to Google...');
        return;
      }

      console.log('✅ Google sign-in successful:', result);

      if (result.needsBase44Setup) {
        alert(
          `Welcome! Your Google account has been linked.\n\nEmail: ${result.user.email}\n\nPlease complete your Blink profile setup.`
        );
        navigate(createPageUrl('RoleSelection'));
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      setError(error.message);
      setOauthLoading(null);
    }
  };
  // ============================================

  // ============================================
  // 🔥 APPLE SIGN-IN HANDLER - ADD THIS
  // ============================================
  const handleAppleLogin = async () => {
    if (!firebaseAvailable || !FirebaseAuthService) {
      setError(
        'Apple Sign-In is temporarily unavailable. Please use email/password login.'
      );
      return;
    }

    setOauthLoading('apple');
    setError('');

    try {
      console.log('🍎 Initiating Apple sign-in...');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const result = await FirebaseAuthService.signInWithApple(isMobile);

      if (result.pending) {
        console.log('🔄 Redirecting to Apple...');
        return;
      }

      console.log('✅ Apple sign-in successful:', result);

      if (result.needsBase44Setup) {
        alert(
          `Welcome! Your Apple ID has been linked.\n\nEmail: ${result.user.email}\n\nPlease complete your Blink profile setup.`
        );
        navigate(createPageUrl('RoleSelection'));
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Apple sign-in failed:', error);
      setError(error.message);
      setOauthLoading(null);
    }
  };
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white">
        <div className="text-center mb-8">
          <BlinkLogo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            Welcome to Blink
          </h1>
          <p className="text-gray-600 text-sm">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading || oauthLoading}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading || oauthLoading}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || oauthLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white h-12 text-base font-semibold rounded-xl shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing in...
              </span>
            ) : (
              'Sign In with Email'
            )}
          </Button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              or continue with
            </span>
          </div>
        </div>

        {/* ============================================ */}
        {/* 🔥 OAUTH BUTTONS SECTION - ADD THIS */}
        {/* ============================================ */}
        <div className="space-y-3">
          {firebaseAvailable ? (
            <>
              {/* GOOGLE BUTTON */}
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || oauthLoading}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 transition-all"
              >
                {oauthLoading === 'google' ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">🔵</span>
                    <span className="font-medium">Continue with Google</span>
                  </span>
                )}
              </Button>

              {/* APPLE BUTTON */}
              <Button
                type="button"
                onClick={handleAppleLogin}
                disabled={isLoading || oauthLoading}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 transition-all"
              >
                {oauthLoading === 'apple' ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">🍎</span>
                    <span className="font-medium">Continue with Apple</span>
                  </span>
                )}
              </Button>
            </>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 text-center">
                ⚠️ OAuth providers temporarily unavailable.
                <br />
                Please use email/password login.
              </p>
            </div>
          )}
        </div>
        {/* ============================================ */}

        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-xs text-gray-400">
            Powered by Base44{firebaseAvailable ? ' & Firebase' : ''} • v3.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
