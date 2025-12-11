
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy
} from "firebase/firestore";
import { db } from "../firebaseConfig";
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

// --- STORE MANAGEMENT ---

export const createStoreInDB = async (storeId: string, metadata: StoreMetadata, settings: StoreSettings, initialAdmin: User) => {
  if (!db) {
      // Local Mode
      const stores = getLocalData('gesmind_local_stores_registry');
      stores.push(metadata);
      setLocalData('gesmind_local_stores_registry', stores);
      
      // Init Settings
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(settings));
      
      // Init Users
      setLocalData(`gesmind_local_${storeId}_users`, [initialAdmin]);
      
      return true;
  }
  
  // Cloud Mode
  try {
    await setDoc(doc(db, "stores_registry", storeId), metadata);
    await setDoc(doc(db, "stores", storeId), { settings });
    await setDoc(doc(db, "stores", storeId, "users", initialAdmin.id), initialAdmin);
    return true;
  } catch (error) {
    console.error("Erreur création boutique:", error);
    throw error;
  }
};

export const subscribeToStoresRegistry = (callback: (stores: StoreMetadata[]) => void) => {
  if (!db) {
      const key = 'gesmind_local_stores_registry';
      const update = () => callback(getLocalData(key));
      if (!localListeners[key]) localListeners[key] = [];
      localListeners[key].push(update);
      update();
      return () => { localListeners[key] = localListeners[key].filter(cb => cb !== update); };
  }
  
  const q = query(collection(db, "stores_registry"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const stores = snapshot.docs.map(doc => doc.data() as StoreMetadata);
    callback(stores);
  }, (error) => {
    console.error("Erreur subscription stores:", error);
    callback([]);
  });
};

export const deleteStoreFromDB = async (storeId: string) => {
  if (!db) {
      const stores = getLocalData('gesmind_local_stores_registry').filter((s: any) => s.id !== storeId);
      setLocalData('gesmind_local_stores_registry', stores);
      // Nettoyage complet idéalement, mais le registre suffit pour masquer
      return true;
  }
  
  try {
    await deleteDoc(doc(db, "stores_registry", storeId));
    return true;
  } catch (error) {
    console.error("Erreur suppression boutique:", error);
    throw error;
  }
};

// --- GENERIC LOCAL SUBSCRIBER ---
const subscribeToLocalCollection = (storeId: string, collection: string, callback: (data: any[]) => void) => {
    const key = `gesmind_local_${storeId}_${collection}`;
    const update = () => callback(getLocalData(key));
    if (!localListeners[key]) localListeners[key] = [];
    localListeners[key].push(update);
    update();
    return () => { localListeners[key] = localListeners[key].filter(cb => cb !== update); };
};

// --- DATA LISTENERS (REALTIME) ---

export const subscribeToInventory = (storeId: string, callback: (data: InventoryItem[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'inventory', callback);
  const q = query(collection(db, "stores", storeId, "inventory"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
  });
};

export const subscribeToTransactions = (storeId: string, callback: (data: Transaction[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'transactions', callback);
  const q = query(collection(db, "stores", storeId, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
  });
};

export const subscribeToExpenses = (storeId: string, callback: (data: Expense[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'expenses', callback);
  const q = query(collection(db, "stores", storeId, "expenses"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
  });
};

export const subscribeToUsers = (storeId: string, callback: (data: User[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'users', callback);
  const q = query(collection(db, "stores", storeId, "users"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
  });
};

// New Listener for Employees
export const subscribeToEmployees = (storeId: string, callback: (data: Employee[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'employees', callback);
  const q = query(collection(db, "stores", storeId, "employees"), orderBy("fullName"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)));
  });
};

export const subscribeToCustomers = (storeId: string, callback: (data: Customer[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'customers', callback);
  const q = query(collection(db, "stores", storeId, "customers"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
  });
};

export const subscribeToSuppliers = (storeId: string, callback: (data: Supplier[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'suppliers', callback);
  const q = query(collection(db, "stores", storeId, "suppliers"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)));
  });
};

export const subscribeToCashMovements = (storeId: string, callback: (data: CashMovement[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cash_movements', callback);
  const q = query(collection(db, "stores", storeId, "cash_movements"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashMovement)));
  });
};

export const subscribeToCashClosings = (storeId: string, callback: (data: CashClosing[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cash_closings', callback);
  const q = query(collection(db, "stores", storeId, "cash_closings"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashClosing)));
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
  return onSnapshot(doc(db, "stores", storeId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().settings as StoreSettings);
    } else {
      callback(null);
    }
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
  if (data.id) {
    await setDoc(doc(db, "stores", storeId, collectionName, data.id), data);
  } else {
    await addDoc(collection(db, "stores", storeId, collectionName), data);
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
  await updateDoc(doc(db, "stores", storeId, collectionName, docId), data);
};

export const deleteData = async (storeId: string, collectionName: string, docId: string) => {
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      let list = getLocalData(key);
      list = list.filter((item: any) => item.id !== docId);
      setLocalData(key, list);
      return;
  }
  await deleteDoc(doc(db, "stores", storeId, collectionName, docId));
};

export const updateSettingsInDB = async (storeId: string, settings: StoreSettings) => {
  if (!db) {
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(settings));
      // Update Registry Metadata too
      const regKey = 'gesmind_local_stores_registry';
      let stores = getLocalData(regKey);
      stores = stores.map((s: any) => s.id === storeId ? { ...s, name: settings.name, logoUrl: settings.logoUrl } : s);
      setLocalData(regKey, stores);
      
      // Trigger listener
      emitLocalChange(`gesmind_local_${storeId}_settings`);
      return;
  }
  await updateDoc(doc(db, "stores", storeId), { settings });
  await updateDoc(doc(db, "stores_registry", storeId), { 
    name: settings.name,
    logoUrl: settings.logoUrl 
  });
};
