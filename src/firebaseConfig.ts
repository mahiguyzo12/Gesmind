import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { FirebaseConfig } from "../types";

// Stockage de l'instance de base de données
let db: Firestore | null = null;
let app: any = null;
let authPromise: Promise<any> | null = null;

// Configuration fournie par l'utilisateur (Extraite du fichier JSON)
const PRECONFIGURED_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyD52rhcJ6NZFCidCs21Ly3zX_v2MRZHFhI",
  authDomain: "original-01-481809.firebaseapp.com",
  projectId: "original-01-481809",
  storageBucket: "original-01-481809.firebasestorage.app",
  messagingSenderId: "123822174953",
  appId: "1:123822174953:web:generic"
};

// Fonction pour initialiser ou réinitialiser Firebase dynamiquement
export const setupFirebase = (configData: string | FirebaseConfig): boolean => {
  try {
    // Cas spécial: Mode Local
    if (configData === 'LOCAL') {
        localStorage.setItem('gesmind_db_mode', 'LOCAL');
        db = null; 
        console.log("Mode Local activé.");
        return true;
    }

    let config: FirebaseConfig;
    
    // Parse JSON safely
    try {
        config = typeof configData === 'string' ? JSON.parse(configData) : configData;
    } catch (parseError) {
        console.warn("Format JSON invalide détecté lors de la configuration.");
        return false;
    }
    
    if (config && config.apiKey && config.projectId) {
      // Sauvegarde dans localStorage
      localStorage.setItem('gesmind_firebase_config', JSON.stringify(config));
      localStorage.setItem('gesmind_db_mode', 'CLOUD');
      
      return initializeFirebaseInstance(config);
    }
    return false;
  } catch (e) {
    console.error("Erreur configuration Firebase:", e);
    return false;
  }
};

const initializeFirebaseInstance = (config: FirebaseConfig): boolean => {
    try {
        app = initializeApp(config);
        
        // Initialisation de l'authentification
        // Tentative de connexion anonyme pour satisfaire les règles de sécurité "request.auth != null"
        const auth = getAuth(app);
        
        // On stocke la promesse pour pouvoir l'attendre ailleurs
        authPromise = signInAnonymously(auth).then((userCredential) => {
            console.log("Connexion anonyme réussie (Auth) :", userCredential.user.uid);
        }).catch((err) => {
            console.warn("La connexion anonyme a échoué. Vérifiez si 'Anonymous Auth' est activé dans la console Firebase.", err);
        });

        db = getFirestore(app);
        
        // Activation du mode Hors-Ligne pour Firestore (Cache persistant)
        if (typeof window !== 'undefined') {
            enableIndexedDbPersistence(db).catch((err) => {
                if (err.code === 'failed-precondition') {
                    // Probablement plusieurs onglets ouverts
                    console.warn('Persistance Firestore désactivée : Plusieurs onglets ouverts.');
                } else if (err.code === 'unimplemented') {
                    // Le navigateur ne supporte pas la persistance (ex: mode privé)
                    console.warn('Persistance Firestore non supportée par ce navigateur.');
                }
            });
        }
        
        console.log("Firebase initialisé avec succès :", config.projectId);
        return true;
    } catch (initError) {
        console.error("Erreur lors de l'initialisation de l'instance Firebase:", initError);
        return false;
    }
}

// Helper pour attendre que l'auth soit prête avant de lancer des requêtes
export const ensureAuthReady = async () => {
    if (authPromise) {
        try {
            await authPromise;
        } catch (e) {
            console.error("Attente Auth échouée", e);
        }
    }
};

// Tentative de chargement au démarrage
const dbMode = localStorage.getItem('gesmind_db_mode');
const savedConfig = localStorage.getItem('gesmind_firebase_config');

if (dbMode === 'LOCAL') {
    console.log("Démarrage en mode Local.");
    db = null;
} else if (savedConfig) {
    // Priorité à la configuration sauvegardée manuellement
    setupFirebase(savedConfig);
} else {
    // Sinon, tentative d'utilisation de la configuration pré-injectée
    console.log("Tentative de connexion avec la configuration par défaut...");
    const success = initializeFirebaseInstance(PRECONFIGURED_CONFIG);
    if (success) {
        localStorage.setItem('gesmind_firebase_config', JSON.stringify(PRECONFIGURED_CONFIG));
        localStorage.setItem('gesmind_db_mode', 'CLOUD');
    }
}

export { db };
