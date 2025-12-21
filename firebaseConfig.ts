// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0fvFv1hdeQ_ZmWLOSQsyfBREKT5jm4L4",
  authDomain: "original-01-481809.firebaseapp.com", // This is usually projectid.firebaseapp.com
  projectId: "original-01-481809",
  storageBucket: "original-01-481809.firebasestorage.app",
  messagingSenderId: "671674065958", // This is usually the project_number
  appId: "1:671674065958:web:YOUR_WEB_APP_ID", // TODO: Replace with your actual web app ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
