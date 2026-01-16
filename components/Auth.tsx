
import React, { useState, useRef, useEffect } from 'react';
import { User, StoreMetadata, StoreSettings, Employee, BackupData } from '../types';
import { LogIn, User as UserIcon, Lock, PlusCircle, Building, X, Store, Cloud, KeyRound, Check, RefreshCw, Sparkles, Moon, Sun, Palette, Image as ImageIcon, Link, Mail, Phone, Eye, EyeOff, Copy, FileText, FileSpreadsheet, File, Terminal, Play, RotateCcw, Trash2, AlertTriangle, Shield, Upload, MapPin, Globe, Briefcase, Wand2, Stars, CheckCircle, ArrowRight } from 'lucide-react';
import { getTranslation } from '../translations';
import { generateStoreLogo } from '../services/geminiService';
import { GesmindLogo } from './GesmindLogo';
import { LoadingScreen } from './LoadingScreen';
import { auth, googleProvider } from '../src/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup, 
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged
} from 'firebase/auth';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onCreateStore: (settings: StoreSettings, adminUser: User, adminEmployee: Employee) => Promise<void>;
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
  onImportBackup?: (data: BackupData) => void; 
}

export const Auth: React.FC<AuthProps> = ({ 
  users, 
  onLogin, 
  onCreateStore, 
  availableStores,
  onImportBackup,
  storeName,
  storeLogo,
  onDeleteStore,
  currentStoreId,
  onSelectStore,
  onFindStore,
  onAddKnownStore,
  lang = 'fr',
  isDbConnected
}) => {
  // VIEW STATES
  const [currentView, setCurrentView] = useState<'STORE_LOGIN' | 'SETUP' | 'CLOUD_AUTH'>(
      currentStoreId ? 'STORE_LOGIN' : 'SETUP'
  );

  const [setupMode, setSetupMode] = useState<'CREATE' | 'JOIN' | 'CREATE_FORM'>('CREATE');
  
  // Cloud Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth?.currentUser || null);

  // LOGIN STATE
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [error, setError] = useState<React.ReactNode>('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- NEW CREATE FORM STATE ---
  const [pName, setPName] = useState('');
  const [pFirstName, setPFirstName] = useState('');
  const [pDob, setPDob] = useState('');
  const [pPob, setPPob] = useState('');
  const [pResidence, setPResidence] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pZip, setPZip] = useState('');
  
  const [cFullName, setCFullName] = useState('');
  const [cShortName, setCShortName] = useState('');
  const [cRccm, setCRccm] = useState('');
  const [cNif, setCNif] = useState('');
  const [cZip, setCZip] = useState('');
  const [cLoc, setCLoc] = useState('');

  const [newLogoUrl, setNewLogoUrl] = useState<string | undefined>(undefined);
  const [logoPrompt, setLogoPrompt] = useState('');
  
  // AI CONSOLE STATE
  const [isLogoConsoleOpen, setIsLogoConsoleOpen] = useState(false);
  const [logoConsoleLogs, setLogoConsoleLogs] = useState<string[]>([]);
  const [generatedPreviewInConsole, setGeneratedPreviewInConsole] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [lConfirm, setLConfirm] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);

  // JOIN STATE
  const [joinStoreId, setJoinStoreId] = useState('');
  const [previewStore, setPreviewStore] = useState<StoreMetadata | null>(null); // State for the preview card
  const [isStoreSelectorOpen, setIsStoreSelectorOpen] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const t = (key: string) => getTranslation(lang, key);

  // Sync View
  useEffect(() => {
      if (currentStoreId) {
          setCurrentView('STORE_LOGIN');
      } else {
          setCurrentView('SETUP');
      }
  }, [currentStoreId]);

  // Listen to Auth State Changes explicitly to ensure sync
  useEffect(() => {
      if (auth) {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
              setFirebaseUser(user);
              if (user) {
                  if (user.email && !pEmail) setPEmail(user.email);
                  if (user.phoneNumber && !pPhone) setPPhone(user.phoneNumber);
              }
          });
          return () => unsubscribe();
      }
  }, [auth]);

  // Console Auto Scroll
  useEffect(() => {
    if (isLogoConsoleOpen) {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logoConsoleLogs, isLogoConsoleOpen]);

  // Clean up Recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  // Recaptcha Init for Phone Auth within the Component
  useEffect(() => {
    let isMounted = true;
    if (currentView === 'CLOUD_AUTH' && authMethod === 'PHONE' && auth) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        const container = document.getElementById('auth-recaptcha-container');
        if (container) {
            try {
                if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = undefined;
                }
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'auth-recaptcha-container', {
                  'size': 'invisible'
                });
                window.recaptchaVerifier.render();
            } catch (e) { console.error("Recaptcha error", e); }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    return () => { isMounted = false; };
  }, [currentView, authMethod]);

  // --- ACTIONS ---

  const handleStoreLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError(t('login_error')); return; }
    
    setError('');
    setIsLoading(true);
    setLoadingMessage(t('login_secure'));

    const user = users.find(u => 
        (u.name.toLowerCase() === email.toLowerCase() || u.email === email) && 
        u.pin === password
    );
    
    if (user) {
        onLogin(user);
    } else {
        setIsLoading(false);
        setError(t('login_error'));
    }
  };

  const handleCreateStoreSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!cShortName) { setError("Le nom abrégé est requis."); return; }
      if (!lUser) { setError("Le nom d'utilisateur est requis."); return; }
      if (lPass.length < 4) { setError("PIN min 4 caractères."); return; }
      if (lPass !== lConfirm) { setError("Mots de passe différents."); return; }

      // Validation Cloud STRICTE
      if (isDbConnected && !firebaseUser) {
          setError(
            <div className="flex flex-col gap-2 items-start">
                <span className="font-bold text-red-600">Connexion Cloud requise !</span>
                <button 
                    type="button"
                    onClick={() => setCurrentView('CLOUD_AUTH')}
                    className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md"
                >
                    {t('cloud_login')}
                </button>
            </div>
          );
          window.scrollTo(0,0);
          return;
      }

      setIsLoading(true);
      setLoadingMessage("Configuration...");

      // L'utilisateur Cloud est déjà là ou null (si mode local)
      let effectiveUid = firebaseUser?.uid;
      const autoRecoveryKey = 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const settings: StoreSettings = {
        name: cShortName,
        address: cFullName ? `${cFullName}, ${cLoc}` : cLoc,
        city: cLoc,
        zipCode: cZip,
        phone: pPhone,
        email: pEmail || (firebaseUser?.email || ''),
        logoUrl: newLogoUrl,
        rccm: cRccm,
        nif: cNif,
        recoveryKey: autoRecoveryKey,
        language: lang,
        cloudProvider: 'NONE',
        themeMode: 'light',
        themeColor: '#4f46e5',
        githubRepo: 'mahiguyzo12/Gesmind'
      };

      const adminUser: User = {
        id: `u-${Date.now()}`,
        authUid: effectiveUid,
        name: lUser,
        role: 'ADMIN',
        pin: lPass,
        avatar: firebaseUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(lUser)}&background=6366f1&color=fff`,
        commissionRate: 0,
        permissions: [],
        email: pEmail,
        phone: pPhone,
        lastLogin: new Date().toISOString()
      };

      const adminEmployee: Employee = {
        id: `emp-${Date.now()}`,
        fullName: `${pFirstName} ${pName}`.trim() || lUser,
        jobTitle: 'Directeur Général',
        department: 'Direction',
        email: pEmail,
        phone: pPhone,
        address: pResidence,
        zipCode: pZip,
        baseSalary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        birthDate: pDob || undefined,
        placeOfBirth: pPob,
        residence: pResidence,
        documents: []
      };

      try {
          await onCreateStore(settings, adminUser, adminEmployee);
      } catch (err: any) {
          setIsLoading(false);
          setLoadingMessage('');
          setError(err.message || "Erreur création.");
      }
  };

  // --- LOGO GENERATION WITH CONSOLE ---
  const addLog = (msg: string) => setLogoConsoleLogs(prev => [...prev, msg]);
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const runLogoGenerationProcess = async () => {
      setGeneratedPreviewInConsole(null);
      setLogoConsoleLogs([]);
      setIsGeneratingLogo(true);
      
      addLog("Initialisation du moteur graphique...");
      await delay(800);
      addLog("Analyse du style de l'entreprise...");
      await delay(800);
      
      try {
          const nameToUse = cFullName || cShortName;
          const promptToUse = logoPrompt || "Design moderne, professionnel et minimaliste.";
          const svgCode = await generateStoreLogo(nameToUse, promptToUse);

          addLog("Rendu final...");
          await delay(500);

          if (svgCode) {
            const base64 = btoa(unescape(encodeURIComponent(svgCode)));
            setGeneratedPreviewInConsole(`data:image/svg+xml;base64,${base64}`);
          }
      } catch (e: any) {
          console.error(e);
          addLog("Erreur de génération.");
      } finally {
          setIsGeneratingLogo(false);
      }
  };

  const handleStartLogoGeneration = () => {
      if (!cShortName && !cFullName) { alert("Nom entreprise requis."); return; }
      setIsLogoConsoleOpen(true);
      runLogoGenerationProcess();
  };

  const handleConfirmLogo = () => {
      if (generatedPreviewInConsole) {
          setNewLogoUrl(generatedPreviewInConsole);
      }
      setIsLogoConsoleOpen(false);
  };

  const handleCancelLogo = () => {
      setIsLogoConsoleOpen(false);
      setGeneratedPreviewInConsole(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setNewLogoUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleJoinStoreSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!joinStoreId) return;
      
      setIsLoading(true);
      setError('');
      setLoadingMessage(t('login_secure'));
      setPreviewStore(null);

      try {
          const cleanId = joinStoreId.trim();
          await new Promise(r => setTimeout(r, 800));
          const metadata = await onFindStore(cleanId);
          if (metadata) {
              setPreviewStore(metadata);
          } else {
              setError(`ID introuvable : ${cleanId}`);
          }
      } catch (err) {
          setError("Erreur connexion.");
      } finally {
          setIsLoading(false);
      }
  };

  const confirmJoinStore = () => {
      if (previewStore && onAddKnownStore) {
          onAddKnownStore(previewStore);
          setCurrentView('STORE_LOGIN');
      }
  };

  // --- AUTH HANDLERS ---

  const handleCloudLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth) return;
      
      if (authMode === 'REGISTER' && password !== confirmPassword) {
          setError("Mots de passe non identiques.");
          return;
      }

      setIsLoading(true);
      setError('');
      try {
          if (authMode === 'LOGIN') {
              const cred = await signInWithEmailAndPassword(auth, email, password);
              setFirebaseUser(cred.user);
              setSuccessMsg(t('msg_verified'));
              setTimeout(() => setCurrentView('SETUP'), 1000);
          } else {
              const cred = await createUserWithEmailAndPassword(auth, email, password);
              await sendEmailVerification(cred.user);
              setFirebaseUser(cred.user);
              setSuccessMsg("Compte créé !");
          }
      } catch (err: any) {
          handleAuthError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth || !phoneNumber) return;
      
      setIsLoading(true);
      setError('');
      
      try {
          if (!window.recaptchaVerifier) {
             window.recaptchaVerifier = new RecaptchaVerifier(auth, 'auth-recaptcha-container', { 'size': 'invisible' });
          }
          const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
          setConfirmationResult(confirmation);
          setSuccessMsg(t('msg_code_sent'));
      } catch (err: any) {
          handleAuthError(err);
          if (window.recaptchaVerifier) { try {window.recaptchaVerifier.clear();} catch(e){} window.recaptchaVerifier = undefined; }
      } finally {
          setIsLoading(false);
      }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmationResult || !otpCode) return;
      setIsLoading(true);
      try {
          const result = await confirmationResult.confirm(otpCode);
          setFirebaseUser(result.user);
          setSuccessMsg(t('msg_verified'));
          setTimeout(() => setCurrentView('SETUP'), 1000);
      } catch (err: any) {
          handleAuthError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleGoogleSignIn = async () => {
      if (!auth) return;
      setIsLoading(true);
      try {
          const result = await signInWithPopup(auth, googleProvider);
          setFirebaseUser(result.user);
          setSuccessMsg(t('msg_google_connected'));
          setTimeout(() => setCurrentView('SETUP'), 1000);
      } catch (err: any) {
          handleAuthError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAuthError = (err: any) => {
      console.error(err);
      setError(err.message);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans relative overflow-y-auto">
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600 blur-[100px]"></div>
      </div>

      {isLoading && <LoadingScreen message={loadingMessage} />}

      {/* --- TOP BAR --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20">
         {availableStores.length > 0 ? (
             <div className="relative">
                 <button 
                    onClick={() => setIsStoreSelectorOpen(!isStoreSelectorOpen)}
                    className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-2 text-white hover:bg-slate-700 transition-colors"
                 >
                     <Store className="w-4 h-4 text-emerald-400" />
                     <span className="font-bold text-sm max-w-[150px] truncate">{storeName || "Sélectionner"}</span>
                 </button>
                 {isStoreSelectorOpen && (
                     <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-30">
                         {availableStores.map(store => (
                             <button
                                key={store.id}
                                onClick={() => { onSelectStore(store.id); setIsStoreSelectorOpen(false); }}
                                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-slate-700 ${store.id === currentStoreId ? 'bg-slate-700/50' : ''}`}
                             >
                                 <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                     {store.name.charAt(0)}
                                 </div>
                                 <span className="text-sm text-white font-medium truncate flex-1">{store.name}</span>
                             </button>
                         ))}
                         <button 
                            onClick={() => { setCurrentView('SETUP'); setSetupMode('CREATE'); setIsStoreSelectorOpen(false); }}
                            className="w-full text-left px-4 py-3 border-t border-slate-700 text-xs text-slate-400 hover:text-white hover:bg-slate-700 flex items-center"
                         >
                             <PlusCircle className="w-4 h-4 mr-2" /> {t('create_new_store')}
                         </button>
                     </div>
                 )}
             </div>
         ) : <div></div>}
      </div>

      <div className="relative z-10 w-full max-w-md my-8">
        
        {/* LOGO DISPLAY */}
        <div className="text-center mb-6">
            {currentView === 'STORE_LOGIN' && storeName ? (
                <>
                    {storeLogo ? (
                        <img src={storeLogo} alt={storeName} className="w-24 h-24 mx-auto mb-4 object-contain rounded-xl bg-white/10 p-2 backdrop-blur-sm shadow-lg" />
                    ) : (
                        <div className="w-24 h-24 mx-auto mb-4 bg-indigo-600 rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                            {storeName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-white tracking-tight">{storeName}</h1>
                </>
            ) : null}
        </div>

        {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl flex items-start animate-fade-in-up text-xs font-bold break-words select-text" style={{userSelect: 'text'}}>
                <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <div className="w-full">{error}</div>
            </div>
        )}

        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${setupMode === 'CREATE_FORM' ? 'max-w-2xl mx-auto' : ''}`}>
            
            {/* --- STORE LOGIN --- */}
            {currentView === 'STORE_LOGIN' && (
                <div className="p-8">
                    <form onSubmit={handleStoreLogin} className="space-y-5 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('username')}</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('password')}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 transition-colors" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                            <LogIn className="w-5 h-5 mr-2" /> {t('login_button')}
                        </button>
                    </form>
                    <div className="mt-6">
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">{t('or')}</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <button 
                            onClick={() => {setCurrentView('SETUP'); setSetupMode('JOIN'); setPreviewStore(null); setError(''); setJoinStoreId('');}} 
                            className="w-full bg-white border-2 border-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center shadow-sm"
                        >
                            <PlusCircle className="w-5 h-5 mr-2 text-indigo-500"/>
                            {t('join_with_id')}
                        </button>
                    </div>
                </div>
            )}

            {/* --- SETUP MENU --- */}
            {currentView === 'SETUP' && setupMode === 'CREATE' && (
                <div className="p-8 text-center animate-fade-in">
                    <div className="mb-6 flex justify-center"><div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300"><Building className="w-10 h-10" /></div></div>
                    <p className="text-slate-500 text-sm mb-8">Bienvenue sur Gesmind Enterprise.</p>
                    <button onClick={() => setSetupMode('JOIN')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold mb-6 shadow-lg">{t('join_store')}</button>
                    <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">{t('or')}</span></div></div>
                    <button onClick={() => setSetupMode('CREATE_FORM')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold mb-4">{t('create_new_store')}</button>
                    <button onClick={() => setCurrentView('CLOUD_AUTH')} className="text-xs text-blue-500 underline flex items-center justify-center mx-auto"><Cloud className="w-3 h-3 mr-1"/> {t('cloud_login')}</button>
                </div>
            )}

            {/* --- DETAILED CREATE FORM --- */}
            {currentView === 'SETUP' && setupMode === 'CREATE_FORM' && (
                <div className="p-0 md:p-6 bg-slate-50 md:bg-white md:min-w-[600px] overflow-y-auto max-h-[85vh]">
                    <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex items-center justify-between z-10">
                        <button onClick={() => setSetupMode('CREATE')} className="text-slate-400 hover:text-slate-600 flex items-center text-sm font-medium"><ArrowRight className="w-4 h-4 mr-1 rotate-180" /> {t('back')}</button>
                        <h3 className="text-lg font-bold text-slate-800">{t('setup_title')}</h3>
                    </div>
                    
                    <form onSubmit={handleCreateStoreSubmit} className="p-6 space-y-8">
                        {/* ALERT IF AUTH DETECTED */}
                        {firebaseUser && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start animate-fade-in">
                                <Cloud className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-indigo-900">{t('msg_account_detected')}</p>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        {t('msg_account_linked')} (<strong>{firebaseUser.email || firebaseUser.phoneNumber}</strong>)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* SECTION 1: PERSONNEL */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-indigo-600 uppercase flex items-center border-b-2 border-indigo-100 pb-2">
                                <UserIcon className="w-4 h-4 mr-2"/> {t('section_personal')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_name')}</label><input type="text" required value={pName} onChange={e => setPName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_firstname')}</label><input type="text" required value={pFirstName} onChange={e => setPFirstName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_dob')}</label><input type="date" value={pDob} onChange={e => setPDob(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_pob')}</label><input type="text" value={pPob} onChange={e => setPPob(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_address')}</label><input type="text" value={pResidence} onChange={e => setPResidence(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('field_phone')}</label><input type="tel" required value={pPhone} onChange={e => setPPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('field_email')}</label><input type="email" required={isDbConnected} value={pEmail} onChange={e => setPEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_zip')}</label><input type="text" value={pZip} onChange={e => setPZip(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400"/></div>
                            </div>
                        </div>

                        {/* SECTION 2: ENTREPRISE */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-emerald-600 uppercase flex items-center border-b-2 border-emerald-100 pb-2">
                                <Briefcase className="w-4 h-4 mr-2"/> {t('section_company')}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_company_full')}</label><input type="text" value={cFullName} onChange={e => setCFullName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_company_short')}</label><input type="text" required value={cShortName} onChange={e => setCShortName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" /></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_rccm')}</label><input type="text" value={cRccm} onChange={e => setCRccm(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400"/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_nif')}</label><input type="text" value={cNif} onChange={e => setCNif(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400"/></div>
                                
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_zip')}</label><input type="text" value={cZip} onChange={e => setCZip(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400"/></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">{t('label_city')}</label><input type="text" value={cLoc} onChange={e => setCLoc(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400"/></div>
                            </div>
                        </div>

                        {/* SECTION 3: LOGO / IDENTITE */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-blue-600 uppercase flex items-center border-b-2 border-blue-100 pb-2">
                                <ImageIcon className="w-4 h-4 mr-2"/> {t('section_logo')}
                            </h4>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                                        {newLogoUrl ? <img src={newLogoUrl} className="w-full h-full object-contain" /> : <Store className="w-8 h-8 text-slate-300"/>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('label_logo_prompt')}</label>
                                        <textarea 
                                            value={logoPrompt}
                                            onChange={e => setLogoPrompt(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-xs h-16 resize-none mb-2 font-mono text-slate-900 placeholder-slate-400"
                                        ></textarea>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleStartLogoGeneration} disabled={isGeneratingLogo} className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                {isGeneratingLogo ? '...' : t('btn_generate_logo')}
                                            </button>
                                            <button type="button" onClick={() => logoInputRef.current?.click()} className="flex-1 bg-white border border-slate-300 text-slate-600 text-xs py-2 rounded font-bold hover:bg-slate-50">{t('btn_import')}</button>
                                            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: CONNEXION */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-purple-600 uppercase flex items-center border-b-2 border-purple-100 pb-2">
                                <Lock className="w-4 h-4 mr-2"/> {t('section_security')}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t('label_username_login')}</label>
                                    <input type="text" required value={lUser} onChange={e => setLUser(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 placeholder-slate-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('label_pin')}</label>
                                        <input type={showCreatePass ? "text" : "password"} required value={lPass} onChange={e => setLPass(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" placeholder="PIN 4+" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('confirm_password')}</label>
                                        <input type={showCreatePass ? "text" : "password"} required value={lConfirm} onChange={e => setLConfirm(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400" />
                                        <button type="button" onClick={() => setShowCreatePass(!showCreatePass)} className="absolute right-2 top-8 text-slate-400"><Eye className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg text-lg mt-6">
                            {t('btn_create_start')}
                        </button>
                    </form>
                </div>
            )}

            {/* --- JOIN FORM --- */}
            {currentView === 'SETUP' && setupMode === 'JOIN' && (
                <div className="p-8 text-left animate-fade-in relative">
                    <button onClick={() => setSetupMode('CREATE')} className="mb-4 text-slate-400 hover:text-slate-600 flex items-center text-sm"><ArrowRight className="w-4 h-4 mr-1 rotate-180" /> {t('back')}</button>
                    
                    {!previewStore ? (
                        <>
                            <h3 className="text-xl font-bold text-slate-800 mb-4">{t('title_join')}</h3>
                            <form onSubmit={handleJoinStoreSearch} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('label_store_id')}</label>
                                    <input type="text" required value={joinStoreId} onChange={e => setJoinStoreId(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-mono placeholder-slate-400" placeholder="store_..." />
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center">
                                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : t('btn_search')}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="animate-fade-in-up">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">{t('msg_store_found')}</h3>
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center shadow-inner mb-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
                                {previewStore.logoUrl ? (
                                    <img src={previewStore.logoUrl} alt={previewStore.name} className="w-24 h-24 mx-auto mb-4 object-contain rounded-xl bg-white shadow-sm p-2" />
                                ) : (
                                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-xl flex items-center justify-center text-3xl font-bold text-slate-300 shadow-sm border border-slate-100">
                                        {previewStore.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <h2 className="text-2xl font-extrabold text-slate-800 mb-1">{previewStore.name}</h2>
                                <p className="text-xs font-mono text-slate-400 bg-slate-200/50 inline-block px-2 py-1 rounded select-all">ID: {previewStore.id}</p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setPreviewStore(null)} 
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button 
                                    onClick={confirmJoinStore} 
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg flex items-center justify-center transition-all transform hover:scale-105"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    {t('btn_confirm_join')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- CLOUD AUTH (Unchanged layout, texts updated via t()) --- */}
            {currentView === 'CLOUD_AUTH' && (
                <div className="p-8 animate-fade-in">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setCurrentView('SETUP')} className="mr-3 text-slate-400 hover:text-slate-600"><ArrowRight className="w-5 h-5 rotate-180" /></button>
                        <h3 className="text-xl font-bold text-slate-800">{t('cloud_login')}</h3>
                    </div>
                    {firebaseUser ? (
                        <div className="text-center space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-xl text-emerald-800 flex flex-col items-center">
                                <Check className="w-8 h-8 mb-2" />
                                <span className="font-bold">{t('connected_account')}</span>
                                <span className="text-sm">{firebaseUser.email || firebaseUser.phoneNumber}</span>
                            </div>
                            <button onClick={() => auth?.signOut().then(() => setFirebaseUser(null))} className="text-red-500 text-sm font-bold">{t('logout')}</button>
                            <button onClick={() => setCurrentView('SETUP')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">{t('back')}</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button onClick={handleGoogleSignIn} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm">
                                {t('btn_google')}
                            </button>
                            
                            <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">{t('or')}</span></div></div>
                            
                            {/* Toggle Method */}
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                                <button onClick={() => setAuthMethod('EMAIL')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${authMethod === 'EMAIL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Mail className="w-4 h-4 mr-2" /> {t('btn_email')}</button>
                                <button onClick={() => setAuthMethod('PHONE')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${authMethod === 'PHONE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Phone className="w-4 h-4 mr-2" /> {t('btn_phone')}</button>
                            </div>

                            {authMethod === 'EMAIL' ? (
                                <form onSubmit={handleCloudLogin} className="space-y-4">
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400" placeholder={t('field_email')} />
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400" placeholder={t('password')} />
                                    {authMode === 'REGISTER' && (
                                        <input 
                                            type="password" 
                                            required 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 animate-fade-in" 
                                            placeholder={t('confirm_password')}
                                        />
                                    )}
                                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">{authMode === 'LOGIN' ? t('login_button') : "S'inscrire"}</button>
                                    <div className="text-center text-xs">
                                        <button type="button" onClick={() => {
                                            setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                                            setError('');
                                            setConfirmPassword('');
                                        }} className="text-indigo-600 font-bold">
                                            {authMode === 'LOGIN' ? "Créer un compte" : "J'ai déjà un compte"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {!confirmationResult ? (
                                        <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                            <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400" placeholder="+33 6 12..." />
                                            <div id="auth-recaptcha-container"></div>
                                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">{t('btn_send_code')}</button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleOtpSubmit} className="space-y-4">
                                            <input type="text" required value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-center font-bold text-xl tracking-widest text-slate-900 placeholder-slate-400" placeholder="CODE" />
                                            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">{t('btn_verify')}</button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <div className="mt-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <div className="flex items-center gap-2"><Shield className="w-3 h-3" /><span>Authentification sécurisée</span></div>
            <p>Gesmind v{process.env.PACKAGE_VERSION || '1.0.0'}</p>
        </div>
      </div>

      {/* LOGO GEN MODAL */}
      {isLogoConsoleOpen && (
        /* ... existing modal code kept for UI but texts should be reviewed if critical ... */
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
           <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border border-white/20">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="relative p-8 pt-12 flex flex-col items-center text-center">
                 <div className="w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center mb-6 relative z-10 overflow-hidden border-4 border-white/50 backdrop-blur-sm group">
                    {generatedPreviewInConsole ? (
                       <img src={generatedPreviewInConsole} className="w-full h-full object-contain p-4 animate-zoom-in" />
                    ) : (
                       <div className="relative">
                           <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-20 animate-pulse"></div>
                           <Wand2 className="w-14 h-14 text-indigo-500 animate-pulse relative z-10" />
                           <Stars className="w-6 h-6 text-purple-400 absolute -top-2 -right-2 animate-bounce" />
                       </div>
                    )}
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    {generatedPreviewInConsole ? "Identité Visuelle Prête !" : "L'IA imagine votre identité..."}
                 </h3>
                 {!generatedPreviewInConsole && (
                    <div className="h-12 flex items-center justify-center w-full">
                       <p key={logoConsoleLogs.length} className="text-slate-500 font-medium animate-fade-in text-sm bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                          {logoConsoleLogs[logoConsoleLogs.length - 1] || "Initialisation..."}
                       </p>
                    </div>
                 )}
                 {!generatedPreviewInConsole && (
                    <div className="mt-4 w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-1/2 animate-[shimmer_1.5s_infinite] rounded-full"></div>
                    </div>
                 )}
                 {generatedPreviewInConsole ? (
                    <div className="flex gap-4 w-full mt-8 animate-fade-in-up">
                       <button onClick={runLogoGenerationProcess} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center shadow-sm">
                           <RotateCcw className="w-4 h-4 mr-2" /> Régénérer
                       </button>
                       <button onClick={handleConfirmLogo} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center transition-all transform hover:scale-105">
                           <Check className="w-4 h-4 mr-2" /> Choisir ce logo
                       </button>
                    </div>
                 ) : null}
                 <button onClick={handleCancelLogo} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/10 hover:bg-black/20 p-2 rounded-full backdrop-blur-sm">
                    <X className="w-5 h-5"/>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
