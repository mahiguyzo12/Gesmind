import React, { useState, useEffect } from 'react';
import { HomeMenu } from './components/HomeMenu';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { AIAdvisor } from './components/AIAdvisor';
import { Commercial } from './components/Commercial';
import { Personnel } from './components/Personnel';
import { Auth } from './components/Auth';
import { Users } from './components/Users';
import { Treasury } from './components/Treasury';
import { Settings } from './components/Settings';
import { GlobalSearch } from './components/GlobalSearch';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Expenses } from './components/Expenses';
import { UpdateBanner } from './components/UpdateBanner';
import { Toast } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';
import { LoadingScreen } from './components/LoadingScreen'; // IMPORT AJOUTÉ
import {
  InventoryItem,
  ViewState,
  Transaction,
  User,
  CashMovement,
  StoreSettings,
  BackupData,
  CashClosing,
  Customer,
  Supplier,
  AppUpdate,
  StoreMetadata,
  Expense,
  Employee,
} from './types';
import { CURRENCIES, PERMISSION_CATEGORIES } from './constants';
import { checkForUpdates } from './services/updateService';
import { LogOut, Eye, X } from 'lucide-react';
import { getTranslation } from './translations';
import { db, setupFirebase } from './src/firebaseConfig';
import {
  createStoreInDB,
  deleteStoreFromDB,
  subscribeToInventory,
  subscribeToTransactions,
  subscribeToUsers,
  subscribeToEmployees,
  subscribeToCustomers,
  subscribeToSuppliers,
  subscribeToCashMovements,
  subscribeToCashClosings,
  subscribeToSettings,
  subscribeToExpenses,
  addData,
  updateData,
  deleteData,
  updateSettingsInDB,
  getStoreMetadata,
  processForgottenClosings,
} from './src/services/firestoreService';

