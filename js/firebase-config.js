// Firebase konfiguráció
const firebaseConfig = {
  apiKey: "AIzaSyDuaNmAUjA0u7GYnD81BW40hJey6q1VA",
  authDomain: "a-s-m-u.firebaseapp.com",
  projectId: "a-s-m-u",
  storageBucket: "a-s-m-u.firebasestorage.app",
  messagingSenderId: "317821756996",
  appId: "1:317821756996:web:614194b49318BB92abe11",
  measurementId: "G-ENT3XNIKTE"
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