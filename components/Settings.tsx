
import React, { useState, useRef, useEffect } from 'react';
import { StoreSettings, User, BackupData, CloudProvider, AppUpdate, ThemeMode } from '../types';
import { CURRENCIES, THEME_COLORS } from '../constants';
import { Settings as SettingsIcon, Globe, Store, Save, User as UserIcon, KeyRound, Database, Download, Upload, Cloud, CheckCircle, Smartphone, Github, RefreshCw, AlertCircle, Sparkles, Moon, Sun, Palette, Image as ImageIcon, Link, X, Mail, Phone, Eye, EyeOff, Copy } from 'lucide-react';
import { getTranslation } from '../translations';
import { db, setupFirebase } from '../src/firebaseConfig';

interface SettingsProps {
  currentSettings: StoreSettings;
  onUpdateSettings: (settings: StoreSettings) => void;
  currentCurrency: string;
  onUpdateCurrency: (code: string) => void;
  currentUser: User;
  onUpdateUser: (id: string, data: Partial<User>) => void;
  onExportData: () => void;
  onImportData: (data: BackupData) => void;
  onCloudSync: (provider: CloudProvider) => void;
  lang?: string;
}

const AVAILABLE_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文 (Chinese)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'ru', label: 'Русский (Russian)' },
];

