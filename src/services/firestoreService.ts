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
  Firestore,
} from 'firebase/firestore';
import { db, ensureAuthReady } from '../firebaseConfig';
import {
  InventoryItem,
  Transaction,
  User,
  Customer,
  Supplier,
  CashMovement,
  CashClosing,
  StoreSettings,
  StoreMetadata,
  Expense,
  Employee,
  RegisterStatus,
} from '../../types';

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
    localListeners[key].forEach((cb) => cb());
  }
};

const getLocalData = (key: string): any[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const setLocalData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(cleanData(data)));
    emitLocalChange(key);
  } catch (e) {
    console.error('Storage Error (setLocalData):', e);
  }
};

// --- FIRESTORE UTILS ---

const authGuard = (startSnapshot: () => () => void) => {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  ensureAuthReady().then(() => {
    if (!cancelled && db) {
      // Guard db existence
      unsub = startSnapshot();
    }
  });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
};

// --- MESSAGING SERVER TRIGGER ---
export const sendCloudMessage = async (
  type: 'EMAIL' | 'SMS',
  to: string,
  subject: string,
  body: string
) => {
  await ensureAuthReady();
  if (!db) {
    console.warn("Mode Local : Impossible d'envoyer des messages Cloud réels.");
    return false;
  }
  try {
    await addDoc(
      collection(db, 'message_queue'),
      cleanData({
        type,
        to,
        subject,
        body,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      })
    );
    return true;
  } catch (e) {
    console.error('Erreur serveur:', e);
    return false;
  }
};

// --- STORE MANAGEMENT ---
export const createStoreInDB = async (
  storeId: string,
  metadata: StoreMetadata,
  settings: StoreSettings,
  initialAdmin: User,
  initialEmployee: Employee
) => {
  await ensureAuthReady();
  if (!db) {
    const stores = getLocalData('gesmind_local_stores_registry');
    stores.push(metadata);
    setLocalData('gesmind_local_stores_registry', stores);
    localStorage.setItem(
      `gesmind_local_${storeId}_settings`,
      JSON.stringify(cleanData(settings))
    );
    setLocalData(`gesmind_local_${storeId}_users`, [initialAdmin]);
    setLocalData(`gesmind_local_${storeId}_employees`, [initialEmployee]);
    return true;
  }
  try {
    await setDoc(doc(db, 'stores_registry', storeId), cleanData(metadata));
    await setDoc(doc(db, 'stores', storeId), { settings: cleanData(settings) });
    await setDoc(
      doc(db, 'stores', storeId, 'users', initialAdmin.id),
      cleanData(initialAdmin)
    );
    await setDoc(
      doc(db, 'stores', storeId, 'employees', initialEmployee.id),
      cleanData(initialEmployee)
    );
    return true;
  } catch (error) {
    console.error('Erreur création boutique:', error);
    throw error;
  }
};

export const getStoreMetadata = async (
  storeId: string
): Promise<StoreMetadata | null> => {
  await ensureAuthReady();
  if (!db) {
    const stores = getLocalData('gesmind_local_stores_registry');
    return stores.find((s: any) => s.id === storeId) || null;
  }
  try {
    const docRef = doc(db, 'stores_registry', storeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as StoreMetadata;
    }
    console.error(`Store with ID '${storeId}' not found in registry.`);
    return null;
  } catch (error) {
    console.error(`Error fetching store metadata for ID '${storeId}':`, error);
    return null;
  }
};

export const deleteStoreFromDB = async (storeId: string) => {
  await ensureAuthReady();
  if (!db) {
    const stores = getLocalData('gesmind_local_stores_registry').filter(
      (s: any) => s.id !== storeId
    );
    setLocalData('gesmind_local_stores_registry', stores);
    return true;
  }
  try {
    await deleteDoc(doc(db, 'stores_registry', storeId));
    return true;
  } catch (error) {
    throw error;
  }
};

const subscribeToLocalCollection = (
  storeId: string,
  collectionName: string,
  callback: (data: any[]) => void
) => {
  const key = `gesmind_local_${storeId}_${collectionName}`;
  const update = () => callback(getLocalData(key));
  if (!localListeners[key]) localListeners[key] = [];
  localListeners[key].push(update);
  update();
  return () => {
    localListeners[key] = localListeners[key].filter((cb) => cb !== update);
  };
};

