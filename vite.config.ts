
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Lecture de la version depuis package.json (Côté Node/Build uniquement)
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement depuis le fichier .env (s'il existe)
  // Le troisième argument '' permet de charger toutes les variables, pas seulement celles préfixées par VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Utilisation de './' permet la compatibilité hybride
    base: './',
    server: {
      host: true, 
      port: 5173
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2015',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react', 'recharts', '@google/genai']
          }
        }
      }
    },
    define: {
      // Injection de la clé API depuis l'environnement (fichier .env ou système)
      // Si aucune clé n'est trouvée, on laisse une chaîne vide (l'app gérera l'erreur)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      // Injection de la version
      'process.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
    }
  };
});
