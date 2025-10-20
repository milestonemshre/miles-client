#!/bin/bash

echo "🔧 Setting up Java 17 for Android build..."

# Try to find Java 17 installation
JAVA17_PATHS=(
    "/usr/lib/jvm/temurin-17-jdk-amd64"
    "/usr/lib/jvm/java-17-openjdk-amd64" 
    "/usr/lib/jvm/java-17-openjdk"
    "/opt/java/openjdk-17"
    "/usr/lib/jvm/adoptopenjdk-17-hotspot"
)

for path in "${JAVA17_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ Found Java 17 at: $path"
        export JAVA_HOME="$path"
        export PATH="$JAVA_HOME/bin:$PATH"
        break
    fi
done

# Check if we successfully set Java 17
if command -v java >/dev/null 2>&1; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "🔍 Current Java version: $JAVA_VERSION"
    
    if [[ "$JAVA_VERSION" == *"17."* ]]; then
        echo "✅ Java 17 is active"
    else
        echo "⚠️  Warning: Java 17 not found, using system default"
        echo "   Android Gradle Plugin requires Java 17"
    fi
else
    echo "❌ Java not found in PATH"
    exit 1
fi

echo "🔧 Java setup complete"