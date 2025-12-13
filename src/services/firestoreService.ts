
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
  getDoc
} from "firebase/firestore";
import { db, ensureAuthReady } from "../firebaseConfig";
import { InventoryItem, Transaction, User, Customer, Supplier, CashMovement, CashClosing, StoreSettings, StoreMetadata, Expense, Employee } from "../../types";

// --- LOCAL STORAGE HELPERS (Mode Sans Serveur) ---
const localListeners: Record<string, Function[]> = {};

const emitLocalChange = (key: string) => {
  if (localListeners[key]) {
    localListeners[key].forEach(cb => cb());
  }
};

const getLocalData = (key: string): any[] => {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
}

const setLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    emitLocalChange(key);
}

// --- FIRESTORE UTILS ---

// Fonction pour nettoyer les objets avant envoi à Firestore
const cleanData = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    const cleaned: any = Array.isArray(data) ? [...data] : { ...data };
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
            delete cleaned[key];
        }
    });
    return cleaned;
};

// --- HELPER: Auth Guarded Snapshot ---
const authGuard = (startSnapshot: () => () => void) => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    
    ensureAuthReady().then(() => {
        if (!cancelled) {
            unsub = startSnapshot();
        }
    });
    
    return () => {
        cancelled = true;
        if (unsub) unsub();
    }
}

// --- MESSAGING SERVER TRIGGER ---

export const sendCloudMessage = async (type: 'EMAIL' | 'SMS', to: string, subject: string, body: string) => {
    if (!db) {
        console.warn("Mode Local : Impossible d'envoyer des messages Cloud réels.");
        console.log(`[SIMULATION ${type}] À: ${to}, Message: ${body}`);
        return false;
    }

    try {
        await ensureAuthReady();
        await addDoc(collection(db, "message_queue"), {
            type,
            to,
            subject,
            body,
            status: "PENDING",
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Erreur lors de l'envoi de la demande au serveur:", e);
        return false;
    }
};

// --- STORE MANAGEMENT ---

export const createStoreInDB = async (storeId: string, metadata: StoreMetadata, settings: StoreSettings, initialAdmin: User, initialEmployee: Employee) => {
  if (!db) {
      // Local Mode
      const stores = getLocalData('gesmind_local_stores_registry');
      stores.push(metadata);
      setLocalData('gesmind_local_stores_registry', stores);
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(settings));
      setLocalData(`gesmind_local_${storeId}_users`, [initialAdmin]);
      setLocalData(`gesmind_local_${storeId}_employees`, [initialEmployee]); // Ajout employé
      return true;
  }
  
  // Cloud Mode
  try {
    await ensureAuthReady();
    await setDoc(doc(db, "stores_registry", storeId), cleanData(metadata));
    await setDoc(doc(db, "stores", storeId), { settings: cleanData(settings) });
    await setDoc(doc(db, "stores", storeId, "users", initialAdmin.id), cleanData(initialAdmin));
    await setDoc(doc(db, "stores", storeId, "employees", initialEmployee.id), cleanData(initialEmployee)); // Ajout employé
    return true;
  } catch (error) {
    console.error("Erreur création boutique:", error);
    throw error;
  }
};

export const getStoreMetadata = async (storeId: string): Promise<StoreMetadata | null> => {
    if (!db) {
        const stores = getLocalData('gesmind_local_stores_registry');
        return stores.find((s: any) => s.id === storeId) || null;
    }

    try {
        await ensureAuthReady();
        const docRef = doc(db, "stores_registry", storeId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as StoreMetadata;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Erreur récupération metadata:", error);
        return null;
    }
};

export const deleteStoreFromDB = async (storeId: string) => {
  if (!db) {
      const stores = getLocalData('gesmind_local_stores_registry').filter((s: any) => s.id !== storeId);
      setLocalData('gesmind_local_stores_registry', stores);
      return true;
  }
  
  try {
    await ensureAuthReady();
    await deleteDoc(doc(db, "stores_registry", storeId));
    // In a real app we'd trigger a cloud function to delete the subcollections
    return true;
  } catch (error) {
    console.error("Erreur suppression boutique:", error);
    throw error;
  }
};

const subscribeToLocalCollection = (storeId: string, collectionName: string, callback: (data: any[]) => void) => {
    const key = `gesmind_local_${storeId}_${collectionName}`;
    const update = () => callback(getLocalData(key));
    if (!localListeners[key]) localListeners[key] = [];
    localListeners[key].push(update);
    update();
    return () => { localListeners[key] = localListeners[key].filter(cb => cb !== update); };
};

export const subscribeToInventory = (storeId: string, callback: (data: InventoryItem[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'inventory', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "inventory"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
      });
  });
};

