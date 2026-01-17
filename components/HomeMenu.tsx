
import React, { useState } from 'react';
import { ViewState, User, InventoryItem, Transaction, Currency, StoreMetadata } from '../types';
import { LayoutDashboard, Package, Sparkles, Settings, ShoppingCart, Users, Wallet, Briefcase, Contact, Truck, LogOut, TrendingDown, Store, ChevronDown, PlusCircle, Copy, Check } from 'lucide-react';
import { getTranslation } from '../translations';
import { GlobalSearch } from './GlobalSearch';
import { GesmindLogo } from './GesmindLogo';

interface HomeMenuProps {
  currentUser: User;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  appName: string;
  themeColor: string;
  logoUrl?: string;
  lang?: string;
  inventory: InventoryItem[];
  transactions: Transaction[];
  users: User[];
  currency: Currency;
  availableStores?: StoreMetadata[];
  currentStoreId?: string;
  onSwitchStore?: (storeId: string) => void;
}

export const HomeMenu: React.FC<HomeMenuProps> = ({ 
  currentUser, 
  onNavigate, 
  onLogout, 
  appName, 
  themeColor, 
  logoUrl, 
  lang = 'fr',
  inventory,
  transactions,
  users,
  currency,
  availableStores = [],
  currentStoreId,
  onSwitchStore
}) => {
  const [isIdCopied, setIsIdCopied] = useState(false); // État pour le feedback visuel de la copie
  const t = (key: string) => getTranslation(lang, key);
  const isAdmin = currentUser.role === 'ADMIN';

  const allMenuItems = [
    { id: ViewState.DASHBOARD, label: t('menu_dashboard'), description: t('menu_dashboard_desc'), icon: LayoutDashboard, requiredPerm: 'dashboard.view' },
    { id: ViewState.INVENTORY, label: t('menu_inventory'), description: t('menu_inventory_desc'), icon: Package, requiredPerm: 'inventory.view' },
    { id: ViewState.COMMERCIAL, label: t('menu_commercial'), description: t('menu_commercial_desc'), icon: ShoppingCart, requiredPerm: 'commercial.view' },
    { id: ViewState.EXPENSES, label: t('menu_expenses'), description: t('menu_expenses_desc'), icon: TrendingDown, requiredPerm: 'expenses.view' },
    { id: ViewState.TREASURY, label: t('menu_treasury'), description: t('menu_treasury_desc'), icon: Wallet, requiredPerm: 'treasury.view' },
    { id: ViewState.CUSTOMERS, label: t('menu_customers'), description: t('menu_customers_desc'), icon: Contact, requiredPerm: 'customers.view' },
    { id: ViewState.SUPPLIERS, label: t('menu_suppliers'), description: t('menu_suppliers_desc'), icon: Truck, requiredPerm: 'suppliers.view' },
    { id: ViewState.PERSONNEL, label: t('menu_personnel'), description: t('menu_personnel_desc'), icon: Briefcase, requiredPerm: 'personnel.view' },
    { id: ViewState.USERS, label: t('menu_users'), description: t('menu_users_desc'), icon: Users, requiredPerm: 'users.view' },
    { id: ViewState.AI_INSIGHTS, label: t('menu_ai'), description: t('menu_ai_desc'), icon: Sparkles, requiredPerm: 'ai.view' },
    { id: ViewState.SETTINGS, label: t('menu_settings'), description: t('menu_settings_desc'), icon: Settings, requiredPerm: 'settings.view' },
  ];

  // Filter based on permissions string inclusion
  const menuItems = allMenuItems.filter(item => 
    currentUser.permissions.includes(item.requiredPerm)
  );

  const handleLogoutClick = () => {
    onLogout();
  };

  const handleCopyStoreId = () => {
    if (currentStoreId) {
      navigator.clipboard.writeText(currentStoreId);
      setIsIdCopied(true);
      setTimeout(() => setIsIdCopied(false), 2000);
    }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-between p-4 overflow-hidden transition-colors duration-300 relative">
      
      {/* Header Compact */}
      <div className="text-center mt-2 mb-2 flex-shrink-0 flex flex-col items-center w-full max-w-xl">
         {/* Logo Section */}
         {logoUrl ? (
           <img 
             src={logoUrl} 
             alt="Logo Entreprise" 
             className="w-16 h-16 object-contain mb-2 drop-shadow-md"
           />
         ) : (
           // Utilisation du logo vectoriel si pas de logo perso
           <div className="mb-2">
             <GesmindLogo className="w-16 h-16" withText={false} />
           </div>
         )}
         
         <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{appName}</h1>
         
         {/* STORE ID DISPLAY & COPY */}
         {currentStoreId && (
            <button
                onClick={handleCopyStoreId}
                className="mt-1 mb-2 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                title="Copier l'ID pour inviter des collaborateurs"
            >
                <span className="font-mono tracking-wide">ID: {currentStoreId}</span>
                {isIdCopied ? (
                    <Check className="w-3 h-3 text-emerald-500 animate-fade-in" />
                ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                )}
            </button>
         )}
         
         <div className="mt-1 text-[10px] bg-slate-200 dark:bg-slate-800 px-3 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
            {t('hello')}, <span className="font-bold" style={{color: themeColor}}>{currentUser.name}</span>
         </div>

         {/* Search Bar Integrated */}
         <div className="w-full mt-3 px-2">
            <GlobalSearch 
              inventory={inventory}
              transactions={transactions}
              users={users}
              currency={currency}
              onNavigate={onNavigate}
            />
         </div>
      </div>

      {/* Grid Menu Responsive & Scrollable */}
      <div className="flex-1 w-full max-w-6xl flex items-start justify-center overflow-y-auto py-2 px-1">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col items-center text-center group relative overflow-hidden aspect-[4/3] md:aspect-square justify-center"
                style={{borderColor: 'transparent'}}
              >
                {/* Hover Effect Border */}
                <div 
                  className="absolute inset-0 border-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ borderColor: themeColor }}
                ></div>

                <div 
                  className="p-2.5 rounded-xl text-white mb-2 shadow-md group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: themeColor }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.label}</h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{item.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Ultra Compact */}
      <div className="mt-2 flex flex-col items-center flex-shrink-0 pb-2">
        <button 
          onClick={handleLogoutClick}
          className="flex items-center text-slate-400 hover:text-red-500 transition-colors px-4 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
        >
          <LogOut className="w-3 h-3 mr-1.5" />
          {t('logout')}
        </button>

        <div className="mt-1 text-[9px] text-slate-300 dark:text-slate-600">
          v{process.env.PACKAGE_VERSION || '1.0.0'}
        </div>
      </div>
    </div>
  );
};
