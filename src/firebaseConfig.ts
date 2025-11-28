import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURATION FIREBASE ---
// 1. Allez sur https://console.firebase.google.com/
// 2. Créez un projet "Gesmind"
// 3. Ajoutez une app Web (</>)
// 4. Copiez les valeurs ci-dessous :

const firebaseConfig = {
  // REMPLACEZ CES VALEURS PAR LES VÔTRES
  apiKey: "AIzaSy...", 
  authDomain: "gesmind-app.firebaseapp.com",
  projectId: "gesmind-app",
  storageBucket: "gesmind-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Activation du mode Hors-Ligne (Persistance locale)
// Cela permet à l'app de fonctionner sans internet et de synchroniser plus tard
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('La persistance a échoué : Plusieurs onglets ouverts.');
        } else if (err.code == 'unimplemented') {
            console.warn('Le navigateur ne supporte pas la persistance.');
        }
    });
} catch(e) { 
    console.error("Erreur init persistence", e); 
}