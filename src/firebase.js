import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Thêm GoogleAuthProvider và signInWithPopup
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDJRsHMjU2G2BAtR3ZC9TlYjP0QMu1xSaw",
  authDomain: "qwer-c9de3.firebaseapp.com",
  projectId: "qwer-c9de3",
  storageBucket: "qwer-c9de3.firebasestorage.app",
  messagingSenderId: "144621785008",
  appId: "1:144621785008:web:dcb4d3c2b72549f4629075",
  measurementId: "G-817GWP0DWM"
};

const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch(e) { console.log('Analytics init failed', e); }

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

// Thêm Google Provider
export const googleProvider = new GoogleAuthProvider();