#!/bin/bash

# Ionic Appflow pre-build hook to set Java 17
echo "Setting up Java 17 for Android build in Appflow..."

# Install Java 17 if not available
if ! java -version 2>&1 | grep -q "openjdk 17"; then
    echo "Java 17 not detected, attempting to install..."
    
    # Try to install Java 17 (Ubuntu/Debian)
    apt-get update && apt-get install -y openjdk-17-jdk 2>/dev/null || true
    
    # Set JAVA_HOME to Java 17
    if [ -d "/usr/lib/jvm/java-17-openjdk-amd64" ]; then
        export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
        export PATH=$JAVA_HOME/bin:$PATH
        echo "Java 17 configured at $JAVA_HOME"
    fi
fi

# Verify Java version
java -version

echo "Java setup complete"