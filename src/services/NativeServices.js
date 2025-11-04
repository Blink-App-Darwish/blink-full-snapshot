export const initializeNativeServices = () => {
  console.log('🔗 NativeServices: Initializing...');
  
  const Capacitor = window.Capacitor;
  
  if (!Capacitor) {
    console.log('🌐 Web mode - Capacitor not available');
    return false;
  }
  
  const isNative = Capacitor.isNativePlatform();
  console.log('🔗 Platform check:', { isNative });
  
  console.log('🔍 DEBUG: Capacitor object keys:', Object.keys(Capacitor));
  console.log('🔍 DEBUG: Capacitor.Plugins keys:', Capacitor.Plugins ? Object.keys(Capacitor.Plugins) : 'Plugins not available');
  console.log('🔍 DEBUG: Full Capacitor.Plugins:', Capacitor.Plugins);
  
  if (!isNative) {
    console.log('🌐 Web platform - native services not needed');
    return false;
  }
  
  console.log('🔗 Native platform - setting up services...');
  
  try {
    const CapacitorApp = Capacitor.Plugins?.App || window.CapacitorApp || window.App;
    
    console.log('🔍 DEBUG: CapacitorApp type:', typeof CapacitorApp);
    console.log('🔍 DEBUG: CapacitorApp value:', CapacitorApp);
    
    if (!CapacitorApp) {
      console.error('❌ CapacitorApp plugin not available');
      console.error('❌ Available plugins:', Capacitor.Plugins ? Object.keys(Capacitor.Plugins) : 'none');
      return false;
    }
    
    console.log('✅ Capacitor App available');
    console.log('✅ addListener type:', typeof CapacitorApp.addListener);
    
    // Add manual test listener
    console.log('✅ Adding manual test listener...');
    CapacitorApp.addListener('appUrlOpen', (data) => {
      console.log('🎯 MANUAL LISTENER TRIGGERED!');
      console.log('🎯 URL:', data.url);
      console.log('🎯 Full data:', JSON.stringify(data, null, 2));
    });
    console.log('✅ Manual listener added');
    
    // Import and initialize DeepLinkService
    console.log('✅ Importing DeepLinkService...');
    import('./DeepLinkService').then(({ deepLinkService }) => {
      console.log('✅ DeepLinkService imported:', deepLinkService);
      
      // CRITICAL: Call initialize() to set up the listener!
      console.log('✅ Calling deepLinkService.initialize()...');
      deepLinkService.initialize();
      
      console.log('✅ All deep link handlers initialized');
    }).catch((error) => {
      console.error('❌ Error importing DeepLinkService:', error);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing native services:', error);
    console.error('❌ Error stack:', error?.stack);
    return false;
  }
};
