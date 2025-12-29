import React, { useState, useEffect } from "react";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from "./authService";
import { Lock, Mail, Loader2, Mountain } from 'lucide-react';

// SVG pour l'icône Google, pour éviter une dépendance externe
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.846,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'google' | null>(null);

  // Effet pour réinitialiser les messages quand on bascule de mode
  useEffect(() => {
    setError(null);
    setMessage(null);
    // Réinitialiser les champs de mot de passe lors du changement de mode
    setPassword("");
    setConfirmPassword("");
  }, [isLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true); setAuthMethod('email');
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        setMessage(
          "Inscription réussie ! Veuillez vérifier votre boîte de réception pour valider votre e-mail."
        );
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true); setAuthMethod('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
      setAuthMethod(null);
    }
  };

  const handleAuthError = (err: any) => {
    switch (err.code) {
      case "auth/email-already-in-use":
        setError("Cette adresse e-mail est déjà utilisée.");
        break;
      case "auth/wrong-password":
      case "auth/invalid-credential":
        setError("Email ou mot de passe incorrect.");
        break;
      case "auth/user-not-found":
        setError("Aucun compte trouvé pour cet e-mail.");
        break;
      case "auth/popup-closed-by-user":
        // Ne rien afficher, c'est une action volontaire
        break;
      default:
        setError("Une erreur est survenue. Veuillez réessayer.");
        console.error("Auth Error:", err);
        break;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 dark:from-slate-900 dark:to-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="text-center">
          <Mountain className="mx-auto h-12 w-auto text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {isLogin ? "Bienvenue sur Gesmind" : "Rejoignez Gesmind"}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Connectez-vous pour continuer" : "Créez votre compte en quelques secondes"}
          </p>
        </div>

        {error && <p className="text-red-500 text-center text-sm font-medium p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
        {message && <p className="text-green-600 text-center text-sm font-medium p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">{message}</p>}

        <form onSubmit={handleEmailAuth}>
          <div className="relative mb-4">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse e-mail"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
            />
          </div>
          <div className="relative mb-6">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
              minLength={6}
            />
          </div>
          {!isLogin && (
            <div className="relative mb-6">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required={!isLogin}
                minLength={6}
              />
            </div>
          )}
          <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
            {isLoading && authMethod === 'email' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isLogin ? 'Se connecter' : "Créer mon compte"}
          </button>
        </form>

        <div className="my-4 flex items-center">
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
          <span className="mx-4 text-xs text-gray-500 dark:text-gray-400 uppercase">OU</span>
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
        </div>

        <button onClick={handleGoogleAuth} disabled={isLoading} className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
          {isLoading && authMethod === 'google' ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="mr-3" />
          )}
          Continuer avec Google
        </button>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button onClick={() => setIsLogin(!isLogin)} disabled={isLoading} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;