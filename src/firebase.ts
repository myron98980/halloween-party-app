import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 1. Importa getAuth
// TODO: Reemplaza esto con la configuración de tu propio proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCoqN4hMIzzo7LhKlv434ckWSwY1z2sGfw",
    authDomain: "halloween-party-98631.firebaseapp.com",
    projectId: "halloween-party-98631",
    storageBucket: "halloween-party-98631.firebasestorage.app",
    messagingSenderId: "955001241633",
    appId: "1:955001241633:web:621e25490ecf1cec586360",
    measurementId: "G-M82F4LH477"
  };

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta la instancia de Firestore para usarla en otros componentes
export const db = getFirestore(app);
export const auth = getAuth(app); // Crea y exporta la instancia de autenticación