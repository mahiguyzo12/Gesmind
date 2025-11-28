
import React, { useState, useEffect } from 'react';
import { HomeMenu } from './components/HomeMenu';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { AIAdvisor } from './components/AIAdvisor';
import { Commercial } from './components/Commercial';
import { Personnel } from './components/Personnel'; // Replaced SalesTeam
import { Auth } from './components/Auth';
import { Users } from './components/Users';
import { Treasury } from './components/Treasury';
import { Settings } from './components/Settings';
import { GlobalSearch } from './components/GlobalSearch';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Expenses } from './components/Expenses';
import { UpdateBanner } from './components/UpdateBanner';
import { InventoryItem, ViewState, Transaction, User, CashMovement, StoreSettings, BackupData, CloudProvider, CashClosing, Customer, Supplier, AppUpdate, StoreMetadata, Expense, Employee } from './types';
import { CURRENCIES, PERMISSION_CATEGORIES } from './constants';
import { checkForUpdates } from './services/updateService';
import { LogOut, WifiOff, Eye, X } from 'lucide-react';
import { getTranslation } from './translations';
import { db, setupFirebase } from './firebaseConfig';

// Import Firestore Service
import { 
  subscribeToStoresRegistry, 
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
  updateSettingsInDB
} from './services/firestoreService';

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Gesmind',
  address: '',
  phone: '',
  email: '',
  language: 'fr',
  cloudProvider: 'NONE',
  themeMode: 'light',
  themeColor: '#4f46e5',
  githubRepo: 'mahiguyzo12/stockmind-update-server'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  
  // SUPERVISION STATE (Option 1)
  const [supervisionTarget, setSupervisionTarget] = useState<User | null>(null);
  
  // Multi-Store Management
  const [availableStores, setAvailableStores] = useState<StoreMetadata[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(localStorage.getItem('gesmind_last_store_id'));

  // Logout Modal State
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // DB Connection State
  const [isDbConfigured, setIsDbConfigured] = useState(!!db || localStorage.getItem('gesmind_db_mode') === 'LOCAL');

  // Data State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  
  // Local state for non-synced preferences
  const [currencyCode, setCurrencyCode] = useState<string>(localStorage.getItem('gesmind_local_currency') || 'EUR');
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  
  // Update State
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
  
  // --- 1. LOAD STORE LIST (Registry) ---
  useEffect(() => {
    if (!isDbConfigured) return;

    const unsubscribe = subscribeToStoresRegistry((stores) => {
      setAvailableStores(stores);
      if (stores.length > 0 && !currentStoreId) {
        setCurrentStoreId(stores[0].id);
      }
    });

    return () => unsubscribe();
  }, [isDbConfigured]);

  useEffect(() => {
    if (currentStoreId) {
      localStorage.setItem('gesmind_last_store_id', currentStoreId);
    }
  }, [currentStoreId]);

  // --- 2. LOAD DATA ---
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
    const unsubCash = subscribeToCashMovements(currentStoreId, setCashMovements);
    const unsubClose = subscribeToCashClosings(currentStoreId, setCashClosings);
    
    const unsubSettings = subscribeToSettings(currentStoreId, (settings) => {
      if (settings) setStoreSettings(settings);
    });

    setCurrentView(ViewState.LOGIN);
    setCurrentUser(null);
    setSupervisionTarget(null);

    return () => {
      unsubInv(); unsubTx(); unsubUsers(); unsubEmps(); unsubCust(); unsubSupp(); unsubExp(); unsubCash(); unsubClose(); unsubSettings();
    };

  }, [currentStoreId, isDbConfigured]);

  // --- 3. HEARTBEAT (User Presence) ---
  useEffect(() => {
    if (!currentUser || !currentStoreId) return;

    // Fonction pour mettre à jour la dernière activité
    const updateHeartbeat = () => {
        const now = new Date().toISOString();
        // On met à jour directement en DB sans re-déclencher un render local de l'utilisateur
        updateData(currentStoreId, 'users', currentUser.id, { lastLogin: now });
    };

    // Mise à jour immédiate
    updateHeartbeat();

    // Puis toutes les 2 minutes
    const interval = setInterval(updateHeartbeat, 120000); 

    return () => clearInterval(interval);
  }, [currentUser?.id, currentStoreId]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (storeSettings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const color = storeSettings.themeColor || '#4f46e5';
    root.style.setProperty('--primary-color', color);
  }, [storeSettings.themeMode, storeSettings.themeColor]);

  const handleDbSetup = (configJson: string) => {
    const success = setupFirebase(configJson);
    if (success) {
      setIsDbConfigured(true);
      return true;
    }
    return false;
  };

  const saveStoreSettings = (newData: StoreSettings) => {
    if (currentStoreId) {
      updateSettingsInDB(currentStoreId, newData);
    }
  };

  const saveCurrency = (code: string) => {
    setCurrencyCode(code);
    localStorage.setItem('gesmind_local_currency', code);
  };

  const selectedCurrency = CURRENCIES[currencyCode] || CURRENCIES['EUR'];

  // --- Handlers ---
  const handleAddItem = (item: InventoryItem) => {
      if (!currentStoreId) return;
      // Supervision Logic: Si on supervise, le produit est créé au nom de la cible
      if (supervisionTarget) {
          item.createdBy = supervisionTarget.id;
      }
      addData(currentStoreId, 'inventory', item);
  }
  const handleUpdateItem = (id: string, updatedItem: Partial<InventoryItem>) => currentStoreId && updateData(currentStoreId, 'inventory', id, updatedItem);
  const handleDeleteItem = (id: string) => currentStoreId && deleteData(currentStoreId, 'inventory', id);

  const handleAddUser = (user: User) => currentStoreId && addData(currentStoreId, 'users', user);
  const handleUpdateUser = (id: string, updatedData: Partial<User>) => {
    if (currentStoreId) {
        updateData(currentStoreId, 'users', id, updatedData);
        if (currentUser && currentUser.id === id) {
            setCurrentUser({ ...currentUser, ...updatedData });
        }
    }
  };
  const handleDeleteUser = (id: string) => currentStoreId && deleteData(currentStoreId, 'users', id);

  const handleAddEmployee = (emp: Employee) => currentStoreId && addData(currentStoreId, 'employees', emp);
  const handleUpdateEmployee = (id: string, updatedData: Partial<Employee>) => currentStoreId && updateData(currentStoreId, 'employees', id, updatedData);
  const handleDeleteEmployee = (id: string) => currentStoreId && deleteData(currentStoreId, 'employees', id);

  const handleAddCustomer = (c: Customer) => currentStoreId && addData(currentStoreId, 'customers', c);
  const handleUpdateCustomer = (id: string, d: Partial<Customer>) => currentStoreId && updateData(currentStoreId, 'customers', id, d);
  const handleDeleteCustomer = (id: string) => currentStoreId && deleteData(currentStoreId, 'customers', id);

  const handleAddSupplier = (s: Supplier) => currentStoreId && addData(currentStoreId, 'suppliers', s);
  const handleUpdateSupplier = (id: string, d: Partial<Supplier>) => currentStoreId && updateData(currentStoreId, 'suppliers', id, d);
  const handleDeleteSupplier = (id: string) => currentStoreId && deleteData(currentStoreId, 'suppliers', id);

  const handleAddExpense = (expense: Expense) => {
    if (currentStoreId) {
      // Traceability in Supervision Mode
      if (supervisionTarget) {
          expense.paidBy = `${currentUser?.name} (pour ${supervisionTarget.name})`;
      }
      
      addData(currentStoreId, 'expenses', expense);
      const movement: CashMovement = {
        id: `m-exp-${Date.now()}`,
        date: expense.date,
        type: 'EXPENSE',
        amount: expense.amount, 
        description: `Dépense : ${expense.description} (${expense.category})`,
        performedBy: expense.paidBy
      };
      addData(currentStoreId, 'cash_movements', movement);
    }
  };
  const handleDeleteExpense = (id: string) => currentStoreId && deleteData(currentStoreId, 'expenses', id);

  const handlePaySalary = (employee: Employee, amountDisplayed: number, month: string) => {
     if (!currentStoreId) return;
     
     // Convert displayed amount (e.g. XOF) back to base currency (EUR)
     const amountBase = amountDisplayed / selectedCurrency.rate;
     
     const expense: Expense = {
         id: `exp-salary-${Date.now()}`,
         date: new Date().toISOString(),
         category: 'SALARY',
         description: `Salaire ${month} - ${employee.fullName}`,
         amount: amountBase,
         paidBy: currentUser?.name || 'Admin'
     };
     
     // This handles both adding the expense and the cash movement
     handleAddExpense(expense);
  };

  const handleAddTransaction = (transaction: Transaction) => {
    if (!currentStoreId) return;
    
    // Supervision Logic: 
    // The transaction belongs to the Target (for stats)
    // But we record the actual Seller Name as "Admin (for Target)"
    if (supervisionTarget) {
        transaction.sellerId = supervisionTarget.id;
        transaction.sellerName = `${currentUser?.name} (pour ${supervisionTarget.name})`;
    }

    addData(currentStoreId, 'transactions', transaction);
    transaction.items.forEach(item => {
      const product = inventory.find(p => p.id === item.productId);
      if (product) {
        const qtyChange = transaction.type === 'SALE' ? -item.quantity : item.quantity;
        const newQty = Math.max(0, product.quantity + qtyChange);
        updateData(currentStoreId, 'inventory', product.id, { quantity: newQty });
      }
    });
    if (transaction.amountPaid > 0) {
      const movement: CashMovement = {
        id: `m-auto-${Date.now()}`,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amountPaid, 
        description: `${transaction.type === 'SALE' ? 'Vente' : 'Achat'} (Ref: ${transaction.id}) ${transaction.paymentStatus === 'PARTIAL' ? '- Partiel' : ''}`,
        performedBy: transaction.sellerName
      };
      addData(currentStoreId, 'cash_movements', movement);
    }
    if (transaction.type === 'SALE' && transaction.customerId) {
        const customer = customers.find(c => c.id === transaction.customerId);
        if (customer) {
            updateData(currentStoreId, 'customers', customer.id, {
                totalSpent: customer.totalSpent + transaction.totalAmount,
                lastPurchaseDate: transaction.date
            });
        }
    }
  };

  const handleSettleTransaction = (transactionId: string, amountToPay: number) => {
     if (!currentStoreId) return;
     const tx = transactions.find(t => t.id === transactionId);
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
       paidAt: paidAtStr
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
        performedBy: performerName
     };
     addData(currentStoreId, 'cash_movements', movement);
  };

  const handleAddCashMovement = (movement: CashMovement) => {
    if (currentStoreId) {
        if (supervisionTarget) {
            movement.performedBy = `${currentUser?.name} (pour ${supervisionTarget.name})`;
        }
        addData(currentStoreId, 'cash_movements', movement);
    }
  };

  const handleCloseCash = (type: 'MANUAL' | 'AUTO', forceDate?: string) => {
    if (!currentStoreId) return;
    const closingDate = forceDate || new Date().toISOString();
    const lastClosing = storeSettings.lastClosingDate ? new Date(storeSettings.lastClosingDate) : new Date(0);
    const periodMovements = cashMovements.filter(m => new Date(m.date) > lastClosing && new Date(m.date) <= new Date(closingDate));
    if (periodMovements.length === 0 && type === 'AUTO') {
       updateSettingsInDB(currentStoreId, { ...storeSettings, lastClosingDate: closingDate });
       return;
    }
    let totalIn = 0;
    let totalOut = 0;
    periodMovements.forEach(m => {
      if (m.type === 'SALE' || m.type === 'DEPOSIT') {
        totalIn += m.amount;
      } else {
        totalOut += m.amount;
      }
    });
    const allPriorMovements = cashMovements.filter(m => new Date(m.date) <= lastClosing);
    const openingBalance = allPriorMovements.reduce((acc, m) => {
       if (m.type === 'SALE' || m.type === 'DEPOSIT') return acc + m.amount;
       return acc - m.amount;
    }, 0);
    const closingBalance = openingBalance + totalIn - totalOut;
    const newClosing: CashClosing = {
      id: `close-${Date.now()}`,
      date: closingDate,
      periodStart: lastClosing.toISOString(),
      openingBalance,
      closingBalance,
      totalIn,
      totalOut,
      type,
      closedBy: type === 'AUTO' ? 'Système' : (currentUser?.name || 'Inconnu')
    };
    addData(currentStoreId, 'cash_closings', newClosing);
    updateSettingsInDB(currentStoreId, { ...storeSettings, lastClosingDate: closingDate });
  };

  // --- Store Creation ---
  const handleCreateStore = async (storeName: string, adminName: string, adminPin: string, logoUrl?: string) => {
    const newStoreId = `store_${Date.now()}`;
    
    // GENERATE ALL PERMISSIONS FOR ADMIN
    const allPermissions: string[] = [];
    PERMISSION_CATEGORIES.forEach(cat => {
        cat.actions.forEach(act => {
            allPermissions.push(`${cat.id}.${act.id}`);
        });
    });

    const newAdmin: User = {
      id: `u-${Date.now()}`,
      name: adminName,
      role: 'ADMIN',
      pin: adminPin,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=6366f1&color=fff`,
      commissionRate: 0,
      permissions: allPermissions,
      lastLogin: new Date().toISOString()
    };

    const newSettings: StoreSettings = { 
      ...DEFAULT_SETTINGS, 
      name: storeName, 
      logoUrl: logoUrl,
      lastClosingDate: new Date().toISOString() 
    };

    const newMetadata: StoreMetadata = {
      id: newStoreId,
      name: storeName,
      logoUrl: logoUrl
    };

    try {
      await createStoreInDB(newStoreId, newMetadata, newSettings, newAdmin);
      setCurrentStoreId(newStoreId);
    } catch (e) {
      alert("Erreur lors de la création de la boutique.");
    }
  };

  const handleDeleteStore = (adminName: string, adminPin: string): boolean => {
    const admin = users.find(u => u.role === 'ADMIN' && u.name.toLowerCase() === adminName.toLowerCase() && u.pin === adminPin);
    if (admin && currentStoreId) {
      deleteStoreFromDB(currentStoreId).then(() => {
         setCurrentStoreId(null);
      });
      return true;
    }
    return false;
  };

  // --- Auth Handlers ---
  const handleLogin = (user: User) => {
    const now = new Date().toISOString();
    if (currentStoreId) updateData(currentStoreId, 'users', user.id, { lastLogin: now });
    setCurrentUser({ ...user, lastLogin: now });
    setCurrentView(ViewState.MENU);
    setSupervisionTarget(null); // Clear supervision on new login
  };

  const requestLogout = () => setIsLogoutModalOpen(true);
  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    setCurrentUser(null);
    setSupervisionTarget(null);
    setCurrentView(ViewState.LOGIN);
  };

  // --- SUPERVISION HANDLER (Option 1) ---
  const handleStartSupervision = (targetUser: User) => {
      setSupervisionTarget(targetUser);
      setCurrentView(ViewState.DASHBOARD); // Jump to their dashboard
  };

  const handleStopSupervision = () => {
      setSupervisionTarget(null);
      setCurrentView(ViewState.USERS); // Return to list
  };

  // --- Backup Handlers ---
  const handleExportData = () => {
    const backup: BackupData = {
      version: "1.3",
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
      cashClosings
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `gesmind_backup_${storeSettings.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportData = () => alert("L'importation écrase la base de données. Fonction désactivée par sécurité en mode Cloud.");
  const handleCloudSync = () => handleExportData();

  const t = (key: string) => getTranslation(storeSettings.language, key);

  // Helper to check access for routing
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
      if (!req) return true; // Public pages
      return currentUser.permissions.includes(req);
  };

  if (!currentUser) {
    return (
      <Auth 
        users={users} 
        onLogin={handleLogin} 
        onCreateStore={handleCreateStore}
        storeName={storeSettings.name}
        storeLogo={storeSettings.logoUrl}
        onDeleteStore={handleDeleteStore}
        availableStores={availableStores}
        currentStoreId={currentStoreId}
        onSelectStore={setCurrentStoreId}
        lang={storeSettings.language}
        isDbConnected={isDbConfigured}
        onSetupDb={handleDbSetup}
      />
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
        {availableUpdate && <UpdateBanner update={availableUpdate} onClose={() => setAvailableUpdate(null)} themeColor={storeSettings.themeColor || '#4f46e5'} />}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-4 text-slate-800 dark:text-white">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                  <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold">{t('logout')}</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-6">{t('login_subtitle')}</p>
              <div className="flex space-x-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium">{t('cancel')}</button>
                <button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">{t('confirm')}</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- ROUTING RENDER ---
  const renderContent = () => {
    if (!hasAccess(currentView)) {
       return <div className="p-8 text-center text-slate-500">Accès Refusé <br/><button onClick={() => setCurrentView(ViewState.MENU)} className="text-indigo-600 font-bold mt-2">Retour au menu</button></div>;
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard inventory={inventory} currency={selectedCurrency} transactions={transactions} expenses={expenses} currentUser={currentUser} supervisionTarget={supervisionTarget} />;
      case ViewState.INVENTORY:
        return <InventoryTable items={inventory} onAddItem={handleAddItem} onDeleteItem={handleDeleteItem} onUpdateItem={handleUpdateItem} currency={selectedCurrency} currentUser={currentUser} suppliers={suppliers} supervisionTarget={supervisionTarget} />;
      case ViewState.COMMERCIAL:
        return <Commercial inventory={inventory} transactions={transactions} onAddTransaction={handleAddTransaction} currency={selectedCurrency} currentUser={currentUser} customers={customers} suppliers={suppliers} storeSettings={storeSettings} supervisionTarget={supervisionTarget} />;
      case ViewState.EXPENSES:
        return <Expenses expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} currency={selectedCurrency} currentUser={currentUser} />;
      case ViewState.PERSONNEL: 
        return <Personnel employees={employees} currency={selectedCurrency} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onDeleteEmployee={handleDeleteEmployee} onPaySalary={handlePaySalary} />;
      case ViewState.CUSTOMERS:
        return <Customers customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} currency={selectedCurrency} />;
      case ViewState.SUPPLIERS:
        return <Suppliers suppliers={suppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} currency={selectedCurrency} />;
      case ViewState.TREASURY:
        return <Treasury movements={cashMovements} closings={cashClosings} transactions={transactions} onAddMovement={handleAddCashMovement} onClosePeriod={() => handleCloseCash('MANUAL')} onSettleTransaction={handleSettleTransaction} lastClosingDate={storeSettings.lastClosingDate} currency={selectedCurrency} currentUser={currentUser} customers={customers} supervisionTarget={supervisionTarget} />;
      case ViewState.USERS:
        return <Users users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} currentUser={currentUser} onSupervise={handleStartSupervision} onLoginAs={handleLogin} />;
      case ViewState.AI_INSIGHTS:
        return <AIAdvisor items={inventory} currency={selectedCurrency} />;
      case ViewState.SETTINGS:
        return <Settings currentSettings={storeSettings} onUpdateSettings={saveStoreSettings} currentCurrency={currencyCode} onUpdateCurrency={saveCurrency} currentUser={currentUser} onUpdateUser={handleUpdateUser} onExportData={handleExportData} onImportData={handleImportData} onCloudSync={handleCloudSync} lang={storeSettings.language} />;
      default:
        return <div>Vue non trouvée</div>;
    }
  };

  const getPageTitle = () => {
     switch(currentView) {
        case ViewState.DASHBOARD: return t('menu_dashboard');
        case ViewState.INVENTORY: return t('menu_inventory');
        case ViewState.COMMERCIAL: return t('menu_commercial');
        case ViewState.EXPENSES: return t('menu_expenses');
        case ViewState.TREASURY: return t('menu_treasury');
        case ViewState.CUSTOMERS: return t('menu_customers');
        case ViewState.SUPPLIERS: return t('menu_suppliers');
        case ViewState.USERS: return t('menu_users');
        case ViewState.AI_INSIGHTS: return t('menu_ai');
        case ViewState.SETTINGS: return t('menu_settings');
        case ViewState.PERSONNEL: return t('menu_personnel');
        default: return '';
     }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans select-none transition-colors duration-300">
      
      {/* SUPERVISION BANNER (Option 1) */}
      {supervisionTarget && (
          <div className="bg-amber-500 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-lg z-50">
              <div className="flex items-center">
                  <Eye className="w-5 h-5 mr-2 animate-pulse" />
                  MODE SUPERVISION : Vous agissez en tant que {supervisionTarget.name}
              </div>
              <button 
                onClick={handleStopSupervision} 
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs transition-colors flex items-center"
              >
                  <X className="w-3 h-3 mr-1" /> Quitter
              </button>
          </div>
      )}

      <Header currentView={currentView} onNavigate={setCurrentView} currentUser={currentUser} onLogout={requestLogout} title={getPageTitle()} themeColor={storeSettings.themeColor} lang={storeSettings.language} />
      <main className="flex-1 w-full p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <GlobalSearch inventory={inventory} transactions={transactions} users={users} onNavigate={setCurrentView} currency={selectedCurrency} currentUser={currentUser} supervisionTarget={supervisionTarget} />
          {renderContent()}
        </div>
      </main>
      {availableUpdate && <UpdateBanner update={availableUpdate} onClose={() => setAvailableUpdate(null)} themeColor={storeSettings.themeColor || '#4f46e5'} />}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
            <h3 className="text-lg font-bold mb-4 flex items-center"><LogOut className="w-6 h-6 mr-2 text-red-500"/> {t('logout')}</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-300">Êtes-vous sûr de vouloir vous déconnecter ?</p>
            <div className="flex space-x-3">
              <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('cancel')}</button>
              <button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
