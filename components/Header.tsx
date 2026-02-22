
import React, { useState } from 'react';
import { ViewState, User, StoreMetadata } from '../types';
import { ArrowLeft, User as UserIcon, LogOut, Home, Store, ChevronDown, PlusCircle } from 'lucide-react';
import { getTranslation } from '../translations';

interface HeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  currentUser: User;
  onLogout: () => void;
  title?: string;
  themeColor?: string;
  lang?: string;
  availableStores?: StoreMetadata[];
  currentStoreId?: string;
  onSwitchStore?: (storeId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  currentUser, 
  onLogout, 
  title, 
  themeColor = '#1e293b', 
  lang = 'fr',
  availableStores = [],
  currentStoreId,
  onSwitchStore
}) => {
  const handleLogoutClick = () => {
    onLogout();
  };

  const t = (key: string) => getTranslation(lang, key);
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header 
      className="text-white shadow-md sticky top-0 z-40 w-full transition-colors duration-300"
      style={{ backgroundColor: themeColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Navigation */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => onNavigate(ViewState.MENU)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center"
            title={t('back_menu')}
          >
            <Home className="w-5 h-5" />
            <span className="ml-2 text-sm font-medium hidden sm:inline">{t('back_menu')}</span>
          </button>
          
          {title && (
             <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>
          )}
          
          {title && (
             <h1 className="text-lg font-bold text-white truncate">{title}</h1>
          )}
        </div>

        {/* Right: User Info */}
        <div className="flex items-center space-x-4">
           <div className="flex items-center space-x-3 bg-white/10 py-1.5 px-3 rounded-full border border-white/10">
             <img src={currentUser.avatar} alt="" className="w-6 h-6 rounded-full" />
             <span className="text-sm font-medium hidden sm:inline">{currentUser.name}</span>
           </div>
           
           <button 
             onClick={handleLogoutClick}
             className="text-white/70 hover:text-white p-2 transition-colors"
             title={t('logout')}
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>

      </div>
    </header>
  );
};
