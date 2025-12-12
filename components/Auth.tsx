
import React, { useState, useRef, useEffect } from 'react';
import { User, StoreMetadata } from '../types';
import { LogIn, User as UserIcon, Lock, PlusCircle, Building, ArrowRight, X, Image as ImageIcon, Trash2, AlertTriangle, ChevronDown, Store, Cloud, Database, HardDrive, ShieldCheck, AlertCircle, Sparkles, Upload, Check, RefreshCw, Palette, Search, Copy, KeyRound, HelpCircle, Mail, Phone, Shield } from 'lucide-react';
import { getTranslation } from '../translations';
import { generateStoreLogo } from '../services/geminiService';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateStore: (storeName: string, adminName: string, adminPin: string, logoUrl?: string, recoveryKey?: string, email?: string, phone?: string) => void;
  storeName?: string;
  storeLogo?: string;
  onDeleteStore?: (adminName: string, adminPin: string) => boolean;
  
  // Multi-Store Props
  availableStores: StoreMetadata[];
  currentStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  onFindStore: (storeId: string) => Promise<StoreMetadata | null>; // Returns Data
  onAddKnownStore?: (metadata: StoreMetadata) => void; // New action to confirm
  
  // Recovery Handler
  onVerifyRecoveryInfo?: (method: 'KEY' | 'CONTACT', value: string) => boolean; // Étape 1
  onResetPassword?: (newPin: string) => boolean; // Étape 2

  lang?: string;
  
  // Database Props
  isDbConnected: boolean;
  onSetupDb: (configJson: string) => boolean;
}

