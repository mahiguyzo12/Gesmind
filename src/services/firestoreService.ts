
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
  getDoc,
  writeBatch,
  where,
  getDocs,
  Timestamp,
  collectionGroup
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { InventoryItem, Transaction, User, Customer, Supplier, CashMovement, CashClosing, StoreSettings, StoreMetadata, Expense, Employee, RegisterStatus } from "../../types";

// --- DEEP CLEAN HELPER (Prevents Circular JSON Errors) ---
const cleanData = (data: any) => {
    const seen = new WeakSet();
    const clone = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (seen.has(obj)) return null; // Break circular reference
        seen.add(obj);

        if (obj instanceof Date) return obj.toISOString();
        if (Array.isArray(obj)) return obj.map(clone);

        const res: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];
                if (val !== undefined && typeof val !== 'function') {
                    res[key] = clone(val);
                }
            }
        }
        return res;
    };
    return clone(data);
};

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
    try {
        localStorage.setItem(key, JSON.stringify(cleanData(data)));
        emitLocalChange(key);
    } catch (e) {
        console.error("Storage Error (setLocalData):", e);
    }
}

// --- FIRESTORE UTILS ---

const authGuard = (startSnapshot: () => () => void) => {
    let unsub: (() => void) | null = null;
    let cancelled = false;
    
    // Simple check: we assume the caller handles the "must be logged in" state via Auth component
    if (!cancelled) {
        unsub = startSnapshot();
    }
    return () => {
        cancelled = true;
        if (unsub) unsub();
    }
}

// --- USER AUTH LINKING ---

export const getUserByAuthUid = async (authUid: string): Promise<{user: User, storeId: string} | null> => {
    if (!db) return null;
    try {
        // Recherche de l'utilisateur dans toutes les sous-collections 'users' de toutes les boutiques
        const usersQuery = query(collectionGroup(db, 'users'), where('authUid', '==', authUid));
        const querySnapshot = await getDocs(usersQuery);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as User;
            // Le parent du parent du document user est le document store
            // structure: stores/{storeId}/users/{userId}
            const storeDocRef = userDoc.ref.parent.parent;
            
            if (storeDocRef) {
                return { user: { ...userData, id: userDoc.id }, storeId: storeDocRef.id };
            }
        }
        return null;
    } catch (error) {
        console.error("Erreur récupération user par Auth UID:", error);
        return null;
    }
};

export const getUserInStoreByAuthUid = async (storeId: string, authUid: string): Promise<User | null> => {
    if (!db) {
        const users = getLocalData(`gesmind_local_${storeId}_users`);
        return users.find((u: User) => u.authUid === authUid) || null;
    }
    try {
        const q = query(collection(db, "stores", storeId, "users"), where("authUid", "==", authUid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { ...userDoc.data(), id: userDoc.id } as User;
        }
        return null;
    } catch (error) {
        console.error("Erreur récupération user dans boutique:", error);
        return null;
    }
};

// --- STORE MANAGEMENT ---
export const createStoreInDB = async (storeId: string, metadata: StoreMetadata, settings: StoreSettings, initialAdmin: User, initialEmployee: Employee) => {
  // Mode Local
  if (!db) {
      const stores = getLocalData('gesmind_local_stores_registry');
      stores.push(metadata);
      setLocalData('gesmind_local_stores_registry', stores);
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(cleanData(settings)));
      setLocalData(`gesmind_local_${storeId}_users`, [initialAdmin]);
      setLocalData(`gesmind_local_${storeId}_employees`, [initialEmployee]);
      return true;
  }

  // Sécurité supplémentaire : Vérifier l'auth avant d'écrire
  if (!auth?.currentUser) {
      throw new Error("Utilisateur non authentifié (Session invalide). Veuillez vous reconnecter.");
  }

  try {
    const batch = writeBatch(db);
    
    // Création atomique de tous les documents initiaux pour éviter les états incohérents
    // Cela requiert les permissions 'create' sur les chemins concernés
    batch.set(doc(db, "stores_registry", storeId), cleanData(metadata));
    
    // UPDATE: Ajout de ownerUid pour satisfaire les règles de sécurité isOwner()
    batch.set(doc(db, "stores", storeId), { 
        settings: cleanData(settings),
        ownerUid: initialAdmin.authUid 
    });
    
    batch.set(doc(db, "stores", storeId, "users", initialAdmin.id), cleanData(initialAdmin));
    batch.set(doc(db, "stores", storeId, "employees", initialEmployee.id), cleanData(initialEmployee));

    // UPDATE: Ajout du membre pour satisfaire les règles de sécurité isMember()
    if (initialAdmin.authUid) {
        batch.set(doc(db, "stores", storeId, "members", initialAdmin.authUid), { 
            role: 'owner',
            userId: initialAdmin.id 
        });
    }

    await batch.commit();
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
        const docRef = doc(db, "stores_registry", storeId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as StoreMetadata : null;
    } catch (error) {
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
    await deleteDoc(doc(db, "stores_registry", storeId));
    return true;
  } catch (error) { throw error; }
};

const subscribeToLocalCollection = (storeId: string, collectionName: string, callback: (data: any[]) => void) => {
    const key = `gesmind_local_${storeId}_${collectionName}`;
    const update = () => callback(getLocalData(key));
    if (!localListeners[key]) localListeners[key] = [];
    localListeners[key].push(update);
    update();
    return () => { localListeners[key] = localListeners[key].filter(cb => cb !== update); };
};

// Generic error handler for snapshots to avoid Uncaught Exceptions
const handleSnapshotError = (err: any) => {
    console.warn("Firestore Snapshot Error (Permission denied or Network):", err.code);
    // Silent fail or specialized handling could go here
};

export const subscribeToInventory = (storeId: string, callback: (data: InventoryItem[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'inventory', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "inventory"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
      }, handleSnapshotError);
  });
};

