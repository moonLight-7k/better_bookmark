import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.FIREBASE_API_KEY || "AIzaSyDr2LiCiUwqibEYAsYCX9r_0sELq5-eCdE",
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN || "betterbookmark-b804b.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "betterbookmark-b804b",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    "betterbookmark-b804b.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "161800747744",
  appId:
    process.env.FIREBASE_APP_ID || "1:161800747744:web:5645c7a349e9929d596e85",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-KQ3B9J6CMP",
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://betterbookmark-b804b-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const db = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
