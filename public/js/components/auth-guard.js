/**
 * Authentication Guard
 * Sistem yang memastikan hanya user yang sudah login yang bisa mengakses halaman tertentu
 * Halaman yang diizinkan tanpa login: index.html dan auth.html
 */

// Firebase auth instance (akan diinisialisasi)
let auth = null;
let isInitialized = false;
let authStateListener = null;
let isRedirecting = false;

/**
 * Initialize Firebase Auth
 * Menginisialisasi Firebase Authentication untuk auth guard
 */
async function initAuthGuard() {
    if (isInitialized) return;
    
    try {
        // Import Firebase auth module
        const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./firebase-loader.js");
        const { app: firebaseApp, auth: firebaseAuth } = await initializeFirebase();
        
        auth = firebaseAuth;
        
        // Store app instance globally for use in auth state changed
        window.firebaseApp = firebaseApp;
        
        isInitialized = true;
        console.log('Auth guard initialized');
        
        // Check authentication on page load
        checkAuthAndRedirect();
        
    } catch (error) {
        console.error('Error initializing auth guard:', error);
    }
}

/**
 * Check if current page requires authentication
 * Halaman yang tidak memerlukan auth: index.html dan auth.html
 */
function requiresAuth() {
    const path = window.location.pathname;

    // Public routes
    const publicRoutes = ['/', '/auth'];

    return !publicRoutes.includes(path);
}

/**
 * Check if user is on auth page and should be redirected to dashboard
 */
function shouldRedirectFromAuth() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    return window.location.pathname === '/auth';
}

/**
 * Wait for auth state to be ready
 * Returns a promise that resolves when auth state is determined
 * With timeout to prevent infinite waiting
 */
function waitForAuthState(timeout = 5000) {
    return new Promise((resolve) => {
        // Check current user immediately
        if (auth.currentUser) {
            console.log('Auth state: currentUser found immediately');
            resolve(auth.currentUser);
            return;
        }
        
        // Set timeout to prevent infinite waiting
        const timeoutId = setTimeout(() => {
            console.warn('Auth state timeout, checking currentUser again');
            resolve(auth.currentUser || null);
        }, timeout);
        
        // Wait for auth state change
        const unsubscribe = auth.onAuthStateChanged((user) => {
            clearTimeout(timeoutId);
            unsubscribe();
            console.log('Auth state changed:', user ? user.email : 'null');
            resolve(user);
        });
    });
}

/**
 * Check authentication status and redirect if needed
 */
