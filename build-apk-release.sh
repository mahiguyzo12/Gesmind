#!/bin/bash

################################################################################
#  GESMIND Enterprise - APK Release Build Script v1.0.4
#  Script pour générer l'APK release Android
################################################################################

set -e

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   GESMIND Enterprise v1.0.4 - APK Release Build Script    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${COLOR_RESET}"

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${COLOR_YELLOW}⚠ WARNING: ANDROID_HOME is not set${COLOR_RESET}"
    echo "Please set ANDROID_HOME environment variable:"
    echo "  export ANDROID_HOME=~/Library/Android/Sdk  # macOS/Linux"
    echo "  export ANDROID_HOME=\$APPDATA\\Local\\Android\\Sdk  # Windows"
    echo ""
    
    # Try to find Android SDK
    if [ -d "$HOME/Library/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/Sdk"
        echo -e "${COLOR_GREEN}✓ Found Android SDK at: $ANDROID_HOME${COLOR_RESET}"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo -e "${COLOR_GREEN}✓ Found Android SDK at: $ANDROID_HOME${COLOR_RESET}"
    else
        echo -e "${COLOR_RED}✗ Android SDK not found. Please install it first.${COLOR_RESET}"
        echo "Download from: https://developer.android.com/studio"
        exit 1
    fi
fi

# Step 1: Build Web Assets
echo -e "\n${COLOR_BLUE}Step 1: Building Web Assets...${COLOR_RESET}"
npm run build
echo -e "${COLOR_GREEN}✓ Web build completed${COLOR_RESET}"

# Step 2: Sync Capacitor
echo -e "\n${COLOR_BLUE}Step 2: Syncing Capacitor...${COLOR_RESET}"
npx cap sync android
echo -e "${COLOR_GREEN}✓ Capacitor sync completed${COLOR_RESET}"

# Step 3: Build APK Release
echo -e "\n${COLOR_BLUE}Step 3: Building APK Release...${COLOR_RESET}"
cd android

if [ ! -x "gradlew" ]; then
    chmod +x gradlew
fi

echo "Running: ./gradlew assembleRelease"
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo -e "\n${COLOR_GREEN}✓ APK Release build successful!${COLOR_RESET}"
    echo -e "Output: ${COLOR_YELLOW}$(pwd)/app/build/outputs/apk/release/app-release.apk${COLOR_RESET}"
    
    # Get APK info
    APK_PATH="$(pwd)/app/build/outputs/apk/release/app-release.apk"
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    
    echo -e "\nAPK Information:"
    echo -e "  File: ${COLOR_YELLOW}app-release.apk${COLOR_RESET}"
    echo -e "  Size: ${COLOR_YELLOW}${APK_SIZE}${COLOR_RESET}"
    echo -e "  Path: ${COLOR_YELLOW}${APK_PATH}${COLOR_RESET}"
    
    # Generate SHA256
    SHA256=$(sha256sum "$APK_PATH" | awk '{print $1}')
    echo -e "  SHA256: ${COLOR_YELLOW}${SHA256:0:32}...${COLOR_RESET}"
    
    echo -e "\n${COLOR_GREEN}Build successful! APK is ready for distribution.${COLOR_RESET}"
    exit 0
else
    echo -e "\n${COLOR_RED}✗ APK build failed${COLOR_RESET}"
    exit 1
fi