import { auth } from './authService';
const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Gesmind',
  address: '',
  phone: '',
  email: '',
  language: 'fr',
  cloudProvider: 'NONE',
  themeMode: 'light',
  themeColor: '#4f46e5',
  githubRepo: 'mahiguyzo12/Gesmind',
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);

  const [isLaunching, setIsLaunching] = useState(true);
  const [isCreatingStoreLoading, setIsCreatingStoreLoading] = useState(false);

  const [supervisionTarget, setSupervisionTarget] = useState<User | null>(null);

  const [knownStores, setKnownStores] = useState<StoreMetadata[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDbConfigured, setIsDbConfigured] = useState(
    !!db || localStorage.getItem('gesmind_db_mode') === 'LOCAL'
  );
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);

  const [currencyCode, setCurrencyCode] = useState<string>('EUR');
  const [storeSettings, setStoreSettings] =
    useState<StoreSettings>(DEFAULT_SETTINGS);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(
    null
  );

  // --- INITIALISATION ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (db && !isDbConfigured) setIsDbConfigured(true);

        // Simulation rapide des tâches de fond pendant le splash
        await new Promise((r) => setTimeout(r, 500));

        const savedStores = localStorage.getItem('gesmind_known_stores');
        const lastStore = localStorage.getItem('gesmind_last_store_id');
        const savedCurrency = localStorage.getItem('gesmind_local_currency');

        if (savedStores) {
          try {
            const list = JSON.parse(savedStores);
            setKnownStores(list);
            if (list.length > 0 && lastStore) setCurrentStoreId(lastStore);
            else if (list.length > 0) setCurrentStoreId(list[0].id);
          } catch (e) {
            console.error('Error loading stores', e);
          }
        }

        if (savedCurrency) setCurrencyCode(savedCurrency);

        // Note: on ne set pas isLaunching à false ici, c'est le SplashScreen qui appellera le callback
      } catch (error) {
        console.error('Erreur init', error);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (knownStores.length > 0)
      localStorage.setItem('gesmind_known_stores', JSON.stringify(knownStores));
  }, [knownStores]);

  useEffect(() => {
    if (currentStoreId)
      localStorage.setItem('gesmind_last_store_id', currentStoreId);
  }, [currentStoreId]);

  useEffect(() => {
    if (!currentStoreId || !isDbConfigured) return;
    setInventory([]);
    setTransactions([]);
    setUsers([]);
    setEmployees([]);
    setCustomers([]);
    setSuppliers([]);
    setExpenses([]);
    setCashMovements([]);
    setCashClosings([]);

    const unsubInv = subscribeToInventory(currentStoreId, setInventory);
    const unsubTx = subscribeToTransactions(currentStoreId, setTransactions);
    const unsubUsers = subscribeToUsers(currentStoreId, setUsers);
    const unsubEmps = subscribeToEmployees(currentStoreId, setEmployees);
    const unsubCust = subscribeToCustomers(currentStoreId, setCustomers);
    const unsubSupp = subscribeToSuppliers(currentStoreId, setSuppliers);
    const unsubExp = subscribeToExpenses(currentStoreId, setExpenses);
    const unsubCash = subscribeToCashMovements(
      currentStoreId,
      setCashMovements
    );
    const unsubClose = subscribeToCashClosings(currentStoreId, setCashClosings);

    const unsubSettings = subscribeToSettings(currentStoreId, (settings) => {
      if (settings) {
        setStoreSettings(settings);
        setKnownStores((prev) =>
          prev.map((s) =>
            s.id === currentStoreId
              ? { ...s, name: settings.name, logoUrl: settings.logoUrl }
              : s
          )
        );
      }
    });

    setCurrentView(ViewState.LOGIN);
    setCurrentUser(null);
    setSupervisionTarget(null);

    return () => {
      unsubInv();
      unsubTx();
      unsubUsers();
      unsubEmps();
      unsubCust();
      unsubSupp();
      unsubExp();
      unsubCash();
      unsubClose();
      unsubSettings();
    };
  }, [currentStoreId, isDbConfigured]);

  // --- AUTOMATIC CLOSING CHECK ---
  useEffect(() => {
    if (currentUser && currentStoreId && isDbConfigured) {
      const runAutoCloseCheck = async () => {
        const closedCount = await processForgottenClosings(
          currentStoreId,
          currentUser.id,
          currentUser.name
        );
        if (closedCount > 0) {
          showToast(
            `${closedCount} journée(s) précédente(s) clôturée(s) automatiquement.`,
            'info'
          );
        }
      };
      setTimeout(runAutoCloseCheck, 3000);
    }
  }, [currentUser, currentStoreId, isDbConfigured]);

  useEffect(() => {
    if (!currentUser || !currentStoreId) return;
    const updateHeartbeat = () => {
      const now = new Date().toISOString();
      updateData(currentStoreId, 'users', currentUser.id, { lastLogin: now });
    };
    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 120000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentStoreId]);

  useEffect(() => {
    const check = async () => {
      if (storeSettings.githubRepo) {
        try {
          const update = await checkForUpdates(storeSettings.githubRepo);
          if (update.hasUpdate) setAvailableUpdate(update);
        } catch {
          console.error('Auto update check failed');
        }
      }
    };
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, [storeSettings.githubRepo]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (storeSettings.themeMode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.setProperty(
      '--primary-color',
      storeSettings.themeColor || '#4f46e5'
    );
  }, [storeSettings.themeMode, storeSettings.themeColor]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => setToast({ message, type });

  const handleDbSetup = (configJson: string) => {
    const success = setupFirebase(configJson);
    if (success) {
      setIsDbConfigured(true);
      showToast('Configuration Firebase appliquée avec succès !', 'success');
      return true;
    }
    showToast('Erreur de configuration. Vérifiez le format JSON.', 'error');
    return false;
  };

  const handleFindStore = async (
    storeId: string
  ): Promise<StoreMetadata | null> => {
    const known = knownStores.find((s) => s.id === storeId);
    if (known) return known;
    const metadata = await getStoreMetadata(storeId);
    if (metadata) return metadata;
    else {
      showToast('Aucune boutique trouvée avec cet ID.', 'error');
      return null;
    }
  };

  const handleAddKnownStore = (metadata: StoreMetadata) => {
    if (!knownStores.some((s) => s.id === metadata.id))
      setKnownStores((prev) => [...prev, metadata]);
    setCurrentStoreId(metadata.id);
    showToast('Boutique sélectionnée !', 'success');
  };

  const saveStoreSettings = (newData: StoreSettings) => {
    if (currentStoreId) {
      updateSettingsInDB(currentStoreId, newData);
      showToast('Paramètres sauvegardés', 'success');
    }
  };

  const saveCurrency = (code: string) => {
    setCurrencyCode(code);
    localStorage.setItem('gesmind_local_currency', code);
    showToast('Devise mise à jour', 'info');
  };

  const selectedCurrency = CURRENCIES[currencyCode] || CURRENCIES['EUR'];

  // ... (CRUD Handlers kept identical) ...
  const handleAddItem = (item: InventoryItem) => {
    if (!currentStoreId) return;
    if (supervisionTarget) item.createdBy = supervisionTarget.id;
    addData(currentStoreId, 'inventory', item);
    showToast('Produit ajouté', 'success');
  };
  const handleUpdateItem = (id: string, updatedItem: Partial<InventoryItem>) =>
    currentStoreId && updateData(currentStoreId, 'inventory', id, updatedItem);
  const handleDeleteItem = (id: string) => {
    if (currentStoreId) {
      deleteData(currentStoreId, 'inventory', id);
      showToast('Produit supprimé', 'info');
    }
  };
  const handleAddUser = (user: User) => {
    if (currentStoreId) {
      addData(currentStoreId, 'users', user);
      showToast('Utilisateur créé', 'success');
    }
  };
  const handleUpdateUser = (id: string, updatedData: Partial<User>) => {
    if (currentStoreId) {
      updateData(currentStoreId, 'users', id, updatedData);
      if (currentUser && currentUser.id === id)
        setCurrentUser({ ...currentUser, ...updatedData });
      showToast('Utilisateur mis à jour', 'success');
    }
  };
  const handleDeleteUser = (id: string) =>
    currentStoreId && deleteData(currentStoreId, 'users', id);
  const handleAddEmployee = (emp: Employee) => {
    if (currentStoreId) {
      addData(currentStoreId, 'employees', emp);
      showToast('Dossier employé créé', 'success');
    }
  };
  const handleUpdateEmployee = (id: string, updatedData: Partial<Employee>) =>
    currentStoreId && updateData(currentStoreId, 'employees', id, updatedData);
  const handleDeleteEmployee = (id: string) =>
    currentStoreId && deleteData(currentStoreId, 'employees', id);
  const handleAddCustomer = (c: Customer) => {
    if (currentStoreId) {
      addData(currentStoreId, 'customers', c);
      showToast('Client ajouté', 'success');
    }
  };
  const handleUpdateCustomer = (id: string, d: Partial<Customer>) =>
    currentStoreId && updateData(currentStoreId, 'customers', id, d);
  const handleDeleteCustomer = (id: string) =>
    currentStoreId && deleteData(currentStoreId, 'customers', id);
  const handleAddSupplier = (s: Supplier) => {
    if (currentStoreId) {
      addData(currentStoreId, 'suppliers', s);
      showToast('Fournisseur ajouté', 'success');
    }
  };
  const handleUpdateSupplier = (id: string, d: Partial<Supplier>) =>
    currentStoreId && updateData(currentStoreId, 'suppliers', id, d);
  const handleDeleteSupplier = (id: string) =>
    currentStoreId && deleteData(currentStoreId, 'suppliers', id);
  const handleAddExpense = (expense: Expense) => {
    if (currentStoreId) {
      if (supervisionTarget)
        expense.paidBy = `${currentUser?.name} (pour ${supervisionTarget.name})`;
      addData(currentStoreId, 'expenses', expense);
      const movement: CashMovement = {
        id: `m-exp-${Date.now()}`,
        date: expense.date,
        type: 'EXPENSE',
        amount: expense.amount,
        description: `Dépense : ${expense.description} (${expense.category})`,
        performedBy: expense.paidBy,
      };
      addData(currentStoreId, 'cash_movements', movement);
      showToast('Dépense enregistrée', 'success');
    }
  };
  const handleDeleteExpense = (id: string) =>
    currentStoreId && deleteData(currentStoreId, 'expenses', id);
  const handlePaySalary = (
    employee: Employee,
    amountDisplayed: number,
    month: string
  ) => {
    if (!currentStoreId) return;
    const amountBase = amountDisplayed / selectedCurrency.rate;
    const expense: Expense = {
      id: `exp-salary-${Date.now()}`,
      date: new Date().toISOString(),
      category: 'SALARY',
      description: `Salaire ${month} - ${employee.fullName}`,
      amount: amountBase,
      paidBy: currentUser?.name || 'Admin',
    };
    handleAddExpense(expense);
  };

  const handleAddTransaction = (transaction: Transaction) => {
    if (!currentStoreId) return;
    if (supervisionTarget) {
      transaction.sellerId = supervisionTarget.id;
      transaction.sellerName = `${currentUser?.name} (pour ${supervisionTarget.name})`;
    }
    transaction.isLocked = false;
    addData(currentStoreId, 'transactions', transaction);
    transaction.items.forEach((item) => {
      const product = inventory.find((p) => p.id === item.productId);
      if (product) {
        const qtyChange =
          transaction.type === 'SALE' ? -item.quantity : item.quantity;
        const newQty = Math.max(0, product.quantity + qtyChange);
        updateData(currentStoreId, 'inventory', product.id, {
          quantity: newQty,
        });
      }
    });
    if (transaction.amountPaid > 0) {
      const movement: CashMovement = {
        id: `m-auto-${Date.now()}`,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amountPaid,
        description: `${transaction.type === 'SALE' ? 'Vente' : 'Règlement Achat'} (Ref: ${transaction.id}) ${transaction.paymentStatus === 'PARTIAL' ? '- Partiel' : ''}`,
        performedBy: transaction.sellerName,
      };
      addData(currentStoreId, 'cash_movements', movement);
    }
    if (transaction.type === 'SALE' && transaction.customerId) {
      const customer = customers.find((c) => c.id === transaction.customerId);
      if (customer) {
        updateData(currentStoreId, 'customers', customer.id, {
          totalSpent: customer.totalSpent + transaction.totalAmount,
          lastPurchaseDate: transaction.date,
        });
      }
    }
    showToast('Transaction validée', 'success');
  };

  const handleSettleTransaction = (
    transactionId: string,
    amountToPay: number
  ) => {
    if (!currentStoreId) return;
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return;
    const amountBase = amountToPay / selectedCurrency.rate;
    const newAmountPaid = tx.amountPaid + amountBase;
    let newStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PARTIAL';
    let paidAtStr: string | undefined = undefined;
    if (newAmountPaid >= tx.totalAmount - 0.01) {
      newStatus = 'PAID';
      paidAtStr = new Date().toISOString();
    }
    updateData(currentStoreId, 'transactions', transactionId, {
      amountPaid: newAmountPaid,
      paymentStatus: newStatus,
      paidAt: paidAtStr,
    });
    let performerName = currentUser?.name || 'Système';
    if (supervisionTarget) {
      performerName = `${currentUser?.name} (pour ${supervisionTarget.name})`;
    }
    const movement: CashMovement = {
      id: `m-settle-${Date.now()}`,
      date: new Date().toISOString(),
      type: tx.type,
      amount: amountBase,
      description: `Règlement Solde ${tx.type === 'SALE' ? 'Vente' : 'Achat'} (Ref: ${tx.id})`,
      performedBy: performerName,
    };
    addData(currentStoreId, 'cash_movements', movement);
    showToast('Règlement enregistré', 'success');
  };
  const handleAddCashMovement = (movement: CashMovement) => {
    if (currentStoreId) {
      if (supervisionTarget) {
        movement.performedBy = `${currentUser?.name} (pour ${supervisionTarget.name})`;
      }
      addData(currentStoreId, 'cash_movements', movement);
      showToast('Mouvement de caisse ajouté', 'success');
    }
  };

  const handleCreateStore = async (
    settings: StoreSettings,
    adminUser: User,
    adminEmployee: Employee
  ) => {
    setIsCreatingStoreLoading(true);

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      alert("Erreur critique : Aucun utilisateur n'est authentifié. Impossible de créer l'entreprise.");
      console.error("Tentative de création d'entreprise sans utilisateur authentifié.");
      setIsCreatingStoreLoading(false);
      return;
    }

    const newStoreId = `store_${Date.now()}`;

    const allPermissions: string[] = [];
    PERMISSION_CATEGORIES.forEach((cat) => {
      cat.actions.forEach((act) => {
        allPermissions.push(`${cat.id}.${act.id}`);
      });
    });
    adminUser.permissions = allPermissions;

    const newMetadata: StoreMetadata = {
      id: newStoreId,
      name: settings.name,
      logoUrl: settings.logoUrl,
      ownerId: firebaseUser.uid, // <-- AJOUT ESSENTIEL
    };

    try {
      await createStoreInDB(
        newStoreId,
        newMetadata,
        settings,
        adminUser,
        adminEmployee
      );


      setTimeout(() => {
        setKnownStores((prev) => [...prev, newMetadata]);
        setCurrentStoreId(newStoreId);
        setIsCreatingStoreLoading(false);
        showToast('Entreprise créée avec succès', 'success');
      }, 800);
    } catch (e) {
setIsCreatingStoreLoading(false);
      alert('Erreur lors de la création de la boutique.');
    }
  };

  const handleDeleteStore = (adminName: string, adminPin: string): boolean => {
    const admin = users.find(
      (u) =>
        u.role === 'ADMIN' &&
        u.name.toLowerCase() === adminName.toLowerCase() &&
        u.pin === adminPin
    );
    if (admin && currentStoreId) {
      deleteStoreFromDB(currentStoreId).then(() => {
        setKnownStores((prev) => prev.filter((s) => s.id !== currentStoreId));
        setCurrentStoreId(null);
        showToast('Entreprise supprimée', 'info');
      });
      return true;
    }
    return false;
  };

  const handleVerifyRecoveryInfo = (
    method: 'KEY' | 'CONTACT',
    value: string
  ): boolean => {
    if (method === 'KEY')
      return (storeSettings.recoveryKey || '').trim() === value.trim();
    else if (method === 'CONTACT') {
      const cleanInput = value.trim();
      const registeredEmail = (storeSettings.email || '').trim().toLowerCase();
      if (registeredEmail && registeredEmail === cleanInput.toLowerCase())
        return true;
      const normalize = (str: string) => str.replace(/[^0-9]/g, '');
      const registeredPhone = normalize(storeSettings.phone || '');
      const inputPhone = normalize(cleanInput);
      if (
        registeredPhone &&
        registeredPhone === inputPhone &&
        registeredPhone.length >= 4
      )
        return true;
    }
    return false;
  };

  const handleAdminResetPin = (newPin: string): boolean => {
    const admin = users.find((u) => u.role === 'ADMIN');
    if (admin && currentStoreId) {
      updateData(currentStoreId, 'users', admin.id, { pin: newPin });
      showToast('Code PIN administrateur réinitialisé !', 'success');
      return true;
    }
    return false;
  };

  const handleLogin = (user: User) => {
    const now = new Date().toISOString();
    if (currentStoreId)
      updateData(currentStoreId, 'users', user.id, { lastLogin: now });
    setCurrentUser({ ...user, lastLogin: now });
    setCurrentView(ViewState.MENU);
    setSupervisionTarget(null);
    showToast(`Bienvenue, ${user.name}`, 'success');
  };

  const requestLogout = () => setIsLogoutModalOpen(true);
  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    setCurrentUser(null);
    setSupervisionTarget(null);
    setCurrentView(ViewState.LOGIN);
  };

  const handleStartSupervision = (targetUser: User) => {
    setSupervisionTarget(targetUser);
    setCurrentView(ViewState.DASHBOARD);
    showToast(`Mode Supervision : ${targetUser.name}`, 'info');
  };
  const handleStopSupervision = () => {
    setSupervisionTarget(null);
    setCurrentView(ViewState.USERS);
    showToast('Mode Supervision désactivé', 'info');
  };

  const handleExportData = () => {
    const backup: BackupData = {
      version: '1.3',
      timestamp: new Date().toISOString(),
      settings: storeSettings,
      currency: currencyCode,
      inventory,
      users,
      employees,
      customers,
      suppliers,
      transactions,
      expenses,
      cashMovements,
      cashClosings,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `gesmind_backup_${storeSettings.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Sauvegarde exportée', 'success');
  };

  const handleImportData = () =>
    alert(
      "L'importation écrase la base de données. Fonction désactivée par sécurité en mode Cloud."
    );
  const handleCloudSync = () => handleExportData();
  const t = (key: string) => getTranslation(storeSettings.language, key);

  const hasAccess = (view: ViewState): boolean => {
    if (!currentUser) return false;
    const mapping: Record<ViewState, string> = {
      [ViewState.LOGIN]: '',
      [ViewState.MENU]: '',
      [ViewState.DASHBOARD]: 'dashboard.view',
      [ViewState.INVENTORY]: 'inventory.view',
      [ViewState.COMMERCIAL]: 'commercial.view',
      [ViewState.EXPENSES]: 'expenses.view',
      [ViewState.PERSONNEL]: 'personnel.view',
      [ViewState.CUSTOMERS]: 'customers.view',
      [ViewState.SUPPLIERS]: 'suppliers.view',
      [ViewState.TREASURY]: 'treasury.view',
      [ViewState.USERS]: 'users.view',
      [ViewState.AI_INSIGHTS]: 'ai.view',
      [ViewState.SETTINGS]: 'settings.view',
    };
    const req = mapping[view];
    if (!req) return true;
    return currentUser.permissions.includes(req);
  };

  // --- RENDER SCREEN LOADER ---
  if (isLaunching) {
    return <SplashScreen onFinish={() => setIsLaunching(false)} />;
  }

  // --- RENDER CREATION LOADER (Replaced with LoadingScreen) ---


  if (!currentUser) {
    return (
      <>
        <Auth
          users={users}
          onLogin={handleLogin}
          onCreateStore={handleCreateStore}
          storeName={storeSettings.name}
          storeLogo={storeSettings.logoUrl}
          onDeleteStore={handleDeleteStore}
          availableStores={knownStores}
          currentStoreId={currentStoreId}
          onSelectStore={setCurrentStoreId}
          onFindStore={handleFindStore}
          onAddKnownStore={handleAddKnownStore}
          onVerifyRecoveryInfo={handleVerifyRecoveryInfo}
          onResetPassword={handleAdminResetPin}
          lang={storeSettings.language}
          isDbConnected={isDbConfigured}
          onSetupDb={handleDbSetup}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  if (currentView === ViewState.MENU) {
    return (
      <>
        <HomeMenu
          currentUser={currentUser}
          onNavigate={setCurrentView}
          onLogout={requestLogout}
          appName={storeSettings.name}
          logoUrl={storeSettings.logoUrl}
          themeColor={storeSettings.themeColor || '#4f46e5'}
          lang={storeSettings.language}
          inventory={inventory}
          transactions={transactions}
          users={users}
          currency={selectedCurrency}
        />
        {availableUpdate && (
          <UpdateBanner
            update={availableUpdate}
            onClose={() => setAvailableUpdate(null)}
            themeColor={storeSettings.themeColor || '#4f46e5'}
          />
        )}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-4 text-slate-800 dark:text-white">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold">{t('logout')}</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {t('login_subtitle')}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl"
                >
                  {t('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  const renderContent = () => {
    if (!hasAccess(currentView)) {
      return (
        <div className="p-8 text-center text-slate-500">
          Accès Refusé <br />
          <button
            onClick={() => setCurrentView(ViewState.MENU)}
            className="text-indigo-600 font-bold mt-2"
          >
            Retour au menu
          </button>
        </div>
      );
    }
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard
            inventory={inventory}
            currency={selectedCurrency}
            transactions={transactions}
            expenses={expenses}
            currentUser={currentUser}
            supervisionTarget={supervisionTarget}
          />
        );
      case ViewState.INVENTORY:
        return (
          <InventoryTable
            items={inventory}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onUpdateItem={handleUpdateItem}
            currency={selectedCurrency}
            currentUser={currentUser}
            suppliers={suppliers}
            supervisionTarget={supervisionTarget}
          />
        );
      case ViewState.COMMERCIAL:
        return (
          <Commercial
            inventory={inventory}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            currency={selectedCurrency}
            currentUser={currentUser}
            customers={customers}
            suppliers={suppliers}
            storeSettings={storeSettings}
            supervisionTarget={supervisionTarget}
          />
        );
      case ViewState.EXPENSES:
        return (
          <Expenses
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            currency={selectedCurrency}
            currentUser={currentUser}
          />
        );
      case ViewState.PERSONNEL:
        return (
          <Personnel
            employees={employees}
            currency={selectedCurrency}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onPaySalary={handlePaySalary}
          />
        );
      case ViewState.CUSTOMERS:
        return (
          <Customers
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            currency={selectedCurrency}
          />
        );
      case ViewState.SUPPLIERS:
        return (
          <Suppliers
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            currency={selectedCurrency}
          />
        );
      case ViewState.TREASURY:
        return (
          <Treasury
            movements={cashMovements}
            closings={cashClosings}
            transactions={transactions}
            onAddMovement={handleAddCashMovement}
            onClosePeriod={() => {}}
            onSettleTransaction={handleSettleTransaction}
            lastClosingDate={storeSettings.lastClosingDate}
            currency={selectedCurrency}
            currentUser={currentUser}
            customers={customers}
            supervisionTarget={supervisionTarget}
          />
        );
      case ViewState.USERS:
        return (
          <Users
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
            onSupervise={handleStartSupervision}
            onLoginAs={handleLogin}
          />
        );
      case ViewState.AI_INSIGHTS:
        return <AIAdvisor items={inventory} currency={selectedCurrency} />;
      case ViewState.SETTINGS:
        return (
          <Settings
            currentSettings={storeSettings}
            onUpdateSettings={saveStoreSettings}
            currentCurrency={currencyCode}
            onUpdateCurrency={saveCurrency}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onCloudSync={handleCloudSync}
            lang={storeSettings.language}
            inventory={inventory}
            transactions={transactions}
            expenses={expenses}
            cashMovements={cashMovements}
          />
        );
      default:
        return <div>Vue non trouvée</div>;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return t('menu_dashboard');
      case ViewState.INVENTORY:
        return t('menu_inventory');
      case ViewState.COMMERCIAL:
        return t('menu_commercial');
      case ViewState.EXPENSES:
        return t('menu_expenses');
      case ViewState.TREASURY:
        return t('menu_treasury');
      case ViewState.CUSTOMERS:
        return t('menu_customers');
      case ViewState.SUPPLIERS:
        return t('menu_suppliers');
      case ViewState.USERS:
        return t('menu_users');
      case ViewState.AI_INSIGHTS:
        return t('menu_ai');
      case ViewState.SETTINGS:
        return t('menu_settings');
      case ViewState.PERSONNEL:
        return t('menu_personnel');
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans select-none transition-colors duration-300">
      {supervisionTarget && (
        <div className="bg-amber-500 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-lg z-50">
          <div className="flex items-center">
            <Eye className="w-5 h-5 mr-2 animate-pulse" /> MODE SUPERVISION :
            Vous agissez en tant que {supervisionTarget.name}
          </div>
          <button
            onClick={handleStopSupervision}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center"
          >
            <X className="w-3 h-3 mr-1" /> Quitter
          </button>
        </div>
      )}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        currentUser={currentUser}
        onLogout={requestLogout}
        title={getPageTitle()}
        themeColor={storeSettings.themeColor}
        lang={storeSettings.language}
      />
      <main className="flex-1 w-full p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <GlobalSearch
            inventory={inventory}
            transactions={transactions}
            users={users}
            onNavigate={setCurrentView}
            currency={selectedCurrency}
            currentUser={currentUser}
            supervisionTarget={supervisionTarget}
          />
          {renderContent()}
        </div>
      </main>
      {availableUpdate && (
        <UpdateBanner
          update={availableUpdate}
          onClose={() => setAvailableUpdate(null)}
          themeColor={storeSettings.themeColor || '#4f46e5'}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <LogOut className="w-6 h-6 mr-2 text-red-500" /> {t('logout')}
            </h3>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
