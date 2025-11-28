
import React, { useState, useRef, useEffect } from 'react';
import { User, StoreMetadata } from '../types';
import { LogIn, User as UserIcon, Lock, PlusCircle, Building, ArrowRight, X, Image as ImageIcon, Trash2, AlertTriangle, ChevronDown, Store, Cloud, Database, HardDrive, ShieldCheck, AlertCircle, Sparkles, Loader2, Upload, Check, RefreshCw, Palette } from 'lucide-react';
import { getTranslation } from '../translations';
import { generateStoreLogo } from '../services/geminiService';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateStore: (storeName: string, adminName: string, adminPin: string, logoUrl?: string) => void;
  storeName?: string;
  storeLogo?: string;
  onDeleteStore?: (adminName: string, adminPin: string) => boolean;
  
  // Multi-Store Props
  availableStores: StoreMetadata[];
  currentStoreId: string | null;
  onSelectStore: (storeId: string) => void;
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
  const [showStorageChoiceModal, setShowStorageChoiceModal] = useState(false); // Modal Cloud vs Local
  const [showDbConfigModal, setShowDbConfigModal] = useState(false); // Modal Config Firebase
  
  // Config Error State
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Pending Store Data (Waiting for DB)
  const [pendingStoreData, setPendingStoreData] = useState<{name: string, admin: string, pin: string, logo?: string} | null>(null);

  const [newStoreName, setNewStoreName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState<string | undefined>(undefined);
  
  // LOGO GENERATION STATE
  const [isLogoGenModalOpen, setIsLogoGenModalOpen] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoPreview, setGeneratedLogoPreview] = useState<string | null>(null);
  const [logoDescription, setLogoDescription] = useState('');
  
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStoreName && newAdminName && newAdminPin.length === 4) {
      
      const storeData = {
        name: newStoreName,
        admin: newAdminName,
        pin: newAdminPin,
        logo: newLogoUrl
      };

      // Si la base de données est DÉJÀ connectée (Cloud ou Local), on crée direct
      if (isDbConnected) {
        onCreateStore(storeData.name, storeData.admin, storeData.pin, storeData.logo);
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

  const handleStorageChoice = (type: 'CLOUD' | 'LOCAL') => {
    setShowStorageChoiceModal(false);
    if (type === 'CLOUD') {
      setShowDbConfigModal(true);
      setConfigError(null);
    } else {
      // Local Mode
      const success = onSetupDb('LOCAL');
      if (success && pendingStoreData) {
         onCreateStore(pendingStoreData.name, pendingStoreData.admin, pendingStoreData.pin, pendingStoreData.logo);
         resetCreateForm();
         setPendingStoreData(null);
      }
    }
  };
  
  const handleDbConfigSubmit = () => {
    setConfigError(null);
    
    // Validation basique avant envoi
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
      // Create the store that was pending
      if (pendingStoreData) {
        onCreateStore(pendingStoreData.name, pendingStoreData.admin, pendingStoreData.pin, pendingStoreData.logo);
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
    setLogoDescription(''); // Reset description
    setIsLogoGenModalOpen(true);
    // On ne lance plus la génération tout de suite, on attend la validation de la description
  };

  const performGeneration = async () => {
    setIsGeneratingLogo(true);
    try {
      // On passe la description utilisateur (ou vide)
      const svgCode = await generateStoreLogo(newStoreName, logoDescription);
      if (svgCode) {
        // Convert SVG string to base64 data URI
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
      <div className="absolute top-4 left-4 z-20">
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
                {availableStores.length === 0 && <option value="">{t('no_store')}</option>}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
           </div>
           <p className="text-[10px] text-slate-500 mt-1 pl-1">{t('change_store')}</p>
         </div>
      </div>

      {/* DB STATUS (TOP RIGHT) */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
         <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
         <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
           {isDbConnected ? 'Online' : 'Local / Setup'}
         </span>
      </div>

      {/* ZONE ENTREPRISE (LOGO + NOM) - Affichée seulement si une boutique est sélectionnée */}
      {currentStoreId && (
        <div className="text-center mb-8 animate-fade-in flex flex-col items-center mt-12 sm:mt-0 justify-center">
          {/* Logo (Optionnel) */}
          {storeLogo && (
             <img 
               src={storeLogo} 
               alt="Logo Entreprise" 
               className="w-32 h-32 object-contain mb-4 drop-shadow-2xl"
             />
          )}
          
          {/* Nom de l'entreprise (Toujours visible si une entreprise est sélectionnée) */}
          {storeName && (
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
              {storeName}
            </h2>
          )}
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
                <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="password">
                  {t('password')}
                </label>
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
          <div className="p-12 text-center text-slate-500">
             <Building className="w-16 h-16 mx-auto mb-4 text-slate-300" />
             <p className="mb-6">{t('no_store')}</p>
             <button 
               onClick={() => setIsSetupOpen(true)}
               className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200/50"
             >
               {t('create_first_store')}
             </button>
          </div>
        )}
        
        {/* Footer: App Name (Gesmind) + Slogan */}
        {!isSetupOpen && !isDeleteOpen && !showDbConfigModal && !showStorageChoiceModal && (
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col items-center justify-center">
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
                Gesmind
             </h1>
             <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Smart Business Hub</p>
          </div>
        )}
      </div>
      
      {/* Footer avec Liens */}
      <div className="mt-8 w-full max-w-md flex justify-between items-center text-xs text-slate-500 px-2">
        {availableStores.length > 0 ? (
          <button 
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center text-slate-500 hover:text-red-400 font-medium transition-colors group"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            {t('delete_store')}
          </button>
        ) : <div></div>}
        
        <button 
          onClick={() => setIsSetupOpen(true)}
          className="flex items-center text-teal-400 hover:text-teal-300 font-medium transition-colors group"
        >
          <PlusCircle className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
          {t('create_other_store')}
        </button>
      </div>

      {/* MODAL CRÉATION ENTREPRISE (ÉTAPE 1) */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
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
                    {newStoreName && !newLogoUrl && (
                      <p className="text-[10px] text-slate-400 mt-1 ml-1">Astuce : Entrez le nom pour activer la génération IA.</p>
                    )}
                  </div>

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

      {/* MODAL GENERATION LOGO IA */}
      {isLogoGenModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-t-4 border-indigo-500">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Création de Logo IA</h3>
              
              <div className="flex flex-col items-center justify-center py-4 min-h-[200px]">
                 
                 {/* STEP 1: LOADING */}
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
                 /* STEP 2: PREVIEW & VALIDATION */
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
                 /* STEP 3: INPUT (DEFAULT START) */
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

      {/* MODAL CHOIX STOCKAGE (ÉTAPE 2) */}
      {showStorageChoiceModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in-up">
              <div className="text-center mb-8">
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">Où stocker vos données ?</h3>
                 <p className="text-slate-500">Choisissez comment vous souhaitez gérer les données de <strong>{pendingStoreData?.name}</strong>.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                 {/* Option Cloud */}
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

                 {/* Option Local */}
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

      {/* MODAL CONFIG FIREBASE (ÉTAPE 3 - SI CLOUD CHOISI) */}
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
                      onClick={() => { setShowDbConfigModal(false); setShowStorageChoiceModal(true); setConfigError(null); }}
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

      {/* MODAL SUPPRESSION */}
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
