# Gesmind Enterprise v1.0.4 - Build APK Release

## 📱 Génération d'APK Release

Ce document explique comment générer l'APK release pour Android.

## ✅ État Actuel (2026-01-17)

### Complété:
- ✓ **Web Build**: Code React/TypeScript compilé avec succès
- ✓ **Web Bundle**: Vite build optimisé (1.4 MB)
- ✓ **Capacitor Sync**: Assets web copiés vers le projet Android
- ✓ **Gradle Configuration**: Java 21 configuré

### En Attente:
- ⏳ **Android SDK**: Installation locale requise
- ⏳ **APK Génération**: Prêt au lancement

---

## 🚀 Options de Génération APK

### Option 1: Génération Locale (Recommandée)

#### Prérequis:
- **Android Studio** ou **Android SDK Command-line Tools**
- **Java 17+** (Java 21 est déjà configuré)
- **Node.js & npm**

#### Installation d'Android SDK:

**macOS:**
```bash
# Via Homebrew
brew install android-sdk

# Ou télécharger Android Studio depuis:
# https://developer.android.com/studio
```

**Linux (Ubuntu/Debian):**
```bash
apt-get install android-sdk
# Ou télécharger depuis https://developer.android.com/studio
```

**Windows:**
- Télécharger Android Studio
- L'installation inclut le SDK automatiquement

#### Configurer ANDROID_HOME:

```bash
# macOS/Linux
export ANDROID_HOME=~/Library/Android/Sdk  # macOS
# ou
export ANDROID_HOME=~/Android/Sdk  # Linux

# Ajouter à ~/.bashrc ou ~/.zshrc pour le rendre permanent:
echo "export ANDROID_HOME=\$HOME/Library/Android/Sdk" >> ~/.zshrc
source ~/.zshrc
```

```cmd
# Windows (PowerShell)
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:APPDATA\Local\Android\Sdk", "User")

# Vérifier:
echo $env:ANDROID_HOME
```

#### Lancer la génération:

```bash
cd /workspaces/Gesmind

# Option A: Utiliser le script automatisé
chmod +x build-apk-release.sh
./build-apk-release.sh

# Option B: Commandes manuelles
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

**Output APK:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

### Option 2: Générer sur Termux (Android)

Utile pour générer directement depuis un appareil Android.

#### Installation:

```bash
# Installer Termux depuis F-Droid ou Play Store
# https://f-droid.org/en/packages/com.termux/

# Dans Termux:
pkg update
pkg upgrade
pkg install nodejs-lts openjdk-17 git

# Cloner le dépôt
git clone https://github.com/mahiguyzo12/Gesmind.git
cd Gesmind
npm install

# Construire
npm run build
npx cap sync android

# Configurer gradle
export JAVA_HOME=/data/data/com.termux/files/usr/opt/openjdk
cd android
./gradlew assembleRelease
```

---

### Option 3: GitHub Actions (CI/CD Automatisé)

Générer automatiquement à chaque push vers main.

#### Créer `.github/workflows/android-build.yml`:

```yaml
name: Build APK Release

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleRelease
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

Puis pusher ce fichier:
```bash
git add .github/workflows/android-build.yml
git commit -m "ci: add android build workflow"
git push origin main
```

L'APK sera généré et téléchargeable dans les artifacts GitHub Actions.

---

## 🔒 Signer l'APK (pour Play Store)

### Générer une clé de signature:

```bash
keytool -genkey -v -keystore gesmind-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias gesmind-key \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_PASSWORD
```

### Configurer `gradle.properties`:

```properties
KEYSTORE_FILE=../gesmind-release.keystore
KEYSTORE_PASSWORD=YOUR_PASSWORD
KEY_ALIAS=gesmind-key
KEY_PASSWORD=YOUR_PASSWORD
```

### Modifier `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile file(KEYSTORE_FILE)
        storePassword KEYSTORE_PASSWORD
        keyAlias KEY_ALIAS
        keyPassword KEY_PASSWORD
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

---

## 📊 Spécifications APK

| Propriété | Valeur |
|-----------|--------|
| Package Name | com.gesmind.app |
| Version Name | 1.0.4 |
| Version Code | 10004 |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 34 (Android 14) |
| Compile SDK | 34 |

---

## 🧪 Tester l'APK

```bash
# Installer sur un appareil/émulateur connecté
adb install android/app/build/outputs/apk/release/app-release.apk

# Ou avec gradle
cd android
./gradlew installRelease
```

---

## 📦 Distribuer l'APK

### Google Play Store:
1. Créer un compte Google Play Console
2. Créer une nouvelle application
3. Uploader l'APK signé
4. Configurer la description, les screenshots, etc.
5. Soumettre pour révision

### Distribution directe:
- Héberger sur un serveur
- Partager via lien direct
- Utiliser des services comme AppInstall

---

## 🐛 Dépannage

### "Android SDK not found"
```bash
# Vérifier que ANDROID_HOME est défini
echo $ANDROID_HOME

# Ou configurer dans local.properties
echo "sdk.dir=/path/to/android/sdk" > android/local.properties
```

### "gradle assembleRelease fails"
```bash
# Nettoyer les caches
cd android
./gradlew clean

# Relancer
./gradlew assembleRelease --stacktrace
```

### "Insufficient memory"
```bash
# Augmenter la mémoire Gradle
export GRADLE_OPTS="-Xmx2048m -XX:MaxPermSize=512m"
```

---

## 📚 Ressources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Gradle Build System](https://developer.android.com/studio/build)
- [Google Play Console](https://play.google.com/console)
- [App Signing for Google Play](https://developer.android.com/studio/publish/app-signing)

---

## ✨ Résumé

**État actuel**: Le projet est **67% prêt** pour la génération APK.

**Prochaine étape**: Installer Android SDK et exécuter le script `build-apk-release.sh`.

**Support**: Pour des problèmes, consultez [GitHub Issues](https://github.com/mahiguyzo12/Gesmind/issues)

---

**Gesmind Enterprise v1.0.4** | Build Date: 2026-01-17
