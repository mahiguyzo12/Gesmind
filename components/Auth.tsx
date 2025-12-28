import React, { useState, useRef, useEffect } from 'react';
import { User, StoreMetadata, StoreSettings, Employee } from '../types';
import {
  LogIn,
  User as UserIcon,
  Lock,
  PlusCircle,
  Building,
  X,
  Trash2,
  ChevronDown,
  Store,
  Cloud,
  HardDrive,
  Sparkles,
  Check,
  Search,
  Copy,
  KeyRound,
} from 'lucide-react';
import { getTranslation } from '../translations';
import { generateStoreLogo } from '../services/geminiService';


interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateStore: (
    settings: StoreSettings,
    adminUser: User,
    adminEmployee: Employee
  ) => void;
  storeName?: string;
  storeLogo?: string;
  onDeleteStore?: (adminName: string, adminPin: string) => boolean;

  availableStores: StoreMetadata[];
  currentStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  onFindStore: (storeId: string) => Promise<StoreMetadata | null>;
  onAddKnownStore?: (metadata: StoreMetadata) => void;

  onVerifyRecoveryInfo?: (method: 'KEY' | 'CONTACT', value: string) => boolean;
  onResetPassword?: (newPin: string) => boolean;

  lang?: string;

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
  onSetupDb,
}) => {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // GLOBAL LOADING STATE (Pour l'écran de chargement vert)
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Create Store & Config State
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isFindStoreOpen, setIsFindStoreOpen] = useState(false);

  // Recovery State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryMethod, setRecoveryMethod] = useState<'KEY' | 'CONTACT'>(
    'CONTACT'
  );
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Find Store State
  const [searchStoreId, setSearchStoreId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundStore, setFoundStore] = useState<StoreMetadata | null>(null);

  const [showStorageChoiceModal, setShowStorageChoiceModal] = useState(false);
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);

  // --- NEW STORE FORM STATES ---
  // Section 1: Admin Personnel
  const [adminLastName, setAdminLastName] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminDOB, setAdminDOB] = useState('');
  const [adminPOB, setAdminPOB] = useState(''); // Lieu de naissance
  const [adminAddress, setAdminAddress] = useState('');
  const [adminCity, setAdminCity] = useState('');
  const [adminCountry, setAdminCountry] = useState('');
  const [adminZip, setAdminZip] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Section 2: Enterprise
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreCountry, setNewStoreCountry] = useState('');
  const [newStoreRCCM, setNewStoreRCCM] = useState(''); // Registre Commerce
  const [newStoreNIF, setNewStoreNIF] = useState(''); // Fiscal
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState<string | undefined>(undefined);

  // Section 3: Connexion
  const [loginPseudo, setLoginPseudo] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginPinConfirm, setLoginPinConfirm] = useState('');

  // Pending Data for DB Choice
  const [pendingCreation, setPendingCreation] = useState<{
    settings: StoreSettings;
    user: User;
    employee: Employee;
  } | null>(null);

  // LOGO GENERATION STATE
  const [isLogoGenModalOpen, setIsLogoGenModalOpen] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoPreview, setGeneratedLogoPreview] = useState<
    string | null
  >(null);
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

  // Load saved username
  useEffect(() => {
    const savedName = localStorage.getItem('gesmind_last_username');
    if (savedName) setUsername(savedName);
    else setUsername('');
    setPassword('');
    setError('');
  }, [currentStoreId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Déclenchement du loader
    setIsLoading(true);
    setLoadingMessage('Authentification...');

    // Simulation d'un délai réseau pour l'effet visuel (1.5s)
    setTimeout(() => {
      const user = users.find(
        (u) =>
          u.name.toLowerCase() === username.toLowerCase() && u.pin === password
      );
      if (user) {
        localStorage.setItem('gesmind_last_username', user.name);
        onLogin(user);
        // Le loader restera actif jusqu'à ce que le composant parent change de vue
      } else {
        setIsLoading(false);
        setError(t('login_error'));
      }
    }, 1500);
  };

  const generateAutoKey = () =>
    'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation Simple
    if (loginPin !== loginPinConfirm) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    if (loginPin.length !== 4) {
      alert('Le code PIN doit comporter 4 chiffres.');
      return;
    }
    if (!newStoreName || !loginPseudo || !adminLastName) {
      alert(
        'Veuillez remplir les champs obligatoires (Nom Entreprise, Admin, Pseudo).'
      );
      return;
    }

    const autoRecoveryKey = generateAutoKey();
    const now = new Date().toISOString();

    // 1. Prepare Settings
    const settings: StoreSettings = {
      name: newStoreName,
      address: newStoreAddress,
      city: newStoreCity,
      country: newStoreCountry,
      phone: newStorePhone,
      email: newStoreEmail,
      rccm: newStoreRCCM,
      nif: newStoreNIF,
      logoUrl: newLogoUrl,
      recoveryKey: autoRecoveryKey,
      language: 'fr',
      cloudProvider: 'NONE',
      themeMode: 'light',
      themeColor: '#4f46e5',
      lastClosingDate: now,
      githubRepo: 'mahiguyzo12/stockmind-update-server',
    };

    // 2. Prepare User (Login)
    const adminUser: User = {
      id: `u-${Date.now()}`,
      name: loginPseudo,
      role: 'ADMIN',
      pin: loginPin,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(loginPseudo)}&background=6366f1&color=fff`,
      commissionRate: 0,
      permissions: [], // Admin has all by default logic
      email: adminEmail,
      phone: adminPhone,
      lastLogin: now,
    };

    // 3. Prepare Employee (Personal Info)
    const adminEmployee: Employee = {
      id: `emp-${Date.now()}`,
      fullName: `${adminFirstName} ${adminLastName}`.trim(),
      jobTitle: 'Directeur Général', // Default Title
      department: 'Direction Générale',
      email: adminEmail,
      phone: adminPhone,
      address: adminAddress,
      city: adminCity,
      country: adminCountry,
      zipCode: adminZip,
      birthDate: adminDOB,
      placeOfBirth: adminPOB,
      residence: `${adminAddress} ${adminCity}`,
      baseSalary: 0, // Default
      hireDate: now.split('T')[0],
      documents: [],
    };

    // If DB Connected, Create immediately
    if (isDbConnected) {
      onCreateStore(settings, adminUser, adminEmployee);
      setIsSetupOpen(false);
      resetCreateForm();
    } else {
      // Store for choice
      setPendingCreation({
        settings,
        user: adminUser,
        employee: adminEmployee,
      });
      setIsSetupOpen(false);
      setShowStorageChoiceModal(true);
    }
  };

  const handleFindStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setFoundStore(null);
    if (!searchStoreId) return;

    // Loader Recherche
    setIsLoading(true);
    setLoadingMessage("Recherche de l'entreprise...");

    try {
      const result = await onFindStore(searchStoreId);
      // Délai artificiel pour fluidité
      await new Promise((r) => setTimeout(r, 800));

      if (result) setFoundStore(result);
      else setSearchError(
          "ID introuvable. Vérifiez l'ID ou si la boutique a été créée en mode local sur un autre appareil."
        );
    } catch {
      setSearchError('Erreur de connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmJoinStore = async () => {
    if (foundStore && onAddKnownStore) {
      // Loader Connexion Boutique
      setIsLoading(true);
      setLoadingMessage('Connexion à la boutique...');

      await new Promise((r) => setTimeout(r, 1000));

      onAddKnownStore(foundStore);
      setIsFindStoreOpen(false);
      setFoundStore(null);
      setSearchStoreId('');
      setIsLoading(false);
    }
  };

  const resetRecoveryState = () => {
    setIsRecoveryOpen(false);
    setRecoveryStep(1);
    setRecoveryInput('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setRecoveryError('');
    setRecoverySuccess(false);
  };

  const handleRecoveryVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!onVerifyRecoveryInfo) return;
    if (!recoveryInput.trim()) {
      setRecoveryError('Veuillez remplir le champ.');
      return;
    }
    const isValid = onVerifyRecoveryInfo(recoveryMethod, recoveryInput);
    if (isValid) setRecoveryStep(2);
    else setRecoveryError('Info incorrecte.');
  };

  const handleRecoveryReset = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!onResetPassword) return;
    if (recoveryNewPin.length !== 4 || recoveryNewPin !== recoveryConfirmPin) {
      setRecoveryError('Code PIN invalide ou ne correspond pas.');
      return;
    }
    if (onResetPassword(recoveryNewPin)) {
      setRecoverySuccess(true);
      setTimeout(() => resetRecoveryState(), 2000);
    } else {
      setRecoveryError('Erreur.');
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
    } else {
      const success = onSetupDb('LOCAL');
      if (success && pendingCreation) {
        onCreateStore(
          pendingCreation.settings,
          pendingCreation.user,
          pendingCreation.employee
        );
        resetCreateForm();
        setPendingCreation(null);
      }
    }
  };

  const handleDbConfigSubmit = () => {
    if (!firebaseJson.trim().startsWith('{')) {
      return;
    }
    const success = onSetupDb(firebaseJson);
    if (success) {
      setShowDbConfigModal(false);
      if (pendingCreation) {
        onCreateStore(
          pendingCreation.settings,
          pendingCreation.user,
          pendingCreation.employee
        );
        resetCreateForm();
        setPendingCreation(null);
      }
    }
  };

  const resetCreateForm = () => {
    setAdminLastName('');
    setAdminFirstName('');
    setAdminDOB('');
    setAdminPOB('');
    setAdminAddress('');
    setAdminCity('');
    setAdminCountry('');
    setAdminZip('');
    setAdminPhone('');
    setAdminEmail('');
    setNewStoreName('');
    setNewStoreAddress('');
    setNewStoreCity('');
    setNewStoreCountry('');
    setNewStoreRCCM('');
    setNewStoreNIF('');
    setNewStorePhone('');
    setNewStoreEmail('');
    setLoginPseudo('');
    setLoginPin('');
    setLoginPinConfirm('');
    setNewLogoUrl(undefined);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Max 2Mo');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) =>
      setNewLogoUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // --- LOGO GENERATION LOGIC ---
  const startLogoGeneration = () => {
    if (!newStoreName) {
      alert("Entrez le nom de l'entreprise d'abord.");
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
        setGeneratedLogoPreview(`data:image/svg+xml;base64,${base64}`);
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(`Erreur: ${error.message || 'Connexion requise.'}`);
      setIsLogoGenModalOpen(false);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const confirmGeneratedLogo = () => {
    if (generatedLogoPreview) setNewLogoUrl(generatedLogoPreview);
    setIsLogoGenModalOpen(false);
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (onDeleteStore && onDeleteStore(deleteAdminName, deleteAdminPin)) {
      setIsDeleteOpen(false);
      setDeleteAdminName('');
      setDeleteAdminPin('');
      alert('Supprimé.');
    } else {
      setDeleteError('Identifiants incorrects.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans relative">
      {/* LOADING SCREEN OVERLAY */}
      {isLoading && <LoadingScreen message={loadingMessage} />}

      {/* HEADER BAR */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
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
                {availableStores.map((store) => (
                  <option
                    key={store.id}
                    value={store.id}
                    className="text-slate-900 bg-white"
                  >
                    {store.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsSetupOpen(true)}
            className="flex items-center space-x-2 bg-teal-600/20 backdrop-blur-md border border-teal-500/50 rounded-xl px-3 py-2 text-teal-300 font-bold text-sm"
          >
            <PlusCircle className="w-4 h-4" /> <span>Créer Boutique</span>
          </button>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-800/30 px-3 py-1.5 rounded-full border border-slate-700/30">
        <span
          className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
        ></span>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center">
          {isDbConnected ? 'Sécurisé' : 'Local'}
        </span>
      </div>

      {/* STORE LOGO */}
      {currentStoreId && (
        <div className="text-center mb-8 animate-fade-in flex flex-col items-center mt-12 sm:mt-0 justify-center group relative">
          {storeLogo ? (
            <img
              src={storeLogo}
              className="w-32 h-32 object-contain mb-4 drop-shadow-2xl"
            />
          ) : (
            // Use Generic Store Icon if no custom logo to respect "No Gesmind default"
            <div className="mb-4 p-6 bg-slate-800/50 rounded-full border border-slate-700 shadow-2xl backdrop-blur-sm">
              <Store className="w-20 h-20 text-slate-300" />
            </div>
          )}

          {storeName && (
            <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
              {storeName}
            </h2>
          )}

          <button
            onClick={handleCopyId}
            className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 opacity-70 hover:opacity-100 transition-all cursor-pointer flex items-center gap-2"
          >
            {copyFeedback ? (
              <span className="text-emerald-400 font-bold flex items-center">
                <Check className="w-3 h-3 mr-1" /> Copié !
              </span>
            ) : (
              <>
                ID:{' '}
                <span className="font-mono text-teal-400 select-all">
                  {currentStoreId}
                </span>{' '}
                <Copy className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      )}

      {/* LOGIN FORM */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {availableStores.length > 0 ? (
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  {t('username')}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Votre pseudo"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-900">
                    {t('password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono tracking-widest"
                    placeholder="••••"
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center animate-pulse">
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-teal-200 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 transition-all transform hover:scale-[1.02]"
              >
                <LogIn className="w-5 h-5 mr-2" /> {t('login_button')}
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
              Rejoindre (ID)
            </button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">ou</span>
              </div>
            </div>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200"
            >
              {t('create_first_store')}
            </button>
          </div>
        )}
      </div>

      {availableStores.length > 0 && (
        <div className="mt-6 w-full max-w-md flex flex-col items-center gap-4 z-10 px-2">
          <div className="flex justify-between w-full">
            <button
              onClick={() => setIsFindStoreOpen(true)}
              className="flex items-center text-slate-500 hover:text-white hover:bg-white/10 transition-all py-1.5 px-3 rounded-full text-xs opacity-70 hover:opacity-100"
            >
              <Search className="w-3 h-3 mr-1.5" /> Trouver
            </button>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="flex items-center text-slate-500 hover:text-white hover:bg-white/10 transition-all py-1.5 px-3 rounded-full text-xs opacity-70 hover:opacity-100"
            >
              <PlusCircle className="w-3 h-3 mr-1.5" /> Créer Autre
            </button>
          </div>
          {currentStoreId && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center text-[10px] text-slate-600 hover:text-red-400 font-medium transition-colors opacity-50 hover:opacity-100"
            >
              <Trash2 className="w-3 h-3 mr-1.5" /> {t('delete_store')}
            </button>
          )}
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center">
                  <Building className="w-6 h-6 mr-2 text-indigo-600" /> Nouvelle
                  Entreprise
                </h3>
                <p className="text-sm text-slate-500">
                  Configuration complète de votre espace de travail.
                </p>
              </div>
              <button
                onClick={() => setIsSetupOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-8">
              {/* ... (Form Content) ... */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2" /> 1. Informations
                  Personnelles (Administrateur)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Nom"
                    className="input-field"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Prénom"
                    className="input-field"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                  />
                  <input
                    type="date"
                    className="input-field"
                    value={adminDOB}
                    onChange={(e) => setAdminDOB(e.target.value)}
                    title="Date de naissance"
                  />
                  <input
                    type="text"
                    placeholder="Lieu de naissance"
                    className="input-field"
                    value={adminPOB}
                    onChange={(e) => setAdminPOB(e.target.value)}
                  />

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Adresse Résidence"
                      className="input-field md:col-span-3"
                      value={adminAddress}
                      onChange={(e) => setAdminAddress(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Ville"
                      className="input-field"
                      value={adminCity}
                      onChange={(e) => setAdminCity(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Pays"
                      className="input-field"
                      value={adminCountry}
                      onChange={(e) => setAdminCountry(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Code Postal"
                      className="input-field"
                      value={adminZip}
                      onChange={(e) => setAdminZip(e.target.value)}
                    />
                  </div>

                  <input
                    type="tel"
                    placeholder="Téléphone Personnel"
                    className="input-field"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email Personnel"
                    className="input-field"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center">
                  <Store className="w-4 h-4 mr-2" /> 2. Informations de
                  l'Entreprise
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="Nom Commercial / Enseigne"
                      className="input-field font-bold"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Adresse Siège Social"
                      className="input-field"
                      value={newStoreAddress}
                      onChange={(e) => setNewStoreAddress(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Ville"
                        className="input-field"
                        value={newStoreCity}
                        onChange={(e) => setNewStoreCity(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Pays"
                        className="input-field"
                        value={newStoreCountry}
                        onChange={(e) => setNewStoreCountry(e.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Registre Commerce (RCCM/SIRET)"
                      className="input-field font-mono"
                      value={newStoreRCCM}
                      onChange={(e) => setNewStoreRCCM(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="N° Impôt / Fiscal (NIF/TIN)"
                      className="input-field font-mono"
                      value={newStoreNIF}
                      onChange={(e) => setNewStoreNIF(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Logo & Branding
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        {newLogoUrl ? (
                          <img
                            src={newLogoUrl}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Store className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs bg-white border border-slate-300 px-3 py-2 rounded shadow-sm hover:bg-slate-50 text-slate-700"
                        >
                          Importer Image
                        </button>
                        <button
                          type="button"
                          onClick={startLogoGeneration}
                          disabled={!newStoreName}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded shadow-sm hover:bg-indigo-200 flex items-center"
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> Générer IA
                        </button>
                        <input
                          type="file"
                          ref={logoInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <input
                        type="tel"
                        placeholder="Tél Entreprise"
                        className="input-field"
                        value={newStorePhone}
                        onChange={(e) => setNewStorePhone(e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Email Pro"
                        className="input-field"
                        value={newStoreEmail}
                        onChange={(e) => setNewStoreEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-2 flex items-center">
                  <KeyRound className="w-4 h-4 mr-2" /> 3. Informations de
                  Connexion
                </h4>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Pseudo / Identifiant
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400"
                      value={loginPseudo}
                      onChange={(e) => setLoginPseudo(e.target.value)}
                      placeholder="Ex: Admin88"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Code PIN (4 chiffres)
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 font-mono text-center tracking-widest"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      placeholder="••••"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-800 mb-1">
                      Confirmer PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 font-mono text-center tracking-widest"
                      value={loginPinConfirm}
                      onChange={(e) => setLoginPinConfirm(e.target.value)}
                      placeholder="••••"
                    />
                  </div>
                  <div className="md:col-span-3 text-xs text-amber-700 italic">
                    * Une clé de récupération unique sera générée
                    automatiquement pour ce compte administrateur.
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-indigo-200 transition-all transform hover:scale-[1.02]"
                >
                  <Check className="w-5 h-5 mr-2" /> Créer & Démarrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FIND STORE MODAL --- */}
      {isFindStoreOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              {t('change_store')}
            </h3>
                      <p className="text-slate-500 text-sm mb-6">
                        Entrez l&apos;identifiant unique de la boutique que vous souhaitez
                        rejoindre.
                      </p>            <form onSubmit={handleFindStoreSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchStoreId}
                  onChange={(e) => setSearchStoreId(e.target.value)}
                  className="input-field pl-10"
                  placeholder="ID Boutique"
                  required
                />
              </div>
              {searchError && (
                <p className="text-red-500 text-sm font-medium">
                  {searchError}
                </p>
              )}
              {foundStore && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Building className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">
                      {foundStore.name}
                    </p>
                    <p className="text-xs text-emerald-700">
                      ID: {foundStore.id}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFindStoreOpen(false);
                    setFoundStore(null);
                    setSearchError('');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  {t('cancel')}
                </button>
                {foundStore ? (
                  <button
                    type="button"
                    onClick={confirmJoinStore}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200"
                  >
                    Rejoindre
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200"
                  >
                    Chercher
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECOVERY MODAL --- */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Récupération Admin
            </h3>

            {recoveryStep === 1 ? (
              <form onSubmit={handleRecoveryVerification} className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Veuillez vérifier votre identité.
                </p>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('CONTACT')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border ${recoveryMethod === 'CONTACT' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    Email / Tél
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('KEY')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border ${recoveryMethod === 'KEY' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    Clé Secours
                  </button>
                </div>
                <input
                  type="text"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  className="input-field"
                  placeholder={
                    recoveryMethod === 'KEY'
                      ? 'Clé Admin (REC-...)'
                      : 'Email ou Téléphone enregistré'
                  }
                  required
                />
                {recoveryError && (
                  <p className="text-red-500 text-xs font-bold">
                    {recoveryError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetRecoveryState}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg"
                  >
                    Vérifier
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRecoveryReset} className="space-y-4">
                {recoverySuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8" />
                    </div>
                    <p className="text-emerald-800 font-bold">
                      Code PIN réinitialisé avec succès !
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-2">
                      Identité vérifiée. Définissez le nouveau PIN Admin.
                    </p>
                    <input
                      type="password"
                      value={recoveryNewPin}
                      onChange={(e) => setRecoveryNewPin(e.target.value)}
                      className="input-field text-center font-mono tracking-widest text-lg"
                      placeholder="Nouveau PIN"
                      maxLength={4}
                      required
                    />
                    <input
                      type="password"
                      value={recoveryConfirmPin}
                      onChange={(e) => setRecoveryConfirmPin(e.target.value)}
                      className="input-field text-center font-mono tracking-widest text-lg"
                      placeholder="Confirmer PIN"
                      maxLength={4}
                      required
                    />
                    {recoveryError && (
                      <p className="text-red-500 text-xs font-bold">
                        {recoveryError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg"
                    >
                      Confirmer changement
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- DELETE STORE MODAL --- */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-red-600 mb-2">
              {t('delete_store_title')}
            </h3>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              {t('delete_store_warning')}
            </p>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <label className="block text-xs font-bold text-red-800 mb-1">
                  {t('delete_confirm_admin')}
                </label>
                <input
                  type="text"
                  value={deleteAdminName}
                  onChange={(e) => setDeleteAdminName(e.target.value)}
                  className="w-full p-2 border border-red-200 rounded bg-white text-sm mb-2"
                  placeholder="Nom Admin"
                  required
                />
                <input
                  type="password"
                  value={deleteAdminPin}
                  onChange={(e) => setDeleteAdminPin(e.target.value)}
                  className="w-full p-2 border border-red-200 rounded bg-white text-sm font-mono text-center tracking-widest"
                  placeholder="Code PIN"
                  maxLength={4}
                  required
                />
              </div>
              {deleteError && (
                <p className="text-red-500 text-xs font-bold">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg"
                >
                  {t('delete_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STORAGE CHOICE MODAL --- */}
      {showStorageChoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Mode de Stockage
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Où souhaitez-vous stocker les données de votre entreprise ?
            </p>
            <div className="space-y-4">
              <button
                onClick={() => handleStorageChoice('CLOUD')}
                className="w-full p-4 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 flex items-center transition-all group"
              >
                <div className="bg-indigo-100 p-3 rounded-full mr-4 group-hover:bg-indigo-200">
                  <Cloud className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-indigo-900">
                    Cloud (Recommandé)
                  </h4>
                  <p className="text-xs text-indigo-700">
                    Synchronisation multi-appareils, sauvegarde automatique.
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleStorageChoice('LOCAL')}
                className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-slate-400 bg-white hover:bg-slate-50 flex items-center transition-all group"
              >
                <div className="bg-slate-100 p-3 rounded-full mr-4 group-hover:bg-slate-200">
                  <HardDrive className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-800">
                    Local (Hors-ligne)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Données stockées uniquement sur cet appareil.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DB CONFIG MODAL --- */}
      {showDbConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              Configuration Cloud
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Collez la configuration JSON de votre projet Firebase ci-dessous.
            </p>
            <textarea
              className="w-full h-40 p-3 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              placeholder='{ "apiKey": "...", "authDomain": "...", ... }'
              value={firebaseJson}
              onChange={(e) => setFirebaseJson(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDbConfigModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleDbConfigSubmit}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGO GENERATION MODAL */}
      {isLogoGenModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up border-t-4 border-indigo-500">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">
              Création de Logo IA
            </h3>
            <div className="flex flex-col items-center justify-center py-4 min-h-[200px]">
              {isGeneratingLogo ? (
                <div className="text-center animate-pulse">
                  <p className="text-indigo-700 font-bold">Création...</p>
                </div>
              ) : generatedLogoPreview ? (
                <div className="flex flex-col items-center w-full">
                  <img
                    src={generatedLogoPreview}
                    className="w-40 h-40 object-contain mb-6"
                  />
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={performGeneration}
                      className="flex-1 py-2 bg-slate-100 rounded"
                    >
                      Refaire
                    </button>
                    <button
                      onClick={confirmGeneratedLogo}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Description (Optionnel)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded mb-4 h-20 text-sm"
                    value={logoDescription}
                    onChange={(e) => setLogoDescription(e.target.value)}
                    placeholder="Ex: Moderne, minimaliste, bleu..."
                  ></textarea>
                  <button
                    onClick={performGeneration}
                    className="w-full py-2 bg-indigo-600 text-white rounded font-bold shadow-lg hover:bg-indigo-700 transition-colors"
                  >
                    Générer
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogoGenModalOpen(false)}
                className="text-slate-400 text-xs hover:text-slate-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-field {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            outline: none;
            transition: all 0.2s;
            background-color: #ffffff;
            color: #0f172a;
        }
        .input-field::placeholder { color: #94a3b8; }
        .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
      `}</style>
    </div>
  );
};
