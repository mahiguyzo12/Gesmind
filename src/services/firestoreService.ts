
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
  Timestamp
} from "firebase/firestore";
import { db, ensureAuthReady } from "../firebaseConfig";
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

        // Handle specific Firebase types if needed, generally treating as object is risky if circular
        // but simple data objects are fine.

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
    // Always clean data before stringifying to avoid circular errors
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
        return false;
    }
    try {
        await ensureAuthReady();
        await addDoc(collection(db, "message_queue"), cleanData({ type, to, subject, body, status: "PENDING", createdAt: new Date().toISOString() }));
        return true;
    } catch (e) {
        console.error("Erreur serveur:", e);
        return false;
    }
};

// --- STORE MANAGEMENT ---
export const createStoreInDB = async (storeId: string, metadata: StoreMetadata, settings: StoreSettings, initialAdmin: User, initialEmployee: Employee) => {
  if (!db) {
      const stores = getLocalData('gesmind_local_stores_registry');
      stores.push(metadata);
      setLocalData('gesmind_local_stores_registry', stores);
      // Clean settings before saving
      localStorage.setItem(`gesmind_local_${storeId}_settings`, JSON.stringify(cleanData(settings)));
      setLocalData(`gesmind_local_${storeId}_users`, [initialAdmin]);
      setLocalData(`gesmind_local_${storeId}_employees`, [initialEmployee]);
      return true;
  }
  try {
    await ensureAuthReady();
    await setDoc(doc(db, "stores_registry", storeId), cleanData(metadata));
    await setDoc(doc(db, "stores", storeId), { settings: cleanData(settings) });
    await setDoc(doc(db, "stores", storeId, "users", initialAdmin.id), cleanData(initialAdmin));
    await setDoc(doc(db, "stores", storeId, "employees", initialEmployee.id), cleanData(initialEmployee));
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
    await ensureAuthReady();
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

export const subscribeToInventory = (storeId: string, callback: (data: InventoryItem[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'inventory', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "inventory"), orderBy("name"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InventoryItem)));
      });
  });
};

// Using 'transactions' collection as in existing code, but implementing 'sales' logic
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