export const subscribeToTransactions = (storeId: string, callback: (data: Transaction[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'transactions', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "transactions"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction)));
      }, handleSnapshotError);
  });
};

export const subscribeToExpenses = (storeId: string, callback: (data: Expense[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'expenses', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "expenses"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
      }, handleSnapshotError);
  });
};

export const subscribeToUsers = (storeId: string, callback: (data: User[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'users', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "users"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
      }, handleSnapshotError);
  });
};

export const subscribeToEmployees = (storeId: string, callback: (data: Employee[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'employees', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "employees"), orderBy("fullName"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)));
      }, handleSnapshotError);
  });
};

export const subscribeToCustomers = (storeId: string, callback: (data: Customer[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'customers', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "customers"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
      }, handleSnapshotError);
  });
};

export const subscribeToSuppliers = (storeId: string, callback: (data: Supplier[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'suppliers', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "suppliers"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Supplier)));
      }, handleSnapshotError);
  });
};

export const subscribeToCashMovements = (storeId: string, callback: (data: CashMovement[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cash_movements', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "cash_movements"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashMovement)));
      }, handleSnapshotError);
  });
};

export const subscribeToCashClosings = (storeId: string, callback: (data: CashClosing[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cashClosings', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "cashClosings"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashClosing)));
      }, handleSnapshotError);
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
          const data = docSnap.data();
          callback(data.settings as StoreSettings);
        } else {
          callback(null);
        }
      }, handleSnapshotError);
  });
};

export const addData = async (storeId: string, collectionName: string, data: any) => {
  const safeData = cleanData(data);
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      const list = getLocalData(key);
      list.push(safeData);
      setLocalData(key, list);
      return;
  }
  if (data.id) {
    await setDoc(doc(db, "stores", storeId, collectionName, data.id), safeData);
  } else {
    await addDoc(collection(db, "stores", storeId, collectionName), safeData);
  }
};

export const updateData = async (storeId: string, collectionName: string, docId: string, data: any) => {
  const safeData = cleanData(data);
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      let list = getLocalData(key);
      list = list.map((item: any) => item.id === docId ? { ...item, ...safeData } : item);
      setLocalData(key, list);
      return;
  }
  await updateDoc(doc(db, "stores", storeId, collectionName, docId), safeData);
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
  const safeSettings = cleanData(settings);
  if (!db) {
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(safeSettings));
      const regKey = 'gesmind_local_stores_registry';
      let stores = getLocalData(regKey);
      stores = stores.map((s: any) => s.id === storeId ? { ...s, name: settings.name, logoUrl: settings.logoUrl } : s);
      setLocalData(regKey, stores);
      emitLocalChange(`gesmind_local_${storeId}_settings`);
      return;
  }
  await updateDoc(doc(db, "stores", storeId), { settings: safeSettings });
  const registryUpdate = { name: settings.name, logoUrl: settings.logoUrl };
  await updateDoc(doc(db, "stores_registry", storeId), cleanData(registryUpdate));
};

