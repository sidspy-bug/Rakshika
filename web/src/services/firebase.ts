import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key-replace-me",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rakshika-safety.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rakshika-safety",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rakshika-safety.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef12345"
};

// Initialize Firebase only if the API key is not the default mock string
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
