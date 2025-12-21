import React from 'react';
import {
  LayoutDashboard,
  Package,
  Sparkles,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  LogOut,
  Briefcase,
  Activity,
  Contact,
  Truck,
  TrendingDown,
} from 'lucide-react';
import { ViewState, User } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentCurrency: string;
  currentUser: User;
  onLogout: () => void;
  allUsers?: User[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  currentCurrency,
  currentUser,
  onLogout,
  allUsers = [],
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const APP_VERSION = process.env.PACKAGE_VERSION || '1.0.0';

  const allMenuItems = [
    {
      id: ViewState.DASHBOARD,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      requiredPerm: 'dashboard.view',
    },
    {
      id: ViewState.INVENTORY,
      label: 'Liste des stocks',
      icon: Package,
      requiredPerm: 'inventory.view',
    },
    {
      id: ViewState.COMMERCIAL,
      label: 'Ventes/Achats',
      icon: ShoppingCart,
      requiredPerm: 'commercial.view',
    },
    {
      id: ViewState.EXPENSES,
      label: 'Dépenses',
      icon: TrendingDown,
      requiredPerm: 'expenses.view',
    },
    {
      id: ViewState.CUSTOMERS,
      label: 'Clients',
      icon: Contact,
      requiredPerm: 'customers.view',
    },
    {
      id: ViewState.SUPPLIERS,
      label: 'Fournisseurs',
      icon: Truck,
      requiredPerm: 'suppliers.view',
    },
    {
      id: ViewState.PERSONNEL,
      label: 'Personnel',
      icon: Briefcase,
      requiredPerm: 'personnel.view',
    },
    {
      id: ViewState.TREASURY,
      label: 'Trésorerie',
      icon: Wallet,
      requiredPerm: 'treasury.view',
    },
    {
      id: ViewState.USERS,
      label: 'Utilisateurs',
      icon: Users,
      requiredPerm: 'users.view',
    },
    {
      id: ViewState.AI_INSIGHTS,
      label: 'Assistant IA',
      icon: Sparkles,
      requiredPerm: 'ai.view',
    },
    {
      id: ViewState.SETTINGS,
      label: 'Paramètres',
      icon: Settings,
      requiredPerm: 'settings.view',
    },
  ];

  // Filter menu items based on string permissions
  const menuItems = allMenuItems.filter((item) =>
    currentUser.permissions.includes(item.requiredPerm)
  );

  const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440)
      return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-10 shadow-xl transition-all duration-300">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-700 bg-slate-950">
        <div className="bg-gradient-to-br from-sky-300 to-blue-600 p-2 rounded-full shadow-lg shadow-sky-500/30">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-white">
            Gesmind
          </span>
          <span className="text-[10px] text-sky-400 uppercase tracking-widest">
            Enterprise
          </span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-6 flex items-center space-x-3 border-b border-slate-800/50 bg-slate-900">
        <div className="relative">
          <img
            src={currentUser.avatar}
            alt="User"
            className="w-10 h-10 rounded-full border-2 border-slate-700"
          />
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isAdmin ? 'bg-purple-500' : 'bg-emerald-500'}`}
          ></div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-slate-200">
            {currentUser.name}
          </p>
          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
            {isAdmin ? 'Administrateur' : 'Vendeur'}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 mt-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-[1.02]'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
              />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
        {menuItems.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm italic">
            Aucun module accessible.
          </div>
        )}
      </nav>

      {/* Connected Users List (Admin Only) */}
      {isAdmin && allUsers.length > 0 && (
        <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2 mb-3 text-slate-400">
            <Activity className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Activité Membres
            </span>
          </div>
          <div className="space-y-3 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {allUsers.map((user) => {
              const isCurrentUser = user.id === currentUser.id;
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${isCurrentUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}
                    ></div>
                    <span
                      className={`text-xs ${isCurrentUser ? 'text-white font-medium' : 'text-slate-400'}`}
                    >
                      {user.name.split(' ')[0]}{' '}
                      {/* Show First Name only to save space */}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono">
                    {isCurrentUser
                      ? 'En ligne'
                      : formatLastLogin(user.lastLogin)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-400">
              Système Actif
            </span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
