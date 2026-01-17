// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_QZdUHQbXHNjzdAGxxiXPRLfu9styp_U",
  authDomain: "capstone-project-d17b1.firebaseapp.com",
  projectId: "capstone-project-d17b1",
  storageBucket: "capstone-project-d17b1.firebasestorage.app",
  messagingSenderId: "769772272390",
  appId: "1:769772272390:web:2802b39d6cc9b1cadffc87"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);