export const subscribeToTransactions = (storeId: string, callback: (data: Transaction[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'transactions', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "transactions"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
      });
  });
};

export const subscribeToExpenses = (storeId: string, callback: (data: Expense[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'expenses', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "expenses"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
      });
  });
};

export const subscribeToUsers = (storeId: string, callback: (data: User[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'users', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "users"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
      });
  });
};

export const subscribeToEmployees = (storeId: string, callback: (data: Employee[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'employees', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "employees"), orderBy("fullName"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)));
      });
  });
};

export const subscribeToCustomers = (storeId: string, callback: (data: Customer[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'customers', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "customers"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
      });
  });
};

export const subscribeToSuppliers = (storeId: string, callback: (data: Supplier[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'suppliers', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "suppliers"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)));
      });
  });
};

export const subscribeToCashMovements = (storeId: string, callback: (data: CashMovement[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cash_movements', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "cash_movements"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashMovement)));
      });
  });
};

export const subscribeToCashClosings = (storeId: string, callback: (data: CashClosing[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cash_closings', callback);
  
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "cash_closings"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashClosing)));
      });
  });
};

export const subscribeToSettings = (storeId: string, callback: (data: StoreSettings | null) => void) => {
  if (!db) {
      const key = `gesmind_local_${storeId}_settings`;
      const update = () => {
          const raw = localStorage.getItem(key);
          callback(raw ? JSON.parse(raw) : null);
      };
      if (!localListeners[key]) localListeners[key] = [];
      localListeners[key].push(update);
      update();
      return () => { localListeners[key] = localListeners[key].filter(cb => cb !== update); };
  }
  
  return authGuard(() => {
      return onSnapshot(doc(db, "stores", storeId), (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data().settings as StoreSettings);
        } else {
          callback(null);
        }
      });
  });
};

// --- CRUD OPERATIONS ---

export const addData = async (storeId: string, collectionName: string, data: any) => {
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      const list = getLocalData(key);
      list.push(data);
      setLocalData(key, list);
      return;
  }
  await ensureAuthReady();
  const cleaned = cleanData(data);
  if (data.id) {
    await setDoc(doc(db, "stores", storeId, collectionName, data.id), cleaned);
  } else {
    await addDoc(collection(db, "stores", storeId, collectionName), cleaned);
  }
};

export const updateData = async (storeId: string, collectionName: string, docId: string, data: any) => {
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      let list = getLocalData(key);
      list = list.map((item: any) => item.id === docId ? { ...item, ...data } : item);
      setLocalData(key, list);
      return;
  }
  await ensureAuthReady();
  await updateDoc(doc(db, "stores", storeId, collectionName, docId), cleanData(data));
};

export const deleteData = async (storeId: string, collectionName: string, docId: string) => {
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      let list = getLocalData(key);
      list = list.filter((item: any) => item.id !== docId);
      setLocalData(key, list);
      return;
  }
  await ensureAuthReady();
  await deleteDoc(doc(db, "stores", storeId, collectionName, docId));
};

export const updateSettingsInDB = async (storeId: string, settings: StoreSettings) => {
  if (!db) {
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(settings));
      const regKey = 'gesmind_local_stores_registry';
      let stores = getLocalData(regKey);
      stores = stores.map((s: any) => s.id === storeId ? { ...s, name: settings.name, logoUrl: settings.logoUrl } : s);
      setLocalData(regKey, stores);
      emitLocalChange(`gesmind_local_${storeId}_settings`);
      return;
  }
  await ensureAuthReady();
  
  const cleanedSettings = cleanData(settings);
  await updateDoc(doc(db, "stores", storeId), { settings: cleanedSettings });
  
  const registryUpdate = { 
    name: settings.name,
    logoUrl: settings.logoUrl 
  };
  await updateDoc(doc(db, "stores_registry", storeId), cleanData(registryUpdate));
};