export const performCashClosing = async (
    storeId: string,
    closingData: CashClosing,
    transactionsToLock: string[]
) => {
    const safeClosing = cleanData(closingData);
    if (!db) {
        const key = `gesmind_local_${storeId}_cashClosings`;
        const list = getLocalData(key);
        if (list.some((c: any) => c.id === closingData.id)) {
            throw new Error("Cette caisse est déjà clôturée pour cette date.");
        }
        list.push(safeClosing);
        setLocalData(key, list);

        const txKey = `gesmind_local_${storeId}_transactions`;
        let transactions = getLocalData(txKey);
        transactions = transactions.map((t: any) => 
            transactionsToLock.includes(t.id) ? { ...t, isLocked: true } : t
        );
        setLocalData(txKey, transactions);
        return true;
    }

    try {
        const batch = writeBatch(db);
        const closingRef = doc(db, "stores", storeId, "cashClosings", closingData.id);
        batch.set(closingRef, safeClosing);
        transactionsToLock.forEach(txId => {
            const txRef = doc(db, "stores", storeId, "transactions", txId);
            batch.update(txRef, { isLocked: true });
        });
        await batch.commit();
        return true;
    } catch (error: any) {
        console.error("Erreur Clôture:", error);
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            throw new Error("Clôture impossible : Déjà clôturé ou permission refusée.");
        }
        throw error;
    }
};

export const checkTodayClosingStatus = async (storeId: string, registerId: string): Promise<{isLocked: boolean, reopenAt?: Date}> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const closureId = `${todayStr}_${registerId}`;
    const now = new Date();
    const reopenAt = new Date(now);
    reopenAt.setHours(24, 0, 0, 0); 

    if (!db) {
        const key = `gesmind_local_${storeId}_cashClosings`;
        const closings = getLocalData(key);
        const isClosed = closings.some((c: any) => c.id === closureId);
        return { isLocked: isClosed, reopenAt: isClosed ? reopenAt : undefined };
    }

    try {
        const docRef = doc(db, "stores", storeId, "cashClosings", closureId);
        const docSnap = await getDoc(docRef);
        const isLocked = docSnap.exists();
        return { isLocked, reopenAt: isLocked ? reopenAt : undefined };
    } catch (e) {
        console.error("Erreur vérification clôture:", e);
        return { isLocked: false };
    }
};

export const processForgottenClosings = async (
    storeId: string, 
    registerId: string, 
    userName: string
): Promise<number> => {
    if (!db) return 0;

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayISO = today.toISOString();

    try {
        const qTransactions = query(
            collection(db, "stores", storeId, "transactions"),
            where("sellerId", "==", registerId)
        );

        const txSnapshot = await getDocs(qTransactions);
        const groups: Record<string, Transaction[]> = {};
        
        txSnapshot.forEach(docSnap => {
            const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
            if (tx.date < todayISO && !tx.isLocked) {
                const dateKey = new Date(tx.date).toISOString().split('T')[0];
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(tx);
            }
        });

        const datesToClose = Object.keys(groups);
        if (datesToClose.length === 0) return 0;

        let closingCount = 0;

        for (const dateKey of datesToClose) {
            const dayTxs = groups[dateKey];
            const closureId = `${dateKey}_${registerId}`;
            const closingRef = doc(db, "stores", storeId, "cashClosings", closureId);
            const closingSnap = await getDoc(closingRef);
            const batch = writeBatch(db);

            if (!closingSnap.exists()) {
                let totalSales = 0;
                let amountCash = 0;
                let amountMobile = 0;
                let amountCard = 0;

                dayTxs.forEach(tx => {
                    totalSales += tx.totalAmount;
                    if (tx.paymentMethod === 'MOBILE_MONEY') amountMobile += tx.amountPaid;
                    else if (tx.paymentMethod === 'CARD') amountCard += tx.amountPaid;
                    else amountCash += tx.amountPaid;
                });

                const autoClosing: CashClosing = {
                    id: closureId,
                    date: new Date(`${dateKey}T23:59:59`).toISOString(),
                    registerId: registerId,
                    closedBy: "system",
                    totalSales,
                    amountCash,
                    amountMobileMoney: amountMobile,
                    amountCard,
                    cashExpected: amountCash, 
                    cashReal: amountCash,     
                    difference: 0,
                    status: 'closed',
                    autoClosed: true,
                    comment: "Clôture automatique (Oubli détecté)",
                    totalCashIn: amountCash,
                    totalCashOut: 0
                };
                batch.set(closingRef, cleanData(autoClosing));
            }

            dayTxs.forEach(tx => {
                batch.update(doc(db, "stores", storeId, "transactions", tx.id), { isLocked: true });
            });

            await batch.commit();
            closingCount++;
        }
        return closingCount;
    } catch (e) {
        console.error("Erreur processForgottenClosings:", e);
        return 0;
    }
};