// Using 'cashClosings' (camelCase) to match prompt structure
export const subscribeToCashClosings = (storeId: string, callback: (data: CashClosing[]) => void) => {
  if (!db) return subscribeToLocalCollection(storeId, 'cashClosings', callback);
  return authGuard(() => {
      const q = query(collection(db, "stores", storeId, "cashClosings"), orderBy("date", "desc"));
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

// --- REGISTER STATUS CHECK (UX MANDATORY) ---
export const getRegisterStatus = async (storeId: string, registerId: string): Promise<RegisterStatus | null> => {
    // This function is kept for legacy compatibility, but checkTodayClosingStatus is preferred for UX.
    return { id: registerId, status: 'open' }; 
};

export const checkTodayClosingStatus = async (storeId: string, registerId: string): Promise<{isLocked: boolean, reopenAt?: Date}> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const closureId = `${todayStr}_${registerId}`;
    
    // Calculate reopen time (Midnight of next day)
    const now = new Date();
    const reopenAt = new Date(now);
    reopenAt.setHours(24, 0, 0, 0); // Set to next midnight

    if (!db) {
        const key = `gesmind_local_${storeId}_cashClosings`;
        const closings = getLocalData(key);
        const isClosed = closings.some((c: any) => c.id === closureId);
        return { isLocked: isClosed, reopenAt: isClosed ? reopenAt : undefined };
    }

    try {
        await ensureAuthReady();
        const docRef = doc(db, "stores", storeId, "cashClosings", closureId);
        const docSnap = await getDoc(docRef);
        
        const isLocked = docSnap.exists();
        return { isLocked, reopenAt: isLocked ? reopenAt : undefined };
    } catch (e) {
        console.error("Erreur vérification clôture:", e);
        return { isLocked: false }; // Fail open to avoid blocking sales on network error
    }
};

// --- CRUD OPERATIONS ---
export const addData = async (storeId: string, collectionName: string, data: any) => {
  const safeData = cleanData(data);
  if (!db) {
      const key = `gesmind_local_${storeId}_${collectionName}`;
      const list = getLocalData(key);
      list.push(safeData);
      setLocalData(key, list);
      return;
  }
  await ensureAuthReady();
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
  await ensureAuthReady();
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
  await ensureAuthReady();
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
  await ensureAuthReady();
  await updateDoc(doc(db, "stores", storeId), { settings: safeSettings });
  const registryUpdate = { name: settings.name, logoUrl: settings.logoUrl };
  await updateDoc(doc(db, "stores_registry", storeId), cleanData(registryUpdate));
};

// --- LOGIQUE MÉTIER CRITIQUE : CLÔTURE DE CAISSE (MANUELLE) ---

export const performCashClosing = async (
    storeId: string,
    closingData: CashClosing,
    transactionsToLock: string[]
) => {
    const safeClosing = cleanData(closingData);
    if (!db) {
        // Mode Local Simulation
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
        await ensureAuthReady();
        const batch = writeBatch(db);

        // 1. Création de la clôture (ID idempotent)
        const closingRef = doc(db, "stores", storeId, "cashClosings", closingData.id);
        batch.set(closingRef, safeClosing);

        // 2. Verrouillage des ventes (Max 500 ops in batch, chunking needed for production scale)
        // Note: For typical daily volume per register, 500 limit is okay for MVP.
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

// --- LOGIQUE MÉTIER CRITIQUE : RATTRAPAGE AUTOMATIQUE (LAZY CATCH-UP) ---

export const processForgottenClosings = async (
    storeId: string, 
    registerId: string, 
    userName: string
): Promise<number> => {
    if (!db) return 0; // Pas d'auto-close en mode local pour l'instant

    await ensureAuthReady();
    
    // Définir "Hier soir" (toutes les transactions strictement avant aujourd'hui 00:00)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayISO = today.toISOString();

    try {
        // 1. Récupérer toutes les transactions déverrouillées antérieures à aujourd'hui
        // NOTE: Optimization pour éviter l'index composite manquant (sellerId + date).
        // On récupère par sellerId et on filtre la date en JS.
        // Cela télécharge plus de docs mais garantit le fonctionnement sans index custom.
        const qTransactions = query(
            collection(db, "stores", storeId, "transactions"),
            where("sellerId", "==", registerId)
        );

        const txSnapshot = await getDocs(qTransactions);
        
        // 2. Filtrer en mémoire et Grouper par Date (YYYY-MM-DD)
        const groups: Record<string, Transaction[]> = {};
        
        txSnapshot.forEach(docSnap => {
            const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
            
            // FILTRE CLIENT-SIDE (Date < Today ET Non Verrouillé)
            if (tx.date < todayISO && !tx.isLocked) {
                const dateKey = new Date(tx.date).toISOString().split('T')[0];
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(tx);
            }
        });

        const datesToClose = Object.keys(groups);
        if (datesToClose.length === 0) return 0;

        console.log(`[AUTO-CLOSE] Détection de ${datesToClose.length} jours oubliés pour ${userName}.`);

        // 3. Pour chaque jour oublié, créer une clôture automatique
        // Attention: Idéalement un batch par jour pour éviter la limite de 500 ops
        let closingCount = 0;

        for (const dateKey of datesToClose) {
            const dayTxs = groups[dateKey];
            const closureId = `${dateKey}_${registerId}`; // ID Unique Idempotent

            // Vérifier si une clôture existe déjà (cas rare d'incohérence)
            const closingRef = doc(db, "stores", storeId, "cashClosings", closureId);
            const closingSnap = await getDoc(closingRef);

            const batch = writeBatch(db);

            if (closingSnap.exists()) {
                console.warn(`[AUTO-CLOSE] La clôture ${closureId} existe déjà. Verrouillage forcé des transactions orphelines.`);
                // On ne recrée pas la clôture, on verrouille juste les ventes oubliées
            } else {
                // Calculs pour la clôture automatique
                let totalSales = 0;
                let amountCash = 0;
                let amountMobile = 0;
                let amountCard = 0;

                dayTxs.forEach(tx => {
                    totalSales += tx.totalAmount;
                    if (tx.paymentMethod === 'MOBILE_MONEY') amountMobile += tx.amountPaid;
                    else if (tx.paymentMethod === 'CARD') amountCard += tx.amountPaid;
                    else amountCash += tx.amountPaid; // Default Cash
                });

                // Dans l'auto-close, on assume que le Réel = Théorique (pas de comptage physique)
                const autoClosing: CashClosing = {
                    id: closureId,
                    date: new Date(`${dateKey}T23:59:59`).toISOString(),
                    registerId: registerId,
                    closedBy: "system",
                    totalSales,
                    amountCash,
                    amountMobileMoney: amountMobile,
                    amountCard,
                    cashExpected: amountCash, // Approx: on ignore fond de caisse initial car donnée manquante
                    cashReal: amountCash,     // Forçage à l'équilibre
                    difference: 0,
                    status: 'closed',
                    autoClosed: true,
                    comment: "Clôture automatique (Oubli détecté)",
                    // Legacy fill
                    totalCashIn: amountCash,
                    totalCashOut: 0
                };

                batch.set(closingRef, cleanData(autoClosing));
            }

            // Verrouillage des ventes
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