// Generic subscription function with null guard
const subscribeToCollection = (
  storeId: string,
  collectionName: string,
  callback: (data: any[]) => void,
  orderField: string = 'name',
  orderDir: 'asc' | 'desc' = 'asc'
) => {
  if (!db) return subscribeToLocalCollection(storeId, collectionName, callback);

  return authGuard(() => {
    if (!db) return () => {}; // Should not happen due to outer check, but for TS safety
    const q = query(
      collection(db, 'stores', storeId, collectionName),
      orderBy(orderField, orderDir)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
  });
};

export const subscribeToInventory = (
  storeId: string,
  callback: (data: InventoryItem[]) => void
) => subscribeToCollection(storeId, 'inventory', callback, 'name');

export const subscribeToTransactions = (
  storeId: string,
  callback: (data: Transaction[]) => void
) => subscribeToCollection(storeId, 'transactions', callback, 'date', 'desc');

export const subscribeToExpenses = (
  storeId: string,
  callback: (data: Expense[]) => void
) => subscribeToCollection(storeId, 'expenses', callback, 'date', 'desc');

export const subscribeToUsers = (
  storeId: string,
  callback: (data: User[]) => void
) => subscribeToCollection(storeId, 'users', callback, 'name');

export const subscribeToEmployees = (
  storeId: string,
  callback: (data: Employee[]) => void
) => subscribeToCollection(storeId, 'employees', callback, 'fullName');

export const subscribeToCustomers = (
  storeId: string,
  callback: (data: Customer[]) => void
) => subscribeToCollection(storeId, 'customers', callback, 'name');

export const subscribeToSuppliers = (
  storeId: string,
  callback: (data: Supplier[]) => void
) => subscribeToCollection(storeId, 'suppliers', callback, 'name');

export const subscribeToCashMovements = (
  storeId: string,
  callback: (data: CashMovement[]) => void
) => subscribeToCollection(storeId, 'cash_movements', callback, 'date', 'desc');

export const subscribeToCashClosings = (
  storeId: string,
  callback: (data: CashClosing[]) => void
) => subscribeToCollection(storeId, 'cashClosings', callback, 'date', 'desc');

export const subscribeToSettings = (
  storeId: string,
  callback: (data: StoreSettings | null) => void
) => {
  if (!db) {
    const key = `gesmind_local_${storeId}_settings`;
    const update = () => {
      const raw = localStorage.getItem(key);
      callback(raw ? JSON.parse(raw) : null);
    };
    if (!localListeners[key]) localListeners[key] = [];
    localListeners[key].push(update);
    update();
    return () => {
      localListeners[key] = localListeners[key].filter((cb) => cb !== update);
    };
  }
  return authGuard(() => {
    if (!db) return () => {}; // Safety guard
    return onSnapshot(doc(db, 'stores', storeId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().settings as StoreSettings);
      } else {
        callback(null);
      }
    });
  });
};

// --- REGISTER STATUS CHECK (UX MANDATORY) ---
export const checkTodayClosingStatus = async (
  storeId: string,
  registerId: string
): Promise<{ isLocked: boolean; reopenAt?: Date }> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const closureId = `${todayStr}_${registerId}`;

  const now = new Date();
  const reopenAt = new Date(now);
  reopenAt.setHours(24, 0, 0, 0); // Set to next midnight

  await ensureAuthReady();
  if (!db) {
    const key = `gesmind_local_${storeId}_cashClosings`;
    const closings = getLocalData(key);
    const isClosed = closings.some((c: any) => c.id === closureId);
    return { isLocked: isClosed, reopenAt: isClosed ? reopenAt : undefined };
  }

  try {
    const docRef = doc(db, 'stores', storeId, 'cashClosings', closureId);
    const docSnap = await getDoc(docRef);
    const isLocked = docSnap.exists();
    return { isLocked, reopenAt: isLocked ? reopenAt : undefined };
  } catch (e) {
    console.error('Erreur vérification clôture:', e);
    return { isLocked: false }; // Fail open
  }
};

// --- CRUD OPERATIONS ---
export const addData = async (
  storeId: string,
  collectionName: string,
  data: any
) => {
  const safeData = cleanData(data);
  await ensureAuthReady();
  if (!db) {
    const key = `gesmind_local_${storeId}_${collectionName}`;
    const list = getLocalData(key);
    list.push(safeData);
    setLocalData(key, list);
    return;
  }
  if (data.id) {
    await setDoc(doc(db, 'stores', storeId, collectionName, data.id), safeData);
  } else {
    await addDoc(collection(db, 'stores', storeId, collectionName), safeData);
  }
};

export const updateData = async (
  storeId: string,
  collectionName: string,
  docId: string,
  data: any
) => {
  const safeData = cleanData(data);
  await ensureAuthReady();
  if (!db) {
    const key = `gesmind_local_${storeId}_${collectionName}`;
    let list = getLocalData(key);
    list = list.map((item: any) =>
      item.id === docId ? { ...item, ...safeData } : item
    );
    setLocalData(key, list);
    return;
  }
  await updateDoc(doc(db, 'stores', storeId, collectionName, docId), safeData);
};

export const deleteData = async (
  storeId: string,
  collectionName: string,
  docId: string
) => {
  await ensureAuthReady();
  if (!db) {
    const key = `gesmind_local_${storeId}_${collectionName}`;
    let list = getLocalData(key);
    list = list.filter((item: any) => item.id !== docId);
    setLocalData(key, list);
    return;
  }
  await deleteDoc(doc(db, 'stores', storeId, collectionName, docId));
};

