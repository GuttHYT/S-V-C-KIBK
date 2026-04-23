// Cole aqui o seu firebaseConfig do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCOCHHZnHSLLIOia6QAXNuF8C4kAH82EYc",
  authDomain: "site-vendas-e-compras.firebaseapp.com",
  projectId: "site-vendas-e-compras",
  storageBucket: "site-vendas-e-compras.firebasestorage.app",
  messagingSenderId: "769215456073",
  appId: "1:769215456073:web:8880b90caea104b31e7098",
}
;

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();