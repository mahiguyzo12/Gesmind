import { AppUpdate } from '../types';

/**
 * Compare deux versions sémantiques (ex: "1.0.0" vs "1.0.1")
 * Retourne true si versionA < versionB
 */
const isNewerVersion = (current: string, remote: string): boolean => {
  // Nettoyage des chaînes (retrait du 'v', des espaces)
  const v1 = current
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map(Number);
  const v2 = remote
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num2 > num1) return true;
    if (num2 < num1) return false;
  }
  return false;
};

/**
 * Extrait le format "username/repo" d'une URL ou chaîne brute
 */
const cleanRepoPath = (input: string): string => {
  let cleaned = input.trim();
  // Retire le .git à la fin
  if (cleaned.endsWith('.git')) {
    cleaned = cleaned.slice(0, -4);
  }
  // Retire le https://github.com/ au début
  cleaned = cleaned
    .replace('https://github.com/', '')
    .replace('http://github.com/', '');

  // Retire les slashs de fin
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
};

/**
 * Vérifie les mises à jour sur GitHub Releases
 * @param repoPath Format "username/repo" (ex: "mon-user/stockmind") ou URL complète
 */
export const checkForUpdates = async (repoPath: string): Promise<AppUpdate> => {
  // Utilisation de la version injectée par Vite (vite.config.ts)
  const currentVersion = process.env.PACKAGE_VERSION || '1.0.0';

  const cleanPath = cleanRepoPath(repoPath);

  if (!cleanPath || !cleanPath.includes('/')) {
    throw new Error(
      "Configuration GitHub invalide. Format attendu: 'username/repo'"
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${cleanPath}/releases/latest`
    );

    // GESTION ERREUR 404 : Si aucune release n'existe, ce n'est pas une erreur système
    if (response.status === 404) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        downloadUrl: '',
        releaseNotes: 'Aucune version publiée pour le moment sur ce dépôt.',
      };
    }

    if (!response.ok) {
      throw new Error(
        `Erreur GitHub: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const latestVersion = data.tag_name; // GitHub tags are usually "v1.0.1"

    // Trouve l'asset APK (Android) ou EXE (Windows)
    // Priorité à l'APK pour la version mobile
    const apkAsset = data.assets.find((a: any) => a.name.endsWith('.apk'));
    const exeAsset = data.assets.find((a: any) => a.name.endsWith('.exe'));

    const asset = apkAsset || exeAsset;
    const downloadUrl = asset ? asset.browser_download_url : data.html_url;

    const hasUpdate = isNewerVersion(currentVersion, latestVersion);

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      downloadUrl,
      releaseNotes: data.body || 'Aucune note de version.',
    };
  } catch (error) {
    console.error('Update check failed:', error);
    throw error;
  }
};