export const Settings: React.FC<SettingsProps> = ({ 
  currentSettings, 
  onUpdateSettings, 
  currentCurrency, 
  onUpdateCurrency,
  currentUser,
  onUpdateUser,
  onExportData,
  onImportData,
  onCloudSync,
  lang = 'fr'
}) => {
  // Check Permissions
  const canViewProfile = currentUser.permissions.includes('settings.view_profile');
  const canViewStore = currentUser.permissions.includes('settings.view_store');
  const canViewData = currentUser.permissions.includes('settings.view_data');

  // Navigation Tabs (Initial State based on permissions)
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'STORE' | 'DATA'>(
      canViewProfile ? 'PROFILE' : canViewStore ? 'STORE' : canViewData ? 'DATA' : 'PROFILE'
  );

  // Local state for Store Settings
  const [formData, setFormData] = useState(currentSettings);
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);
  const [isStoreSaved, setIsStoreSaved] = useState(false);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  
  // Local state for User Profile
  const [userName, setUserName] = useState(currentUser.name);
  const [userPin, setUserPin] = useState(currentUser.pin);
  const [userEmail, setUserEmail] = useState(currentUser.email || '');
  const [userPhone, setUserPhone] = useState(currentUser.phone || '');
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  
  // Firebase Config Modal
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [firebaseJson, setFirebaseJson] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.role === 'ADMIN';

  const t = (key: string) => getTranslation(lang, key);

  // Helper for Theme
  const currentThemeColor = formData.themeColor || '#4f46e5';

  // Check if DB is connected
  const isDbConnected = !!db;

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    onUpdateCurrency(selectedCurrency);
    
    setIsStoreSaved(true);
    setTimeout(() => setIsStoreSaved(false), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPin) return;
    
    onUpdateUser(currentUser.id, {
      name: userName,
      pin: userPin,
      email: userEmail,
      phone: userPhone
    });

    setIsProfileSaved(true);
    setTimeout(() => setIsProfileSaved(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("Attention : Cette action va écraser toutes les données actuelles (Stocks, Ventes, Utilisateurs). Êtes-vous sûr de vouloir restaurer cette sauvegarde ?")) {
          onImportData(json);
        }
      } catch (err) {
        alert("Erreur : Le fichier sélectionné n'est pas valide.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (limit to 2MB to keep localStorage happy)
    if (file.size > 2 * 1024 * 1024) {
      alert("L'image du logo est trop volumineuse (Max 2Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       const base64 = event.target?.result as string;
       setFormData({...formData, logoUrl: base64});
    };
    reader.readAsDataURL(file);
  };

  const handleRegenerateKey = () => {
      const confirmMsg = formData.recoveryKey 
        ? "Régénérer la clé invalidera l'ancienne. Continuer ?" 
        : "Générer une nouvelle clé de secours ?";
        
      if (window.confirm(confirmMsg)) {
          const newKey = 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          setFormData(prev => ({...prev, recoveryKey: newKey}));
          // Auto-save to ensure it persists immediately
          onUpdateSettings({...formData, recoveryKey: newKey});
      }
  };

  const copyKey = () => {
      if (formData.recoveryKey) {
          navigator.clipboard.writeText(formData.recoveryKey);
          alert("Clé copiée !");
      }
  };

  const handleSaveFirebaseConfig = () => {
    setConfigError(null);
    if (!firebaseJson.trim()) {
      setConfigError("Veuillez coller la configuration JSON.");
      return;
    }
    
    if (!firebaseJson.trim().startsWith('{')) {
      setConfigError("Format invalide : Le texte doit être un objet JSON complet commençant par '{'.");
      return;
    }

    const success = setupFirebase(firebaseJson);
    if (success) {
      setIsDbModalOpen(false);
      if (window.confirm("Configuration enregistrée ! L'application doit redémarrer pour se connecter. Redémarrer maintenant ?")) {
        window.location.reload();
      }
    } else {
      setConfigError("Configuration invalide. Vérifiez le format JSON et les clés (apiKey, projectId).");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      <header className="mb-6">
        <h2 className="text-3xl font-bold flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3" />
          {t('settings_title')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          {t('settings_subtitle')}
        </p>
      </header>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
        {canViewProfile && (
            <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${
                activeTab === 'PROFILE' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            >
            <div className="flex items-center"><UserIcon className="w-4 h-4 mr-2"/> {t('tab_profile')}</div>
            {activeTab === 'PROFILE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
            </button>
        )}
        
        {canViewStore && (
          <button
            onClick={() => setActiveTab('STORE')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${
              activeTab === 'STORE' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center"><Store className="w-4 h-4 mr-2"/> {t('tab_store')}</div>
             {activeTab === 'STORE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
          </button>
        )}

        {canViewData && (
          <button
            onClick={() => setActiveTab('DATA')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${
              activeTab === 'DATA' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center"><Cloud className="w-4 h-4 mr-2"/> {t('tab_data')}</div>
             {activeTab === 'DATA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></div>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* --- TAB 1: USER PROFILE --- */}
        {activeTab === 'PROFILE' && canViewProfile && (
          <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold mb-4">{t('edit_profile')}</h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center space-x-4 mb-6">
                 <img src={currentUser.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-emerald-100" />
                 <div>
                   <p className="text-sm text-slate-500 dark:text-slate-400">{t('connected_account')}</p>
                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                     {isAdmin ? 'Administrateur' : 'Vendeur'}
                   </span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('username')}</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                    <KeyRound className="w-4 h-4 mr-1 text-slate-400" />
                    {t('pin_code')}
                  </label>
                  <input
                    type="password"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono tracking-widest bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                
                {/* NEW FIELDS FOR EMAIL AND PHONE */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-1 text-slate-400" />
                    Email Personnel
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    Téléphone Personnel
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+33 6..."
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center space-x-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                {isProfileSaved && (
                  <span className="text-emerald-600 font-medium text-sm flex items-center animate-fade-in">
                    <CheckCircle className="w-4 h-4 mr-1" /> {t('profile_saved')}
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-slate-200 transition-all transform hover:scale-[1.02]"
                >
                  {t('save_profile')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 2: STORE SETTINGS --- */}
        {activeTab === 'STORE' && canViewStore && (
          <div className="xl:col-span-2 space-y-6">
            <form onSubmit={handleSaveStore} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
              <h3 className="text-lg font-bold mb-4">{t('general_config')}</h3>

              <div className="space-y-6">

                {/* --- THEME SETTINGS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Mode Sombre / Clair */}
                   <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                      <label className="block text-sm font-bold mb-3 flex items-center">
                        {formData.themeMode === 'dark' ? <Moon className="w-4 h-4 mr-2"/> : <Sun className="w-4 h-4 mr-2"/>}
                        {t('appearance')}
                      </label>
                      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                         <button
                           type="button"
                           onClick={() => setFormData({...formData, themeMode: 'light'})}
                           className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.themeMode !== 'dark' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                         >
                           {t('light')}
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({...formData, themeMode: 'dark'})}
                           className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.themeMode === 'dark' ? 'bg-slate-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           {t('dark')}
                         </button>
                      </div>
                   </div>

                   {/* Couleur Principale */}
                   <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                      <label className="block text-sm font-bold mb-3 flex items-center">
                        <Palette className="w-4 h-4 mr-2"/>
                        {t('primary_color')}
                      </label>
                      <div className="flex flex-wrap gap-3">
                         {THEME_COLORS.map(color => (
                           <button
                             key={color.id}
                             type="button"
                             onClick={() => setFormData({...formData, themeColor: color.hex})}
                             className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${currentThemeColor === color.hex ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-slate-200 dark:ring-slate-700' : 'border-transparent'}`}
                             style={{ backgroundColor: color.hex }}
                             title={color.label}
                           />
                         ))}
                      </div>
                   </div>
                </div>
                
                {/* LOGO UPLOAD SECTION */}
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                   <label className="block text-sm font-bold mb-3 flex items-center">
                     <ImageIcon className="w-4 h-4 mr-2" />
                     {t('company_logo')}
                   </label>
                   <div className="flex items-center space-x-4">
                     <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                       {formData.logoUrl ? (
                         <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                       ) : (
                         <Store className="w-8 h-8 text-slate-300" />
                       )}
                     </div>
                     <div className="flex-1">
                        <div className="flex gap-2">
                           <button 
                             type="button"
                             onClick={() => logoInputRef.current?.click()}
                             className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors"
                           >
                             {t('load_logo')}
                           </button>
                           {formData.logoUrl && (
                             <button 
                               type="button"
                               onClick={() => setFormData({...formData, logoUrl: undefined})}
                               className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                             >
                               {t('remove')}
                             </button>
                           )}
                        </div>
                        <input 
                          type="file" 
                          ref={logoInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden" 
                        />
                     </div>
                   </div>
                </div>

                {/* SECURITY & ACCESS (RECOVERY KEY) */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                    <label className="block text-sm font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center">
                        <KeyRound className="w-4 h-4 mr-2" />
                        Sécurité & Accès
                    </label>
                    <div className="space-y-2">
                        <label className="text-xs text-amber-800 dark:text-amber-300 font-medium">Clé de Récupération (Admin)</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input 
                                    type={showRecoveryKey ? "text" : "password"} 
                                    readOnly
                                    value={formData.recoveryKey || ''}
                                    placeholder={!formData.recoveryKey ? "Non générée - Cliquez sur Générer" : ""}
                                    className="w-full px-3 py-2 border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-mono"
                                />
                                <button
                                    type="button" 
                                    onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    disabled={!formData.recoveryKey}
                                >
                                    {showRecoveryKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {formData.recoveryKey && (
                                <button 
                                    type="button"
                                    onClick={copyKey}
                                    className="bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-700 p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-600 text-amber-700 dark:text-amber-400 transition-colors"
                                    title="Copier"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                type="button"
                                onClick={handleRegenerateKey}
                                className={`bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-700 p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-600 transition-colors ${!formData.recoveryKey ? 'w-auto px-4 flex items-center text-xs font-bold' : ''}`}
                                title={formData.recoveryKey ? "Régénérer" : "Générer Clé"}
                            >
                                <RefreshCw className={`w-4 h-4 ${!formData.recoveryKey ? 'mr-2' : ''}`} />
                                {!formData.recoveryKey ? "Générer" : ""}
                            </button>
                        </div>
                        <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-1">
                            {formData.recoveryKey 
                                ? "Cette clé sert à réinitialiser le code PIN admin si nécessaire."
                                : "Aucune clé de récupération n'est définie. Veuillez en générer une maintenant."}
                        </p>
                    </div>
                </div>

                {/* AI Configuration Status */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start space-x-4">
                  <div className="bg-white dark:bg-indigo-900 p-2 rounded-lg shadow-sm">
                    <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                     <h4 className="font-bold text-indigo-900 dark:text-indigo-300">{t('ai_active')}</h4>
                     <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                       {t('ai_ready')}
                     </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Globe className="w-4 h-4 inline mr-1 text-slate-400" />
                    {t('currency_lang')}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700"
                    >
                      {Object.values(CURRENCIES).map(curr => (
                        <option key={curr.code} value={curr.code}>
                          {curr.label} ({curr.symbol})
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700"
                    >
                      {AVAILABLE_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('company_details')}</label>
                  
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700"
                    placeholder={t('store_name')}
                  />
                  
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700"
                    placeholder={t('address')}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700"
                      placeholder={t('phone')}
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700"
                      placeholder={t('email')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center space-x-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {isStoreSaved && (
                  <span className="text-emerald-600 font-medium text-sm flex items-center animate-fade-in">
                    <CheckCircle className="w-4 h-4 mr-1" /> {t('settings_saved')}
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-xl shadow-indigo-200 transition-all transform hover:scale-[1.02]"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {t('update_btn')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 3: CLOUD & DATA --- */}
        {activeTab === 'DATA' && canViewData && (
          <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Database Connection */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Database className={`w-5 h-5 ${isDbConnected ? 'text-emerald-500' : 'text-red-500'}`} />
                    <h3 className="text-lg font-bold">Base de Données</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDbConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {isDbConnected ? 'CONNECTÉ (Firebase)' : 'DÉCONNECTÉ (Mode Local)'}
                  </span>
               </div>
               
               <p className="text-sm text-slate-500 mb-4">
                 {isDbConnected 
                   ? "Votre application est synchronisée en temps réel avec le cloud Google Firebase. Vos données sont sécurisées."
                   : "L'application fonctionne actuellement sans serveur. Les données ne sont pas partagées entre les appareils."}
               </p>
            </div>

            {/* Cloud Connectors */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                <Cloud className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold">{t('cloud_sync')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Google Drive */}
                 <div className={`border rounded-xl p-4 flex flex-col items-center text-center transition-all ${currentSettings.cloudProvider === 'GOOGLE_DRIVE' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-12 h-12 mb-3" />
                    <h4 className="font-bold">Google Drive</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('save')}</p>
                    <button 
                      onClick={() => onCloudSync('GOOGLE_DRIVE')}
                      className={`text-xs font-bold px-4 py-2 rounded-lg w-full ${currentSettings.cloudProvider === 'GOOGLE_DRIVE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                      {currentSettings.cloudProvider === 'GOOGLE_DRIVE' ? t('active') : t('save')}
                    </button>
                 </div>

                 {/* OneDrive */}
                 <div className={`border rounded-xl p-4 flex flex-col items-center text-center transition-all ${currentSettings.cloudProvider === 'ONEDRIVE' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg" alt="OneDrive" className="w-12 h-12 mb-3" />
                    <h4 className="font-bold">OneDrive</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Microsoft 365</p>
                    <button 
                      onClick={() => onCloudSync('ONEDRIVE')}
                      className={`text-xs font-bold px-4 py-2 rounded-lg w-full ${currentSettings.cloudProvider === 'ONEDRIVE' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                      {currentSettings.cloudProvider === 'ONEDRIVE' ? t('active') : t('save')}
                    </button>
                 </div>

                 {/* Dropbox */}
                 <div className={`border rounded-xl p-4 flex flex-col items-center text-center transition-all ${currentSettings.cloudProvider === 'DROPBOX' ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 ring-2 ring-sky-500/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg" alt="Dropbox" className="w-12 h-12 mb-3" />
                    <h4 className="font-bold">Dropbox</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cloud Storage</p>
                    <button 
                       onClick={() => onCloudSync('DROPBOX')}
                       className={`text-xs font-bold px-4 py-2 rounded-lg w-full ${currentSettings.cloudProvider === 'DROPBOX' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                    >
                      {currentSettings.cloudProvider === 'DROPBOX' ? t('active') : t('save')}
                    </button>
                 </div>
              </div>
            </div>

            {/* Local Data Management */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-bold">{t('local_backup')}</h3>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                {t('local_desc')}
              </div>

              <div className="space-y-3">
                 <button 
                  onClick={onExportData}
                  className="flex items-center w-full p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors group"
                 >
                   <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform mr-3">
                      <Download className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div className="text-left">
                     <span className="block font-bold">{t('export_json')}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('internal_backup')}</span>
                   </div>
                 </button>

                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center w-full p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors group"
                 >
                   <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform mr-3">
                      <Upload className="w-5 h-5 text-blue-600" />
                   </div>
                   <div className="text-left">
                     <span className="block font-bold">{t('import_json')}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('restore_backup')}</span>
                   </div>
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef}
                   onChange={handleFileChange}
                   accept=".json"
                   className="hidden" 
                 />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* FIREBASE CONFIG MODAL */}
      {isDbModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">Connexion Firebase</h3>
                 <button onClick={() => setIsDbModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="space-y-4">
                 <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
                    1. Créez un projet sur <a href="https://console.firebase.google.com" target="_blank" className="underline font-bold">console.firebase.google.com</a><br/>
                    2. Ajoutez une application Web (icône &lt;/&gt;)<br/>
                    3. Copiez le code <code>firebaseConfig</code> (l'objet JSON complet avec les accolades)<br/>
                    4. Collez-le ci-dessous :
                 </div>
                 
                 <textarea 
                   className="w-full h-48 p-3 border border-slate-300 rounded-xl font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
                   placeholder='{ "apiKey": "AIza...", "authDomain": "...", ... }'
                   value={firebaseJson}
                   onChange={(e) => setFirebaseJson(e.target.value)}
                 ></textarea>

                 {configError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-xs flex items-center">
                       <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                       {configError}
                    </div>
                 )}

                 <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => { setIsDbModalOpen(false); setConfigError(null); }}
                      className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleSaveFirebaseConfig}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                    >
                      Sauvegarder & Connecter
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
