import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: '' // Force account picker for all domains
});

// ✅ Google Login (Always ask for account)
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();

  // Force Google to show account chooser
  provider.setCustomParameters({
    prompt: "select_account"
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Clear logout flag on successful login
    localStorage.removeItem('user_logged_out');
    sessionStorage.removeItem('user_logged_out');

    console.log("✅ Signed in as:", user.email);
    return result;
  } catch (error) {
    console.error("❌ Sign-in error:", error);
    throw error;
  }
};

// ✅ Logout Function (Properly logout user)
export const signOutUser = async () => {
  try {
    // Set logout flag first to prevent auto-login
    localStorage.setItem('user_logged_out', 'true');
    sessionStorage.setItem('user_logged_out', 'true');

    // Call backend logout to clear server session
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    // Then sign out from Firebase
    await signOut(auth);
    console.log("✅ Firebase signout completed");

    // Clear all stored session/local data except logout flag
    const logoutFlag = localStorage.getItem('user_logged_out');
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore logout flag
    localStorage.setItem('user_logged_out', 'true');
    sessionStorage.setItem('user_logged_out', 'true');

    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log("✅ Complete logout finished");
  } catch (error) {
    console.error("❌ Logout error:", error);
    // Even if logout fails, set logout flag and clear local data
    localStorage.setItem('user_logged_out', 'true');
    sessionStorage.setItem('user_logged_out', 'true');
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Export auth and googleProvider for use in other components
export { auth, googleProvider };
export default app;