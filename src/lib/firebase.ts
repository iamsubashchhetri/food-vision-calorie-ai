
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRLFwHQ73uUQY1tKJeIDBPeK0GnqZdPCs",
  authDomain: "calorietracking-fe648.firebaseapp.com",
  projectId: "calorietracking-fe648",
  storageBucket: "calorietracking-fe648.firebasestorage.app",
  messagingSenderId: "914978569136",
  appId: "1:914978569136:web:abe194e4a4a391ead5b475",
  measurementId: "G-04Z76FRGQ9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
