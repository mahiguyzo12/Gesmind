import React, { useState } from "react";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from "./authService";

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        // La redirection sera gérée par AuthGate
      } else {
        await signUpWithEmail(email, password);
        setMessage(
          "Inscription réussie ! Veuillez vérifier votre boîte de réception pour valider votre e-mail."
        );
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Cette adresse e-mail est déjà utilisée.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect.");
      } else if (err.code === "auth/user-not-found") {
        setError("Aucun compte trouvé pour cet e-mail.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    try {
      await signInWithGoogle();
      // La redirection sera gérée par AuthGate
    } catch (err: any) {
      setError("Erreur lors de la connexion avec Google. Veuillez réessayer.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Connexion à Gesmind" : "Inscription à Gesmind"}
        </h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}

        <form onSubmit={handleEmailAuth}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            {isLogin ? "Se connecter" : "S'inscrire"}
          </button>
        </form>

        <div className="my-4 flex items-center">
          <hr className="flex-grow border-t border-gray-300" />
          <span className="mx-4 text-gray-500">OU</span>
          <hr className="flex-grow border-t border-gray-300" />
        </div>

        <button onClick={handleGoogleAuth} className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg flex items-center justify-center hover:bg-gray-50">
          {/* Vous pouvez ajouter une icône Google ici */}
          Continuer avec Google
        </button>

        <p className="mt-6 text-center">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 hover:underline ml-1">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;