export const Auth: React.FC<AuthProps> = ({ 
  users, 
  onLogin, 
  onCreateStore, 
  storeName, 
  storeLogo, 
  onDeleteStore,
  availableStores,
  currentStoreId,
  onSelectStore,
  onFindStore,
  onAddKnownStore,
  onVerifyRecoveryInfo,
  onResetPassword,
  lang = 'fr',
  isDbConnected,
  onSetupDb
}) => {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');

  // Create Store & Config State
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isFindStoreOpen, setIsFindStoreOpen] = useState(false);
  
  // Recovery State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // Étape 1 : Verif, Étape 2 : Nouveau PIN
  const [recoveryMethod, setRecoveryMethod] = useState<'KEY' | 'CONTACT'>('CONTACT');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState(''); // Confirmation PIN
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Find Store State
  const [searchStoreId, setSearchStoreId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundStore, setFoundStore] = useState<StoreMetadata | null>(null);

  const [showStorageChoiceModal, setShowStorageChoiceModal] = useState(false); // Modal Cloud vs Local
  const [showDbConfigModal, setShowDbConfigModal] = useState(false); // Modal Config Firebase
  
  // Config Error State
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Pending Store Data (Waiting for DB)
  const [pendingStoreData, setPendingStoreData] = useState<{name: string, admin: string, pin: string, logo?: string, recoveryKey?: string, email?: string, phone?: string} | null>(null);

  const [newStoreName, setNewStoreName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  // const [newRecoveryKey, setNewRecoveryKey] = useState(''); // REMOVED: Auto-generated now
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState<string | undefined>(undefined);
  
  // LOGO GENERATION STATE
  const [isLogoGenModalOpen, setIsLogoGenModalOpen] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoPreview, setGeneratedLogoPreview] = useState<string | null>(null);
  const [logoDescription, setLogoDescription] = useState('');
  
  // Copy Feedback State
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // DB Config Input
  const [firebaseJson, setFirebaseJson] = useState('');

  // Delete Store Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteAdminName, setDeleteAdminName] = useState('');
  const [deleteAdminPin, setDeleteAdminPin] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => getTranslation(lang, key);

  // Load saved username on mount or store change
  useEffect(() => {
    const savedName = localStorage.getItem('gesmind_last_username');
    if (savedName) {
      setUsername(savedName);
    } else {
      setUsername('');
    }
    setPassword('');
    setError('');
  }, [currentStoreId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users.find(
      u => u.name.toLowerCase() === username.toLowerCase() && u.pin === password
    );

    if (user) {
      localStorage.setItem('gesmind_last_username', user.name);
      onLogin(user);
    } else {
      setError(t('login_error'));
    }
  };

  const generateAutoKey = () => {
      return 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoreName && newAdminName && newAdminPin.length === 4) {
      
      // AUTO GENERATE RECOVERY KEY
      const autoRecoveryKey = generateAutoKey();

      const storeData = {
        name: newStoreName,
        admin: newAdminName,
        pin: newAdminPin,
        logo: newLogoUrl,
        recoveryKey: autoRecoveryKey,
        email: newStoreEmail,
        phone: newStorePhone
      };

      // Si la base de données est DÉJÀ connectée (Cloud ou Local), on crée direct
      if (isDbConnected) {
        onCreateStore(storeData.name, storeData.admin, storeData.pin, storeData.logo, storeData.recoveryKey, storeData.email, storeData.phone);
        setIsSetupOpen(false);
        resetCreateForm();
      } else {
        // Sinon, on sauvegarde les données et on demande le type de stockage
        setPendingStoreData(storeData);
        setIsSetupOpen(false); // Close form
        setShowStorageChoiceModal(true); // Open Choice Modal
      }
    }
  };

  // STEP 1: FIND
  const handleFindStoreSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSearchError('');
      setFoundStore(null); // Reset
      if (!searchStoreId) return;

      const result = await onFindStore(searchStoreId);
      if (result) {
          setFoundStore(result);
      } else {
          setSearchError("ID introuvable. Vérifiez auprès de l'administrateur.");
      }
  };

  // STEP 2: CONFIRM JOIN
  const confirmJoinStore = () => {
      if (foundStore && onAddKnownStore) {
          onAddKnownStore(foundStore);
          setIsFindStoreOpen(false);
          setFoundStore(null);
          setSearchStoreId('');
      }
  };

  // RECOVERY FLOW
  const resetRecoveryState = () => {
      setIsRecoveryOpen(false);
      setRecoveryStep(1);
      setRecoveryInput('');
      setRecoveryNewPin('');
      setRecoveryConfirmPin('');
      setRecoveryError('');
      setRecoverySuccess(false);
  };

  // Étape 1 : Vérification
  const handleRecoveryVerification = (e: React.FormEvent) => {
      e.preventDefault();
      setRecoveryError('');
      if (!onVerifyRecoveryInfo) return;

      if (!recoveryInput.trim()) {
          setRecoveryError("Veuillez remplir le champ.");
          return;
      }

      const isValid = onVerifyRecoveryInfo(recoveryMethod, recoveryInput);
      if (isValid) {
          setRecoveryStep(2); // Passe à l'étape 2
      } else {
          setRecoveryError(recoveryMethod === 'KEY' 
            ? "Clé de secours incorrecte." 
            : "Email ou Téléphone ne correspond pas.");
      }
  };

  // Étape 2 : Changement de Mot de passe
  const handleRecoveryReset = (e: React.FormEvent) => {
      e.preventDefault();
      setRecoveryError('');
      if (!onResetPassword) return;

      if (recoveryNewPin.length !== 4) {
          setRecoveryError("Le code PIN doit comporter 4 chiffres.");
          return;
      }
      if (recoveryNewPin !== recoveryConfirmPin) {
          setRecoveryError("Les codes PIN ne correspondent pas.");
          return;
      }

      const success = onResetPassword(recoveryNewPin);
      if (success) {
          setRecoverySuccess(true);
          setTimeout(() => {
              resetRecoveryState();
          }, 2000);
      } else {
          setRecoveryError("Erreur lors de la mise à jour.");
      }
  };

  const handleCopyId = () => {
      if (currentStoreId) {
          navigator.clipboard.writeText(currentStoreId);
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2000);
      }
  };

  const handleStorageChoice = (type: 'CLOUD' | 'LOCAL') => {
    setShowStorageChoiceModal(false);
    if (type === 'CLOUD') {
      setShowDbConfigModal(true);
      setConfigError(null);
    } else {
      // Local Mode
      const success = onSetupDb('LOCAL');
      if (success && pendingStoreData) {
         onCreateStore(pendingStoreData.name, pendingStoreData.admin, pendingStoreData.pin, pendingStoreData.logo, pendingStoreData.recoveryKey, pendingStoreData.email, pendingStoreData.phone);
         resetCreateForm();
         setPendingStoreData(null);
      }
    }
  };
  
  const handleDbConfigSubmit = () => {
    setConfigError(null);
    if (!firebaseJson.trim()) {
      setConfigError("Veuillez coller la configuration JSON.");
      return;
    }
    if (!firebaseJson.trim().startsWith('{')) {
      setConfigError("Format invalide : Le texte doit être un objet JSON complet commençant par '{'.");
      return;
    }

    const success = onSetupDb(firebaseJson);
    if (success) {
      setShowDbConfigModal(false);
      if (pendingStoreData) {
        onCreateStore(pendingStoreData.name, pendingStoreData.admin, pendingStoreData.pin, pendingStoreData.logo, pendingStoreData.recoveryKey, pendingStoreData.email, pendingStoreData.phone);
        resetCreateForm();
        setPendingStoreData(null);
      }
    } else {
      setConfigError("Configuration invalide. Vérifiez le format JSON ou les clés.");
    }
  };

  const resetCreateForm = () => {
    setNewStoreName('');
    setNewAdminName('');
    setNewAdminPin('');
    // setNewRecoveryKey(''); // Removed
    setNewStoreEmail('');
    setNewStorePhone('');
    setNewLogoUrl(undefined);
  }
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image est trop volumineuse (Max 2Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       setNewLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- LOGO GENERATION LOGIC ---
  const startLogoGeneration = () => {
    if (!newStoreName) {
      alert("Veuillez d'abord entrer le nom de l'entreprise.");
      return;
    }
    setGeneratedLogoPreview(null);
    setLogoDescription(''); 
    setIsLogoGenModalOpen(true);
  };

  const performGeneration = async () => {
    setIsGeneratingLogo(true);
    try {
      const svgCode = await generateStoreLogo(newStoreName, logoDescription);
      if (svgCode) {
        const base64 = btoa(unescape(encodeURIComponent(svgCode)));
        const dataUrl = `data:image/svg+xml;base64,${base64}`;
        setGeneratedLogoPreview(dataUrl);
      }
    } catch (e) {
      console.error(e);
      alert("Impossible de générer le logo. Vérifiez la connexion internet.");
      setIsLogoGenModalOpen(false);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const confirmGeneratedLogo = () => {
    if (generatedLogoPreview) {
      setNewLogoUrl(generatedLogoPreview);
    }
    setIsLogoGenModalOpen(false);
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (onDeleteStore) {
      const success = onDeleteStore(deleteAdminName, deleteAdminPin);
      if (success) {
        setIsDeleteOpen(false);
        setDeleteAdminName('');
        setDeleteAdminPin('');
        alert("L'entreprise a été supprimée.");
      } else {
        setDeleteError("Identifiants administrateur incorrects.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans relative">
      
      {/* SELECTEUR D'ENTREPRISE (HAUT GAUCHE) */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
         {/* Bouton SELECT ou ADD */}
         {availableStores.length > 0 ? (
             <div className="relative group">
                <div className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl px-3 py-2 text-white cursor-pointer hover:bg-slate-800 transition-colors">
                    <Store className="w-4 h-4 text-teal-400" />
                    <select 
                        value={currentStoreId || ''}
                        onChange={(e) => onSelectStore(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-medium appearance-none pr-6 cursor-pointer text-slate-200"
                        style={{ minWidth: '120px' }}
                    >
                        {availableStores.map(store => (
                        <option key={store.id} value={store.id} className="text-slate-900 bg-white">
                            {store.name}
                        </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">{t('change_store')}</p>
             </div>
         ) : (
             <button 
                onClick={() => setIsSetupOpen(true)}
                className="flex items-center space-x-2 bg-teal-600/20 backdrop-blur-md border border-teal-500/50 rounded-xl px-3 py-2 text-teal-300 cursor-pointer hover:bg-teal-600/30 transition-colors text-sm font-bold"
             >
                 <PlusCircle className="w-4 h-4" />
                 <span>Créer Boutique</span>
             </button>
         )}
      </div>

      {/* DB STATUS (TOP RIGHT) - INFO SEULEMENT */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-800/30 px-3 py-1.5 rounded-full border border-slate-700/30">
         <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
         <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center">
           {isDbConnected ? 'Sécurisé' : 'Local'}
         </span>
      </div>

      {/* ZONE ENTREPRISE (LOGO + NOM + ID DISPLAY) */}
      {currentStoreId && (
        <div className="text-center mb-8 animate-fade-in flex flex-col items-center mt-12 sm:mt-0 justify-center group relative">
          {storeLogo && (
             <img 
               src={storeLogo} 
               alt="Logo Entreprise" 
               className="w-32 h-32 object-contain mb-4 drop-shadow-2xl"
             />
          )}
          {storeName && (
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
              {storeName}
            </h2>
          )}
          {/* DISPLAY STORE ID FOR COPYING */}
          <button 
            onClick={handleCopyId}
            className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 opacity-70 hover:opacity-100 transition-all cursor-pointer flex items-center gap-2 hover:bg-slate-800 hover:text-white group"
            title="Cliquez pour copier l'ID"
          >
             {copyFeedback ? (
                 <span className="text-emerald-400 font-bold animate-pulse flex items-center">
                    <Check className="w-3 h-3 mr-1" /> Copié !
                 </span>
             ) : (
                 <>ID: <span className="font-mono text-teal-400 select-all">{currentStoreId}</span> <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></>
             )}
          </button>
        </div>
      )}

      {/* Formulaire de Connexion */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {availableStores.length > 0 ? (
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Champ Utilisateur */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="username">
                  {t('username')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full text-slate-900 pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm font-medium"
                    placeholder="Entrez votre nom"
                    required
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-900" htmlFor="password">
                    {t('password')}
                    </label>
                    <button 
                        type="button"
                        onClick={() => setIsRecoveryOpen(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Code oublié ?
                    </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full text-slate-900 pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all sm:text-sm font-medium tracking-widest"
                    placeholder="••••"
                    required
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-teal-200 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all transform hover:scale-[1.02]"
              >
                <LogIn className="w-5 h-5 mr-2" />
                {t('login_button')}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 flex flex-col gap-4">
             <Building className="w-16 h-16 mx-auto mb-2 text-slate-300" />
             <p>{t('no_store')}</p>
             
             <button 
               onClick={() => setIsFindStoreOpen(true)}
               className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg"
             >
               Rejoindre une boutique (ID)
             </button>
             
             <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">ou</span></div>
             </div>

             <button 
               onClick={() => setIsSetupOpen(true)}
               className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200"
             >
               {t('create_first_store')}
             </button>
          </div>
        )}
        
        {/* Footer: App Name (Gesmind) + Slogan */}
        {!isSetupOpen && !isDeleteOpen && !showDbConfigModal && !showStorageChoiceModal && !isFindStoreOpen && !isRecoveryOpen && (
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col items-center justify-center">
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
                Gesmind
             </h1>
             <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Smart Business Hub</p>
          </div>
        )}
      </div>
      
      {/* Footer avec Lien Création Réduit (Aligné à droite) */}
      {availableStores.length > 0 && (
        <div className="mt-6 w-full max-w-md flex flex-col items-center gap-4 z-10 px-2">
            {/* Row for Find / Create */}
            <div className="flex justify-between w-full">
                <button 
                onClick={() => setIsFindStoreOpen(true)}
                className="flex items-center text-slate-500 hover:text-white hover:bg-white/10 transition-all py-1.5 px-3 rounded-full text-xs opacity-70 hover:opacity-100"
                >
                <Search className="w-3 h-3 mr-1.5" />
                Trouver boutique
                </button>

                <button 
                onClick={() => setIsSetupOpen(true)}
                className="flex items-center text-slate-500 hover:text-white hover:bg-white/10 transition-all py-1.5 px-3 rounded-full text-xs opacity-70 hover:opacity-100"
                >
                <PlusCircle className="w-3 h-3 mr-1.5" />
                {t('create_other_store')}
                </button>
            </div>

            {/* DELETE BUTTON CENTRED BELOW */}
            {currentStoreId && (
                <div className="flex justify-center">
                    <button 
                        onClick={() => setIsDeleteOpen(true)}
                        className="flex items-center text-[10px] text-slate-600 hover:text-red-400 font-medium transition-colors group opacity-50 hover:opacity-100"
                    >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        {t('delete_store')}
                    </button>
                </div>
            )}
        </div>
      )}

      {/* MODAL REJOINDRE BOUTIQUE (ID) */}
      {isFindStoreOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Rejoindre une boutique</h3>
                 <button onClick={() => { setIsFindStoreOpen(false); setFoundStore(null); setSearchStoreId(''); setSearchError(''); }} className="text-slate-400 hover:text-slate-600">
                   <X className="w-6 h-6" />
                 </button>
              </div>

              {!foundStore ? (
                <form onSubmit={handleFindStoreSubmit} className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Identifiant Unique (ID)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Ex: store_123456..."
                        value={searchStoreId}
                        onChange={e => setSearchStoreId(e.target.value)}
                        autoFocus
                      />
                      <p className="text-xs text-slate-400 mt-1">Demandez l'ID à votre administrateur.</p>
                   </div>
                   
                   {searchError && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center">
                         <AlertTriangle className="w-3 h-3 mr-1" /> {searchError}
                      </div>
                   )}

                   <button 
                     type="submit"
                     className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                   >
                     Rechercher
                   </button>
                </form>
              ) : (
                 <div className="text-center space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center">
                        {foundStore.logoUrl ? (
                           <img src={foundStore.logoUrl} className="w-16 h-16 object-contain mb-2" />
                        ) : (
                           <Store className="w-12 h-12 text-slate-300 mb-2" />
                        )}
                        <h4 className="text-xl font-bold text-slate-800">{foundStore.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">ID: {foundStore.id}</p>
                    </div>
                    
                    <div className="flex gap-3">
                       <button 
                         onClick={() => setFoundStore(null)}
                         className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                       >
                         Retour
                       </button>
                       <button 
                         onClick={confirmJoinStore}
                         className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg flex items-center justify-center"
                       >
                         <Check className="w-4 h-4 mr-2" />
                         Rejoindre
                       </button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* MODAL RECOVERY */}
      {isRecoveryOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up relative">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">
                          {recoveryStep === 1 ? 'Vérification Identité' : 'Nouveau Code PIN'}
                      </h3>
                      <button onClick={resetRecoveryState} className="text-slate-400 hover:text-slate-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {recoverySuccess ? (
                      <div className="text-center py-6 text-emerald-600">
                          <Check className="w-16 h-16 mx-auto mb-2" />
                          <p className="font-bold">Code PIN mis à jour !</p>
                          <p className="text-xs text-slate-500">Vous pouvez maintenant vous connecter.</p>
                      </div>
                  ) : recoveryStep === 1 ? (
                      // STEP 1: VERIFICATION FORM
                      <form onSubmit={handleRecoveryVerification} className="space-y-4">
                          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                              <button
                                type="button"
                                onClick={() => { setRecoveryMethod('CONTACT'); setRecoveryError(''); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${recoveryMethod === 'CONTACT' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Email / Tél
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRecoveryMethod('KEY'); setRecoveryError(''); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${recoveryMethod === 'KEY' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Clé Secrète
                              </button>
                          </div>

                          {recoveryMethod === 'CONTACT' ? (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email ou Téléphone</label>
                                  <input 
                                      type="text"
                                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                                      value={recoveryInput}
                                      onChange={e => setRecoveryInput(e.target.value)}
                                      placeholder="Ex: admin@store.com ou 06..."
                                      autoFocus
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">Saisissez l'email ou le téléphone enregistré.</p>
                              </div>
                          ) : (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clé de Secours</label>
                                  <input 
                                      type="password"
                                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                                      value={recoveryInput}
                                      onChange={e => setRecoveryInput(e.target.value)}
                                      placeholder="Clé secrète"
                                      autoFocus
                                  />
                              </div>
                          )}

                          {recoveryError && (
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded text-center font-medium flex items-center justify-center">
                                  <AlertCircle className="w-3 h-3 mr-1"/> {recoveryError}
                              </div>
                          )}

                          <button 
                              type="submit"
                              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg flex justify-center items-center"
                          >
                              Vérifier l'accès
                          </button>
                      </form>
                  ) : (
                      // STEP 2: RESET PASSWORD FORM
                      <form onSubmit={handleRecoveryReset} className="space-y-4 animate-fade-in">
                          <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-xs flex items-center mb-2">
                              <Shield className="w-4 h-4 mr-2" />
                              Identité vérifiée. Définissez votre nouveau code.
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nouveau PIN Admin</label>
                              <input 
                                  type="password"
                                  maxLength={4}
                                  className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-indigo-500/20"
                                  value={recoveryNewPin}
                                  onChange={e => setRecoveryNewPin(e.target.value)}
                                  placeholder="••••"
                                  autoFocus
                              />
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmer le PIN</label>
                              <input 
                                  type="password"
                                  maxLength={4}
                                  className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-indigo-500/20"
                                  value={recoveryConfirmPin}
                                  onChange={e => setRecoveryConfirmPin(e.target.value)}
                                  placeholder="••••"
                              />
                          </div>

                          {recoveryError && (
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded text-center font-medium">
                                  {recoveryError}
                              </div>
                          )}

                          <div className="flex gap-3">
                              <button 
                                  type="button"
                                  onClick={() => setRecoveryStep(1)}
                                  className="flex-1 py-3 text-slate-500 hover:text-slate-700 font-bold text-xs"
                              >
                                  Retour
                              </button>
                              <button 
                                  type="submit"
                                  className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg"
                              >
                                  Confirmer
                              </button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      )}

      {/* MODAL CRÉATION ENTREPRISE (ÉTAPE 1) - (Existing code remains same) */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{t('new_store_title')}</h3>
                  <p className="text-sm text-slate-500">{t('new_store_subtitle')}</p>
                </div>
                <button onClick={() => setIsSetupOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
             </div>

             <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      <Building className="w-4 h-4 mr-2 text-slate-400" />
                      {t('store_name')}
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Ma Boutique Mode"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                      value={newStoreName}
                      onChange={e => setNewStoreName(e.target.value)}
                    />
                  </div>

                  {/* Logo Upload & AI Generation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <div className="flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2 text-slate-400" />
                        {t('logo_optional')}
                      </div>
                    </label>
                    
                    <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                          {newLogoUrl ? (
                            <img src={newLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                       </div>
                       
                       <div className="flex flex-col gap-2 w-full">
                          <button 
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center justify-center font-medium"
                          >
                            <Upload className="w-3 h-3 mr-2" />
                            {t('choose_image')}
                          </button>
                          
                          <button 
                            type="button"
                            onClick={startLogoGeneration}
                            disabled={!newStoreName}
                            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg transition-colors flex items-center justify-center font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-3 h-3 mr-2" />
                            Générer par IA
                          </button>
                       </div>
                       <input 
                         type="file" 
                         ref={logoInputRef} 
                         className="hidden" 
                         accept="image/*"
                         onChange={handleLogoUpload}
                       />
                    </div>
                  </div>

                  {/* Admin Account */}
                  <div className="border-t border-slate-100 pt-4">
                     <p className="text-xs font-bold text-teal-600 uppercase mb-3">{t('admin_account')}</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin_name')}</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ex: Patron"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20"
                            value={newAdminName}
                            onChange={e => setNewAdminName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t('pin_code')}</label>
                          <input 
                            type="password" 
                            required
                            maxLength={4}
                            pattern="\d{4}"
                            placeholder="••••"
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 font-mono tracking-widest text-center"
                            value={newAdminPin}
                            onChange={e => setNewAdminPin(e.target.value)}
                          />
                        </div>
                     </div>
                  </div>

                  {/* Recovery Options */}
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold text-amber-800 uppercase flex items-center">
                              <KeyRound className="w-3 h-3 mr-1" /> Sécurité & Récupération
                          </label>
                      </div>
                      
                      <div className="space-y-3">
                          <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                              <input 
                                type="email"
                                className="w-full pl-9 px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm"
                                placeholder="Email de secours"
                                value={newStoreEmail}
                                onChange={e => setNewStoreEmail(e.target.value)}
                              />
                          </div>
                          <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                              <input 
                                type="text"
                                className="w-full pl-9 px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm"
                                placeholder="Tél de secours"
                                value={newStorePhone}
                                onChange={e => setNewStorePhone(e.target.value)}
                              />
                          </div>
                          <p className="text-[10px] text-amber-700 mt-2 font-medium">
                              La Clé de Récupération sera générée automatiquement et visible dans les paramètres.
                          </p>
                      </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-teal-200 transition-all"
                  >
                    {t('confirm')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* MODAL GENERATION LOGO IA (Existing code...) */}
      {isLogoGenModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-t-4 border-indigo-500">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Création de Logo IA</h3>
              <div className="flex flex-col items-center justify-center py-4 min-h-[200px]">
                 {isGeneratingLogo ? (
                    <div className="text-center animate-pulse">
                       <div className="relative w-20 h-20 mx-auto mb-4">
                          <div className="absolute inset-0 rounded-full bg-indigo-200 animate-ping opacity-75"></div>
                          <div className="relative bg-white rounded-full p-4 shadow-lg border-2 border-indigo-100 flex items-center justify-center h-full w-full">
                             <Sparkles className="w-8 h-8 text-indigo-600 animate-spin-slow" />
                          </div>
                       </div>
                       <p className="text-indigo-700 font-bold">Création en cours...</p>
                       <p className="text-xs text-slate-400 mt-1">Gemini dessine votre logo</p>
                    </div>
                 ) 
                 : generatedLogoPreview ? (
                    <div className="flex flex-col items-center w-full">
                       <div className="w-40 h-40 bg-white border-2 border-slate-100 rounded-xl shadow-inner mb-6 p-2 flex items-center justify-center">
                          <img src={generatedLogoPreview} alt="Generated Logo" className="w-full h-full object-contain" />
                       </div>
                       <div className="flex gap-3 w-full">
                          <button 
                            onClick={performGeneration}
                            className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-sm"
                          >
                             <RefreshCw className="w-4 h-4 mr-2" />
                             Régénérer
                          </button>
                          <button 
                            onClick={confirmGeneratedLogo}
                            className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm shadow-lg shadow-indigo-200"
                          >
                             <Check className="w-4 h-4 mr-2" />
                             Valider
                          </button>
                       </div>
                    </div>
                 )
                 : (
                    <div className="w-full">
                       <div className="bg-indigo-50 p-3 rounded-xl mb-4 flex items-start">
                          <Palette className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-indigo-800">
                             L'IA va générer un logo unique basé sur le nom <strong>{newStoreName}</strong>. 
                             Ajoutez une description pour guider le style.
                          </p>
                       </div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optionnel)</label>
                       <textarea 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 h-20 resize-none focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="Ex: Un lion bleu minimaliste, géométrique, moderne..."
                          value={logoDescription}
                          onChange={(e) => setLogoDescription(e.target.value)}
                       ></textarea>
                       <div className="flex gap-3 w-full">
                          <button 
                             onClick={() => setIsLogoGenModalOpen(false)} 
                             className="flex-1 py-2 text-slate-500 font-medium text-sm hover:text-slate-700"
                          >
                             Annuler
                          </button>
                          <button 
                             onClick={performGeneration}
                             className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm shadow-md"
                          >
                             <Sparkles className="w-4 h-4 mr-2" />
                             Lancer la création
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL CHOIX STOCKAGE & CONFIG DB (Existing code...) */}
      {showStorageChoiceModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
              <div className="text-center mb-8">
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Où stocker vos données ?</h3>
                 <p className="text-slate-500">Choisissez comment vous souhaitez gérer les données de <strong>{pendingStoreData?.name}</strong>.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                   onClick={() => handleStorageChoice('CLOUD')}
                   className="p-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-500 hover:shadow-xl transition-all group flex flex-col items-center text-center relative overflow-hidden"
                 >
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">RECOMMANDÉ</div>
                    <div className="p-3 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <Cloud className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h4 className="font-bold text-indigo-900 mb-1">Firebase Cloud</h4>
                    <p className="text-xs text-indigo-700/70 mb-4">Synchronisation temps réel, multi-appareils, sauvegardes automatiques.</p>
                    <div className="text-xs font-medium text-indigo-600 flex items-center">
                       Configurer maintenant <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                 </button>
                 <button 
                   onClick={() => handleStorageChoice('LOCAL')}
                   className="p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-400 hover:shadow-xl transition-all group flex flex-col items-center text-center"
                 >
                    <div className="p-3 bg-slate-100 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <HardDrive className="w-8 h-8 text-slate-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">Stockage Local</h4>
                    <p className="text-xs text-slate-500 mb-4">Données stockées uniquement sur cet appareil. Pas de synchronisation.</p>
                    <div className="text-xs font-medium text-slate-600 flex items-center">
                       Démarrer tout de suite <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                 </button>
              </div>
              <button 
                onClick={() => { setShowStorageChoiceModal(false); setPendingStoreData(null); }}
                className="mt-8 w-full text-center text-slate-400 hover:text-slate-600 text-sm"
              >
                Annuler la création
              </button>
           </div>
        </div>
      )}

      {showDbConfigModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up border-t-4 border-indigo-500">
              <div className="flex items-center space-x-3 mb-6">
                 <div className="bg-indigo-100 p-3 rounded-full">
                    <Database className="w-8 h-8 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">Configuration Firebase</h3>
                    <p className="text-sm text-slate-500">Connectez votre base de données Google.</p>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-900 leading-relaxed border border-blue-100 flex items-start">
                    <ShieldCheck className="w-5 h-5 mr-2 flex-shrink-0" />
                    <div>
                       <span className="font-bold block mb-1">Sécurité & Données</span>
                       Collez ici la configuration JSON de votre projet Firebase. Vos clés sont stockées localement.
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">JSON Configuration</label>
                    <textarea 
                      className="w-full h-32 p-3 border border-slate-300 rounded-xl font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder='{ "apiKey": "AIza...", "authDomain": "...", ... }'
                      value={firebaseJson}
                      onChange={(e) => setFirebaseJson(e.target.value)}
                    ></textarea>
                 </div>
                 {configError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-xs flex items-center">
                       <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                       {configError}
                    </div>
                 )}
                 <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => { setShowDbConfigModal(false); if(pendingStoreData) setShowStorageChoiceModal(true); setConfigError(null); }}
                      className="px-4 py-3 text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Retour
                    </button>
                    <button 
                      onClick={handleDbConfigSubmit}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-colors flex items-center"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      Connecter & Finaliser
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL SUPPRESSION (Existing code...) */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up border-2 border-red-100">
              <div className="flex items-center space-x-3 mb-4 text-red-600">
                <div className="bg-red-100 p-2 rounded-full">
                   <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{t('delete_store_title')}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                {t('delete_store_warning')}
              </p>
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">{t('delete_confirm_admin')}</p>
                    <div className="space-y-3">
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">{t('admin_name')}</label>
                          <input 
                            type="text"
                            required
                            value={deleteAdminName}
                            onChange={(e) => setDeleteAdminName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Entrez votre nom"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">{t('pin_code')}</label>
                          <input 
                            type="password"
                            required
                            maxLength={4}
                            value={deleteAdminPin}
                            onChange={(e) => setDeleteAdminPin(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest"
                            placeholder="••••"
                          />
                       </div>
                    </div>
                 </div>
                 {deleteError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded font-medium text-center">
                       {deleteError}
                    </div>
                 )}
                 <div className="flex justify-end space-x-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsDeleteOpen(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-200 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('delete_btn')}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};
