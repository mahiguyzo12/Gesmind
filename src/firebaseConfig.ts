
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore";
import { FirebaseConfig } from "../types";

// Stockage de l'instance de base de données
let db: Firestore | null = null;
let app: any = null;

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
      
      // Initialisation
      app = initializeApp(config);
      db = getFirestore(app);
      
      // Activation du mode Hors-Ligne pour Firestore
      enableIndexedDbPersistence(db).catch((err) => {
          if (err.code == 'failed-precondition') {
              console.warn('La persistance a échoué : Plusieurs onglets ouverts.');
          } else if (err.code == 'unimplemented') {
              console.warn('Le navigateur ne supporte pas la persistance.');
          }
      });
      
      console.log("Firebase initialisé avec succès.");
      return true;
    }
    return false;
  } catch (e) {
    console.error("Erreur configuration Firebase:", e);
    return false;
  }
};

// Tentative de chargement au démarrage
const dbMode = localStorage.getItem('gesmind_db_mode');
const savedConfig = localStorage.getItem('gesmind_firebase_config');

if (dbMode === 'LOCAL') {
    console.log("Démarrage en mode Local.");
    db = null;
} else if (savedConfig) {
    setupFirebase(savedConfig);
} else {
    console.warn("Aucune configuration trouvée.");
}

export { db };
