// Firebase konfiguráció
const firebaseConfig = {
  apiKey: "AIzaSyDxsN0vk0dAoDu7GYn2Bl8WoKDejy6q1vA",
  authDomain: "a-s-m-u.firebaseapp.com",
  projectId: "a-s-m-u",
  storageBucket: "a-s-m-u.firebasestorage.app",
  messagingSenderId: "317821756996",
  appId: "1:317821756996:web:61d1b94b291080592abe11",
  measurementId: "G-ENT3XNTKTE"
};

// Firebase inicializálása
firebase.initializeApp(firebaseConfig);

// Firebase szolgáltatások
const auth = firebase.auth();
const db = firebase.firestore();

// Exportáljuk, hogy más fájlokban is használható legyen
window.firebaseApp = {
  auth: auth,
  db: db
};