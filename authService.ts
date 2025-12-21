import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { app } from "./firebaseConfig"; // Assurez-vous que ce chemin est correct

export const auth = getAuth(app);

/**
 * S'inscrit avec email et mot de passe, puis envoie un email de vérification.
 */
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    throw error;
  }
};

/**
 * Se connecte avec email et mot de passe.
 * Vérifie si l'email de l'utilisateur a été vérifié.
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      throw new Error("Veuillez vérifier votre adresse e-mail avant de vous connecter.");
    }
    return userCredential.user;
  } catch (error) {
    console.error("Erreur de connexion:", error);
    throw error;
  }
};

/**
 * Se connecte ou s'inscrit avec Google.
 */
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erreur de connexion Google:", error);
    throw error;
  }
};

/**
 * Déconnecte l'utilisateur.
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    throw error;
  }
};

/**
 * Un observateur qui écoute les changements d'état d'authentification.
 * @param callback - La fonction à appeler avec l'utilisateur (ou null)
 * @returns Une fonction pour se désabonner de l'observateur.
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};