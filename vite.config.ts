
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Lecture de la version depuis package.json (Côté Node/Build uniquement)
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  // Utilisation de './' permet la compatibilité hybride :
  // 1. Android/Electron (file://)
  // 2. GitHub Pages (https://user.github.io/repo/)
  base: './',
  server: {
    host: true, // Permet d'accéder au serveur dev depuis le réseau local ou le navigateur Android
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015', // Assure la compatibilité avec les WebView Android plus anciennes
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'recharts', '@google/generative-ai']
        }
      }
    }
  },
  define: {
    // Injection directe de la clé fournie par l'utilisateur
    'process.env.API_KEY': JSON.stringify("AIzaSyASr_E3TGXSCynKXDqaEAUCnO768BFAOyU"),
    // Injection de la version pour éviter l'import de package.json dans le code client
    'process.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
  }
});