async function checkAuthAndRedirect() {
    if (!auth) {
        console.error('Auth not initialized');
        return;
    }
    
    // Prevent multiple listeners
    if (authStateListener) {
        return;
    }
    
    // Check if current page requires authentication
    if (!requiresAuth()) {
        // Public page - check if user is logged in and should be redirected
        if (shouldRedirectFromAuth()) {
            // On auth page, wait for auth state and check if user is already logged in
            const user = await waitForAuthState();
            if (user && !isRedirecting) {
                console.log('User already logged in, redirecting to dashboard');
                isRedirecting = true;
                window.location.href = '/dashboard';
            }
        }
        return;
    }
    
    // Protected page - check authentication
    // First check sessionStorage/localStorage for user ID (from login)
    const storedUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const loginTimestamp = parseInt(sessionStorage.getItem('loginTimestamp') || localStorage.getItem('loginTimestamp') || '0');
    const timeSinceLogin = Date.now() - loginTimestamp;
    
    // If user ID exists in storage and login was recent (within 30 seconds), wait for auth state
    if (storedUserId && timeSinceLogin < 30000) {
        console.log('User ID found in storage:', storedUserId, 'Login was', timeSinceLogin, 'ms ago');
        console.log('Waiting for auth state to sync...');
        
        // Wait for auth state to be determined (handles race condition)
        // Give it more time since we know user just logged in
        const user = await waitForAuthState(10000); // 10 second timeout for recent login
        
        if (user && user.uid === storedUserId) {
            // User is authenticated and matches stored ID, allow access
            console.log('User authenticated (matches storage):', user.email);
            window.currentUser = user;
            // Don't block page load for user document creation
            ensureUserDocument(user).catch(err => {
                console.error('Error ensuring user document:', err);
            });
            return; // Exit early, user is authenticated
        } else if (user) {
            // User authenticated but ID doesn't match (shouldn't happen, but handle it)
            console.warn('User authenticated but ID mismatch. Stored:', storedUserId, 'Current:', user.uid);
            window.currentUser = user;
            ensureUserDocument(user).catch(err => {
                console.error('Error ensuring user document:', err);
            });
            return;
        } else {
            // Auth state not ready yet, but we have stored user ID
            // Wait a bit more and check currentUser directly
            console.log('Auth state not ready, checking currentUser directly...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (auth.currentUser && auth.currentUser.uid === storedUserId) {
                console.log('User authenticated (currentUser check):', auth.currentUser.email);
                window.currentUser = auth.currentUser;
                ensureUserDocument(auth.currentUser).catch(err => {
                    console.error('Error ensuring user document:', err);
                });
                return;
            }
        }
    }
    
    // No stored user ID or login was too long ago, check auth state normally
    console.log('Checking auth state for protected page...');
    const user = await waitForAuthState(8000); // 8 second timeout
    
    if (user) {
        // User is authenticated, allow access
        console.log('User authenticated:', user.email);
        window.currentUser = user;
        // Store user ID for future use
        sessionStorage.setItem('userId', user.uid);
        sessionStorage.setItem('userEmail', user.email || '');
        // Don't block page load for user document creation
        ensureUserDocument(user).catch(err => {
            console.error('Error ensuring user document:', err);
        });
    } else {
        // User not authenticated, redirect to auth.html
        console.log('User not authenticated, redirecting to auth.html');
        // Clear stored user data
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('loginTimestamp');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('loginTimestamp');
        
        if (!isRedirecting) {
            isRedirecting = true;
            // Add small delay to prevent redirect loop
            setTimeout(() => {
                window.location.href = '/auth';
            }, 100);
        }
    }
    
    // Also set up listener for future auth state changes
    authStateListener = auth.onAuthStateChanged(async (user) => {
        // Prevent redirect loop
        if (isRedirecting) {
            return;
        }
        
        if (!user) {
            // User logged out, redirect to auth.html
            console.log('User logged out, redirecting to auth.html');
            isRedirecting = true;
            window.location.href = 'auth.html';
        } else {
            // User logged in, update current user
            console.log('User authenticated (onAuthStateChanged):', user.email);
            window.currentUser = user;
        }
    });
}

/**
 * Ensure user document exists in Firestore
 */
async function ensureUserDocument(user) {
    try {
        const { getFirestore, doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const db = getFirestore(window.firebaseApp);
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            // Create user document for first-time login
            await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            console.log('User document created in auth guard for:', user.email);
        } else {
            // Update last login
            await setDoc(userDocRef, {
                lastLogin: new Date().toISOString()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error ensuring user document in auth guard:', error);
    }
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
function getCurrentUser() {
    return auth?.currentUser || null;
}

/**
 * Logout function
 * Logout user dan redirect ke auth.html
 */
async function logout() {
    if (!auth) {
        console.error('Auth not initialized');
        return;
    }
    
    try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(auth);
        window.currentUser = null;
        window.location.href = '/auth';
    } catch (error) {
        console.error('Error signing out:', error);
        // Try to use modal if available, otherwise fallback to alert
        if (typeof showModal === 'function') {
            showModal('Logout Error', 'Failed to logout: ' + error.message, []);
        } else {
            alert('Gagal logout: ' + error.message);
        }
    }
}

// Initialize auth guard when script loads
// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthGuard);
} else {
    // DOM already loaded
    initAuthGuard();
}

// Export functions for use in other scripts
window.authGuard = {
    getCurrentUser,
    logout,
    requiresAuth
};
