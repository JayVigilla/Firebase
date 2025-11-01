// firebase-config.js - ES6 MODULE VERSION (FIXED)
// ============================================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js"
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js"

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAGbKxcni6TjGEnYjMPYOkJfdqXq57MeHs",
  authDomain: "florist-3da75.firebaseapp.com",
  projectId: "florist-3da75",
  storageBucket: "florist-3da75.firebasestorage.app",
  messagingSenderId: "424840107599",
  appId: "1:424840107599:web:5070aca3d345318c0fbc3a",
  measurementId: "G-8WVXMN5DYZ",
}

// ============================================================================
// INITIALIZE FIREBASE
// ============================================================================

let app, analytics, auth, db, storage

try {
  app = initializeApp(firebaseConfig)
  analytics = getAnalytics(app)
  auth = getAuth(app)

  // Initialize Firestore with persistent cache
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  })

  storage = getStorage(app)

  console.log("✅ Firebase initialized successfully")
} catch (error) {
  console.error("❌ Firebase initialization error:", error)
}

// ============================================================================
// ADMIN CREDENTIALS
// ============================================================================

const ADMIN_EMAIL = "admin@florist.com"
const ADMIN_PASSWORD = "adminflorist123"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user is admin
 */
const isAdmin = (email) => {
  return email === ADMIN_EMAIL
}

/**
 * Get current authenticated user
 */
const getCurrentUser = () => {
  return auth?.currentUser || null
}

/**
 * Check authentication state (returns a promise)
 */
const checkAuthState = () => {
  return new Promise((resolve) => {
    if (!auth) {
      console.warn("⚠️ Auth not initialized")
      resolve(null)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

/**
 * Password reset helper
 */
const resetPassword = async (email) => {
  try {
    if (!auth) {
      throw new Error("Firebase Auth not initialized")
    }
    await sendPasswordResetEmail(auth, email)
    return { success: true, message: "Password reset email sent successfully!" }
  } catch (error) {
    return { success: false, error: error.code, message: error.message }
  }
}

/**
 * Network connectivity manager
 */
const toggleFirestoreNetwork = async (enabled) => {
  try {
    if (!db) {
      console.warn("⚠️ Firestore not initialized")
      return
    }

    if (enabled) {
      await enableNetwork(db)
      console.log("✅ Firestore network enabled")
    } else {
      await disableNetwork(db)
      console.log("⚠️ Firestore network disabled")
    }
  } catch (error) {
    console.error("Network toggle error:", error)
  }
}

/**
 * Get user by email helper
 */
const getUserByEmail = async (email) => {
  try {
    if (!db) throw new Error("Firestore not initialized")

    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      return { id: userDoc.id, ...userDoc.data() }
    }

    return null
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

/**
 * Create or update user profile
 */
const saveUserProfile = async (userId, userData) => {
  try {
    if (!db) throw new Error("Firestore not initialized")

    const userRef = doc(db, "users", userId)
    await setDoc(userRef, {
      ...userData,
      updatedAt: Timestamp.now(),
    }, { merge: true })

    console.log("✅ User profile saved")
    return { success: true }
  } catch (error) {
    console.error("Error saving user profile:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
  try {
    if (!db) throw new Error("Firestore not initialized")

    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() }
    }

    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

// ============================================================================
// ONLINE/OFFLINE EVENT LISTENERS
// ============================================================================

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Back online")
    toggleFirestoreNetwork(true)
  })

  window.addEventListener("offline", () => {
    console.log("📵 Gone offline")
    toggleFirestoreNetwork(false)
  })
}

// ============================================================================
// GLOBAL FIREBASE CONFIG OBJECT FOR OTHER MODULES
// ============================================================================

export const globalFirebaseConfig = {
  app,
  auth,
  db,
  storage,
  analytics,
  // Firestore functions
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  // Auth functions
  onAuthStateChanged,
}

// ============================================================================
// MAKE AVAILABLE GLOBALLY (for non-module scripts)
// ============================================================================

if (typeof window !== "undefined") {
  window.firebaseApp = app
  window.firebaseAuth = auth
  window.firebaseDB = db
  window.firebaseStorage = storage
  window.firebaseConfig = globalFirebaseConfig

  console.log("✅ Global Firebase config set")
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Firebase instances
  auth,
  db,
  storage,
  analytics,
  app,
  
  // Authentication functions
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  
  // Firestore functions
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  
  // Storage functions
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  
  // Helper functions
  resetPassword,
  isAdmin,
  getCurrentUser,
  checkAuthState,
  toggleFirestoreNetwork,
  getUserByEmail,
  saveUserProfile,
  getUserProfile,
  
  // Constants
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
}

console.log("✅ Firebase config module loaded and ready")