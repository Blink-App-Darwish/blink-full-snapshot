// Base44 Client - Auto switches between real and mock based on environment
import { Capacitor } from '@capacitor/core';

const isLocalDev = import.meta.env.VITE_LOCAL_DEV === 'true';
const isMobile = Capacitor.isNativePlatform();

let base44Client;

if (isLocalDev) {
  console.log('🔧 LOCAL DEV MODE - Using mock Base44 client');
  const mockModule = await import('./mockBase44Client.js');
  base44Client = mockModule.base44;
} else {
  console.log('☁️ PRODUCTION MODE - Using real Base44 client');
  const { createClient } = await import('@base44/sdk');
  base44Client = createClient({
    appId: "68debc13e09ac863690db587", 
    requiresAuth: true,
    // Mobile-specific config
    redirectUrl: isMobile ? 'com.blink.app://callback' : undefined,
    useBrowserAuth: !isMobile // Only use browser auth on web
  });
}

export const base44 = base44Client;
