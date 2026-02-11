/** @format */
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "teste-f9d4e.firebaseapp.com",
  projectId: "teste-f9d4e",
  storageBucket: "auditoria-xls-fusion",
  messagingSenderId: "788286452772",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();