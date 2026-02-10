// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6i0EtJjfFcbVVBqul047T5eo9Kto3TIk",
  authDomain: "tallent-8b886.firebaseapp.com",
  databaseURL: "https://tallent-8b886-default-rtdb.firebaseio.com",
  projectId: "tallent-8b886",
  storageBucket: "tallent-8b886.firebasestorage.app",
  messagingSenderId: "238393198809",
  appId: "1:238393198809:web:d5bf72d3821f6fb12056c8",
  measurementId: "G-72RX9T32MY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let analytics;
// Initialize analytics only on client side
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, analytics };