export const updateSettingsInDB = async (
  storeId: string,
  settings: StoreSettings
) => {
  const safeSettings = cleanData(settings);
  await ensureAuthReady();
  if (!db) {
    localStorage.setItem(
      `gesmind_local_${storeId}_settings`,
      JSON.stringify(safeSettings)
    );
    const regKey = 'gesmind_local_stores_registry';
    let stores = getLocalData(regKey);
    stores = stores.map((s: any) =>
      s.id === storeId
        ? { ...s, name: settings.name, logoUrl: settings.logoUrl }
        : s
    );
    setLocalData(regKey, stores);
    emitLocalChange(`gesmind_local_${storeId}_settings`);
    return;
  }
  await updateDoc(doc(db, 'stores', storeId), { settings: safeSettings });
  const registryUpdate = { name: settings.name, logoUrl: settings.logoUrl };
  await updateDoc(
    doc(db, 'stores_registry', storeId),
    cleanData(registryUpdate)
  );
};

// --- LOGIQUE MÉTIER CRITIQUE : CLÔTURE DE CAISSE (MANUELLE) ---
export const performCashClosing = async (
  storeId: string,
  closingData: CashClosing,
  transactionsToLock: string[]
) => {
  const safeClosing = cleanData(closingData);
  await ensureAuthReady();
  if (!db) {
    // Mode Local Simulation
    const key = `gesmind_local_${storeId}_cashClosings`;
    const list = getLocalData(key);
    if (list.some((c: any) => c.id === closingData.id)) {
      throw new Error('Cette caisse est déjà clôturée pour cette date.');
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
    const dbInstance = db; // Create a local, non-null reference
    const batch = writeBatch(dbInstance);
    const closingRef = doc(
      dbInstance,
      'stores',
      storeId,
      'cashClosings',
      closingData.id
    );
    batch.set(closingRef, safeClosing);

    transactionsToLock.forEach((txId) => {
      const txRef = doc(dbInstance, 'stores', storeId, 'transactions', txId);
      batch.update(txRef, { isLocked: true });
    });

    await batch.commit();
    return true;
  } catch (error: any) {
    console.error('Erreur Clôture:', error);
    if (
      error.code === 'permission-denied' ||
      error.message.includes('permission')
    ) {
      throw new Error(
        'Clôture impossible : Déjà clôturé ou permission refusée.'
      );
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
  await ensureAuthReady();
  if (!db) return 0; // Pas d'auto-close en mode local pour l'instant

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    const qTransactions = query(
      collection(db, 'stores', storeId, 'transactions'),
      where('sellerId', '==', registerId)
    );

    const txSnapshot = await getDocs(qTransactions);

    const groups: Record<string, Transaction[]> = {};

    txSnapshot.forEach((docSnap) => {
      const tx = { id: docSnap.id, ...docSnap.data() } as Transaction;
      if (tx.date < todayISO && !tx.isLocked) {
        const dateKey = new Date(tx.date).toISOString().split('T')[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(tx);
      }
    });

    const datesToClose = Object.keys(groups);
    if (datesToClose.length === 0) return 0;

    console.log(
      `[AUTO-CLOSE] Détection de ${datesToClose.length} jours oubliés pour ${userName}.`
    );

    let closingCount = 0;

    for (const dateKey of datesToClose) {
      const dayTxs = groups[dateKey];
      const closureId = `${dateKey}_${registerId}`;
      const closingRef = doc(db, 'stores', storeId, 'cashClosings', closureId);
      const closingSnap = await getDoc(closingRef);
      const batch = writeBatch(db);

      if (closingSnap.exists()) {
        console.warn(
          `[AUTO-CLOSE] La clôture ${closureId} existe déjà. Verrouillage forcé des transactions orphelines.`
        );
      } else {
        let totalSales = 0,
          amountCash = 0,
          amountMobile = 0,
          amountCard = 0;
        dayTxs.forEach((tx) => {
          totalSales += tx.totalAmount;
          if (tx.paymentMethod === 'MOBILE_MONEY')
            amountMobile += tx.amountPaid;
          else if (tx.paymentMethod === 'CARD') amountCard += tx.amountPaid;
          else amountCash += tx.amountPaid;
        });

        const autoClosing: CashClosing = {
          id: closureId,
          date: new Date(`${dateKey}T23:59:59`).toISOString(),
          registerId: registerId,
          closedBy: 'system',
          totalSales,
          amountCash,
          amountMobileMoney: amountMobile,
          amountCard,
          cashExpected: amountCash,
          cashReal: amountCash,
          difference: 0,
          status: 'closed',
          autoClosed: true,
          comment: 'Clôture automatique (Oubli détecté)',
          totalCashIn: amountCash,
          totalCashOut: 0,
        };
        batch.set(closingRef, cleanData(autoClosing));
      }

      dayTxs.forEach((tx) => {
        if (db) {
          batch.update(doc(db, 'stores', storeId, 'transactions', tx.id), {
            isLocked: true,
          });
        }
      });

      await batch.commit();
      closingCount++;
    }

    return closingCount;
  } catch (e) {
    console.error('Erreur processForgottenClosings:', e);
    return 0;
  }
};
