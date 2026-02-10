/**
 * Firebase Configuration
 * Konfigurasi Firebase untuk aplikasi SYNAGLO
 * 
 * PERINGATAN: File ini berisi API key yang sensitif!
 * JANGAN commit file ini ke repository publik.
 * File ini sudah ditambahkan ke .gitignore
 */

// Firebase configuration object
export const firebaseConfig = {
  apiKey: "AIzaSyDS71aBZzAnM_0CfVs0AJqlOn85KxnI2AA",
  authDomain: "synaglo.firebaseapp.com",
  projectId: "synaglo",
  storageBucket: "synaglo.firebasestorage.app",
  messagingSenderId: "346099703316",
  appId: "1:346099703316:web:5fa7d072ea7253523e5101"
};

// Initialize Firebase (optional, bisa di-initialize di file yang membutuhkan)
let app = null;
let auth = null;
let db = null;

/**
 * Initialize Firebase App
 * Menginisialisasi Firebase app instance
 */
export async function initFirebase() {
  if (app) return { app, auth, db };
  
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  return { app, auth, db };
}

// Export initialized services (akan null sampai initFirebase dipanggil)
export { app, auth, db };
