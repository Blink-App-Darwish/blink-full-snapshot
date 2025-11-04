import { useEffect } from 'react';

/**
 * Injects external scripts into the document head
 * Used to load mobile-oauth.js globally
 */
export default function ScriptInjector() {
  useEffect(() => {
    console.log('🔧 ScriptInjector: Loading mobile-oauth.js...');

    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src="/mobile-oauth.js"]'
    );
    if (existingScript) {
      console.log('✅ Script already loaded');
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = '/mobile-oauth.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ mobile-oauth.js loaded successfully');
    };

    script.onerror = () => {
      console.error('❌ Failed to load mobile-oauth.js');
    };

    // Append to document head
    document.head.appendChild(script);

    console.log('📝 Script tag added to document');

    // Cleanup function
    return () => {
      // Don't remove script on unmount - we want it to persist
      console.log('🔧 ScriptInjector unmounted (script remains)');
    };
  }, []);

  // This component renders nothing
  return null;
}
