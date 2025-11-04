import { base44 } from '@/api/base44Client';

class DeepLinkService {
  private static instance: DeepLinkService;
  private listeners: Set<(url: string) => void> = new Set();

  private constructor() {
    this.initialize();
  }

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  private initialize() {
    console.log('🔗 DeepLinkService: Initializing...');

    // Access Capacitor App plugin from window
    const CapacitorApp = (window as any).Capacitor?.Plugins?.App;
    
    if (!CapacitorApp) {
      console.error('❌ DeepLinkService: Capacitor App plugin not available');
      return;
    }

    // Listen for app URL open events (deep links)
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      console.log('🔗 DeepLinkService: Received deep link:', data.url);
      this.handleDeepLink(data.url);
    });

    // Check if app was opened with a URL
    this.checkInitialUrl();
  }

  private async checkInitialUrl() {
    try {
      const CapacitorApp = (window as any).Capacitor?.Plugins?.App;
      if (!CapacitorApp) return;
      
      const result = await CapacitorApp.getLaunchUrl();
      if (result?.url) {
        console.log('🔗 DeepLinkService: App launched with URL:', result.url);
        this.handleDeepLink(result.url);
      }
    } catch (error) {
      console.error('🔗 DeepLinkService: Error checking initial URL:', error);
    }
  }

  private handleDeepLink(url: string) {
    console.log('🔗 DeepLinkService: Processing URL:', url);

    try {
      const urlObj = new URL(url);
      console.log('🔗 DeepLinkService: URL parsed:', {
        protocol: urlObj.protocol,
        host: urlObj.host,
        pathname: urlObj.pathname,
        searchParams: Object.fromEntries(urlObj.searchParams)
      });

      // Handle auth callback: blinkapp://auth/callback?code=xxx
      if (urlObj.host === 'auth' && urlObj.pathname === '/callback') {
        this.handleAuthCallback(urlObj);
        return;
      }

      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(url);
        } catch (error) {
          console.error('🔗 DeepLinkService: Listener error:', error);
        }
      });

    } catch (error) {
      console.error('🔗 DeepLinkService: Error parsing URL:', error);
    }
  }

  private async handleAuthCallback(urlObj: URL) {
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');

    console.log('🔐 DeepLinkService: Auth callback received:', { code, state, error });

    if (error) {
      console.error('🔐 DeepLinkService: Auth error:', error);
      alert(`Authentication failed: ${error}`);
      return;
    }

    if (!code) {
      console.error('🔐 DeepLinkService: No auth code in callback');
      alert('Authentication failed: No code received');
      return;
    }

    try {
      console.log('🔐 DeepLinkService: Exchanging code for token...');
      
      // Exchange code for token using Base44 SDK
      await base44.auth.handleOAuthCallback(code, state || undefined);
      
      console.log('✅ DeepLinkService: Authentication successful!');
      
      // Redirect to app home
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ DeepLinkService: Authentication failed:', error);
      alert('Authentication failed. Please try again.');
    }
  }

  // Public API for custom deep link handling
  public addListener(listener: (url: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Manual deep link trigger (for testing)
  public triggerDeepLink(url: string) {
    console.log('🔗 DeepLinkService: Manual trigger:', url);
    this.handleDeepLink(url);
  }
}

// Export singleton instance
export const deepLinkService = DeepLinkService.getInstance();
