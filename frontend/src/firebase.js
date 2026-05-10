import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAW3jUOUVNaG6vkDtUmS3b0y5yGk_jM-_A",
  authDomain: "certverifypro.firebaseapp.com",
  projectId: "certverifypro",
  storageBucket: "certverifypro.firebasestorage.app",
  messagingSenderId: "465691423733",
  appId: "1:465691423733:web:251f9efd79386f6e9ea6bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
