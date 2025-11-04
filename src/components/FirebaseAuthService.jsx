// Check if Firebase is available
let firebaseAvailable = false;
let app = null;
let auth = null;
let googleProvider = null;
let appleProvider = null;

try {
  const { initializeApp } = require('firebase/app');
  const {
    getAuth,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    OAuthProvider,
  } = require('firebase/auth');

  // Firebase configuration for blink-app-6638b
  const firebaseConfig = {
    apiKey: 'AIzaSyBnJx4flWRALby-3amzME5SMozc6F1_6vw',
    authDomain: 'blink-app-6638b.firebaseapp.com',
    projectId: 'blink-app-6638b',
    storageBucket: 'blink-app-6638b.firebasestorage.app',
    messagingSenderId: '253607084059',
    appId: '1:253607084059:web:8ea28370a24ebfa6bbf8be',
    measurementId: 'G-72KRPEDQ6Y',
  };

  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Configure Google Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  // Configure Apple Provider
  appleProvider = new OAuthProvider('apple.com');
  appleProvider.addScope('email');
  appleProvider.addScope('name');

  firebaseAvailable = true;
  console.log('✅ Firebase SDK loaded successfully');
} catch (error) {
  console.warn('⚠️ Firebase SDK not available:', error.message);
  firebaseAvailable = false;
}

/**
 * Check if Firebase is available
 */
export function isFirebaseAvailable() {
  return firebaseAvailable;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(useMobileFlow = false) {
  if (!firebaseAvailable) {
    throw new Error(
      'Firebase SDK is not available. Please use email/password login.'
    );
  }

  try {
    const { signInWithPopup, signInWithRedirect } = require('firebase/auth');
    console.log('🔵 Starting Google sign-in...', { useMobileFlow });

    let result;
    if (useMobileFlow) {
      await signInWithRedirect(auth, googleProvider);
      return { pending: true };
    } else {
      result = await signInWithPopup(auth, googleProvider);
    }

    return await handleOAuthSuccess(result, 'google');
  } catch (error) {
    console.error('❌ Google sign-in error:', error);
    throw new Error(getReadableError(error));
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(useMobileFlow = false) {
  if (!firebaseAvailable) {
    throw new Error(
      'Firebase SDK is not available. Please use email/password login.'
    );
  }

  try {
    const { signInWithPopup, signInWithRedirect } = require('firebase/auth');
    console.log('🍎 Starting Apple sign-in...', { useMobileFlow });

    let result;
    if (useMobileFlow) {
      await signInWithRedirect(auth, appleProvider);
      return { pending: true };
    } else {
      result = await signInWithPopup(auth, appleProvider);
    }

    return await handleOAuthSuccess(result, 'apple');
  } catch (error) {
    console.error('❌ Apple sign-in error:', error);
    throw new Error(getReadableError(error));
  }
}

/**
 * Handle redirect result (for mobile OAuth)
 */
export async function handleOAuthRedirect() {
  if (!firebaseAvailable) {
    console.log('ℹ️ Firebase not available - skipping OAuth redirect check');
    return null;
  }

  try {
    const { getRedirectResult } = require('firebase/auth');
    console.log('🔄 Checking for OAuth redirect result...');
    const result = await getRedirectResult(auth);

    if (!result) {
      console.log('ℹ️ No redirect result found');
      return null;
    }

    console.log('✅ OAuth redirect successful:', result.user.email);

    const provider = result.providerId?.includes('google')
      ? 'google'
      : result.providerId?.includes('apple')
      ? 'apple'
      : 'unknown';

    return await handleOAuthSuccess(result, provider);
  } catch (error) {
    console.error('❌ OAuth redirect error:', error);
    throw new Error(getReadableError(error));
  }
}

/**
 * Handle successful OAuth authentication
 */
async function handleOAuthSuccess(result, provider) {
  const { base44 } = require('@/api/base44Client');
  const { user } = result;

  console.log('👤 OAuth user:', {
    email: user.email,
    name: user.displayName,
    provider,
  });

  const firebaseToken = await user.getIdToken();

  localStorage.setItem('firebase_token', firebaseToken);
  localStorage.setItem('firebase_uid', user.uid);
  localStorage.setItem('oauth_provider', provider);

  try {
    console.log('🔍 Attempting Base44 integration...');

    try {
      const loginResult = await base44.auth.login(user.email, firebaseToken);
      console.log('✅ Logged into existing Base44 account');

      localStorage.setItem('auth_token', loginResult.token);
      localStorage.setItem('user_id', loginResult.user.id);
      localStorage.setItem('user_email', loginResult.user.email);

      return {
        success: true,
        user: loginResult.user,
        isNewUser: false,
        provider,
      };
    } catch (loginError) {
      console.log('ℹ️ No existing Base44 account, storing OAuth data...');

      localStorage.setItem('pending_oauth_signup', 'true');
      localStorage.setItem('oauth_email', user.email);
      localStorage.setItem('oauth_name', user.displayName || '');
      localStorage.setItem('oauth_photo', user.photoURL || '');

      return {
        success: true,
        user: {
          email: user.email,
          full_name: user.displayName,
          profile_picture: user.photoURL,
        },
        isNewUser: true,
        provider,
        needsBase44Setup: true,
      };
    }
  } catch (error) {
    console.error('❌ Error linking to Base44:', error);
    throw new Error('Failed to link OAuth account. Please try again.');
  }
}

/**
 * Sign out
 */
export async function signOut() {
  if (!firebaseAvailable) {
    localStorage.removeItem('firebase_token');
    localStorage.removeItem('firebase_uid');
    localStorage.removeItem('oauth_provider');
    return;
  }

  try {
    await auth.signOut();
    localStorage.removeItem('firebase_token');
    localStorage.removeItem('firebase_uid');
    localStorage.removeItem('oauth_provider');
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out error:', error);
  }
}

/**
 * Convert Firebase error to user-friendly message
 */
function getReadableError(error) {
  const errorCode = error.code;

  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Please allow pop-ups.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
}

export { auth };
