/**
 * Firebase Loader
 * Helper untuk load Firebase config dari firebase-config.js
 * Menggunakan dynamic import untuk kompatibilitas dengan ES modules
 */

let firebaseConfigCache = null;

/**
 * Get Firebase Configuration
 * Mengambil konfigurasi Firebase dari firebase-config.js
 */
export async function getFirebaseConfig() {
  if (firebaseConfigCache) {
    return firebaseConfigCache;
  }
  
  try {
    // Import config dari firebase-config.js
    const configModule = await import('/js/components/firebase-config.js');
    firebaseConfigCache = configModule.firebaseConfig;
    return firebaseConfigCache;
  } catch (error) {
    console.error('Error loading Firebase config:', error);
    throw new Error('Firebase configuration file not found. Please create firebase-config.js from firebase-config.example.js');
  }
}

/**
 * Initialize Firebase with config from firebase-config.js
 * Menginisialisasi Firebase menggunakan config dari file terpusat
 */
export async function initializeFirebase() {
  try {
    const config = await getFirebaseConfig();
    
    // Import Firebase modules
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    
    // Initialize Firebase
    const app = initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    return { app, auth, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}
