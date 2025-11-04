// Create new file: src/utils/auth.ts
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

export const isMobileApp = () => Capacitor.isNativePlatform();

export const initializeAuth = async () => {
  try {
    // Try to get current user
    const user = await base44.auth.me();
    return { authenticated: true, user };
  } catch (error) {
    // Not authenticated - different handling for mobile vs web
    if (isMobileApp()) {
      return { authenticated: false, requiresInAppAuth: true };
    } else {
      return { authenticated: false, redirectToLogin: true };
    }
  }
};

export const loginMobile = async (email: string, password: string) => {
  // Use Base44's programmatic login (not OAuth redirect)
  try {
    const response = await base44.auth.login({ email, password });
    return { success: true, user: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
