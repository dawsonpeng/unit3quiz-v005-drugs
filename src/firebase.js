// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzxQJquNVt8VQhePxR551aDj7fUKs-LG4",
  authDomain: "unit3quiz-v005-drugs.firebaseapp.com",
  projectId: "unit3quiz-v005-drugs",
  storageBucket: "unit3quiz-v005-drugs.firebasestorage.app",
  messagingSenderId: "1089080057228",
  appId: "1:1089080057228:web:e34e8e497f3852ceaf0aa9",
  measurementId: "G-60GVH5QYDQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

const db = getFirestore(app);

export { app, analytics, db };

