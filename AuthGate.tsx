import React, { useState, useEffect } from "react";
import { onAuthChange } from "./authService";
import type { User } from "firebase/auth";
import AuthScreen from "./AuthScreen";
import App from "./App"; // C'est votre composant applicatif principal

const AuthGate: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Nettoyage de l'abonnement lors du démontage du composant
    return () => unsubscribe();
  }, []);

  if (loading) {
    // Affichez un spinner ou un écran de chargement pendant la vérification
    return <div>Chargement...</div>;
  }

  return user ? <App /> : <AuthScreen />;
};

export default AuthGate;