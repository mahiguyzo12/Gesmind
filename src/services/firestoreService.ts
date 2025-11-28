import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  where
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { InventoryItem, Transaction, User, Customer, Supplier, CashMovement, CashClosing, StoreSettings, StoreMetadata } from "../types";

// --- STORE MANAGEMENT ---

// Créer une nouvelle boutique
export const createStoreInDB = async (storeId: string, metadata: StoreMetadata, settings: StoreSettings, initialAdmin: User) => {
  try {
    // 1. Enregistrer les métadonnées dans la liste globale des boutiques
    await setDoc(doc(db, "stores_registry", storeId), metadata);

    // 2. Initialiser les paramètres de la boutique
    await setDoc(doc(db, "stores", storeId), { settings });

    // 3. Créer l'admin initial
    await setDoc(doc(db, "stores", storeId, "users", initialAdmin.id), initialAdmin);

    return true;
  } catch (error) {
    console.error("Erreur création boutique:", error);
    throw error;
  }
};

// Écouter la liste des boutiques disponibles
export const subscribeToStoresRegistry = (callback: (stores: StoreMetadata[]) => void) => {
  const q = query(collection(db, "stores_registry"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => doc.data() as StoreMetadata);
    callback(stores);
  });
};

// Supprimer une boutique (Attention: suppression logique, Firestore ne supprime pas récursivement les sous-collections facilement)
export const deleteStoreFromDB = async (storeId: string) => {
  try {
    await deleteDoc(doc(db, "stores_registry", storeId));
    // Note: Les sous-collections resteront orphelines dans Firestore (comportement standard NoSQL)
    // Pour une vraie suppression, il faudrait une Cloud Function.
    return true;
  } catch (error) {
    console.error("Erreur suppression boutique:", error);
    throw error;
  }
};

// --- DATA LISTENERS (REALTIME) ---

export const subscribeToInventory = (storeId: string, callback: (data: InventoryItem[]) => void) => {
  const q = query(collection(db, "stores", storeId, "inventory"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
  });
};

export const subscribeToTransactions = (storeId: string, callback: (data: Transaction[]) => void) => {
  // Limite optionnelle: les 1000 dernières transactions pour la perf
  const q = query(collection(db, "stores", storeId, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
  });
};

export const subscribeToUsers = (storeId: string, callback: (data: User[]) => void) => {
  const q = query(collection(db, "stores", storeId, "users"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
  });
};

export const subscribeToCustomers = (storeId: string, callback: (data: Customer[]) => void) => {
  const q = query(collection(db, "stores", storeId, "customers"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
  });
};

export const subscribeToSuppliers = (storeId: string, callback: (data: Supplier[]) => void) => {
  const q = query(collection(db, "stores", storeId, "suppliers"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)));
  });
};

export const subscribeToCashMovements = (storeId: string, callback: (data: CashMovement[]) => void) => {
  const q = query(collection(db, "stores", storeId, "cash_movements"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashMovement)));
  });
};

export const subscribeToCashClosings = (storeId: string, callback: (data: CashClosing[]) => void) => {
  const q = query(collection(db, "stores", storeId, "cash_closings"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashClosing)));
  });
};

export const subscribeToSettings = (storeId: string, callback: (data: StoreSettings | null) => void) => {
  return onSnapshot(doc(db, "stores", storeId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().settings as StoreSettings);
    } else {
      callback(null);
    }
  });
};

// --- CRUD OPERATIONS ---

// Generic Add
export const addData = async (storeId: string, collectionName: string, data: any) => {
  // Si l'objet a déjà un ID généré (ex: T-1234), on l'utilise comme ID de document
  if (data.id) {
    await setDoc(doc(db, "stores", storeId, collectionName, data.id), data);
  } else {
    await addDoc(collection(db, "stores", storeId, collectionName), data);
  }
};

// Generic Update
export const updateData = async (storeId: string, collectionName: string, docId: string, data: any) => {
  await updateDoc(doc(db, "stores", storeId, collectionName, docId), data);
};

// Generic Delete
export const deleteData = async (storeId: string, collectionName: string, docId: string) => {
  await deleteDoc(doc(db, "stores", storeId, collectionName, docId));
};

// Specific: Update Settings
export const updateSettingsInDB = async (storeId: string, settings: StoreSettings) => {
  await updateDoc(doc(db, "stores", storeId), { settings });
  // Mettre à jour aussi le registre si le nom/logo change
  await updateDoc(doc(db, "stores_registry", storeId), { 
    name: settings.name,
    logoUrl: settings.logoUrl 
  });
};