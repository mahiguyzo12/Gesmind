
import * as firebaseApp from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { FirebaseConfig } from "../types";

// Workaround for TypeScript error: Module '"firebase/app"' has no exported member 'initializeApp'
const { initializeApp, getApp } = firebaseApp as any;

// Stockage de l'instance de base de données
let db: Firestore | null = null;
let auth: Auth | null = null;
let app: any = null;
const googleProvider = new GoogleAuthProvider();

// --- CONFIGURATION FIREBASE ---
// Mise à jour avec les identifiants de "gesmind-smart-business-hub"
const PRECONFIGURED_CONFIG: FirebaseConfig | null = {
  apiKey: "AIzaSyDtreUxFbO3moOMCE53BcAHFOhLSZRUY3E",
  authDomain: "gesmind-smart-business-hub.firebaseapp.com",
  projectId: "gesmind-smart-business-hub",
  storageBucket: "gesmind-smart-business-hub.firebasestorage.app",
  messagingSenderId: "750957581069",
  appId: "1:750957581069:web:3c2161689daf3e341a9644"
};

// Fonction pour initialiser ou réinitialiser Firebase dynamiquement
export const setupFirebase = (configData: string | FirebaseConfig): boolean => {
  try {
    // Cas spécial: Mode Local
    if (configData === 'LOCAL') {
        localStorage.setItem('gesmind_db_mode', 'LOCAL');
        db = null; 
        auth = null;
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
        // Protection basique contre re-init si même config
        try {
            app = initializeApp(config);
        } catch (e: any) {
            // Si déjà initialisé (ex: Hot Reload), on récupère l'instance existante
            if (e.code === 'app/duplicate-app') {
                 try {
                    app = getApp();
                 } catch (err) {
                    console.warn("Impossible de récupérer l'app existante:", err);
                 }
                 console.log("Firebase app already initialized, using existing instance.");
            } else {
                 console.warn("Firebase init warning:", e.message);
            }
        }
        
        // Sécurité supplémentaire si app est toujours null
        if (!app) {
             try {
                app = getApp();
             } catch(e) {
                console.error("Impossible de récupérer l'instance Firebase.");
                return false;
             }
        }

        auth = getAuth(app);
        db = getFirestore(app);
        
        // Activation du mode Hors-Ligne pour Firestore (Cache persistant)
        if (typeof window !== 'undefined') {
            enableIndexedDbPersistence(db).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Persistance Firestore désactivée : Plusieurs onglets ouverts.');
                } else if (err.code === 'unimplemented') {
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

export const ensureAuthReady = async () => {
    if (auth && auth.currentUser) return;
};

// Tentative de chargement au démarrage
const dbMode = localStorage.getItem('gesmind_db_mode');
const savedConfigStr = localStorage.getItem('gesmind_firebase_config');

// Logique de priorité :
let configToLoad: string | FirebaseConfig | null = null;

if (dbMode === 'LOCAL') {
    console.log("Démarrage en mode Local.");
    db = null;
} else {
    // 1. Utiliser la configuration pré-configurée si disponible et valide
    if (PRECONFIGURED_CONFIG && PRECONFIGURED_CONFIG.apiKey !== "VOTRE_API_KEY_ICI") {
        configToLoad = PRECONFIGURED_CONFIG;
        // On met à jour le cache
        localStorage.setItem('gesmind_firebase_config', JSON.stringify(PRECONFIGURED_CONFIG));
        localStorage.setItem('gesmind_db_mode', 'CLOUD');
    } 
    // 2. Sinon, on regarde si une config a été injectée manuellement et stockée
    else if (savedConfigStr) {
        configToLoad = savedConfigStr;
    }
    
    if (configToLoad) {
        setupFirebase(configToLoad);
    } else {
        console.log("Aucune configuration Firebase valide détectée. L'application démarrera en mode configuration ou local.");
    }
}

export { db, auth, googleProvider };
