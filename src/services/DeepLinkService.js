class DeepLinkService {
  constructor() {
    this.listeners = {};
    console.log('🔗 DeepLinkService: Initializing...');
  }

  initialize() {
    const Capacitor = window.Capacitor;

    if (!Capacitor || !Capacitor.isNativePlatform()) {
      console.log('🔗 DeepLinkService: Not native platform, skipping');
      return;
    }

    const CapacitorApp = Capacitor.Plugins?.App;

    if (!CapacitorApp) {
      console.error('🔗 DeepLinkService: App plugin not available');
      return;
    }

    // Add listener for deep links
    CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('🔗 DeepLinkService: Received deep link:', data.url);
      this.handleDeepLink(data.url);
    });

    // Check if app was launched with a URL
    CapacitorApp.getLaunchUrl().then((result) => {
      if (result && result.url) {
        console.log('🔗 DeepLinkService: Launched with URL:', result.url);
        this.handleDeepLink(result.url);
      }
    });
  }

  handleDeepLink(url) {
    try {
      console.log('🔗 DeepLinkService: Processing URL:', url);

      // Parse URL
      const urlObj = new URL(url);
      const host = urlObj.hostname || urlObj.host;
      const searchParams = {};
      urlObj.searchParams.forEach((value, key) => {
        searchParams[key] = value;
      });

      console.log('🔗 DeepLinkService: URL parsed:', {
        protocol: urlObj.protocol,
        host,
        pathname: urlObj.pathname,
        searchParams
      });

      // MOBILE MODE: Navigate by setting window location
      if (window.BLINK_MOBILE_MODE) {
        console.log('🔗 DeepLinkService: Mobile mode - redirecting to web app');

        // Map deep link paths to web app URLs
        const webUrl = this.mapDeepLinkToWebUrl(host, searchParams);

        console.log('🔗 DeepLinkService: Redirecting to:', webUrl);

        // Store auth token if present
        if (searchParams.token) {
          localStorage.setItem('auth_token', searchParams.token);
          console.log('🔗 DeepLinkService: Stored auth token');
        }
        
        // Redirect to web app with deep link data
        window.location.href = webUrl;
        return;
      }

      // DESKTOP MODE: Use React Router (existing logic)
      // Notify all listeners
      Object.values(this.listeners).forEach(callback => {
        try {
          callback({ url, host, searchParams });
        } catch (error) {
          console.error('🔗 DeepLinkService: Listener error:', error);
        }
      });

    } catch (error) {
      console.error('🔗 DeepLinkService: Error handling deep link:', error);
    }
  }

  mapDeepLinkToWebUrl(host, params) {
    // Base web app URL
    const baseUrl = 'https://blink-app.base44.app';

    // Map deep link routes to web app routes
    const routeMap = {
      'browse': '/browse',
      'enablerprofile': `/enabler-profile?id=${params.id || ''}`,
      'event': `/event-detail?id=${params.id || ''}`,
      'home': '/home',
      'profile': '/profile',
      'mybookings': '/my-events',
      'enablerdashboard': '/enabler-dashboard'
    };

    const webPath = routeMap[host.toLowerCase()] || '/home';

    // Add auth token if present
    const url = new URL(webPath, baseUrl);
    if (params.token) {
      url.searchParams.set('token', params.token);
    }

    return url.toString();
  }

  addListener(id, callback) {
    this.listeners[id] = callback;
    console.log(`🔗 DeepLinkService: Added listener: ${id}`);
  }

  removeListener(id) {
    delete this.listeners[id];
    console.log(`🔗 DeepLinkService: Removed listener: ${id}`);
  }
}

export const deepLinkService = new DeepLinkService();
