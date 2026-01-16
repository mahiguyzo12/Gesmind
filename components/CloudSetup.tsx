
import React, { useState, useEffect } from 'react';
import { Cloud, Check, Shield, AlertTriangle, ArrowRight, Copy, Phone, Mail, Lock, RefreshCw, Settings, Database, ArrowLeft } from 'lucide-react';
import { auth, googleProvider, setupFirebase } from '../src/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  linkWithPhoneNumber,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { getTranslation } from '../translations';

interface CloudSetupProps {
  onComplete: () => void;
  lang: string;
}

export const CloudSetup: React.FC<CloudSetupProps> = ({ onComplete, lang }) => {
  // --- STATE GESTION ---
  const [step, setStep] = useState<'CONFIG' | 'AUTH' | 'SECURITY_CHECK'>('AUTH');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Configuration State
  const [configJson, setConfigJson] = useState('');
  const [configError, setConfigError] = useState('');

  // Auth Step State
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Security Step State
  const [secPhone, setSecPhone] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secOtp, setSecOtp] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkStep, setLinkStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [emailSent, setEmailSent] = useState(false);

  // System State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<React.ReactNode>(''); 
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = (key: string) => getTranslation(lang, key);

  // Detect missing config on mount
  useEffect(() => {
      if (!auth) {
          setStep('CONFIG');
      }
  }, []);

  // Clean up Recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e) {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  // Initialize Recaptcha
  const initRecaptcha = (containerId: string) => {
    if (auth && !window.recaptchaVerifier) {
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                'size': 'invisible',
                'callback': () => console.log('Recaptcha verified')
            });
            window.recaptchaVerifier.render();
        } catch (e) {
            console.error("Recaptcha init error", e);
        }
    }
  };

  useEffect(() => {
      const timer = setTimeout(() => {
          if (step === 'AUTH' && authMethod === 'PHONE') initRecaptcha('recaptcha-container');
          if (step === 'SECURITY_CHECK') initRecaptcha('sec-recaptcha-container');
      }, 500);
      return () => clearTimeout(timer);
  }, [step, authMethod]);


  const handleSaveConfig = () => {
      if (!configJson.trim()) { setConfigError("JSON missing."); return; }
      try {
          const config = JSON.parse(configJson);
          if (!config.apiKey || !config.projectId) { setConfigError("Invalid JSON."); return; }
          const success = setupFirebase(config);
          if (success) { window.location.reload(); } else { setConfigError("Init Failed."); }
      } catch (e) { setConfigError("JSON Syntax Error."); }
  };

  const handlePrimaryAuthSuccess = (user: User) => {
      setCurrentUser(user);
      setError('');
      const hasEmail = user.email && user.emailVerified;
      const hasPhone = !!user.phoneNumber;
      if (hasEmail && hasPhone) { onComplete(); } else {
          setStep('SECURITY_CHECK');
          if (!hasEmail && user.email) setSecEmail(user.email);
      }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return setError("Firebase config missing.");
    setIsLoading(true); setError('');
    try {
      const res = await signInWithPopup(auth, googleProvider);
      handlePrimaryAuthSuccess(res.user);
    } catch (err: any) { handleAuthError(err); } finally { setIsLoading(false); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return setError("Firebase config missing.");
    if (authMode === 'REGISTER' && password !== confirmPassword) return setError("Passwords mismatch.");
    setIsLoading(true); setError('');
    try {
      let userCredential;
      if (authMode === 'LOGIN') userCredential = await signInWithEmailAndPassword(auth, email, password);
      else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
      }
      handlePrimaryAuthSuccess(userCredential.user);
    } catch (err: any) { handleAuthError(err); } finally { setIsLoading(false); }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth) return setError("Firebase config missing.");
      if (!email) return setError("Email required");
      
      setIsLoading(true); setError(''); setSuccessMsg('');
      try {
          await sendPasswordResetEmail(auth, email);
          setSuccessMsg(t('reset_sent'));
          setTimeout(() => {
              setAuthMode('LOGIN');
              setSuccessMsg('');
          }, 4000);
      } catch (err: any) {
          handleAuthError(err);
      } finally {
          setIsLoading(false);
      }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!phoneNumber) return;
      if (!auth) return setError("Firebase config missing.");
      setIsLoading(true); setError('');
      try {
          if (!window.recaptchaVerifier) initRecaptcha('recaptcha-container');
          const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
          setConfirmationResult(confirmation);
      } catch (err: any) { handleAuthError(err); } finally { setIsLoading(false); }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmationResult || !otpCode) return;
      setIsLoading(true);
      try {
          const res = await confirmationResult.confirm(otpCode);
          handlePrimaryAuthSuccess(res.user);
      } catch (err: any) { handleAuthError(err); } finally { setIsLoading(false); }
  };

  const handleLinkPhone = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth?.currentUser || !secPhone) return;
      setIsLinking(true); setError('');
      try {
          if (!window.recaptchaVerifier) initRecaptcha('sec-recaptcha-container');
          const confirmation = await linkWithPhoneNumber(auth.currentUser, secPhone, window.recaptchaVerifier);
          setConfirmationResult(confirmation);
          setLinkStep('VERIFY');
      } catch (err: any) { handleAuthError(err); } finally { setIsLinking(false); }
  };

  const handleVerifyLinkPhone = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirmationResult || !secOtp) return;
      setIsLinking(true);
      try { await confirmationResult.confirm(secOtp); onComplete(); } catch (err: any) { handleAuthError(err); } finally { setIsLinking(false); }
  };

  const handleLinkEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth?.currentUser || !secEmail) return;
      setIsLinking(true); setError('');
      try { await verifyBeforeUpdateEmail(auth.currentUser, secEmail); setEmailSent(true); } catch (err: any) { handleAuthError(err); } finally { setIsLinking(false); }
  };

  const checkEmailVerified = async () => {
      if (auth?.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) { onComplete(); } else { setError("Email not verified yet."); }
      }
  };

  const handleAuthError = (err: any) => { console.error(err); setError(err.message); };

  const handleOfflineMode = () => {
      if (window.confirm("Offline Mode: Data is local only. Continue?")) {
          localStorage.setItem('gesmind_db_mode', 'LOCAL');
          onComplete();
      }
  };

  if (step === 'CONFIG') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 border-4 border-red-100"><Settings className="w-8 h-8 animate-spin-slow" /></div>
                    <h2 className="text-xl font-bold text-slate-800">{t('config_required')}</h2>
                </div>
                {configError && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-start"><AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" /><div>{configError}</div></div>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('config_paste_json')}</label>
                        <textarea className="w-full h-40 p-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-xs font-mono text-slate-700 focus:border-indigo-500 outline-none resize-none" placeholder='{ "apiKey": "...", ... }' value={configJson} onChange={(e) => setConfigJson(e.target.value)} />
                    </div>
                    <button onClick={handleSaveConfig} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center"><Database className="w-4 h-4 mr-2" /> {t('btn_save_connect')}</button>
                    <div className="pt-4 border-t border-slate-100 mt-4 text-center"><button onClick={handleOfflineMode} className="text-xs text-slate-400 hover:text-slate-600 font-bold">{t('btn_offline')}</button></div>
                </div>
            </div>
        </div>
      );
  }

  if (step === 'SECURITY_CHECK') {
      const missingPhone = !currentUser?.phoneNumber;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans relative">
            <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 border-4 border-amber-100"><Lock className="w-8 h-8" /></div>
                    <h2 className="text-xl font-bold text-slate-800">{t('sec_check_title')}</h2>
                    <p className="text-slate-500 text-sm mt-2 px-4">{t('sec_check_subtitle')}</p>
                </div>
                {error && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-start"><AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" /><div>{error}</div></div>}
                {missingPhone && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-4">{t('add_phone')}</h3>
                        {linkStep === 'INPUT' ? (
                            <form onSubmit={handleLinkPhone} className="space-y-4">
                                <div><label className="text-xs text-slate-500 font-bold mb-1 block">{t('field_phone')}</label><input type="tel" required value={secPhone} onChange={e => setSecPhone(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800" placeholder="+33 6..." /></div>
                                <div id="sec-recaptcha-container"></div>
                                <button type="submit" disabled={isLinking} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex justify-center items-center">{isLinking ? <RefreshCw className="w-5 h-5 animate-spin"/> : t('btn_send_code')}</button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyLinkPhone} className="space-y-4 animate-fade-in">
                                <input type="text" required value={secOtp} onChange={e => setSecOtp(e.target.value)} className="w-full p-3 border-2 border-indigo-200 rounded-xl text-center text-2xl font-bold tracking-widest text-indigo-900 focus:border-indigo-500 outline-none" placeholder="123456" />
                                <button type="submit" disabled={isLinking} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">{t('btn_verify')}</button>
                            </form>
                        )}
                    </div>
                )}
                {!missingPhone && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-4">{t('add_email')}</h3>
                        {!emailSent ? (
                            <form onSubmit={handleLinkEmail} className="space-y-4">
                                <div><label className="text-xs text-slate-500 font-bold mb-1 block">{t('field_email')}</label><input type="email" required value={secEmail} onChange={e => setSecEmail(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800" /></div>
                                <button type="submit" disabled={isLinking} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex justify-center items-center">{isLinking ? <RefreshCw className="w-5 h-5 animate-spin"/> : t('btn_verify')}</button>
                            </form>
                        ) : (
                            <div className="text-center animate-fade-in space-y-4">
                                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm">{t('link_sent')} <strong>{secEmail}</strong>.</div>
                                <button onClick={checkEmailVerified} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center"><Check className="w-5 h-5 mr-2" /> OK</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 font-sans relative">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none"><div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600 blur-[100px]"></div></div>
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 animate-fade-in">
        <div className="text-center mb-6">
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600"><Cloud className="w-10 h-10" /></div>
            <h2 className="text-2xl font-bold text-slate-800">
                {authMode === 'FORGOT' ? t('forgot_title') : t('cloud_setup_title')}
            </h2>
            <p className="text-slate-500 text-sm mt-2">
                {authMode === 'FORGOT' ? t('forgot_desc') : t('cloud_setup_subtitle')}
            </p>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold flex items-start break-words select-text" style={{userSelect: 'text'}}><AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" /><div className="w-full">{error}</div></div>}
        {successMsg && <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl text-xs font-bold flex items-center"><Check className="w-5 h-5 mr-2" />{successMsg}</div>}
        
        <div className="space-y-4">
            {/* FORGOT PASSWORD FORM */}
            {authMode === 'FORGOT' ? (
                <form onSubmit={handlePasswordReset} className="space-y-4 animate-fade-in">
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder={t('field_email')} />
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center transition-all">
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : t('btn_reset_link')}
                    </button>
                    <div className="text-center mt-4">
                        <button type="button" onClick={() => { setAuthMode('LOGIN'); setError(''); }} className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center mx-auto">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {t('back_to_login')}
                        </button>
                    </div>
                </form>
            ) : (
                /* NORMAL AUTH FORMS */
                <>
                    <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm group">
                        {isLoading ? <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-2"></div> : <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="#EA4335" d="M12 4.63c1.61 0 3.06.56 4.21 1.64l3.16-3.16C17.45 1.18 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>}
                        {t('btn_google')}
                    </button>
                    
                    <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">{t('or')}</span></div></div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                        <button onClick={() => { setAuthMethod('EMAIL'); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${authMethod === 'EMAIL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Mail className="w-4 h-4 mr-2" /> {t('btn_email')}</button>
                        <button onClick={() => { setAuthMethod('PHONE'); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${authMethod === 'PHONE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Phone className="w-4 h-4 mr-2" /> {t('btn_phone')}</button>
                    </div>

                    {authMethod === 'EMAIL' ? (
                        <form onSubmit={handleEmailAuth} className="space-y-3">
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder={t('field_email')} />
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder={t('password')} />
                            {authMode === 'REGISTER' && <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all animate-fade-in" placeholder={t('confirm_password')} />}
                            
                            {authMode === 'LOGIN' && (
                                <div className="text-right">
                                    <button type="button" onClick={() => { setAuthMode('FORGOT'); setError(''); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                        {t('forgot_password')}
                                    </button>
                                </div>
                            )}

                            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center transition-all mt-2">{authMode === 'LOGIN' ? t('login_button') : "S'inscrire"}{!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}</button>
                            <div className="text-center mt-2"><button type="button" onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(''); setConfirmPassword(''); }} className="text-sm text-indigo-600 font-bold hover:underline">{authMode === 'LOGIN' ? "S'inscrire" : "J'ai un compte"}</button></div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {!confirmationResult ? (
                                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                    <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">{t('field_phone')}</label><input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="+33 6..." /></div>
                                    <div id="recaptcha-container"></div>
                                    <button type="submit" disabled={isLoading || !phoneNumber} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center transition-all">{isLoading ? '...' : t('btn_send_code')}</button>
                                </form>
                            ) : (
                                <form onSubmit={handleOtpSubmit} className="space-y-4 animate-fade-in">
                                    <div className="text-center mb-4"><span className="text-sm text-slate-500">Code envoyé au {phoneNumber}</span><button type="button" onClick={() => { setConfirmationResult(null); setError(''); }} className="text-xs text-indigo-600 font-bold ml-2 hover:underline">Modifier</button></div>
                                    <input type="text" required value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-center text-xl font-bold tracking-widest text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="123456" maxLength={6} />
                                    <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center transition-all">{isLoading ? '...' : t('btn_verify')}</button>
                                </form>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
