#!/bin/bash
################################################################################
# GESMIND ENTERPRISE v1.0.4 - ANDROID SDK SETUP SCRIPT
################################################################################

echo "=========================================="
echo "🚀 Android SDK Installation & Configuration"
echo "=========================================="
echo ""

# Set Java 21
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.9-ms
export ANDROID_HOME=~/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platforms/android-34:$PATH

echo "✓ Java Version:"
$JAVA_HOME/bin/java -version 2>&1 | head -1

echo "✓ Android SDK Home: $ANDROID_HOME"
echo "✓ Java Home: $JAVA_HOME"

# Accept licenses
echo ""
echo "Accepting Android SDK licenses..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1
echo "✓ Licenses accepted"

# Install SDK components
echo ""
echo "Installing Android SDK components..."
echo "  • Platform Android 34"
echo "  • Build Tools 34.0.0"
echo "  • NDK 25.1.8937393"
echo ""

$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "platform-tools" \
  "tools" \
  --verbose

echo ""
echo "✓ SDK Installation complete"
echo ""
echo "=========================================="
echo "Configuration for Future Sessions:"
echo "=========================================="
echo ""
echo "Add to ~/.bashrc or run before gradle build:"
echo ""
echo "export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.9-ms"
echo "export ANDROID_HOME=~/android-sdk"
echo "export PATH=\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"
echo ""
echo "=========================================="
echo "Next: Run APK Build"
echo "=========================================="
echo ""
echo "$ cd /workspaces/Gesmind"
echo "$ ./build-apk-release.sh"
echo ""
