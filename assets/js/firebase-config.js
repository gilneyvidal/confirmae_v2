import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================================================
   Confirmaê v2 · Configuração do Firebase
   =========================================================
   ATENÇÃO: Este arquivo aponta para o projeto NOVO (v2).
   Para reverter para o antigo, troque os valores de volta.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDqImA4Bh-ufuJnKrLu1dJ-tjOtiynJtM8",
  authDomain: "confirmae-v2.firebaseapp.com",
  projectId: "confirmae-v2",
  storageBucket: "confirmae-v2.firebasestorage.app",
  messagingSenderId: "158099483138",
  appId: "1:158099483138:web:3105baf62554cb72c6951b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  app,
  db,
  auth,
  googleProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy
};
